import { Movie } from '@/lib/types';
import Link from 'next/link';
import MovieCard, { MovieCardSkeleton } from './MovieCard';

interface MovieGridProps {
    movies: Movie[];
    title?: string;
    showViewAll?: boolean;
    viewAllHref?: string;
}

export default function MovieGrid({
    movies,
    title,
    showViewAll = false,
    viewAllHref = '#',
    scrollable = false // New prop
}: MovieGridProps & { scrollable?: boolean }) {
    return (
        <section className="py-8">
            {title && (
                <div className="flex items-center justify-between mb-6 px-4 md:px-0">
                    <h2 className="section-title">{title}</h2>
                    {showViewAll && (
                        <Link
                            href={viewAllHref}
                            className="text-xs md:text-sm text-gray-400 hover:text-red-500 transition-colors flex items-center gap-1 font-medium"
                        >
                            View All
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                            </svg>
                        </Link>
                    )}
                </div>
            )}

            {/* Scrollable Container logic */}
            <div className={
                scrollable
                    ? "flex overflow-x-auto gap-4 scrollbar-hide snap-x px-4 -mx-4 md:mx-0 md:px-0 md:grid md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 md:overflow-visible"
                    : "grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3 md:gap-6 px-4 md:px-0"
            }>
                {movies.map((movie, index) => (
                    <div
                        key={movie.id}
                        className={scrollable ? "min-w-[160px] md:min-w-0 md:w-auto snap-center" : "w-full"}
                    >
                        <MovieCard movie={movie} />
                    </div>
                ))}
            </div>
        </section>
    );
}

// Skeleton loader for MovieGrid
export function MovieGridSkeleton({ count = 12 }: { count?: number }) {
    return (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4 md:gap-6">
            {Array.from({ length: count }).map((_, index) => (
                <MovieCardSkeleton key={index} />
            ))}
        </div>
    );
}
