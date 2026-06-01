import { Metadata } from 'next';
import MovieGrid from '@/components/MovieGrid';
import Pagination from '@/components/Pagination';
import { buildPageMetadata } from '@/lib/metadata';
import { supabase } from '@/lib/supabase';
import { Movie } from '@/lib/types';

const ITEMS_PER_PAGE = 24;

export const metadata: Metadata = buildPageMetadata({
    title: 'Movies',
    description: 'Browse and download the latest movies in HD quality. Free movie downloads available.',
    path: '/movies',
});

export const revalidate = 720;

interface MoviesPageProps {
    searchParams: Promise<{ page?: string }>;
}

async function getMovies(page: number): Promise<{ movies: Movie[]; totalCount: number }> {
    const from = (page - 1) * ITEMS_PER_PAGE;
    const to = from + ITEMS_PER_PAGE - 1;

    // Get total count
    const { count } = await supabase
        .from('movies')
        .select('id', { count: 'exact', head: true })
        .eq('type', 'movie');

    // Get paginated data
    const { data, error } = await supabase
        .from('movies')
        .select('id, title, slug, type, poster_url, description, release_year, created_at, trending_badge, is_adult')
        .eq('type', 'movie')
        .order('created_at', { ascending: false })
        .range(from, to);

    if (error) {
        console.error('Error fetching movies:', error);
        return { movies: [], totalCount: 0 };
    }

    return { movies: data || [], totalCount: count || 0 };
}

export default async function MoviesPage({ searchParams }: MoviesPageProps) {
    const { page: pageParam } = await searchParams;
    const currentPage = Math.max(1, parseInt(pageParam || '1', 10) || 1);
    const { movies, totalCount } = await getMovies(currentPage);
    const totalPages = Math.ceil(totalCount / ITEMS_PER_PAGE);

    return (
        <div className="container mx-auto px-4 py-8">
            <div className="mb-8">
                <h1 className="text-3xl md:text-4xl font-bold mb-2">Movies</h1>
                <p className="text-gray-400">
                    Browse our collection of {totalCount} movies available for download
                </p>
            </div>

            {movies.length > 0 ? (
                <>
                    <MovieGrid movies={movies} />
                    <Pagination
                        currentPage={currentPage}
                        totalPages={totalPages}
                        totalItems={totalCount}
                        itemsPerPage={ITEMS_PER_PAGE}
                    />
                </>
            ) : (
                <div className="text-center py-20">
                    <svg className="w-20 h-20 mx-auto text-gray-600 mb-6" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M18 4l2 4h-3l-2-4h-2l2 4h-3l-2-4H8l2 4H7L5 4H4c-1.1 0-1.99.9-1.99 2L2 18c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V4h-4z" />
                    </svg>
                    <h2 className="text-2xl font-bold text-gray-300 mb-2">No Movies Found</h2>
                    <p className="text-gray-500">Movies will appear here once added to the database.</p>
                </div>
            )}
        </div>
    );
}
