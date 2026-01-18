import { Metadata } from 'next';
import { supabase } from '@/lib/supabase';
import { Movie } from '@/lib/types';
import MovieGrid from '@/components/MovieGrid';

export const metadata: Metadata = {
    title: 'Series - Nexiplay',
    description: 'Browse and download the latest TV series in HD quality. Free series downloads available.',
};

async function getSeries(): Promise<Movie[]> {
    const { data, error } = await supabase
        .from('movies')
        .select('*')
        .eq('type', 'series')
        .order('created_at', { ascending: false });

    if (error) {
        console.error('Error fetching series:', error);
        return [];
    }

    return data || [];
}

export default async function SeriesPage() {
    const series = await getSeries();

    return (
        <div className="container mx-auto px-4 py-8">
            {/* Page Header */}
            <div className="mb-8">
                <h1 className="text-3xl md:text-4xl font-bold mb-2">Series</h1>
                <p className="text-gray-400">
                    Browse our collection of {series.length} TV series available for download
                </p>
            </div>

            {/* Series Grid */}
            {series.length > 0 ? (
                <MovieGrid movies={series} />
            ) : (
                <div className="text-center py-20">
                    <svg className="w-20 h-20 mx-auto text-gray-600 mb-6" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M21 3H3c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h5v2h8v-2h5c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm0 14H3V5h18v12z" />
                    </svg>
                    <h2 className="text-2xl font-bold text-gray-300 mb-2">No Series Found</h2>
                    <p className="text-gray-500">
                        Series will appear here once added to the database.
                    </p>
                </div>
            )}
        </div>
    );
}
