import { notFound, redirect } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';
import { AdBanner, NativeAd } from '@/components/ads';
import RelatedPosts from '@/components/RelatedPosts';
import TelegramButton from '@/components/TelegramButton';
import { supabase } from '@/lib/supabase';
import { MovieWithDownloads, DownloadLink, Season } from '@/lib/types';
import { Metadata } from 'next';
import dynamicImport from 'next/dynamic';
import { buildPageMetadata } from '@/lib/metadata';
import AdultGateGuard from '@/components/AdultGateGuard';
import ActiveMovieSetter from '@/components/ActiveMovieSetter';
import WatchlistButton from '@/components/WatchlistButton';
import { fetchTmdbDetails, tmdbDetailToMovie, fetchTmdbByImdbId, searchTmdb, cleanTitleForTmdb } from '@/lib/tmdb';

const ScreenshotGallery = dynamicImport(() => import('@/components/ScreenshotGallery'), {
    loading: () => <div className="h-64 bg-dark-800 animate-pulse rounded-xl my-8" />
});
const CommentSection = dynamicImport(() => import('@/components/CommentSection'), {
    loading: () => <div className="h-40 bg-dark-800 animate-pulse rounded-xl my-8" />
});
const EpisodeList = dynamicImport(() => import('@/components/EpisodeList'), {
    loading: () => <div className="h-96 bg-dark-800 animate-pulse rounded-xl my-8" />
});
const DownloadPanel = dynamicImport(() => import('@/components/DownloadPanel'), {
    loading: () => <div className="h-40 bg-dark-800 animate-pulse rounded-xl my-8" />
});

export const revalidate = 60; // Lower for OG testing — increase to 3600 after verifying

interface PageProps {
    params: Promise<{
        type: string;
        slug: string;
    }>;
    searchParams: Promise<{
        tab?: string;
    }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
    const { type, slug: rawSlug } = await params;

    // Parse slug-year format (e.g., "solo-leveling-2024" -> slug: "solo-leveling", year: 2024)
    const slugParts = rawSlug.match(/^(.+)-(\d{4})$/);
    const actualSlug = slugParts ? slugParts[1] : rawSlug;
    const releaseYear = slugParts ? parseInt(slugParts[2]) : null;

    let dbType = 'movie';
    if (type === 'anime') dbType = 'anime';
    else if (type === 'series') dbType = 'series';
    else if (type === 'movie' || type === 'movies') dbType = 'movie';

    const metadataFields = `
        title,
        description,
        poster_url,
        release_year,
        type,
        slug,
        updated_at,
        language,
        cast_members,
        movie_categories (
            categories (name)
        )
    `;

    // 1. Try exact slug match first (handles slugs that contain years in the name)
    let { data: movie } = await supabase
        .from('movies')
        .select(metadataFields)
        .eq('slug', rawSlug)
        .eq('type', dbType)
        .maybeSingle();

    // 2. Fallback: split slug-year if exact match failed
    if (!movie && releaseYear) {
        const { data: fallbackMovie } = await supabase
            .from('movies')
            .select(metadataFields)
            .eq('slug', actualSlug)
            .eq('release_year', releaseYear)
            .eq('type', dbType)
            .maybeSingle();
        if (fallbackMovie) movie = fallbackMovie;
    }

    // 3. Fallback: Resolve TMDB / IMDb item metadata on-demand
    if (!movie) {
        const media = (dbType === 'series' || dbType === 'anime') ? 'tv' : 'movie';
        let tmdbId: number | null = null;
        let resolvedMedia: 'movie' | 'tv' = media;

        if (rawSlug.startsWith('tmdb-') || /^\d+$/.test(rawSlug)) {
            tmdbId = parseInt(rawSlug.replace(/^tmdb-/, ''), 10);
        } else if (/^tt\d+$/i.test(rawSlug)) {
            const findRes = await fetchTmdbByImdbId(rawSlug);
            if (findRes) {
                tmdbId = findRes.tmdbId;
                resolvedMedia = findRes.media;
            }
        } else {
            const searchResults = await searchTmdb(actualSlug.replace(/-/g, ' '), media);
            if (searchResults.length > 0) {
                const match = releaseYear
                    ? searchResults.find(r => r.release_year === releaseYear) || searchResults[0]
                    : searchResults[0];
                if (match?.tmdb_id) {
                    tmdbId = parseInt(match.tmdb_id, 10);
                }
            }
        }

        if (tmdbId) {
            const detail = await fetchTmdbDetails(tmdbId, resolvedMedia);
            if (detail) {
                const { movie: virtualMovie } = tmdbDetailToMovie(detail, resolvedMedia);
                movie = virtualMovie as any;
            }
        }
    }

    if (!movie) {
        return buildPageMetadata({
            title: 'Not Found',
            description: 'The requested title could not be found on Nexiplay.',
            path: `/${type}/${rawSlug}`,
        });
    }

    const canonicalPath = `/${type}/${rawSlug}`;

    // Generate keywords
    const keywords = [
        movie.title,
        `Download ${movie.title}`,
        `${movie.title} ${movie.release_year}`,
        movie.language,
        movie.type,
        ...(movie.movie_categories?.map((mc: any) => mc.categories?.name) || [])
    ].filter(Boolean);

    const releaseYearLabel = movie.release_year ? ` (${movie.release_year})` : '';
    const contentTypeLabel =
        movie.type === 'movie' ? 'Movie' : movie.type === 'series' ? 'Series' : 'Anime';

    return buildPageMetadata({
        title: `${movie.title}${releaseYearLabel} - Download ${contentTypeLabel}`,
        description:
            movie.description ||
            `Download ${movie.title}${releaseYearLabel} in HD quality. Watch online or download for free on Nexiplay.`,
        path: canonicalPath,
        type: movie.type === 'movie' ? 'video.movie' : 'video.tv_show',
        keywords,
        image: movie.poster_url || undefined,
        imageAlt: `${movie.title} - ${contentTypeLabel} Poster`,
    });
}

export default async function MovieDetailPage({ params, searchParams }: PageProps) {
    const { type, slug: rawSlug } = await params;
    const { tab } = await searchParams;
    const activeTab = tab || 'download';

    if (activeTab === 'watch') {
        redirect(`/watch/${type}/${rawSlug}`);
    }

    // Parse slug-year format (e.g., "solo-leveling-2024" -> slug: "solo-leveling", year: 2024)
    const slugParts = rawSlug.match(/^(.+)-(\d{4})$/);
    const actualSlug = slugParts ? slugParts[1] : rawSlug;
    const releaseYear = slugParts ? parseInt(slugParts[2]) : null;

    // Determine correct type
    // Handles both singular (preferred) and plural (legacy) URL segments
    let dbType = 'movie'; // Default
    if (type === 'anime') dbType = 'anime';
    else if (type === 'series') dbType = 'series';
    else if (type === 'movie' || type === 'movies') dbType = 'movie';

    // 1. Try Exact Slug Match First (Most reliable)
    // This handles cases where slug already contains the year (e.g. "movie-2024")
    let { data: movie, error } = await supabase
        .from('movies')
        .select(`
            *,
            downloads (*),
            download_links (*),
            screenshots:movie_screenshots (*),
            movie_categories (
                categories (*)
            )
        `)
        .eq('slug', rawSlug) // Try exact match first
        .eq('type', dbType)
        .maybeSingle();

    // 2. Fallback: Parse slug-year format if exact match failed
    if (!movie) {
        // Parse slug-year format (e.g., "solo-leveling-2024" -> slug: "solo-leveling", year: 2024)
        const slugParts = rawSlug.match(/^(.+)-(\d{4})$/);

        if (slugParts) {
            const actualSlug = slugParts[1];
            const releaseYear = parseInt(slugParts[2]);

            const { data: fallbackMovie, error: fallbackError } = await supabase
                .from('movies')
                .select(`
                    *,
                    downloads (*),
                    download_links (*),
                    screenshots:movie_screenshots (*),
                    movie_categories (
                        categories (*)
                    )
                `)
                .eq('slug', actualSlug) // Try without year
                .eq('release_year', releaseYear) // Enforce year match
                .eq('type', dbType)
                .maybeSingle();

            if (fallbackMovie) {
                movie = fallbackMovie;
                error = fallbackError;
            }
        }
    }

    // 3. Fallback: On-demand TMDB / IMDb item resolution for detail page
    let tmdbSeasons: Season[] = [];
    if (!movie) {
        const media = (dbType === 'series' || dbType === 'anime') ? 'tv' : 'movie';
        let tmdbId: number | null = null;
        let resolvedMedia: 'movie' | 'tv' = media;

        if (rawSlug.startsWith('tmdb-') || /^\d+$/.test(rawSlug)) {
            tmdbId = parseInt(rawSlug.replace(/^tmdb-/, ''), 10);
        } else if (/^tt\d+$/i.test(rawSlug)) {
            const findRes = await fetchTmdbByImdbId(rawSlug);
            if (findRes) {
                tmdbId = findRes.tmdbId;
                resolvedMedia = findRes.media;
            }
        } else {
            const searchResults = await searchTmdb(actualSlug.replace(/-/g, ' '), media);
            if (searchResults.length > 0) {
                const match = releaseYear
                    ? searchResults.find(r => r.release_year === releaseYear) || searchResults[0]
                    : searchResults[0];
                if (match?.tmdb_id) {
                    tmdbId = parseInt(match.tmdb_id, 10);
                }
            }
        }

        if (tmdbId) {
            const detail = await fetchTmdbDetails(tmdbId, resolvedMedia);
            if (detail) {
                const { movie: virtualMovie, seasons: virtualSeasons } = tmdbDetailToMovie(detail, resolvedMedia);
                movie = virtualMovie as any;
                tmdbSeasons = virtualSeasons;
                error = null;
            }
        }
    }

    if (error && !movie) {
        console.error('Movie fetch error:', JSON.stringify(error, null, 2));
    }

    if (!movie) {
        notFound();
    }

    const movieData = movie as any; // Cast to any to handle joined relations easily

    // Dynamic fallback: resolve TMDB ID if not present in DB
    if (!movieData.tmdb_id && !movieData.imdb_id) {
        const cleanTitle = cleanTitleForTmdb(movieData.title);
        const media = (movieData.type === 'series' || movieData.type === 'anime') ? 'tv' : 'movie';
        try {
            const searchResults = await searchTmdb(cleanTitle, media);
            if (searchResults.length > 0) {
                const match = movieData.release_year
                    ? searchResults.find(r => r.release_year === movieData.release_year) || searchResults[0]
                    : searchResults[0];
                if (match?.tmdb_id) {
                    movieData.tmdb_id = match.tmdb_id;
                    // Persist to DB asynchronously
                    supabase.from('movies').update({ tmdb_id: match.tmdb_id }).eq('id', movieData.id).then();
                }
            }
        } catch (e) {
            console.warn('[MovieDetailPage] Auto TMDB resolve error:', e);
        }
    }

    const categories = movieData.movie_categories?.map((mc: any) => mc.categories?.name).join(', ') || 'N/A';
    const uniqueQualities = Array.from(new Set(movieData.downloads?.map((d: any) => d.quality))).join(', ') || 'N/A';
    const sizes = Array.from(new Set(movieData.downloads?.map((d: any) => d.file_size))).filter(Boolean).join(', ') || 'N/A';
    const isSeriesOrAnime = movieData.type === 'series' || movieData.type === 'anime';

    // Fetch seasons for series/anime
    let seasons: Season[] = tmdbSeasons;
    if (isSeriesOrAnime && seasons.length === 0 && !movieData.id?.startsWith('tmdb-')) {
        const { data: seasonData } = await supabase
            .from('seasons')
            .select(`
                *,
                episodes (
                    *,
                    download_links:episode_download_links (*)
                )
            `)
            .eq('movie_id', movieData.id)
            .order('season_number');

        seasons = (seasonData as Season[]) || [];

        // If DB has 0 seasons but has tmdb_id, dynamically generate virtual seasons from TMDB
        if (seasons.length === 0 && movieData.tmdb_id) {
            try {
                const detail = await fetchTmdbDetails(parseInt(movieData.tmdb_id, 10), 'tv');
                if (detail) {
                    const { seasons: virtualSeasons } = tmdbDetailToMovie(detail, 'tv');
                    seasons = virtualSeasons;
                }
            } catch (e) {
                console.warn('[MovieDetailPage] Failed to fetch virtual seasons from TMDB:', e);
            }
        }
    }

    // Dynamic TMDB rich metadata retrieval
    let tmdbDetail: any = null;
    if (movieData.tmdb_id) {
        const media = (movieData.type === 'series' || movieData.type === 'anime') ? 'tv' : 'movie';
        try {
            tmdbDetail = await fetchTmdbDetails(parseInt(movieData.tmdb_id, 10), media);
        } catch (e) {
            console.warn('[MovieDetailPage] fetchTmdbDetails error:', e);
        }
    }

    // Dynamic franchise prequel/sequel retrieval for the Yomi "RELATED" card (only show if true title root match exists)
    let franchiseItem: any = null;
    try {
        const titleRoot = movieData.title.split(/[:\-\(]/)[0].trim();
        if (titleRoot.length >= 3) {
            const { data: relatedData } = await supabase
                .from('movies')
                .select('id, title, slug, type, poster_url, release_year')
                .eq('type', movieData.type)
                .neq('id', movieData.id)
                .ilike('title', `%${titleRoot}%`)
                .limit(1);
            if (relatedData && relatedData.length > 0) {
                franchiseItem = relatedData[0];
            }
        }
    } catch (e) {
        console.warn('[MovieDetailPage] related fetch error:', e);
    }

    // Derived metadata fields
    const backdropUrl = movieData.banner_url_desktop || 
        (tmdbDetail?.backdrop_path ? `https://image.tmdb.org/t/p/original${tmdbDetail.backdrop_path}` : movieData.poster_url);
    const score = tmdbDetail?.vote_average ? Number(tmdbDetail.vote_average).toFixed(1) : (movieData.type === 'anime' ? '8.7' : '8.2');
    const popularityRank = tmdbDetail?.popularity ? `#${Math.round(tmdbDetail.popularity * 850).toLocaleString()}` : '#93,595';
    const durationStr = tmdbDetail?.runtime 
        ? `${tmdbDetail.runtime}m`
        : tmdbDetail?.episode_run_time?.[0]
            ? `${tmdbDetail.episode_run_time[0]}m`
            : (movieData.type === 'movie' ? '2h 15m' : '24m');
    const studioName = tmdbDetail?.production_companies?.[0]?.name 
        || tmdbDetail?.networks?.[0]?.name 
        || (movieData.type === 'anime' ? 'Studio Pierrot' : 'Warner Bros.');

    // Genre items
    const genresList: string[] = [];
    if (movieData.movie_categories && movieData.movie_categories.length > 0) {
        for (const mc of movieData.movie_categories) {
            if (mc.categories?.name && !genresList.includes(mc.categories.name)) {
                genresList.push(mc.categories.name);
            }
        }
    }
    if (genresList.length === 0 && tmdbDetail?.genres) {
        for (const g of tmdbDetail.genres) {
            if (g.name && !genresList.includes(g.name)) genresList.push(g.name);
        }
    }
    if (genresList.length === 0) {
        genresList.push(movieData.type === 'anime' ? 'Action' : 'Action', 'Adventure', 'Fantasy', 'Drama');
    }

    // Cast members
    let castList: string[] = [];
    if (movieData.cast_members && movieData.cast_members.trim() && movieData.cast_members !== 'N/A') {
        castList = movieData.cast_members.split(',').map((c: string) => c.trim()).filter(Boolean);
    } else if (tmdbDetail?.credits?.cast) {
        castList = tmdbDetail.credits.cast.slice(0, 5).map((c: any) => c.name).filter(Boolean);
    }

    // Clean title and season parsing
    const titleSeasonMatch = movieData.title.match(/^(.*?)\s*[\(\[]?(Season\s*\d+[^)\]]*)[\)\]]?$/i);
    const mainTitle = titleSeasonMatch ? titleSeasonMatch[1].trim() : movieData.title;
    const detectedSeason = titleSeasonMatch ? titleSeasonMatch[2].trim() : (isSeriesOrAnime ? 'Season 1' : null);
    const initialSeasonNum = detectedSeason ? parseInt(detectedSeason.replace(/\D/g, ''), 10) : undefined;
    const subtitle = movieData.language ? `${movieData.language} Multi Audio` : '';
    const statusLabel = isSeriesOrAnime
        ? (movieData.running_status || (tmdbDetail?.status === 'Ended' ? 'Completed' : 'Airing'))
        : (movieData.release_year ? `Released (${movieData.release_year})` : 'Full Movie');
    const descriptionText = (movieData.description && !movieData.description.toLowerCase().startsWith('download & watch'))
        ? movieData.description
        : (tmdbDetail?.overview || movieData.description || `Watch and download ${movieData.title} in HD quality on Nexiplay.`);
    const trailerUrl = movieData.trailer_url || (tmdbDetail?.videos?.results?.find((v: any) => v.type === 'Trailer' && v.site === 'YouTube')?.key ? `https://www.youtube.com/watch?v=${tmdbDetail.videos.results.find((v: any) => v.type === 'Trailer' && v.site === 'YouTube').key}` : null);

    const isAdultContent = !!movieData.is_adult;

    const pageContent = (
        <div className="min-h-screen pb-20 bg-[#0A0B12]">
            <ActiveMovieSetter movieId={movieData.id} allowGlobalNotices={!!movieData.allow_global_notices} />
            
            {/* Cinematic Hero Backdrop Banner */}
            <div className="relative w-full overflow-hidden">
                {/* Wide Horizon Backdrop Image */}
                <div className="absolute inset-0 h-[68vh] min-h-[520px] w-full overflow-hidden" suppressHydrationWarning>
                    {backdropUrl && (
                        <Image
                            src={backdropUrl}
                            alt={movieData.title}
                            fill
                            className="object-cover object-top opacity-35 filter brightness-90 saturate-125"
                            priority
                        />
                    )}
                    {/* Multi-layered dark gradients for seamless blend into deep obsidian */}
                    <div className="absolute inset-0 bg-gradient-to-t from-[#0A0B12] via-[#0A0B12]/80 to-transparent" />
                    <div className="absolute inset-0 bg-gradient-to-b from-[#0A0B12]/80 via-transparent to-[#0A0B12]" />
                    <div className="absolute inset-0 bg-gradient-to-r from-[#0A0B12] via-transparent to-[#0A0B12]/80" />
                    {/* Ambient Glow */}
                    <div className="absolute -top-32 left-1/4 w-96 h-96 bg-violet-600/15 rounded-full blur-[120px] pointer-events-none" />
                </div>

                {/* Main Content Layout */}
                <div className="relative z-10 container mx-auto px-4 max-w-7xl pt-28 sm:pt-32 pb-12">
                    <div className="grid grid-cols-1 lg:grid-cols-[300px_1fr] gap-8 xl:gap-12 items-start">
                        
                        {/* LEFT COLUMN: Poster & Quick Stats Box (Desktop Only) */}
                        <div className="hidden lg:block space-y-6 lg:sticky lg:top-24">
                            {/* Poster Card */}
                            <div className="relative aspect-[2/3] rounded-2xl overflow-hidden shadow-2xl shadow-violet-950/40 ring-1 ring-white/10 group bg-dark-900" suppressHydrationWarning>
                                {movieData.poster_url ? (
                                    <Image
                                        src={movieData.poster_url}
                                        alt={movieData.title}
                                        fill
                                        className="object-cover group-hover:scale-105 transition-transform duration-500"
                                        priority
                                    />
                                ) : (
                                    <div className="w-full h-full bg-dark-800 flex items-center justify-center">
                                        <span className="text-gray-500 font-bold">No Poster</span>
                                    </div>
                                )}
                                {/* Corner Badges */}
                                <div className="absolute top-3 left-3 flex flex-col gap-1.5 pointer-events-none">
                                    <span className="px-2 py-0.5 rounded-md text-[10px] font-black uppercase tracking-wider bg-black/75 backdrop-blur-md text-amber-300 border border-amber-400/30">
                                        ★ {score}
                                    </span>
                                </div>
                                <div className="absolute top-3 right-3 pointer-events-none">
                                    <span className="px-2 py-0.5 rounded-md text-[10px] font-black uppercase tracking-wider bg-black/75 backdrop-blur-md text-cyan-300 border border-cyan-400/30">
                                        {uniqueQualities !== 'N/A' ? uniqueQualities.split(',')[0] : '1080p'}
                                    </span>
                                </div>
                            </div>

                            {/* Sleek Stats Box (Under Poster) */}
                            <div className="rounded-2xl bg-[#12131F]/90 border border-white/[0.08] p-4 text-xs space-y-2.5 backdrop-blur-xl shadow-xl">
                                <div className="flex items-center justify-between pb-2 border-b border-white/[0.06]">
                                    <span className="text-gray-400 font-medium">Score</span>
                                    <span className="font-extrabold text-amber-400 flex items-center gap-1.5 text-sm">
                                        <svg className="w-4 h-4 fill-amber-400 text-amber-400" viewBox="0 0 24 24">
                                            <path d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z" />
                                        </svg>
                                        {score}
                                    </span>
                                </div>
                                <div className="flex items-center justify-between pb-2 border-b border-white/[0.06]">
                                    <span className="text-gray-400 font-medium">Duration</span>
                                    <span className="font-semibold text-gray-200">{durationStr}</span>
                                </div>
                                <div className="flex items-center justify-between pb-2 border-b border-white/[0.06]">
                                    <span className="text-gray-400 font-medium">Studio</span>
                                    <span className="font-bold text-violet-400 hover:text-violet-300 truncate max-w-[130px]" title={studioName}>
                                        {studioName}
                                    </span>
                                </div>
                                <div className="flex items-center justify-between">
                                    <span className="text-gray-400 font-medium">Audio</span>
                                    <span className="font-semibold text-emerald-400 truncate max-w-[130px]">
                                        {movieData.language || 'Multi Audio'}
                                    </span>
                                </div>
                            </div>

                            {/* Community & Sidebar Ads */}
                            <div className="flex flex-col gap-4">
                                <TelegramButton className="w-full shadow-lg shadow-cyan-900/20" />
                                <AdBanner placement="movie_sidebar" size="300x250" />
                            </div>
                        </div>

                        {/* RIGHT COLUMN: Badges, Title, Genres, Actions, Synopsis, Tech Specs, Related */}
                        <div className="space-y-6">
                            {/* Breadcrumb Navigation */}
                            <nav className="flex items-center text-xs text-gray-400 overflow-x-auto whitespace-nowrap py-1">
                                <Link href="/" className="hover:text-violet-400 transition-colors">Home</Link>
                                <span className="mx-2 text-gray-600">›</span>
                                <Link href={`/${movieData.type}`} className="hover:text-violet-400 transition-colors capitalize">{movieData.type}</Link>
                                <span className="mx-2 text-gray-600">›</span>
                                <span className="text-gray-200 truncate max-w-[260px]">{mainTitle}</span>
                            </nav>

                            {/* Top Badges Row */}
                            <div className="flex flex-wrap items-center gap-2">
                                {isSeriesOrAnime ? (
                                    <span className="px-3 py-1 rounded-full text-xs font-bold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 flex items-center gap-1.5 shadow-sm">
                                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                                        {statusLabel}
                                    </span>
                                ) : (
                                    <span className="px-3 py-1 rounded-full text-xs font-bold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 flex items-center gap-1.5 shadow-sm">
                                        <svg className="w-3.5 h-3.5 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2.5}>
                                            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                                        </svg>
                                        Full Movie
                                    </span>
                                )}
                                <span className="px-3 py-1 rounded-full text-xs font-bold bg-violet-500/20 text-violet-300 border border-violet-500/30 uppercase tracking-wider">
                                    {movieData.type === 'anime' ? 'Anime' : movieData.type === 'series' ? 'TV Series' : 'Movie'}
                                </span>
                                <span className="px-3 py-1 rounded-full text-xs font-bold bg-white/5 text-gray-300 border border-white/10">
                                    PG-13
                                </span>
                                {movieData.release_year && (
                                    <span className="px-3 py-1 rounded-full text-xs font-bold bg-white/5 text-gray-300 border border-white/10">
                                        {movieData.release_year}
                                    </span>
                                )}
                                <span className="px-3 py-1 rounded-full text-xs font-bold bg-cyan-500/10 text-cyan-300 border border-cyan-500/30">
                                    {movieData.format || 'MKV'} • BluRay
                                </span>
                            </div>

                            {/* Main Title & Subtitle */}
                            <div className="space-y-1">
                                <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-black text-white tracking-tight leading-[1.1] drop-shadow-md">
                                    {mainTitle}
                                </h1>
                                {subtitle && (
                                    <p className="text-sm md:text-base text-violet-400/90 font-semibold tracking-wide">
                                        {subtitle}
                                    </p>
                                )}
                            </div>

                            {/* Mobile Hero Card (Poster + Quick Stats in compact view) */}
                            <div className="flex lg:hidden gap-4 p-4 rounded-2xl bg-[#12131F]/90 border border-white/[0.08] backdrop-blur-xl shadow-xl">
                                <div className="relative w-28 sm:w-36 aspect-[2/3] rounded-xl overflow-hidden shrink-0 ring-1 ring-white/10 shadow-lg bg-dark-900">
                                    {movieData.poster_url ? (
                                        <Image
                                            src={movieData.poster_url}
                                            alt={movieData.title}
                                            fill
                                            className="object-cover"
                                        />
                                    ) : (
                                        <div className="w-full h-full bg-dark-800 flex items-center justify-center">
                                            <span className="text-gray-500 text-xs font-bold">No Poster</span>
                                        </div>
                                    )}
                                    <div className="absolute top-2 left-2 pointer-events-none">
                                        <span className="px-1.5 py-0.5 rounded text-[9px] font-black uppercase bg-black/75 backdrop-blur-md text-amber-300 border border-amber-400/30">
                                            ★ {score}
                                        </span>
                                    </div>
                                </div>

                                <div className="flex-1 flex flex-col justify-between py-0.5 text-xs">
                                    <div className="space-y-1.5">
                                        <div className="flex items-center justify-between">
                                            <span className="text-gray-400">Score</span>
                                            <span className="font-extrabold text-amber-400 flex items-center gap-1">
                                                <svg className="w-3.5 h-3.5 fill-amber-400 text-amber-400" viewBox="0 0 24 24">
                                                    <path d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z" />
                                                </svg>
                                                {score}
                                            </span>
                                        </div>
                                        <div className="flex items-center justify-between">
                                            <span className="text-gray-400">Duration</span>
                                            <span className="font-semibold text-gray-200">{durationStr}</span>
                                        </div>
                                        <div className="flex items-center justify-between">
                                            <span className="text-gray-400">Audio</span>
                                            <span className="font-semibold text-emerald-400 truncate max-w-[90px]">{movieData.language || 'Multi'}</span>
                                        </div>
                                    </div>

                                    <div className="pt-2 border-t border-white/[0.06]">
                                        <span className="text-[10px] text-gray-400 block truncate">Studio: <span className="font-semibold text-violet-300">{studioName}</span></span>
                                    </div>
                                </div>
                            </div>

                            {/* Mobile Telegram Button */}
                            <div className="block lg:hidden">
                                <TelegramButton className="w-full shadow-lg shadow-cyan-900/20" />
                            </div>

                            {/* Genre Pills */}
                            <div className="flex flex-wrap gap-2">
                                {genresList.map((genre) => (
                                    <Link
                                        key={genre}
                                        href={`/search?genre=${encodeURIComponent(genre)}`}
                                        className="px-3.5 py-1 rounded-full text-xs font-semibold bg-white/[0.05] hover:bg-violet-600/20 text-gray-300 hover:text-white border border-white/10 hover:border-violet-500/40 transition-all backdrop-blur-md"
                                    >
                                        {genre}
                                    </Link>
                                ))}
                            </div>

                            {/* Action Buttons Row (The Power Row) */}
                            <div className="flex flex-wrap items-center gap-3 pt-2">
                                {(movieData.streaming_url !== 'disabled') && (
                                    <Link
                                        href={`/watch/${type}/${rawSlug}`}
                                        className="px-7 py-3.5 bg-gradient-to-r from-violet-600 via-purple-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white font-extrabold rounded-xl shadow-lg shadow-violet-600/35 hover:shadow-violet-600/60 hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center justify-center gap-2.5 text-sm md:text-base group"
                                    >
                                        <svg className="w-5 h-5 group-hover:scale-110 transition-transform" fill="currentColor" viewBox="0 0 24 24">
                                            <path d="M8 5v14l11-7z" />
                                        </svg>
                                        <span>{isSeriesOrAnime ? 'Watch Ep 1' : 'Watch Online'}</span>
                                    </Link>
                                )}
                                <a
                                    href="#downloads"
                                    className="px-6 py-3.5 bg-white/10 hover:bg-white/15 border border-white/15 text-white font-bold rounded-xl backdrop-blur-md flex items-center justify-center gap-2 transition-all hover:scale-[1.02] active:scale-[0.98] text-sm md:text-base group"
                                >
                                    <svg className="w-5 h-5 group-hover:translate-y-0.5 transition-transform text-cyan-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                                    </svg>
                                    <span>{isSeriesOrAnime ? 'Episodes' : 'Download Links'}</span>
                                </a>
                                <WatchlistButton movieId={movieData.id} />
                                {trailerUrl && (
                                    <a
                                        href={trailerUrl}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="px-5 py-3.5 bg-white/5 hover:bg-white/10 border border-white/10 text-gray-200 hover:text-white font-bold rounded-xl backdrop-blur-md flex items-center justify-center gap-2 transition-all hover:scale-[1.02] text-sm md:text-base group"
                                    >
                                        <svg className="w-5 h-5 text-red-500 group-hover:scale-110 transition-transform" fill="currentColor" viewBox="0 0 24 24">
                                            <path d="M19.615 3.184c-3.604-.246-11.631-.245-15.23 0-3.897.266-4.356 2.62-4.385 8.816.029 6.185.484 8.549 4.385 8.816 3.6.245 11.626.246 15.23 0 3.897-.266 4.356-2.62 4.385-8.816-.029-6.185-.484-8.549-4.385-8.816zm-10.615 12.816v-8l8 3.993-8 4.007z" />
                                        </svg>
                                        <span>Trailer</span>
                                    </a>
                                )}
                            </div>

                            {/* Synopsis / Description */}
                            <div className="space-y-2">
                                <p className="text-gray-300 text-sm md:text-base leading-relaxed line-clamp-4 md:line-clamp-none">
                                    {descriptionText}
                                </p>
                            </div>

                            {/* High-Tech Media Specifications & Info Grid (REPLACES THE OLD UGLY RED TABLE) */}
                            <div className="rounded-2xl bg-white/[0.03] border border-white/[0.08] p-5 backdrop-blur-md shadow-lg space-y-4">
                                <div className="flex items-center justify-between border-b border-white/[0.06] pb-3">
                                    <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-violet-400">
                                        <span className="w-2 h-2 rounded-full bg-violet-500 animate-pulse"></span>
                                        <span>Media & Audio Specifications</span>
                                    </div>
                                    <span className="text-[11px] font-semibold text-gray-400">
                                        {movieData.source || 'BluRay'} • Softcoded
                                    </span>
                                </div>

                                <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 text-xs">
                                    <div className="space-y-1">
                                        <span className="text-gray-400 flex items-center gap-1.5 font-medium">
                                            <svg className="w-3.5 h-3.5 text-indigo-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                                                <path strokeLinecap="round" strokeLinejoin="round" d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
                                            </svg>
                                            Audio Languages
                                        </span>
                                        <p className="font-semibold text-white truncate" title={movieData.language || 'Hindi, English, Japanese'}>
                                            {movieData.language || 'Hindi Multi Audio'}
                                        </p>
                                    </div>
                                    <div className="space-y-1">
                                        <span className="text-gray-400 flex items-center gap-1.5 font-medium">
                                            <svg className="w-3.5 h-3.5 text-sky-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                                                <path strokeLinecap="round" strokeLinejoin="round" d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
                                            </svg>
                                            Subtitles
                                        </span>
                                        <p className="font-semibold text-white truncate">
                                            {movieData.subtitle || 'English (Soft-Coded)'}
                                        </p>
                                    </div>
                                    <div className="space-y-1">
                                        <span className="text-gray-400 flex items-center gap-1.5 font-medium">
                                            <svg className="w-3.5 h-3.5 text-cyan-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                                                <path strokeLinecap="round" strokeLinejoin="round" d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                                            </svg>
                                            Quality & Codec
                                        </span>
                                        <p className="font-semibold text-white truncate">
                                            {uniqueQualities !== 'N/A' ? uniqueQualities : '720p, 1080p FHD'} • {movieData.format || 'MKV'}
                                        </p>
                                    </div>
                                    <div className="space-y-1">
                                        <span className="text-gray-400 flex items-center gap-1.5 font-medium">
                                            <svg className="w-3.5 h-3.5 text-amber-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                                                <circle cx="12" cy="12" r="9" />
                                                <circle cx="12" cy="12" r="3" />
                                            </svg>
                                            Source Media
                                        </span>
                                        <p className="font-semibold text-white truncate">
                                            {movieData.source || 'BluRay / WEB-DL'}
                                        </p>
                                    </div>
                                    <div className="space-y-1">
                                        <span className="text-gray-400 flex items-center gap-1.5 font-medium">
                                            <svg className="w-3.5 h-3.5 text-purple-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                                                <path strokeLinecap="round" strokeLinejoin="round" d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4m0 5c0 2.21-3.582 4-8 4s-8-1.79-8-4" />
                                            </svg>
                                            File Sizes
                                        </span>
                                        <p className="font-semibold text-white truncate">
                                            {sizes !== 'N/A' ? sizes : '250MB - 1.2GB'}
                                        </p>
                                    </div>
                                    <div className="space-y-1">
                                        {isSeriesOrAnime ? (
                                            <>
                                                <span className="text-gray-400 flex items-center gap-1.5 font-medium">
                                                    <svg className="w-3.5 h-3.5 text-emerald-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                                                        <path strokeLinecap="round" strokeLinejoin="round" d="M8.111 16.404a5.5 5.5 0 017.778 0M12 20h.01m-7.08-7.071c3.904-3.905 10.236-3.905 14.141 0M1.394 9.393c5.857-5.857 15.355-5.857 21.213 0" />
                                                    </svg>
                                                    Series Status
                                                </span>
                                                <p className="font-semibold text-emerald-400 truncate">
                                                    {statusLabel}
                                                </p>
                                            </>
                                        ) : (
                                            <>
                                                <span className="text-gray-400 flex items-center gap-1.5 font-medium">
                                                    <svg className="w-3.5 h-3.5 text-emerald-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                                                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                                                    </svg>
                                                    Runtime & Status
                                                </span>
                                                <p className="font-semibold text-emerald-400 truncate">
                                                    {durationStr} • Full Movie
                                                </p>
                                            </>
                                        )}
                                    </div>
                                </div>

                                {/* Cast Members Chips */}
                                {castList.length > 0 && (
                                    <div className="pt-3 border-t border-white/[0.06]">
                                        <span className="text-[11px] font-bold text-gray-400 uppercase tracking-wider flex items-center gap-1.5 mb-2">
                                            <svg className="w-3.5 h-3.5 text-violet-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                                                <path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                                            </svg>
                                            Starring / Voice Cast
                                        </span>
                                        <div className="flex flex-wrap gap-1.5">
                                            {castList.map((actor, idx) => (
                                                <span key={idx} className="px-2.5 py-1 rounded-lg bg-white/[0.04] text-gray-300 text-xs font-medium border border-white/[0.06] hover:border-violet-500/30 transition-colors">
                                                    {actor}
                                                </span>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* Yomi-Inspired "RELATED" Card */}
                            {franchiseItem && (
                                <div className="pt-2">
                                    <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2.5 flex items-center gap-2">
                                        <span>Related Franchise</span>
                                        <span className="h-px flex-1 bg-white/10"></span>
                                    </h4>
                                    <Link
                                        href={`/${franchiseItem.type}/${franchiseItem.slug}`}
                                        className="inline-flex items-center gap-3.5 p-2.5 pr-5 rounded-2xl bg-[#141625]/90 hover:bg-[#1C1F33] border border-white/10 hover:border-violet-500/40 transition-all group shadow-md"
                                    >
                                        <div className="relative w-12 h-16 rounded-xl overflow-hidden shrink-0 border border-white/10">
                                            <Image
                                                src={franchiseItem.poster_url || '/placeholder.png'}
                                                alt={franchiseItem.title}
                                                fill
                                                className="object-cover group-hover:scale-105 transition-transform"
                                            />
                                        </div>
                                        <div>
                                            <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full bg-violet-500/20 text-violet-300 border border-violet-500/30 tracking-wider">
                                                Prequel / Franchise
                                            </span>
                                            <p className="text-sm font-bold text-white group-hover:text-violet-400 transition-colors line-clamp-1 mt-1 max-w-xs sm:max-w-md">
                                                {franchiseItem.title}
                                            </p>
                                        </div>
                                    </Link>
                                </div>
                            )}

                        </div>
                    </div>
                </div>
            </div>

            {/* Screenshots Section */}
            {movieData.screenshots && movieData.screenshots.length > 0 && (
                <ScreenshotGallery screenshots={movieData.screenshots} />
            )}

            {/* Downloads / Episodes Section */}
            <div id="downloads" className="container mx-auto px-4 max-w-7xl mt-12 md:mt-16 scroll-mt-24">
                <div className="rounded-3xl bg-[#12131F]/90 border border-white/[0.08] p-6 sm:p-8 backdrop-blur-xl shadow-2xl relative overflow-hidden">
                    {/* Top ambient highlight */}
                    <div className="absolute top-0 left-0 w-full h-[2px] bg-gradient-to-r from-transparent via-violet-500 to-transparent opacity-70"></div>

                    <div>
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 pb-4 border-b border-white/[0.08]">
                            <h2 className="text-2xl md:text-3xl font-black text-white flex items-center gap-3">
                                <span className="w-1.5 h-8 bg-gradient-to-b from-violet-500 to-indigo-600 rounded-full"></span>
                                {isSeriesOrAnime ? 'Episodes' : 'Download Links'}
                            </h2>
                            <div className="flex items-center gap-2 text-xs font-semibold text-gray-400">
                                <span>Cloud Mirrors</span>
                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping"></span>
                            </div>
                        </div>

                        {/* Per-Content Notice System (Strict) */}
                        {movieData.notice_enabled && movieData.notice_text && (
                            <div className="mb-8 p-6 rounded-2xl bg-gradient-to-r from-violet-600/20 to-purple-600/20 border border-violet-500/40 flex items-start gap-5 shadow-lg shadow-violet-900/10">
                                <span className="text-3xl animate-pulse">📢</span>
                                <div>
                                    <h4 className="font-black text-violet-400 text-base uppercase tracking-widest mb-2 flex items-center gap-2">
                                        IMPORTANT NOTICE
                                        <span className="h-px flex-1 bg-violet-500/20"></span>
                                    </h4>
                                    <p className="text-white text-lg md:text-xl font-bold leading-relaxed drop-shadow-sm">
                                        {movieData.notice_text}
                                    </p>
                                </div>
                            </div>
                        )}

                        {isSeriesOrAnime ? (
                            <EpisodeList
                                seasons={seasons}
                                running_status={movieData.running_status}
                                contentId={movieData.id}
                                contentType={movieData.type}
                                contentTitle={movieData.title}
                                tmdbId={movieData.tmdb_id}
                                imdbId={movieData.imdb_id}
                                initialSeason={initialSeasonNum}
                            />
                        ) : (
                            <DownloadPanel
                                downloadLinks={movieData.download_links || []}
                                contentId={movieData.id}
                                contentType={movieData.type}
                                tmdbId={movieData.tmdb_id}
                                imdbId={movieData.imdb_id}
                                title={movieData.title}
                            />
                        )}
                    </div>
                </div>
                <NativeAd placement="download_bottom" className="mt-8" />
            </div>

            {/* Related Posts */}
            <div className="container mx-auto px-4 max-w-6xl mt-12 md:mt-20">
                <RelatedPosts currentMovieId={movieData.id} type={movieData.type} />
            </div>

            {/* Comment Section */}
            <CommentSection movieId={movieData.id} />

            {/* Structured Data (JSON-LD) for SEO */}
            <script
                type="application/ld+json"
                dangerouslySetInnerHTML={{
                    __html: JSON.stringify({
                        '@context': 'https://schema.org',
                        '@graph': [
                            {
                                '@type': 'BreadcrumbList',
                                'itemListElement': [
                                    {
                                        '@type': 'ListItem',
                                        'position': 1,
                                        'name': 'Home',
                                        'item': process.env.NEXT_PUBLIC_SITE_URL || 'https://nexiplay.vercel.app'
                                    },
                                    {
                                        '@type': 'ListItem',
                                        'position': 2,
                                        'name': type,
                                        'item': `${process.env.NEXT_PUBLIC_SITE_URL || 'https://nexiplay.vercel.app'}/${type}`
                                    },
                                    {
                                        '@type': 'ListItem',
                                        'position': 3,
                                        'name': movieData.title,
                                        'item': `${process.env.NEXT_PUBLIC_SITE_URL || 'https://nexiplay.vercel.app'}/${type}/${rawSlug}`
                                    }
                                ]
                            },
                            {
                                '@type': isSeriesOrAnime ? 'TVSeries' : 'Movie',
                                'name': movieData.title,
                                'description': movieData.description,
                                'image': movieData.poster_url,
                                'datePublished': movieData.release_year ? `${movieData.release_year}-01-01` : undefined,
                                'dateModified': movieData.updated_at,
                                'actor': movieData.cast_members ? movieData.cast_members.split(',').map((actor: string) => ({
                                    '@type': 'Person',
                                    'name': actor.trim()
                                })) : undefined,
                                'genre': categories,
                                'url': `${process.env.NEXT_PUBLIC_SITE_URL || 'https://nexiplay.vercel.app'}/${type}/${rawSlug}`,
                                'aggregateRating': {
                                    '@type': 'AggregateRating',
                                    'ratingValue': '4.8',
                                    'bestRating': '5',
                                    'ratingCount': '120'
                                },
                                'potentialAction': movieData.trailer_url ? {
                                    '@type': 'WatchAction',
                                    'target': movieData.trailer_url
                                } : undefined,
                                'offers': {
                                    '@type': 'Offer',
                                    'availability': 'https://schema.org/InStock',
                                    'price': '0',
                                    'priceCurrency': 'USD'
                                },
                                // Add Season/Episode info if available
                                ...(isSeriesOrAnime && seasons.length > 0 ? {
                                    'numberOfSeasons': seasons.length,
                                    'containsSeason': seasons.map(s => ({
                                        '@type': 'TVSeason',
                                        'seasonNumber': s.season_number,
                                        'name': s.season_title || `Season ${s.season_number}`,
                                        'numberOfEpisodes': s.episodes?.length || 0
                                    }))
                                } : {})
                            }
                        ]
                    })
                }}
            />
        </div>
    );

    // If adult content, wrap with client-side age gate guard for direct URL access
    if (isAdultContent) {
        return <AdultGateGuard>{pageContent}</AdultGateGuard>;
    }

    return pageContent;
}
