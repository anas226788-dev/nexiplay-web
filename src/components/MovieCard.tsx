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
            className="movie-card block group perspective-1000 active:scale-[0.98] transition-transform duration-200 cursor-pointer"
        >
            <div className="relative aspect-[2/3] rounded-np-card overflow-hidden np-glass-solid border border-white/10 group-hover:border-[#E51D48]/50 group-hover:shadow-[0_10px_30px_rgba(229,29,72,0.22)] transition-all duration-300" suppressHydrationWarning>
                {/* Poster Image */}
                {movie.poster_url ? (
                    <Image
                        src={movie.poster_url}
                        alt={movie.title}
                        fill
                        className="object-cover transition-transform duration-500 ease-out group-hover:scale-108"
                        sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 20vw"
                        placeholder="blur"
                        blurDataURL="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mmM/w8AAgAB/6zTqgAAAABJRU5ErkJggg=="
                    />
                ) : (
                    <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-[#141625] to-[#0B0D16]">
                        <svg className="w-14 h-14 text-white/20" fill="currentColor" viewBox="0 0 24 24">
                            <path d="M18 4l2 4h-3l-2-4h-2l2 4h-3l-2-4H8l2 4H7L5 4H4c-1.1 0-1.99.9-1.99 2L2 18c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V4h-4z" />
                        </svg>
                    </div>
                )}

                {/* Permanent subtle bottom fade for contrast */}
                <div className="absolute inset-0 np-poster-fade pointer-events-none" />

                {/* Hover Overlay with Tactile Play CTA */}
                <div className="absolute inset-0 bg-gradient-to-t from-[#0B0D16] via-[#0B0D16]/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-end p-3.5">
                    <div className="w-full transform translate-y-3 group-hover:translate-y-0 transition-transform duration-300 space-y-2">
                        <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="px-2 py-0.5 text-[10px] font-bold rounded-md bg-[#E51D48] text-white uppercase tracking-wider shadow-[0_2px_8px_rgba(229,29,72,0.4)]">
                                {movie.type}
                            </span>
                            {movie.release_year && (
                                <span className="text-[10px] text-white/80 font-medium bg-black/60 px-2 py-0.5 rounded-md border border-white/10">
                                    {movie.release_year}
                                </span>
                            )}
                        </div>

                        {/* Clay-style Watch CTA button */}
                        <div className="w-full py-2 px-3 np-clay-btn text-white text-xs font-bold rounded-lg flex items-center justify-center gap-1.5 shadow-lg">
                            <svg className="w-3.5 h-3.5 fill-current translate-x-0.5" viewBox="0 0 24 24">
                                <path d="M8 5v14l11-7z" />
                            </svg>
                            <span>Watch Now</span>
                        </div>
                    </div>
                </div>

                {/* 18+ Badge - Top Left */}
                {movie.is_adult && (
                    <div className="absolute top-2 left-2 z-10">
                        <span className="px-2 py-0.5 text-[10px] font-black rounded-md bg-[#E51D48] text-white uppercase tracking-wider shadow-md border border-red-400/40">
                            🔞 18+
                        </span>
                    </div>
                )}

                {/* Quality Badge - Top Right */}
                <div className="absolute top-2 right-2 z-10">
                    <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-[#141625]/85 border border-white/15 text-white shadow-sm">
                        HD
                    </span>
                </div>

                {/* PINNED / GORGEOUS / TRENDING Badge */}
                <div className="absolute bottom-2 left-2 z-10 group-hover:opacity-0 transition-opacity duration-200">
                    {movie.is_pinned ? (
                        <span className="px-2.5 py-0.5 text-[10px] font-black rounded-md bg-gradient-to-r from-[#F6C453] via-amber-300 to-[#F6C453] text-[#0B0D16] uppercase tracking-wider shadow-[0_2px_10px_rgba(246,196,83,0.35)] border border-yellow-200/80 flex items-center gap-1">
                            <span>📌</span> Pinned
                        </span>
                    ) : movie.trending_badge ? (
                        <span className="px-2 py-0.5 text-[10px] font-black rounded-md bg-gradient-to-r from-orange-500 to-[#E51D48] text-white uppercase tracking-wider shadow-[0_2px_8px_rgba(229,29,72,0.35)]">
                            🔥 Trending
                        </span>
                    ) : (
                        <span className="px-2 py-0.5 text-[10px] font-bold rounded-md bg-[#28D391]/90 text-black uppercase tracking-wider font-semibold">
                            New
                        </span>
                    )}
                </div>
            </div>

            {/* Title & Metadata */}
            <div className="mt-2.5 px-0.5">
                <h3 className="font-medium text-sm md:text-base text-[#F7F8FC] line-clamp-2 group-hover:text-[#E51D48] transition-colors duration-200 leading-snug">
                    {movie.title}
                </h3>
                {movie.release_year && (
                    <p className="text-xs text-[#A7AABD] mt-1 font-normal">{movie.release_year}</p>
                )}
            </div>
        </Link>
    );
}

// Skeleton loader for MovieCard
export function MovieCardSkeleton() {
    return (
        <div className="space-y-2.5">
            <div className="aspect-[2/3] rounded-np-card np-skeleton" />
            <div className="px-0.5 space-y-1.5">
                <div className="h-4 rounded-md np-skeleton w-3/4" />
                <div className="h-3 rounded-md np-skeleton w-1/3" />
            </div>
        </div>
    );
}
