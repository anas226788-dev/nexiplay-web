import { Metadata } from 'next';
import MovieGrid from '@/components/MovieGrid';
import Pagination from '@/components/Pagination';
import { buildPageMetadata } from '@/lib/metadata';
import { supabase } from '@/lib/supabase';
import { Movie } from '@/lib/types';

const ITEMS_PER_PAGE = 24;

export const metadata: Metadata = buildPageMetadata({
    title: 'Series',
    description: 'Browse and download the latest TV series in HD quality. Free series downloads available.',
    path: '/series',
});

export const revalidate = 720;

interface SeriesPageProps {
    searchParams: Promise<{ page?: string }>;
}

async function getSeries(page: number): Promise<{ series: Movie[]; totalCount: number }> {
    const from = (page - 1) * ITEMS_PER_PAGE;
    const to = from + ITEMS_PER_PAGE - 1;

    // Get total count
    const { count } = await supabase
        .from('movies')
        .select('id', { count: 'exact', head: true })
        .eq('type', 'series');

    // Get paginated data
    const { data, error } = await supabase
        .from('movies')
        .select('id, title, slug, type, poster_url, description, release_year, created_at, trending_badge, is_adult')
        .eq('type', 'series')
        .order('created_at', { ascending: false })
        .range(from, to);

    if (error) {
        console.error('Error fetching series:', error);
        return { series: [], totalCount: 0 };
    }

    return { series: data || [], totalCount: count || 0 };
}

export default async function SeriesPage({ searchParams }: SeriesPageProps) {
    const { page: pageParam } = await searchParams;
    const currentPage = Math.max(1, parseInt(pageParam || '1', 10) || 1);
    const { series, totalCount } = await getSeries(currentPage);
    const totalPages = Math.ceil(totalCount / ITEMS_PER_PAGE);

    return (
        <div className="container mx-auto px-4 py-8">
            <div className="mb-8">
                <h1 className="text-3xl md:text-4xl font-bold mb-2">Series</h1>
                <p className="text-gray-400">
                    Browse our collection of {totalCount} TV series available for download
                </p>
            </div>

            {series.length > 0 ? (
                <>
                    <MovieGrid movies={series} />
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
                        <path d="M21 3H3c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h5v2h8v-2h5c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm0 14H3V5h18v12z" />
                    </svg>
                    <h2 className="text-2xl font-bold text-gray-300 mb-2">No Series Found</h2>
                    <p className="text-gray-500">Series will appear here once added to the database.</p>
                </div>
            )}
        </div>
    );
}
