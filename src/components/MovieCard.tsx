'use client';

import Image from 'next/image';
import Link from 'next/link';
import { Movie } from '@/lib/types';
import { getContentUrl } from '@/lib/urlUtils';
import { useAdultGate } from './AdultGateProvider';
import { useAuth } from '@/context/AuthContext';

interface MovieCardProps {
    movie: Movie;
}

export default function MovieCard({ movie }: MovieCardProps) {
    const detailUrl = getContentUrl(movie);
    const { checkAdultGate } = useAdultGate();
    const { hideNsfw } = useAuth();

    if (hideNsfw && movie.is_adult) {
        return null;
    }

    const handleClick = (e: React.MouseEvent) => {
        if (movie.is_adult) {
            e.preventDefault();
            checkAdultGate(detailUrl, true);
        }
    };

    return (
        <Link
            href={detailUrl}
            onClick={handleClick}
            className="movie-card block group perspective-1000 active:scale-95 transition-transform duration-100 cursor-pointer"
        >
            <div className="relative aspect-[2/3] rounded-xl overflow-hidden glass-panel movie-card-3d" suppressHydrationWarning>
                {/* Poster Image */}
                {movie.poster_url ? (
                    <Image
                        src={movie.poster_url}
                        alt={movie.title}
                        fill
                        className="object-cover transition-transform duration-500 group-hover:scale-110"
                        sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 20vw"
                        placeholder="blur"
                        blurDataURL="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mmM/w8AAgAB/6zTqgAAAABJRU5ErkJggg=="
                    />
                ) : (
                    <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-dark-600 to-dark-800">
                        <svg className="w-16 h-16 text-gray-600" fill="currentColor" viewBox="0 0 24 24">
                            <path d="M18 4l2 4h-3l-2-4h-2l2 4h-3l-2-4H8l2 4H7L5 4H4c-1.1 0-1.99.9-1.99 2L2 18c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V4h-4z" />
                        </svg>
                    </div>
                )}

                {/* Overlay with Glassmorphism */}
                <div className="absolute inset-0 bg-gradient-to-t from-black via-black/40 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-end">
                    <div className="p-4 w-full transform translate-y-4 group-hover:translate-y-0 transition-transform duration-300">
                        <div className="flex items-center gap-2 mb-2">
                            <span className="px-2 py-0.5 text-xs font-bold rounded bg-red-600 shadow-lg shadow-red-900/50 uppercase tracking-wider text-white">
                                {movie.type}
                            </span>
                            {movie.release_year && (
                                <span className="text-xs text-gray-300 font-medium bg-black/50 px-2 py-0.5 rounded-full backdrop-blur-sm">
                                    {movie.release_year}
                                </span>
                            )}
                        </div>

                        <div className="flex items-center gap-2 text-sm font-bold text-white">
                            <div className="w-8 h-8 rounded-full bg-white text-black flex items-center justify-center">
                                <svg className="w-4 h-4 translate-x-0.5" fill="currentColor" viewBox="0 0 24 24">
                                    <path d="M8 5v14l11-7z" />
                                </svg>
                            </div>
                            <span>Watch Now</span>
                        </div>
                    </div>
                </div>

                {/* 18+ Badge - Top Left */}
                {movie.is_adult && (
                    <div className="absolute top-2 left-2 z-10">
                        <span className="px-2 py-1 text-[10px] font-black rounded bg-gradient-to-r from-red-700 to-red-600 text-white uppercase tracking-wider shadow-lg shadow-red-900/50 border border-red-500/30">
                            🔞 18+
                        </span>
                    </div>
                )}

                {/* Quality Badge - Top Right */}
                <div className="absolute top-2 right-2">
                    <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-black/40 backdrop-blur-md border border-white/20 shadow-lg text-white">
                        HD
                    </span>
                </div>

                {/* NEW / TRENDING Badge */}
                <div className="absolute bottom-2 left-2">
                    {movie.trending_badge ? (
                        <span className="px-2 py-1 text-[10px] font-black rounded bg-gradient-to-r from-orange-500 to-red-600 text-white uppercase tracking-wider shadow-lg shadow-red-600/30 animate-pulse">
                            🔥 Trending
                        </span>
                    ) : (
                        <span className="px-2 py-1 text-[10px] font-bold rounded bg-green-600/90 text-white uppercase tracking-wider">
                            New
                        </span>
                    )}
                </div>
            </div>

            {/* Title */}
            <div className="mt-3 px-1">
                <h3 className="font-medium text-sm md:text-base text-gray-100 line-clamp-2 group-hover:text-red-400 transition-colors">
                    {movie.title}
                </h3>
                {movie.release_year && (
                    <p className="text-xs text-gray-500 mt-1">{movie.release_year}</p>
                )}
            </div>
        </Link>
    );
}

// Skeleton loader for MovieCard
export function MovieCardSkeleton() {
    return (
        <div className="animate-pulse">
            <div className="aspect-[2/3] rounded-xl bg-dark-600 animate-shimmer" />
            <div className="mt-3 px-1">
                <div className="h-4 bg-dark-600 rounded w-3/4 animate-shimmer" />
                <div className="h-3 bg-dark-600 rounded w-1/4 mt-2 animate-shimmer" />
            </div>
        </div>
    );
}
