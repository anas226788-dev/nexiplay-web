import { notFound } from 'next/navigation';
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
import StreamingPlayer from '@/components/StreamingPlayer';

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

    if (error) {
        console.error('Movie fetch error:', JSON.stringify(error, null, 2));
    }

    if (!movie) {
        notFound();
    }

    const movieData = movie as any; // Cast to any to handle joined relations easily
    const categories = movieData.movie_categories?.map((mc: any) => mc.categories?.name).join(', ') || 'N/A';
    const uniqueQualities = Array.from(new Set(movieData.downloads?.map((d: any) => d.quality))).join(', ') || 'N/A';
    const sizes = Array.from(new Set(movieData.downloads?.map((d: any) => d.file_size))).filter(Boolean).join(', ') || 'N/A';
    const isSeriesOrAnime = movieData.type === 'series' || movieData.type === 'anime';

    // Fetch seasons for series/anime
    let seasons: Season[] = [];
    if (isSeriesOrAnime) {
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
    }

    const isAdultContent = !!movieData.is_adult;

    const pageContent = (
        <div className="min-h-screen pb-20">
            <ActiveMovieSetter movieId={movieData.id} allowGlobalNotices={!!movieData.allow_global_notices} />
            {/* Backdrop / Header Section */}
            <div className="relative w-full">
                {/* Background Image with Blur */}
                <div className="absolute inset-0 h-[70vh] w-full overflow-hidden" suppressHydrationWarning>
                    {movieData.poster_url && (
                        <Image
                            src={movieData.poster_url}
                            alt={movieData.title}
                            fill
                            className="object-cover opacity-30 blur-md mask-image-b"
                            priority
                        />
                    )}
                    <div className="absolute inset-0 bg-gradient-to-t from-[#050505] to-transparent/50" />
                    <div className="absolute inset-0 bg-gradient-to-b from-black/60 to-transparent" />
                </div>

                {/* Content Container */}
                <div className="relative z-10 container mx-auto px-4 max-w-6xl pt-32 pb-12">
                    <div className="grid grid-cols-1 md:grid-cols-[300px_1fr] gap-8 md:gap-12 items-start">

                        {/* LEFT COLUMN: Poster & Ad */}
                        <div className="space-y-6">
                            {/* Poster Card */}
                            <div className="hidden md:block relative aspect-[2/3] rounded-2xl overflow-hidden shadow-2xl shadow-red-900/20 ring-1 ring-white/10 movie-card-3d transform hover:scale-105 transition-transform duration-500" suppressHydrationWarning>
                                {movieData.poster_url ? (
                                    <Image
                                        src={movieData.poster_url}
                                        alt={movieData.title}
                                        fill
                                        className="object-cover"
                                        priority
                                    />
                                ) : (
                                    <div className="w-full h-full bg-dark-800 flex items-center justify-center">
                                        <span className="text-gray-600 font-bold">No Poster</span>
                                    </div>
                                )}
                            </div>

                            {/* Sidebar Ad & Telegram (Desktop) */}
                            <div className="hidden md:flex flex-col gap-6 sticky top-32">
                                <TelegramButton className="w-full shadow-lg shadow-cyan-900/20" />
                                <AdBanner placement="movie_sidebar" size="300x250" />
                            </div>
                        </div>

                        {/* RIGHT COLUMN: Text Content */}
                        <div className="space-y-6">
                            {/* Breadcrumb */}
                            <nav className="flex items-center text-sm text-gray-400 mb-2 overflow-x-auto whitespace-nowrap">
                                <Link href="/" className="hover:text-red-500 transition-colors">Home</Link>
                                <span className="mx-2">›</span>
                                <Link href={`/${movieData.type}`} className="hover:text-red-500 transition-colors capitalize">{movieData.type}</Link>
                                <span className="mx-2">›</span>
                                <span className="text-white truncate max-w-[200px]">{movieData.title}</span>
                            </nav>

                            <div className="space-x-2 flex flex-wrap">
                                <span className="px-3 py-1 bg-red-600 text-white text-xs font-bold rounded uppercase tracking-wider shadow-lg shadow-red-900/40">
                                    {movieData.type}
                                </span>
                                {movieData.release_year && (
                                    <span className="px-3 py-1 bg-white/10 text-gray-200 text-xs font-bold rounded backdrop-blur-md border border-white/10">
                                        {movieData.release_year}
                                    </span>
                                )}
                            </div>

                            <h1 className="text-4xl md:text-6xl font-black text-white leading-tight">
                                {movieData.title}
                            </h1>

                            {/* Auto-Generated Movie Details Block */}
                            <div className="glass p-5 rounded-xl border border-white/5 bg-black/20 backdrop-blur-sm">
                                <h3 className="text-lg font-bold text-red-500 mb-3 border-b border-white/10 pb-2">
                                    Download {movieData.title} ({movieData.release_year}) {movieData.language || 'Hindi'} {movieData.type === 'movie' ? 'Movie' : movieData.type} ~ Nexiplay
                                </h3>
                                <ul className="space-y-2 text-sm text-gray-300">
                                    <li className="flex"><span className="font-bold text-white min-w-[100px]">Full Name:</span> <span>{movieData.title}</span></li>
                                    <li className="flex"><span className="font-bold text-white min-w-[100px]">Language:</span> <span>{movieData.language || 'Hindi'}</span></li>
                                    <li className="flex"><span className="font-bold text-white min-w-[100px]">Year:</span> <span>{movieData.release_year}</span></li>
                                    <li className="flex"><span className="font-bold text-white min-w-[100px]">Size:</span> <span>{sizes}</span></li>
                                    <li className="flex"><span className="font-bold text-white min-w-[100px]">Quality:</span> <span>{uniqueQualities}</span></li>
                                    <li className="flex"><span className="font-bold text-white min-w-[100px]">Format:</span> <span>{movieData.format || 'MKV'}</span></li>
                                    <li className="flex"><span className="font-bold text-white min-w-[100px]">Source:</span> <span>{movieData.source || 'BluRay'}</span></li>
                                    <li className="flex"><span className="font-bold text-white min-w-[100px]">Genres:</span> <span>{categories}</span></li>
                                    <li className="flex"><span className="font-bold text-white min-w-[100px]">Cast:</span> <span>{movieData.cast_members || 'N/A'}</span></li>
                                    <li className="flex"><span className="font-bold text-white min-w-[100px]">Subtitle:</span> <span>{movieData.subtitle || 'English'}</span></li>
                                </ul>
                            </div>

                            <p className="text-gray-300 text-lg leading-relaxed max-w-2xl line-clamp-4 md:line-clamp-none">
                                {movieData.description}
                            </p>

                            {/* Buttons */}
                            {/* Mobile Poster (shown only on small screens) */}
                            <div className="md:hidden relative aspect-video rounded-xl overflow-hidden shadow-lg border border-white/10 mb-6" suppressHydrationWarning>
                                {movieData.poster_url && (
                                    <Image
                                        src={movieData.poster_url}
                                        alt={movieData.title}
                                        fill
                                        className="object-cover"
                                    />
                                )}
                            </div>

                            {/* Mobile Telegram Button */}
                            <div className="md:hidden mb-6">
                                <TelegramButton className="w-full" />
                            </div>

                            <div className="flex flex-col sm:flex-row gap-4 pt-4">
                                {(movieData.tmdb_id || movieData.imdb_id || movieData.mal_id || movieData.streaming_url) && (
                                    <Link
                                        href={`/${type}/${rawSlug}?tab=watch#downloads`}
                                        className="px-8 py-4 bg-red-600 hover:bg-red-700 text-white font-bold rounded-xl transition-all shadow-lg shadow-red-900/30 flex items-center justify-center gap-2 group"
                                    >
                                        <svg className="w-6 h-6 group-hover:scale-110 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                        </svg>
                                        Watch Online
                                    </Link>
                                )}
                                <Link
                                    href={`/${type}/${rawSlug}?tab=download#downloads`}
                                    className="px-8 py-4 bg-white/5 hover:bg-white/10 hover:shadow-lg hover:shadow-white/5 text-white font-bold rounded-xl transition-all border border-white/10 backdrop-blur-md flex items-center justify-center gap-2 group"
                                >
                                    <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                                        <path d="M4 17v2a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-2" />
                                        <polyline points="7 11 12 16 17 11" />
                                        <line x1="12" y1="4" x2="12" y2="16" />
                                    </svg>
                                    Download Links
                                </Link>
                                {movieData.trailer_url && (
                                    <a
                                        href={movieData.trailer_url}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="px-8 py-4 bg-white/5 hover:bg-white/10 hover:shadow-lg hover:shadow-white/5 text-white font-bold rounded-xl transition-all border border-white/10 backdrop-blur-md flex items-center justify-center group"
                                    >
                                        <svg className="w-6 h-6 mr-2 group-hover:scale-110 transition-transform text-red-500" fill="currentColor" viewBox="0 0 24 24">
                                            <path d="M8 5v14l11-7z" />
                                        </svg>
                                        Watch Trailer
                                    </a>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Screenshots Section */}
            {movieData.screenshots && movieData.screenshots.length > 0 && (
                <ScreenshotGallery screenshots={movieData.screenshots} />
            )}

            {/* Downloads / Episodes Section */}
            <div id="downloads" className="container mx-auto px-4 max-w-4xl mt-12 md:mt-20">
                {/* Tabs selection */}
                <div className="flex border-b border-white/10 mb-6 gap-2">
                    <Link
                        href={`/${type}/${rawSlug}?tab=download#downloads`}
                        className={`px-6 py-3 font-bold text-base transition-all border-b-2 ${
                            activeTab === 'download'
                                ? 'border-red-600 text-white'
                                : 'border-transparent text-gray-400 hover:text-white'
                        }`}
                    >
                        📥 Download Links
                    </Link>
                    {(movieData.tmdb_id || movieData.imdb_id || movieData.mal_id || movieData.streaming_url) && (
                        <Link
                            href={`/${type}/${rawSlug}?tab=watch#downloads`}
                            className={`px-6 py-3 font-bold text-base transition-all border-b-2 ${
                                activeTab === 'watch'
                                    ? 'border-red-600 text-white'
                                    : 'border-transparent text-gray-400 hover:text-white'
                            }`}
                        >
                            🎬 Watch Online (Free)
                        </Link>
                    )}
                </div>

                <div className="glass p-6 sm:p-8 rounded-3xl border border-white/5 relative overflow-hidden">
                    {/* Glossy effect */}
                    <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-red-500/50 to-transparent opacity-50"></div>

                    {activeTab === 'watch' ? (
                        <div>
                            <h2 className="text-2xl font-bold text-white mb-6 flex items-center gap-3">
                                <span className="w-1 h-8 bg-red-600 rounded-full"></span>
                                Streaming Player
                            </h2>
                            <StreamingPlayer movie={movieData} seasons={seasons} />
                        </div>
                    ) : (
                        <div>
                            <h2 className="text-2xl font-bold text-white mb-6 flex items-center gap-3">
                                <span className="w-1 h-8 bg-red-600 rounded-full"></span>
                                {isSeriesOrAnime ? 'Episodes' : 'Download Links'}
                            </h2>

                            {/* Per-Content Notice System (Strict) */}
                            {movieData.notice_enabled && movieData.notice_text && (
                                <div className="mb-8 p-6 rounded-2xl bg-gradient-to-r from-red-600/20 to-orange-600/20 border border-red-500/40 flex items-start gap-5 shadow-lg shadow-red-900/10">
                                    <span className="text-3xl animate-pulse">📢</span>
                                    <div>
                                        <h4 className="font-black text-red-500 text-base uppercase tracking-widest mb-2 flex items-center gap-2">
                                            IMPORTANT NOTICE
                                            <span className="h-px flex-1 bg-red-500/20"></span>
                                        </h4>
                                        <p className="text-white text-lg md:text-xl font-bold leading-relaxed drop-shadow-sm">
                                            {movieData.notice_text}
                                        </p>
                                    </div>
                                </div>
                            )}

                            {isSeriesOrAnime ? (
                                <EpisodeList seasons={seasons} running_status={movieData.running_status} />
                            ) : (
                                <DownloadPanel downloadLinks={movieData.download_links || []} />
                            )}
                        </div>
                    )}
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
