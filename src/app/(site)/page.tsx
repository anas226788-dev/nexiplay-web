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

// Dynamic Imports for Performance
const HeroSlider = dynamicImport(() => import('@/components/HeroSlider'), {
    ssr: true, // Keep SSR for SEO (above fold)
    loading: () => <div className="w-full aspect-[21/9] bg-dark-800 animate-pulse" />,
});

const MovieGrid = dynamicImport(() => import('@/components/MovieGrid'), {
    loading: () => <div className="h-96 bg-dark-800 animate-pulse rounded-xl my-8" />,
});

// Force dynamic to ensure immediate reflection of admin pin/unpin actions
export const dynamic = 'force-dynamic';
export const revalidate = 0;

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
    const to = from + ITEMS_PER_PAGE - 1;

    // 1. Fetch core data (always needed)
    const [categoriesRes, latestCountRes, paginatedLatestRes, pinnedRes] = await Promise.all([
        supabase.from('categories').select('id, name, slug, created_at').order('name', { ascending: true }),
        supabase.from('movies').select('id', { count: 'exact', head: true }).in('type', ['movie', 'series', 'anime']),
        supabase.from('movies').select(cardFields).in('type', ['movie', 'series', 'anime']).order('created_at', { ascending: false }).range(from, to),
        page === 1 
            ? supabase.from('movies').select(cardFields).eq('admin_note', 'pinned').in('type', ['movie', 'series', 'anime']).order('created_at', { ascending: false })
            : Promise.resolve({ data: [] }),
    ]);

    // Format pinned movies
    const pinnedMovies: Movie[] = (pinnedRes.data || []).map((m: any) => ({
        ...m,
        is_pinned: true
    }));
    const pinnedIds = new Set(pinnedMovies.map(m => m.id));

    // Combine pinned movies at the top of page 1, filtering duplicates
    const regularLatest: Movie[] = (paginatedLatestRes.data || [])
        .filter((m: any) => !pinnedIds.has(m.id))
        .map((m: any) => ({
            ...m,
            is_pinned: Boolean(m.admin_note === 'pinned')
        }));

    const paginatedLatest: Movie[] = page === 1 
        ? [...pinnedMovies, ...regularLatest] 
        : (paginatedLatestRes.data || []).map((m: any) => ({ ...m, is_pinned: Boolean(m.admin_note === 'pinned') }));

    let trendingMovies: Movie[] = [];
    let latestUpdates: any[] = [];
    let latestUpdateAdLink = '';
    let upcomingReleases: Upcoming[] = [];
    let latestMovies: Movie[] = [];
    let latestSeries: Movie[] = [];
    let latestAnime: Movie[] = [];

    // Helper to fetch category items with pinned items always placed first
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
        return [...catPinned, ...catRegular].slice(0, 6);
    };

    // 2. Fetch specific Home Page grids & widgets ONLY if page exactly 1
    if (page === 1) {
        const [trendingRes, updatesRes, settingsRes, upcomingRes, movList, serList, aniList] = await Promise.all([
            supabase.from('movies').select(sliderFields).eq('is_trending', true).order('trending_rank', { ascending: true }).limit(10),
            supabase.from('updates').select('*').eq('is_active', true).order('updated_at', { ascending: false }).limit(10),
            supabase.from('app_settings').select('latest_update_click_ad_link').eq('id', 1).single(),
            supabase.from('upcoming').select('*').order('release_date', { ascending: true }).limit(10),
            getCategoryWithPinned('movie'),
            getCategoryWithPinned('series'),
            getCategoryWithPinned('anime'),
        ]);

        trendingMovies = (trendingRes.data as Movie[]) || [];
        latestUpdates = updatesRes.data || [];
        latestUpdateAdLink = settingsRes.data?.latest_update_click_ad_link || '';
        upcomingReleases = upcomingRes.data || [];
        latestMovies = movList;
        latestSeries = serList;
        latestAnime = aniList;
    }

    return {
        categories: categoriesRes.data || [],
        totalLatestCount: latestCountRes.count || 0,
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
                        <div className="absolute inset-0 bg-gradient-to-b from-red-900/10 via-transparent to-transparent" />
                        <div className="container mx-auto px-4 relative">
                            <div className="text-center mb-8">
                                <h1 className="text-3xl md:text-4xl font-bold mb-2">
                                    <span className="bg-gradient-to-r from-red-500 to-red-600 bg-clip-text text-transparent">
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

                {/* Paginated Latest Additions - Combined Grid */}
                {paginatedLatest.length > 0 && (
                    <section className="mb-12">
                        <div className="flex items-center justify-between mb-6">
                            <h2 className="section-title">
                                {currentPage === 1 ? 'Latest Additions' : `All Content - Page ${currentPage}`}
                            </h2>
                        </div>
                        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3 md:gap-4">
                            {paginatedLatest.map((movie) => (
                                <MovieCard key={movie.id} movie={movie} />
                            ))}
                        </div>
                        
                        <div className="mt-8">
                            <Pagination
                                currentPage={currentPage}
                                totalPages={totalPages}
                                totalItems={totalLatestCount}
                                itemsPerPage={ITEMS_PER_PAGE}
                            />
                        </div>
                    </section>
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
