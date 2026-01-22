import { notFound } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';
import AdSpot from '@/components/AdSpot';
import ScreenshotGallery from '@/components/ScreenshotGallery';
import RelatedPosts from '@/components/RelatedPosts';
import CommentSection from '@/components/CommentSection';
import TelegramButton from '@/components/TelegramButton';
import DownloadPanel from '@/components/DownloadPanel';
import EpisodeList from '@/components/EpisodeList';
import { supabase } from '@/lib/supabase';
import { MovieWithDownloads, DownloadLink, Season } from '@/lib/types';
import { Metadata } from 'next';

export const revalidate = 60; // Revalidate every minute

interface PageProps {
    params: Promise<{
        type: string;
        slug: string;
    }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
    const { type, slug } = await params;

    // Clean slug to remove year if present for search (optional, depends on your logic)
    // For now searching exact slug is safer if you store full slug

    const { data: movie } = await supabase
        .from('movies')
        .select('*')
        .eq('slug', slug)
        .eq('type', type === 'movie' ? 'movie' : type === 'series' ? 'series' : 'anime')
        .maybeSingle();

    if (!movie) {
        return {
            title: 'Not Found - Nexiplay',
        };
    }

    const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://nexiplay.com';
    const canonicalUrl = `${baseUrl}/${type}/${slug}`;

    return {
        title: `Download ${movie.title} (${movie.release_year || 'N/A'}) ${movie.language || ''} ${movie.type === 'movie' ? 'Movie' : movie.type} | Nexiplay`,
        description: movie.description || `Download ${movie.title} (${movie.release_year}) full ${movie.type} in 480p, 720p, 1080p. Watch trailer and read full details on Nexiplay.`,
        alternates: {
            canonical: canonicalUrl,
        },
        openGraph: {
            title: `Download ${movie.title} | Nexiplay`,
            description: movie.description || `Download ${movie.title} in HD.`,
            url: canonicalUrl,
            images: movie.poster_url ? [{ url: movie.poster_url, width: 800, height: 1200, alt: movie.title }] : [],
            type: type === 'movie' ? 'video.movie' : 'video.tv_show',
        },
        twitter: {
            card: 'summary_large_image',
            title: `Download ${movie.title}`,
            description: movie.description || `Download now in 480p, 720p, 1080p.`,
            images: movie.poster_url ? [movie.poster_url] : [],
        },
    };
}

export default async function MovieDetailPage({ params }: PageProps) {
    const { type, slug } = await params;

    // Fetch movie with downloads and download_links
    const { data: movie, error } = await supabase
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
        .eq('slug', slug)
        .eq('type', type === 'movie' ? 'movie' : type === 'series' ? 'series' : 'anime')
        .maybeSingle();

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

    return (
        <div className="min-h-screen pb-20">
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
                                <AdSpot placement="movie_sidebar" />
                            </div>
                        </div>

                        {/* RIGHT COLUMN: Text Content */}
                        <div className="space-y-6">
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
                                <a
                                    href="#downloads"
                                    className="px-8 py-4 bg-red-600 hover:bg-red-700 text-white font-bold rounded-xl transition-all shadow-lg shadow-red-900/30 flex items-center justify-center gap-2 group"
                                >
                                    <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                                        <path d="M4 17v2a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-2" />
                                        <polyline points="7 11 12 16 17 11" />
                                        <line x1="12" y1="4" x2="12" y2="16" />
                                    </svg>
                                    Download Now
                                </a>
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
                <div className="glass p-6 sm:p-8 rounded-3xl border border-white/5 relative overflow-hidden">
                    {/* Glossy effect */}
                    <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-red-500/50 to-transparent opacity-50"></div>

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
                <AdSpot placement="download_bottom" className="mt-8" />
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
                        '@type': isSeriesOrAnime ? 'TVSeries' : 'Movie',
                        name: movieData.title,
                        description: movieData.description,
                        image: movieData.poster_url,
                        datePublished: movieData.release_year ? `${movieData.release_year}-01-01` : undefined,
                        actor: movieData.cast_members ? movieData.cast_members.split(',').map((actor: string) => ({
                            '@type': 'Person',
                            name: actor.trim()
                        })) : undefined,
                        genre: categories,
                        url: `${process.env.NEXT_PUBLIC_SITE_URL || 'https://nexiplay.com'}/${type}/${slug}`,
                        aggregateRating: {
                            '@type': 'AggregateRating',
                            ratingValue: '4.8',
                            bestRating: '5',
                            ratingCount: '120'
                        },
                        potentialAction: movieData.trailer_url ? {
                            '@type': 'WatchAction',
                            target: movieData.trailer_url
                        } : undefined,
                        offers: {
                            '@type': 'Offer',
                            availability: 'https://schema.org/InStock',
                            price: '0',
                            priceCurrency: 'USD'
                        }
                    })
                }}
            />
        </div>
    );
}
