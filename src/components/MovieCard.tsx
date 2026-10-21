'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Movie } from '@/lib/types';
import { getContentUrl } from '@/lib/urlUtils';
import { useAdultGate } from './AdultGateProvider';
import { useAuth } from '@/context/AuthContext';

interface MovieCardProps {
    movie: Movie;
}

export default function MovieCard({ movie }: MovieCardProps) {
    const router = useRouter();
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

    const prefetchDetails = () => {
        router.prefetch(detailUrl);
    };

    return (
        <Link
            href={detailUrl}
            prefetch={false}
            onMouseEnter={prefetchDetails}
            onFocus={prefetchDetails}
            onClick={handleClick}
            className="movie-card block group active:scale-[0.99] transition-transform duration-200 cursor-pointer hover:-translate-y-1"
        >
            <div className="relative aspect-[2/3] overflow-hidden rounded-t-[14px] border border-white/[0.09] border-b-0 bg-[#111116] transition-colors duration-200 group-hover:border-white/[0.16]" suppressHydrationWarning>
                {/* Poster Image */}
                {movie.poster_url ? (
                    <Image
                        src={movie.poster_url}
                        alt={movie.title}
                        fill
                        className="object-cover transition-transform duration-500 ease-out group-hover:scale-[1.04]"
                        sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 20vw"
                        placeholder="blur"
                        blurDataURL="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mmM/w8AAgAB/6zTqgAAAABJRU5ErkJggg=="
                    />
                ) : (
                    <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-[#17141F] to-[#0D0B12]">
                        <svg className="w-14 h-14 text-white/20" fill="currentColor" viewBox="0 0 24 24">
                            <path d="M18 4l2 4h-3l-2-4h-2l2 4h-3l-2-4H8l2 4H7L5 4H4c-1.1 0-1.99.9-1.99 2L2 18c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V4h-4z" />
                        </svg>
                    </div>
                )}

                {/* Permanent subtle bottom fade for contrast */}
                <div className="absolute inset-0 np-poster-fade pointer-events-none" />

                {/* 18+ Badge - Top Left */}
                {movie.is_adult && (
                    <div className="absolute left-2 top-2 z-10">
                        <span className="px-2 py-0.5 text-[10px] font-black rounded-md bg-[#9273F5] text-white uppercase tracking-wider shadow-md border border-red-400/40">
                            🔞 18+
                        </span>
                    </div>
                )}

                {/* Quality Badge - Top Right */}
                    <div className="absolute right-2 top-2 z-10">
                        <span className="rounded-md border border-white/15 bg-[#111116]/85 px-2 py-1 text-[9px] font-bold tracking-wide text-white/90 backdrop-blur-sm">
                        HD
                    </span>
                </div>

                {/* PINNED / GORGEOUS / TRENDING Badge */}
                <div className={`movie-card-status-badge absolute left-2 z-10 ${movie.is_adult ? 'top-9' : 'top-2'}`}>
                    {movie.is_pinned ? (
                        <span className="badge-glow badge-glow-gorgeous px-2 py-1 text-[10px] font-bold rounded-md bg-gradient-to-r from-[#FFD08A] to-[#FFAD66] text-[#211D2B] uppercase tracking-wider border border-[#FFE1B8]/70 flex items-center gap-1">
                            <svg aria-hidden="true" className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M16 3l5 5-4 1-4 4v5l-2 2-2-7-7-2 2-2h5l4-4 1-4z" /></svg>
                            Gorgeous
                        </span>
                    ) : movie.trending_badge ? (
                        <span className="badge-glow badge-glow-trending px-2 py-1 text-[10px] font-bold rounded-md bg-[#FF8A32] text-[#241205] uppercase tracking-wider border border-[#FFC17F]/80 flex items-center gap-1">
                            <svg aria-hidden="true" className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M12 22a7 7 0 007-7c0-3.5-2-5.5-4-7-.5 3-2 4-3 4-1-4-4-7-6-9 0 4-1 6-2 9a7 7 0 008 10z" /></svg>
                            Trending
                        </span>
                    ) : (
                        <span className="badge-glow badge-glow-new px-2 py-1 text-[10px] font-extrabold rounded-md bg-[#54F28B] text-[#092313] uppercase tracking-wider border border-[#B1FFCA]/80">
                            New
                        </span>
                    )}
                </div>
            </div>

            {/* Title & Metadata */}
            <div className="rounded-b-[14px] border border-white/[0.09] border-t-0 bg-[#121217] px-3 pb-3 pt-2.5 transition-colors duration-200 group-hover:bg-[#17171E]">
                <h3 className="line-clamp-2 text-[13px] font-semibold leading-snug text-[#F4F0FA] transition-colors duration-200 group-hover:text-[#C7B8FF] md:text-sm">
                    {movie.title}
                </h3>
                <p className="mt-1.5 flex items-center gap-1.5 text-[10px] font-medium uppercase tracking-[0.08em] text-[#92909A]">
                    <span>{movie.type}</span>
                    {movie.release_year && <><span aria-hidden="true" className="text-white/25">•</span><span>{movie.release_year}</span></>}
                </p>
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
