import { Metadata } from 'next';
import { supabase } from '@/lib/supabase';
import { Movie } from '@/lib/types';
import SearchBar from '@/components/SearchBar';
import MovieCard from '@/components/MovieCard';
import Link from 'next/link';
import { buildPageMetadata } from '@/lib/metadata';

interface SearchPageProps {
    searchParams: Promise<{ q?: string }>;
}

type SearchResult = Pick<Movie, 'id' | 'title' | 'slug' | 'type' | 'poster_url' | 'release_year' | 'is_adult' | 'created_at'>;

async function searchMovies(query: string): Promise<SearchResult[]> {
    if (!query || query.length < 2) return [];

    const { data, error } = await supabase
        .from('movies')
        .select('id, title, slug, type, poster_url, release_year, is_adult, created_at')
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
    return buildPageMetadata({
        title: q ? `Search: ${q}` : 'Search',
        description: q ? `Search results for "${q}" on Nexiplay.` : 'Search for movies, series, and anime on Nexiplay.',
        path: q ? `/search?q=${encodeURIComponent(q)}` : '/search',
    });
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
                            {results.map((movie) => (
                                <MovieCard key={movie.id} movie={movie as Movie} />
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
