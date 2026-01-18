import { Metadata } from 'next';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import { Movie } from '@/lib/types';
import SearchBar from '@/components/SearchBar';

interface SearchPageProps {
    searchParams: Promise<{ q?: string }>;
}

async function searchMovies(query: string): Promise<Movie[]> {
    if (!query || query.length < 2) return [];

    const { data, error } = await supabase
        .from('movies')
        .select('*')
        .ilike('title', `%${query}%`)
        .order('created_at', { ascending: false })
        .limit(50);

    if (error) {
        console.error('Search error:', error);
        return [];
    }

    return data || [];
}

export async function generateMetadata({ searchParams }: SearchPageProps): Promise<Metadata> {
    const { q } = await searchParams;
    return {
        title: q ? `Search: ${q} - Nexiplay` : 'Search - Nexiplay',
        description: `Search results for "${q}" on Nexiplay`,
    };
}

export default async function SearchPage({ searchParams }: SearchPageProps) {
    const { q: query } = await searchParams;
    const results = query ? await searchMovies(query) : [];

    return (
        <div className="container mx-auto px-4 py-8">
            {/* Search Bar */}
            <div className="max-w-2xl mx-auto mb-8">
                <SearchBar />
            </div>

            {/* Results */}
            {query ? (
                <>
                    <h1 className="text-2xl font-bold mb-6">
                        Search results for &quot;{query}&quot;
                        <span className="text-gray-500 font-normal text-lg ml-2">
                            ({results.length} found)
                        </span>
                    </h1>

                    {results.length > 0 ? (
                        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3 md:gap-4">
                            {results.map((movie, index) => (
                                <Link
                                    key={movie.id}
                                    href={`/${movie.type}/${movie.slug}`}
                                    className="movie-card group animate-fade-in"
                                    style={{ animationDelay: `${index * 30}ms` }}
                                >
                                    <div className="relative aspect-[2/3] rounded-lg overflow-hidden bg-dark-700">
                                        {movie.poster_url ? (
                                            <img
                                                src={movie.poster_url}
                                                alt={movie.title}
                                                className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                                                loading="lazy"
                                            />
                                        ) : (
                                            <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-dark-600 to-dark-800">
                                                <svg className="w-12 h-12 text-gray-600" fill="currentColor" viewBox="0 0 24 24">
                                                    <path d="M18 4l2 4h-3l-2-4h-2l2 4h-3l-2-4H8l2 4H7L5 4H4c-1.1 0-1.99.9-1.99 2L2 18c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V4h-4z" />
                                                </svg>
                                            </div>
                                        )}

                                        {/* Type Badge */}
                                        <div className="absolute top-2 left-2">
                                            <span className="px-2 py-0.5 text-[10px] font-bold rounded bg-black/60 backdrop-blur-sm uppercase">
                                                {movie.type}
                                            </span>
                                        </div>

                                        <div className="absolute top-2 right-2">
                                            <span className="px-1.5 py-0.5 text-[10px] font-bold rounded bg-red-600 text-white">
                                                HD
                                            </span>
                                        </div>
                                    </div>

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
                    ) : (
                        <div className="text-center py-20">
                            <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-dark-700 flex items-center justify-center">
                                <svg className="w-10 h-10 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                                </svg>
                            </div>
                            <h2 className="text-xl font-bold text-gray-300 mb-2">No results found</h2>
                            <p className="text-gray-500 mb-6">
                                Try searching with different keywords
                            </p>
                            <Link href="/" className="btn-secondary">
                                Back to Home
                            </Link>
                        </div>
                    )}
                </>
            ) : (
                <div className="text-center py-20">
                    <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-dark-700 flex items-center justify-center">
                        <svg className="w-10 h-10 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                        </svg>
                    </div>
                    <h2 className="text-xl font-bold text-gray-300 mb-2">Search for content</h2>
                    <p className="text-gray-500">
                        Enter a movie, series, or anime title to search
                    </p>
                </div>
            )}
        </div>
    );
}
