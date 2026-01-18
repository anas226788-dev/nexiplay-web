import { Metadata } from 'next';
import { supabase } from '@/lib/supabase';
import { Movie } from '@/lib/types';
import MovieGrid from '@/components/MovieGrid';

export const metadata: Metadata = {
    title: 'Anime - Nexiplay',
    description: 'Browse and download the latest anime in HD quality. Free anime downloads available.',
};

async function getAnime(): Promise<Movie[]> {
    const { data, error } = await supabase
        .from('movies')
        .select('*')
        .eq('type', 'anime')
        .order('created_at', { ascending: false });

    if (error) {
        console.error('Error fetching anime:', error);
        return [];
    }

    return data || [];
}

export default async function AnimePage() {
    const anime = await getAnime();

    return (
        <div className="container mx-auto px-4 py-8">
            {/* Page Header */}
            <div className="mb-8">
                <h1 className="text-3xl md:text-4xl font-bold mb-2">Anime</h1>
                <p className="text-gray-400">
                    Browse our collection of {anime.length} anime available for download
                </p>
            </div>

            {/* Anime Grid */}
            {anime.length > 0 ? (
                <MovieGrid movies={anime} />
            ) : (
                <div className="text-center py-20">
                    <svg className="w-20 h-20 mx-auto text-gray-600 mb-6" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z" />
                    </svg>
                    <h2 className="text-2xl font-bold text-gray-300 mb-2">No Anime Found</h2>
                    <p className="text-gray-500">
                        Anime will appear here once added to the database.
                    </p>
                </div>
            )}
        </div>
    );
}
