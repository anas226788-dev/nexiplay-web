import Link from 'next/link';
import Image from 'next/image';
import AdSpot from '@/components/AdSpot';
import { supabase } from '@/lib/supabase';
import { Movie, Category } from '@/lib/types';
import MovieGrid from '@/components/MovieGrid';
import SearchBar from '@/components/SearchBar';
import CategoryMenu, { TypeTabs } from '@/components/CategoryMenu';

async function getHomeContent(): Promise<{
    latestMovies: Movie[];
    latestSeries: Movie[];
    latestAnime: Movie[];
    categories: Category[];
}> {
    const [moviesRes, seriesRes, animeRes, categoriesRes] = await Promise.all([
        supabase
            .from('movies')
            .select('*')
            .eq('type', 'movie')
            .order('created_at', { ascending: false })
            .limit(12),
        supabase
            .from('movies')
            .select('*')
            .eq('type', 'series')
            .order('created_at', { ascending: false })
            .limit(12),
        supabase
            .from('movies')
            .select('*')
            .eq('type', 'anime')
            .order('created_at', { ascending: false })
            .limit(12),
        supabase
            .from('categories')
            .select('*')
            .order('name', { ascending: true }),
    ]);

    return {
        latestMovies: moviesRes.data || [],
        latestSeries: seriesRes.data || [],
        latestAnime: animeRes.data || [],
        categories: categoriesRes.data || [],
    };
}

export default async function HomePage() {
    const { latestMovies, latestSeries, latestAnime, categories } = await getHomeContent();
    const allLatest = [...latestMovies, ...latestSeries, ...latestAnime]
        .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
        .slice(0, 18);

    return (
        <div className="min-h-screen">
            {/* Hero Section - Compact */}
            <section className="relative py-8 md:py-12">
                <div className="absolute inset-0 bg-gradient-to-b from-red-900/10 via-transparent to-transparent" />

                <div className="container mx-auto px-4 relative">
                    {/* Logo & Tagline */}
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
            </section>

            {/* Content */}
            <div className="container mx-auto px-4 pb-12">
                <AdSpot placement="home_top" />
                {/* Latest Additions - Combined Grid */}
                {allLatest.length > 0 && (
                    <section className="mb-12">
                        <div className="flex items-center justify-between mb-6">
                            <h2 className="section-title">Latest Additions</h2>
                        </div>
                        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3 md:gap-4">
                            {allLatest.map((movie, index) => (
                                <Link
                                    key={movie.id}
                                    href={`/${movie.type}/${movie.slug}`}
                                    className="movie-card group animate-fade-in"
                                    style={{ animationDelay: `${index * 30}ms` }}
                                >
                                    <div className="relative aspect-[2/3] rounded-lg overflow-hidden bg-dark-700">
                                        {/* Poster */}
                                        {movie.poster_url ? (
                                            <Image
                                                src={movie.poster_url}
                                                alt={movie.title}
                                                fill
                                                sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 16vw"
                                                className="object-cover transition-transform duration-500 group-hover:scale-110"
                                                priority={index < 6}
                                            />
                                        ) : (
                                            <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-dark-600 to-dark-800">
                                                <svg className="w-12 h-12 text-gray-600" fill="currentColor" viewBox="0 0 24 24">
                                                    <path d="M18 4l2 4h-3l-2-4h-2l2 4h-3l-2-4H8l2 4H7L5 4H4c-1.1 0-1.99.9-1.99 2L2 18c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V4h-4z" />
                                                </svg>
                                            </div>
                                        )}

                                        {/* Overlay on hover */}
                                        <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                                            <div className="absolute bottom-0 left-0 right-0 p-3">
                                                <div className="flex items-center justify-center gap-2 text-xs font-medium">
                                                    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                                                        <path d="M8 5v14l11-7z" />
                                                    </svg>
                                                    View Details
                                                </div>
                                            </div>
                                        </div>

                                        {/* Type Badge */}
                                        <div className="absolute top-2 left-2">
                                            <span className="px-2 py-0.5 text-[10px] font-bold rounded bg-black/60 backdrop-blur-sm uppercase">
                                                {movie.type}
                                            </span>
                                        </div>

                                        {/* HD Badge */}
                                        <div className="absolute top-2 right-2">
                                            <span className="px-1.5 py-0.5 text-[10px] font-bold rounded bg-red-600 text-white">
                                                HD
                                            </span>
                                        </div>
                                    </div>

                                    {/* Title */}
                                    <div className="mt-2 px-0.5">
                                        <h3 className="font-medium text-sm text-gray-200 line-clamp-2 group-hover:text-red-400 transition-colors leading-tight">
                                            {movie.title}
                                        </h3>
                                        {movie.release_year && (
                                            <p className="text-[11px] text-gray-500 mt-0.5">{movie.release_year}</p>
                                        )}
                                    </div>
                                </Link>
                            ))}
                        </div>
                    </section>
                )}

                {/* Movies Section */}
                {latestMovies.length > 0 && (
                    <MovieGrid
                        movies={latestMovies.slice(0, 6)}
                        title="Latest Movies"
                        showViewAll
                        viewAllHref="/movies"
                        scrollable={true}
                    />
                )}

                {/* Series Section */}
                {latestSeries.length > 0 && (
                    <MovieGrid
                        movies={latestSeries.slice(0, 6)}
                        title="Latest Series"
                        showViewAll
                        viewAllHref="/series"
                        scrollable={true}
                    />
                )}

                {/* Anime Section */}
                {latestAnime.length > 0 && (
                    <MovieGrid
                        movies={latestAnime.slice(0, 6)}
                        title="Latest Anime"
                        showViewAll
                        viewAllHref="/anime"
                        scrollable={true}
                    />
                )}

                <AdSpot placement="home_bottom" />

                {/* Empty State */}
                {allLatest.length === 0 && (
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
