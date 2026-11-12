import Link from 'next/link';
import Image from 'next/image';
import dynamicImport from 'next/dynamic';
import { supabase } from '@/lib/supabase';
import { Movie, Category } from '@/lib/types';
import SearchBar from '@/components/SearchBar';
import CategoryMenu, { TypeTabs } from '@/components/CategoryMenu';
import { AdBanner } from '@/components/ads';
import LatestUpdates from '@/components/LatestUpdates';
import UpcomingSection from '@/components/UpcomingSection';
import { Upcoming } from '@/lib/types';
import MovieCard from '@/components/MovieCard';
import { Metadata } from 'next';
import { buildPageMetadata } from '@/lib/metadata';
import Pagination from '@/components/Pagination';
import LatestGrid from '@/components/LatestGrid';
import { interleaveLatestContent, interleaveCategoryRow } from '@/lib/contentMixer';

import { fetchTmdbLatestTrending, getExistingDatabaseCatalog, normalizeTitle } from '@/lib/tmdb';

// Dynamic Imports for Performance
const HeroSlider = dynamicImport(() => import('@/components/HeroSlider'), {
    ssr: true, // Keep SSR for SEO (above fold)
    loading: () => <div className="w-full aspect-[21/9] bg-dark-800 animate-pulse" />,
});

const MovieGrid = dynamicImport(() => import('@/components/MovieGrid'), {
    loading: () => <div className="h-96 bg-dark-800 animate-pulse rounded-xl my-8" />,
});

// ISR: Cache on Vercel Global Edge CDN for 60 seconds.
// Fresh uploads appear almost immediately while maintaining serverless efficiency!
export const revalidate = 60;

export const metadata: Metadata = buildPageMetadata({
    title: 'Download Movies, Series & Anime',
    description: 'Your ultimate destination for downloading high-quality movies, series, and anime in HD.',
    path: '/',
});

const ITEMS_PER_PAGE = 24;

async function getHomeContent(page: number) {
    const cardFields = 'id, title, slug, type, poster_url, release_year, created_at, trending_badge, is_adult, admin_note';
    const sliderFields = 'id, title, slug, type, poster_url, release_year, banner_url_desktop, banner_url_mobile, description, ad_link, is_adult';
    
    const from = (page - 1) * ITEMS_PER_PAGE;
    // On page 1, fetch 36 items so we have a full queue of regular items even after extracting pinned items
    const to = from + (page === 1 ? 35 : ITEMS_PER_PAGE - 1);

    const getCategoryWithPinned = async (type: string) => {
        const [catPinnedRes, catRegularRes] = await Promise.all([
            supabase.from('movies').select(cardFields).eq('type', type).eq('admin_note', 'pinned').order('created_at', { ascending: false }).limit(6),
            supabase.from('movies').select(cardFields).eq('type', type).order('created_at', { ascending: false }).limit(10),
        ]);
        const catPinned = (catPinnedRes.data || []).map((m: any) => ({ ...m, is_pinned: true }));
        const catPinnedIds = new Set(catPinned.map(m => m.id));
        const catRegular = (catRegularRes.data || [])
            .filter((m: any) => !catPinnedIds.has(m.id))
            .map((m: any) => ({ ...m, is_pinned: false }));
        return interleaveCategoryRow(catPinned, catRegular, 6);
    };

    // Run every independent home query together, rather than waiting for a
    // second database round trip before requesting the home-page sections.
    const coreDataPromise = Promise.all([
        supabase.from('categories').select('id, name, slug, created_at').order('name', { ascending: true }),
        supabase.from('movies').select(cardFields, { count: 'exact' }).in('type', ['movie', 'series', 'anime']).order('created_at', { ascending: false }).range(from, to),
        page === 1
            ? supabase.from('movies').select(cardFields).eq('admin_note', 'pinned').in('type', ['movie', 'series', 'anime']).order('created_at', { ascending: false })
            : Promise.resolve({ data: [] }),
        getExistingDatabaseCatalog(),
    ]);

    const homeSectionsPromise = page === 1
        ? Promise.all([
            supabase.from('movies').select(sliderFields).eq('is_trending', true).order('trending_rank', { ascending: true }).limit(10),
            supabase.from('updates').select('*').eq('is_active', true).order('updated_at', { ascending: false, nullsFirst: false }).limit(30),
            supabase.from('app_settings').select('latest_update_click_ad_link').eq('id', 1).single(),
            supabase.from('upcoming').select('*').order('release_date', { ascending: true }).limit(10),
            getCategoryWithPinned('movie'),
            getCategoryWithPinned('series'),
            getCategoryWithPinned('anime'),
            supabase
                .from('episodes')
                .select('id, episode_number, created_at, seasons!inner(season_number, movie_id, movies!inner(id, title, slug, poster_url, type, is_adult))')
                .order('created_at', { ascending: false })
                .limit(25),
        ] as const)
        : Promise.resolve(null);

    const [[categoriesRes, paginatedLatestRes, pinnedRes, dbCatalog], homeSections] = await Promise.all([
        coreDataPromise,
        homeSectionsPromise,
    ]);

    // Format pinned movies
    const pinnedMovies: Movie[] = (pinnedRes.data || []).map((m: any) => ({
        ...m,
        is_pinned: true
    }));
    const pinnedIds = new Set(pinnedMovies.map(m => m.id));
    const localCount = paginatedLatestRes.count || 0;

    // Regular database movies (excluding pinned)
    const regularLatest: Movie[] = (paginatedLatestRes.data || [])
        .filter((m: any) => !pinnedIds.has(m.id))
        .map((m: any) => ({
            ...m,
            is_pinned: Boolean(m.admin_note === 'pinned')
        }));

    let paginatedLatest: Movie[] = [];
    let page1TmdbMovies: Movie[] = [];

    if (page === 1) {
        // Always fetch live fresh TMDB trending & latest releases for Page 1
        try {
            const { results: tmdbResults } = await fetchTmdbLatestTrending(1);
            page1TmdbMovies = tmdbResults.filter(item => {
                if (item.tmdb_id && dbCatalog.existingTmdbIds.has(item.tmdb_id)) return false;
                if (dbCatalog.existingTitles.has(normalizeTitle(item.title))) return false;
                if (pinnedIds.has(item.id)) return false;
                return true;
            });
        } catch (tmdbErr) {
            console.warn('[Home Page] TMDB latest dynamic fill failed:', tmdbErr);
        }

        // Assemble Page 1 with intelligent interleaving & dynamic rotation:
        // 1. Newly uploaded local database content appears right in the top row (slots 1, 2, 4, 5...)
        //    without needing to be manually pinned!
        // 2. Pinned content is prominently highlighted with Gorgeous badges at designated spots (0, 3, 7...)
        //    and rotated dynamically so the same cards don't stay in the exact same positions.
        // 3. TMDB trending items seamlessly supplement any empty slots when local uploads are exhausted.
        paginatedLatest = interleaveLatestContent({
            pinned: pinnedMovies,
            regular: regularLatest,
            fallback: page1TmdbMovies,
            limit: ITEMS_PER_PAGE,
        });
    } else {
        // Page 2+: Local database pages first, then continuous TMDB
        const localPages = Math.max(1, Math.ceil(localCount / ITEMS_PER_PAGE));
        const combined = [...regularLatest];

        if (combined.length < ITEMS_PER_PAGE || page > localPages) {
            const tmdbPage = Math.max(1, page - localPages + 1);
            try {
                const { results: tmdbResults } = await fetchTmdbLatestTrending(tmdbPage);
                const freshTmdbMovies = tmdbResults.filter(item => {
                    if (item.tmdb_id && dbCatalog.existingTmdbIds.has(item.tmdb_id)) return false;
                    if (dbCatalog.existingTitles.has(normalizeTitle(item.title))) return false;
                    return true;
                });
                combined.push(...freshTmdbMovies.slice(0, ITEMS_PER_PAGE - combined.length));
            } catch (tmdbErr) {
                console.warn('[Home Page] TMDB pagination fill failed:', tmdbErr);
            }
        }
        paginatedLatest = combined.slice(0, ITEMS_PER_PAGE);
    }

    const totalLatestCount = localCount + 12000;

    let trendingMovies: Movie[] = [];
    let latestUpdates: any[] = [];
    let latestUpdateAdLink = '';
    let upcomingReleases: Upcoming[] = [];
    let latestMovies: Movie[] = [];
    let latestSeries: Movie[] = [];
    let latestAnime: Movie[] = [];

    // 2. Read the already-fetched page-one sections.
    if (homeSections) {
        const [trendingRes, updatesRes, settingsRes, upcomingRes, movList, serList, aniList, recentEpisodesRes] = homeSections;
        trendingMovies = (trendingRes.data as Movie[]) || [];
        if (trendingMovies.length < 5 && page1TmdbMovies.length > 0) {
            const existingTrendingIds = new Set(trendingMovies.map(m => m.id));
            const extraTrending = page1TmdbMovies
                .filter(m => !existingTrendingIds.has(m.id) && m.banner_url_desktop)
                .slice(0, 5 - trendingMovies.length);
            trendingMovies = [...trendingMovies, ...extraTrending];
        }

        const episodeUpdates = ((recentEpisodesRes?.data as any[]) || [])
            .map((ep: any) => {
                const season = Array.isArray(ep.seasons) ? ep.seasons[0] : ep.seasons;
                const movie = season ? (Array.isArray(season.movies) ? season.movies[0] : season.movies) : null;
                if (!movie?.id || !movie?.title || !movie?.slug) return null;
                const cleanType = (movie.type || 'anime').toLowerCase();
                const cleanSlug = String(movie.slug).replace(/^\/+/, '').split('/').pop() || movie.slug;
                return {
                    id: `ep_${ep.id}`,
                    content_id: movie.id,
                    title: movie.title,
                    poster_url: movie.poster_url,
                    slug: `/${cleanType}/${cleanSlug}`,
                    content_type: cleanType,
                    update_type: 'episode' as const,
                    season_number: season.season_number || 1,
                    episode_number: ep.episode_number,
                    created_at: ep.created_at,
                    updated_at: ep.created_at,
                    is_active: true,
                };
            })
            .filter(Boolean);

        const combinedUpdates = [...(updatesRes.data || []), ...episodeUpdates].sort((a: any, b: any) => {
            const timeA = new Date(a.updated_at || a.created_at || 0).getTime() || 0;
            const timeB = new Date(b.updated_at || b.created_at || 0).getTime() || 0;
            return timeB - timeA;
        });

        const seenUpdateContentKeys = new Set<string>();
        latestUpdates = [];
        for (const item of combinedUpdates) {
            const cleanSlug = String(item.slug || '').replace(/^\/+/, '').split('/').pop()?.toLowerCase() || '';
            const contentIdKey = item.content_id ? `id:${item.content_id}` : '';
            const slugKey = cleanSlug ? `slug:${cleanSlug}` : '';
            const primaryKey = contentIdKey || slugKey || item.id;
            if (!primaryKey) continue;
            if ((contentIdKey && seenUpdateContentKeys.has(contentIdKey)) || (slugKey && seenUpdateContentKeys.has(slugKey))) {
                continue;
            }
            if (contentIdKey) seenUpdateContentKeys.add(contentIdKey);
            if (slugKey) seenUpdateContentKeys.add(slugKey);
            seenUpdateContentKeys.add(item.id);
            latestUpdates.push(item);
            if (latestUpdates.length >= 16) break;
        }

        // Supplement with recent database releases if needed
        if (latestUpdates.length < 10 && regularLatest.length > 0) {
            const extraUpdates = regularLatest
                .filter(m => !seenUpdateContentKeys.has(`id:${m.id}`) && !seenUpdateContentKeys.has(`slug:${m.slug.toLowerCase()}`))
                .slice(0, 12 - latestUpdates.length)
                .map(m => ({
                    id: m.id,
                    content_id: m.id,
                    title: m.title,
                    poster_url: m.poster_url,
                    slug: `/${m.type}/${m.slug}`,
                    content_type: m.type,
                    update_type: 'movie' as const,
                    season_number: null,
                    episode_number: null,
                    created_at: m.created_at,
                    updated_at: m.created_at,
                    is_active: true
                }));
            latestUpdates = [...latestUpdates, ...extraUpdates].sort((a: any, b: any) => {
                const timeA = new Date(a.updated_at || a.created_at || 0).getTime();
                const timeB = new Date(b.updated_at || b.created_at || 0).getTime();
                return timeB - timeA;
            });
        }

        latestUpdateAdLink = settingsRes.data?.latest_update_click_ad_link || '';
        upcomingReleases = upcomingRes.data || [];
        latestMovies = movList;
        latestSeries = serList;
        latestAnime = aniList;
    }

    return {
        categories: categoriesRes.data || [],
        totalLatestCount,
        paginatedLatest,
        trendingMovies,
        latestUpdates,
        latestUpdateAdLink,
        upcomingReleases,
        latestMovies,
        latestSeries,
        latestAnime
    };
}

export default async function HomePage({ searchParams }: { searchParams: Promise<{ page?: string }> }) {
    const { page } = await searchParams;
    const currentPage = Math.max(1, parseInt(page || '1', 10) || 1);
    
    const { 
        categories, 
        totalLatestCount, 
        paginatedLatest, 
        trendingMovies, 
        latestUpdates, 
        latestUpdateAdLink, 
        upcomingReleases, 
        latestMovies, 
        latestSeries, 
        latestAnime 
    } = await getHomeContent(currentPage);

    const totalPages = Math.ceil(totalLatestCount / ITEMS_PER_PAGE);

    return (
        <div className="min-h-screen">
            {/* Hero Slider (Trending) - Only on Page 1 */}
            {currentPage === 1 && (
                trendingMovies.length > 0 ? (
                    <HeroSlider movies={trendingMovies} />
                ) : (
                    <section className="relative py-8 md:py-12">
                        <div className="absolute inset-0 bg-gradient-to-b from-violet-900/15 via-transparent to-transparent" />
                        <div className="container mx-auto px-4 relative">
                            <div className="text-center mb-8">
                                <h1 className="text-3xl md:text-4xl font-bold mb-2">
                                    <span className="bg-gradient-to-r from-violet-300 to-violet-600 bg-clip-text text-transparent">
                                        Nexiplay
                                    </span>
                                </h1>
                                <p className="text-gray-400 text-sm md:text-base">
                                    Download Movies, Series & Anime in HD
                                </p>
                            </div>
                        </div>
                    </section>
                )
            )}

            {/* Search Bar & Categories - Moved below slider */}
            <div className={`container mx-auto px-4 ${currentPage === 1 ? '-mt-8' : 'pt-8'} relative z-20 mb-12`}>
                {/* Search Bar */}
                <div className="max-w-2xl mx-auto mb-8">
                    <SearchBar />
                </div>

                {/* Type Tabs */}
                <div className="flex justify-center mb-6">
                    <TypeTabs activeType="all" />
                </div>

                {/* Categories */}
                {categories.length > 0 && (
                    <div className="mb-8">
                        <CategoryMenu categories={categories} />
                    </div>
                )}
            </div>

            {currentPage === 1 && (
                <div className="container mx-auto -mt-5 px-4 pb-9 grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Vibe Check Banner */}
                    <Link href="/mood" className="group relative flex min-h-24 items-center justify-between overflow-hidden rounded-3xl border border-[#B09AFF]/20 bg-[radial-gradient(ellipse_at_80%_50%,rgba(146,115,245,.2),transparent_55%),linear-gradient(110deg,#17131f,#111016)] px-5 py-4 shadow-[0_16px_48px_rgba(0,0,0,.24)] transition hover:border-[#B09AFF]/45 sm:px-6">
                        <div className="relative z-10 max-w-xl">
                            <p className="text-[10px] font-extrabold uppercase tracking-[.22em] text-[#B09AFF]">Not sure what to watch?</p>
                            <h2 className="mt-1 text-lg font-black text-white sm:text-xl">Do a Vibe Check <span aria-hidden="true">✦</span></h2>
                            <p className="mt-0.5 text-xs text-gray-400">Pick your vibe. Get a fresh mix from Nexiplay & TMDB.</p>
                        </div>
                        <span className="relative z-10 ml-3 grid h-10 w-10 shrink-0 place-items-center rounded-2xl border border-white/10 bg-white/[.06] text-xl text-[#B09AFF] transition group-hover:scale-110 group-hover:rotate-6">→</span>
                        <span aria-hidden="true" className="pointer-events-none absolute -right-7 -top-12 h-40 w-40 rounded-full bg-[#9273F5]/10 blur-3xl" />
                    </Link>

                    {/* Nexiplay Arcade Games Banner */}
                    <Link href="/games" className="group relative flex min-h-24 items-center justify-between overflow-hidden rounded-3xl border border-fuchsia-500/20 bg-[radial-gradient(ellipse_at_80%_50%,rgba(217,70,239,.2),transparent_55%),linear-gradient(110deg,#1c1228,#120e1c)] px-5 py-4 shadow-[0_16px_48px_rgba(0,0,0,.24)] transition hover:border-fuchsia-500/45 sm:px-6">
                        <div className="relative z-10 max-w-xl">
                            <p className="text-[10px] font-extrabold uppercase tracking-[.22em] text-fuchsia-400">Instant HTML5 Games</p>
                            <h2 className="mt-1 text-lg font-black text-white sm:text-xl">Nexiplay Arcade <span aria-hidden="true">🎮</span></h2>
                            <p className="mt-0.5 text-xs text-gray-400">1,000+ free games. Action, racing, puzzles. Zero download.</p>
                        </div>
                        <span className="relative z-10 ml-3 grid h-10 w-10 shrink-0 place-items-center rounded-2xl border border-white/10 bg-white/[.06] text-xl text-fuchsia-400 transition group-hover:scale-110 group-hover:rotate-6">→</span>
                        <span aria-hidden="true" className="pointer-events-none absolute -right-7 -top-12 h-40 w-40 rounded-full bg-fuchsia-600/10 blur-3xl" />
                    </Link>
                </div>
            )}

            {/* Content */}
            <div className="container mx-auto px-4 pb-12">
                <AdBanner placement="home_top" size="728x90" lazy={false} />

                {/* Latest Updates Section - Only on Page 1 */}
                {currentPage === 1 && latestUpdates.length > 0 && (
                    <LatestUpdates updates={latestUpdates} adLink={latestUpdateAdLink} />
                )}

                {/* Upcoming Releases Section - Only on Page 1 */}
                {currentPage === 1 && upcomingReleases.length > 0 && (
                    <UpcomingSection items={upcomingReleases} />
                )}

                {/* Paginated Latest Additions - Combined Grid with Shuffle */}
                {paginatedLatest.length > 0 && (
                    <div className="mb-12">
                        <LatestGrid
                            movies={paginatedLatest}
                            title={currentPage === 1 ? 'Latest Additions' : `All Content - Page ${currentPage}`}
                            isPageOne={currentPage === 1}
                        />
                        
                        <div className="mt-8">
                            <Pagination
                                currentPage={currentPage}
                                totalPages={totalPages}
                                totalItems={totalLatestCount}
                                itemsPerPage={ITEMS_PER_PAGE}
                            />
                        </div>
                    </div>
                )}

                {/* Movies Section - Only on Page 1 */}
                {currentPage === 1 && latestMovies.length > 0 && (
                    <MovieGrid
                        movies={latestMovies}
                        title="Latest Movies"
                        showViewAll
                        viewAllHref="/movies"
                        scrollable={true}
                    />
                )}

                {/* Series Section - Only on Page 1 */}
                {currentPage === 1 && latestSeries.length > 0 && (
                    <MovieGrid
                        movies={latestSeries}
                        title="Latest Series"
                        showViewAll
                        viewAllHref="/series"
                        scrollable={true}
                    />
                )}

                {/* Anime Section - Only on Page 1 */}
                {currentPage === 1 && latestAnime.length > 0 && (
                    <MovieGrid
                        movies={latestAnime}
                        title="Latest Anime"
                        showViewAll
                        viewAllHref="/anime"
                        scrollable={true}
                    />
                )}

                <AdBanner placement="home_bottom" size="300x250" />

                {/* Empty State */}
                {paginatedLatest.length === 0 && (
                    <div className="text-center py-20">
                        <div className="w-24 h-24 mx-auto mb-6 rounded-full bg-dark-700 flex items-center justify-center">
                            <svg className="w-12 h-12 text-gray-600" fill="currentColor" viewBox="0 0 24 24">
                                <path d="M18 4l2 4h-3l-2-4h-2l2 4h-3l-2-4H8l2 4H7L5 4H4c-1.1 0-1.99.9-1.99 2L2 18c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V4h-4z" />
                            </svg>
                        </div>
                        <h2 className="text-2xl font-bold text-gray-300 mb-3">No Content Yet</h2>
                        <p className="text-gray-500 max-w-md mx-auto mb-6">
                            Add movies, series, or anime to your Supabase database to see them here.
                        </p>
                        <div className="flex flex-wrap justify-center gap-3">
                            <a
                                href="https://supabase.com/dashboard"
                                target="_blank"
                                rel="noopener noreferrer"
                                className="btn-primary text-sm"
                            >
                                Open Supabase Dashboard
                            </a>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
