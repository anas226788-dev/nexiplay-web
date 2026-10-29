'use client';

import { useState, useEffect } from 'react';
import { Movie } from '@/lib/types';
import MovieCard from './MovieCard';
import { shuffleArray } from '@/lib/contentMixer';

interface LatestGridProps {
    movies: Movie[];
    title?: string;
    isPageOne?: boolean;
}

export default function LatestGrid({
    movies: initialMovies,
    title = 'Latest Additions',
    isPageOne = true
}: LatestGridProps) {
    const [movies, setMovies] = useState<Movie[]>(initialMovies);
    const [isShuffled, setIsShuffled] = useState(false);
    const [isAnimating, setIsAnimating] = useState(false);

    // Synchronize if initialMovies change (e.g. pagination or server refresh)
    useEffect(() => {
        setMovies(initialMovies);
        setIsShuffled(false);
    }, [initialMovies]);

    const handleShuffle = () => {
        setIsAnimating(true);
        setTimeout(() => {
            const shuffled = shuffleArray(movies);
            setMovies(shuffled);
            setIsShuffled(true);
            setIsAnimating(false);
        }, 180);
    };

    const handleReset = () => {
        setIsAnimating(true);
        setTimeout(() => {
            setMovies(initialMovies);
            setIsShuffled(false);
            setIsAnimating(false);
        }, 150);
    };

    return (
        <section className="mb-12">
            {/* Header with Title & Shuffle Button */}
            <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
                <div className="flex items-center gap-3">
                    <h2 className="section-title mb-0">{title}</h2>
                    {isShuffled && (
                        <span className="text-[10px] md:text-xs font-bold px-2.5 py-0.5 rounded-full bg-violet-500/20 text-violet-300 border border-violet-500/30 animate-pulse">
                            🎲 Shuffled
                        </span>
                    )}
                </div>

                {isPageOne && movies.length > 1 && (
                    <div className="flex items-center gap-2">
                        <button
                            type="button"
                            onClick={handleShuffle}
                            disabled={isAnimating}
                            title="Shuffle / নতুন ভাবে এলোমেলো করুন"
                            aria-label="Shuffle movies grid"
                            className="group relative flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-white/10 bg-[#16141F] text-xs font-semibold text-gray-200 transition-all duration-200 hover:border-violet-500/50 hover:bg-violet-950/40 hover:text-white active:scale-95 shadow-sm"
                        >
                            <svg
                                className={`w-3.5 h-3.5 text-violet-400 transition-transform duration-500 ${isAnimating ? 'rotate-180 scale-125' : 'group-hover:rotate-45'}`}
                                viewBox="0 0 24 24"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth="2.2"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                            >
                                <polyline points="16 3 21 3 21 8" />
                                <line x1="4" y1="20" x2="21" y2="3" />
                                <polyline points="21 16 21 21 16 21" />
                                <line x1="15" y1="15" x2="21" y2="21" />
                                <line x1="4" y1="4" x2="9" y2="9" />
                            </svg>
                            <span>Shuffle</span>
                        </button>

                        {isShuffled && (
                            <button
                                type="button"
                                onClick={handleReset}
                                title="Reset to default order / সবার নতুন আগে"
                                aria-label="Reset to latest additions order"
                                className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl border border-white/10 bg-white/[0.04] text-xs text-gray-400 hover:text-white hover:bg-white/[0.08] transition-all active:scale-95"
                            >
                                <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                                </svg>
                                <span>Latest</span>
                            </button>
                        )}
                    </div>
                )}
            </div>

            {/* Movies Grid */}
            <div
                className={`grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3 md:gap-4 transition-all duration-200 ${
                    isAnimating ? 'opacity-30 scale-[0.99] blur-[0.5px]' : 'opacity-100 scale-100'
                }`}
            >
                {movies.map((movie) => (
                    <MovieCard key={movie.id} movie={movie} />
                ))}
            </div>
        </section>
    );
}
