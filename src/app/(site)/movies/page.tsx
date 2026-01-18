import { Metadata } from 'next';
import { supabase } from '@/lib/supabase';
import { Movie } from '@/lib/types';
import MovieGrid from '@/components/MovieGrid';

export const metadata: Metadata = {
    title: 'Movies - Nexiplay',
    description: 'Browse and download the latest movies in HD quality. Free movie downloads available.',
};

async function getMovies(): Promise<Movie[]> {
    const { data, error } = await supabase
        .from('movies')
        .select('*')
        .eq('type', 'movie')
        .order('created_at', { ascending: false });

    if (error) {
        console.error('Error fetching movies:', error);
        return [];
    }

    return data || [];
}

export default async function MoviesPage() {
    const movies = await getMovies();

    return (
        <div className="container mx-auto px-4 py-8">
            {/* Page Header */}
            <div className="mb-8">
                <h1 className="text-3xl md:text-4xl font-bold mb-2">Movies</h1>
                <p className="text-gray-400">
                    Browse our collection of {movies.length} movies available for download
                </p>
            </div>

            {/* Movies Grid */}
            {movies.length > 0 ? (
                <MovieGrid movies={movies} />
            ) : (
                <div className="text-center py-20">
                    <svg className="w-20 h-20 mx-auto text-gray-600 mb-6" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M18 4l2 4h-3l-2-4h-2l2 4h-3l-2-4H8l2 4H7L5 4H4c-1.1 0-1.99.9-1.99 2L2 18c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V4h-4z" />
                    </svg>
                    <h2 className="text-2xl font-bold text-gray-300 mb-2">No Movies Found</h2>
                    <p className="text-gray-500">
                        Movies will appear here once added to the database.
                    </p>
                </div>
            )}
        </div>
    );
}
