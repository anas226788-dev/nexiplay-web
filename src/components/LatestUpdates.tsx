'use client';

import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { useRef, useState, useEffect } from 'react';

interface UpdateItem {
    id: string;
    title: string;
    poster_url: string | null;
    slug: string;
    content_type: 'anime' | 'series' | 'movie';
    update_type: 'movie' | 'season' | 'episode';
    season_number: number | null;
    episode_number: number | null;
    created_at: string;
}

interface LatestUpdatesProps {
    updates: UpdateItem[];
    adLink?: string;
}

function getUpdateBadge(item: UpdateItem): string {
    if (item.update_type === 'episode' && item.season_number && item.episode_number) {
        return `S${item.season_number} EP ${item.episode_number} ADDED`;
    }
    if (item.update_type === 'episode' && item.episode_number) {
        return `EP ${item.episode_number} ADDED`;
    }
    if (item.update_type === 'season' && item.season_number) {
        return `SEASON ${item.season_number} ADDED`;
    }
    return 'NEW RELEASE';
}

export default function LatestUpdates({ updates, adLink }: LatestUpdatesProps) {
    const router = useRouter();
    const scrollRef = useRef<HTMLDivElement>(null);
    const [canScrollLeft, setCanScrollLeft] = useState(false);
    const [canScrollRight, setCanScrollRight] = useState(true);

    if (!updates || updates.length === 0) return null;

    const handleCardClick = (e: React.MouseEvent, slug: string) => {
        e.preventDefault();
        // Open ad link in new tab if configured
        if (adLink) {
            window.open(adLink, '_blank', 'noopener,noreferrer');
        }
        // Navigate to content page in same tab
        router.push(slug);
    };

    const checkScroll = () => {
        const el = scrollRef.current;
        if (!el) return;
        setCanScrollLeft(el.scrollLeft > 10);
        setCanScrollRight(el.scrollLeft < el.scrollWidth - el.clientWidth - 10);
    };

    const scroll = (direction: 'left' | 'right') => {
        const el = scrollRef.current;
        if (!el) return;
        const scrollAmount = el.clientWidth * 0.75;
        el.scrollBy({
            left: direction === 'left' ? -scrollAmount : scrollAmount,
            behavior: 'smooth'
        });
        // Check after animation
        setTimeout(checkScroll, 400);
    };

    return (
        <section className="mb-12">
            <div className="flex items-center justify-between mb-6">
                <h2 className="section-title flex items-center gap-2">
                    <span className="w-1 h-6 bg-red-600 rounded-full"></span>
                    Latest Updates
                    <span className="px-2 py-0.5 text-[10px] font-bold bg-red-600/20 text-red-400 rounded-full border border-red-500/20 animate-pulse">
                        LIVE
                    </span>
                </h2>

                {/* Arrow Buttons - Desktop Only */}
                <div className="hidden md:flex items-center gap-2">
                    <button
                        onClick={() => scroll('left')}
                        className={`w-9 h-9 rounded-full border flex items-center justify-center transition-all duration-300 ${
                            canScrollLeft
                                ? 'border-white/20 bg-white/5 hover:bg-red-600 hover:border-red-600 text-white cursor-pointer'
                                : 'border-white/5 bg-white/[0.02] text-gray-600 cursor-not-allowed'
                        }`}
                        disabled={!canScrollLeft}
                        aria-label="Scroll left"
                    >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15 19l-7-7 7-7" />
                        </svg>
                    </button>
                    <button
                        onClick={() => scroll('right')}
                        className={`w-9 h-9 rounded-full border flex items-center justify-center transition-all duration-300 ${
                            canScrollRight
                                ? 'border-white/20 bg-white/5 hover:bg-red-600 hover:border-red-600 text-white cursor-pointer'
                                : 'border-white/5 bg-white/[0.02] text-gray-600 cursor-not-allowed'
                        }`}
                        disabled={!canScrollRight}
                        aria-label="Scroll right"
                    >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5l7 7-7 7" />
                        </svg>
                    </button>
                </div>
            </div>

            {/* Horizontally Scrollable Container */}
            <div className="relative -mx-4 px-4">
                <div
                    ref={scrollRef}
                    onScroll={checkScroll}
                    className="flex gap-3 overflow-x-auto pb-4 scrollbar-hide snap-x snap-mandatory"
                >
                    {updates.map((item, index) => (
                        <a
                            key={item.id}
                            href={item.slug}
                            onClick={(e) => handleCardClick(e, item.slug)}
                            className="flex-shrink-0 w-[140px] sm:w-[160px] group animate-fade-in snap-start cursor-pointer"
                            style={{ animationDelay: `${index * 40}ms` }}
                        >
                            <div className="relative aspect-[2/3] rounded-xl overflow-hidden glass-panel shadow-lg">
                                {/* Poster */}
                                {item.poster_url ? (
                                    <Image
                                        src={item.poster_url}
                                        alt={item.title}
                                        fill
                                        sizes="160px"
                                        className="object-cover transition-transform duration-500 group-hover:scale-110"
                                        loading="lazy"
                                        placeholder="blur"
                                        blurDataURL="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mmM/w8AAgAB/6zTqgAAAABJRU5ErkJggg=="
                                    />
                                ) : (
                                    <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-dark-600 to-dark-800">
                                        <svg className="w-10 h-10 text-gray-600" fill="currentColor" viewBox="0 0 24 24">
                                            <path d="M18 4l2 4h-3l-2-4h-2l2 4h-3l-2-4H8l2 4H7L5 4H4c-1.1 0-1.99.9-1.99 2L2 18c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V4h-4z" />
                                        </svg>
                                    </div>
                                )}

                                {/* Hover Overlay */}
                                <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                                    <div className="absolute bottom-0 left-0 right-0 p-3 flex items-center justify-center gap-1 text-xs font-medium">
                                        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                                            <path d="M8 5v14l11-7z" />
                                        </svg>
                                        View
                                    </div>
                                </div>

                                {/* NEW Badge - top left */}
                                <div className="absolute top-2 left-2">
                                    <span className="px-2 py-0.5 text-[10px] font-black rounded bg-red-600 text-white shadow-lg shadow-red-900/40 uppercase tracking-wider animate-pulse">
                                        NEW
                                    </span>
                                </div>

                                {/* Type Badge - top right */}
                                <div className="absolute top-2 right-2">
                                    <span className="px-2 py-0.5 text-[10px] font-bold rounded bg-black/60 backdrop-blur-sm uppercase text-white">
                                        {item.content_type}
                                    </span>
                                </div>

                                {/* Update Badge - bottom left */}
                                <div className="absolute bottom-2 left-2">
                                    <span className="px-2.5 py-1 text-[10px] font-black rounded-md bg-red-600 text-white uppercase tracking-wide shadow-lg shadow-red-900/50">
                                        {getUpdateBadge(item)}
                                    </span>
                                </div>
                            </div>

                            {/* Title */}
                            <div className="mt-2 px-0.5">
                                <h3 className="font-medium text-sm text-gray-200 line-clamp-2 group-hover:text-red-400 transition-colors leading-tight">
                                    {item.title}
                                </h3>
                            </div>
                        </a>
                    ))}
                </div>
            </div>
        </section>
    );
}
