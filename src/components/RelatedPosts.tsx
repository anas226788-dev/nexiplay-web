'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { Movie } from '@/lib/types';
import MovieGrid from './MovieGrid';

interface RelatedPostsProps {
    currentMovieId: string;
    type: 'movie' | 'series' | 'anime';
    categoryIds?: string[]; // Optional: if we want to match by category later
}

export default function RelatedPosts({ currentMovieId, type }: RelatedPostsProps) {
    const [movies, setMovies] = useState<Movie[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        async function fetchRelated() {
            // Simple logic: Fetch same type, exclude current
            // Limit 10 to allow for some scrolling
            const { data } = await supabase
                .from('movies')
                .select('*')
                .eq('type', type)
                .neq('id', currentMovieId)
                .limit(10);

            if (data) {
                setMovies(data);
            }
            setLoading(false);
        }

        fetchRelated();
    }, [currentMovieId, type]);

    if (loading) {
        // Show skeleton
        return (
            <div className="py-8">
                <div className="flex items-center gap-3 mb-6 px-4 md:px-0">
                    <span className="w-1 h-8 bg-red-600 rounded-full"></span>
                    <h2 className="section-title">You May Also Like</h2>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4 md:gap-6 px-4 md:px-0">
                    {Array.from({ length: 6 }).map((_, i) => (
                        <div key={i} className="aspect-[2/3] bg-dark-700 rounded-xl animate-pulse" />
                    ))}
                </div>
            </div>
        );
    }

    if (movies.length === 0) return null;

    return (
        <MovieGrid
            movies={movies}
            title="You May Also Like"
            scrollable={true} // Enable swipe on mobile
        />
    );
}
