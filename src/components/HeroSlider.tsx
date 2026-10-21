'use client';

import { useState, useEffect, useRef } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { Swiper, SwiperSlide } from 'swiper/react';
import type { Swiper as SwiperType } from 'swiper';
import { Autoplay, EffectFade, Pagination } from 'swiper/modules';
import { Movie } from '@/lib/types';
import { getAppSettings, CachedAppSettings } from '@/lib/settingsCache';
import { getContentUrl } from '@/lib/urlUtils';
import { useAdultGate } from './AdultGateProvider';
import { useAuth } from '@/context/AuthContext';

import 'swiper/css';
import 'swiper/css/effect-fade';
import 'swiper/css/pagination';

interface HeroSliderProps {
    movies: Movie[];
}

export default function HeroSlider({ movies }: HeroSliderProps) {
    const [settings, setSettings] = useState<CachedAppSettings | null>(null);
    const adTriggeredRef = useRef(false);
    const swiperRef = useRef<SwiperType | null>(null);
    const { checkAdultGate } = useAdultGate();

    useEffect(() => {
        // Fetch Ad settings from shared cache
        getAppSettings().then(data => {
            if (data) setSettings(data);
        });
    }, []);

    const handleBannerClick = (e: React.MouseEvent, movie: Movie) => {
        // If adult content, intercept and go through the gate
        if (movie.is_adult) {
            e.preventDefault();
            checkAdultGate(getContentUrl(movie), true);
            return;
        }

        // Construct content URL
        const contentUrl = getContentUrl(movie);

        // Check if this movie has a per-content ad link or global popunder ad
        const adToTrigger = movie.ad_link || (settings?.is_ads_enabled && settings?.popunder_url ? settings.popunder_url : null);
        const adKey = movie.ad_link ? `ad_seen_${movie.id}` : 'trending_ad_seen';
        const hasSeenAd = sessionStorage.getItem(adKey);

        if (adToTrigger && !hasSeenAd && !adTriggeredRef.current) {
            e.preventDefault();
            adTriggeredRef.current = true;
            sessionStorage.setItem(adKey, 'true');

            // Bypass splash screen on the destination tab
            try {
                sessionStorage.setItem('nexiplay_splash_seen', 'true');
                localStorage.setItem('nexiplay_splash_seen', Date.now().toString());
            } catch (err) {}

            // Open the MOVIE in the active foreground tab:
            const newTab = window.open(contentUrl, '_blank');
            if (newTab) {
                // The current background tab replaces with the Ad:
                setTimeout(() => {
                    try {
                        window.location.replace(adToTrigger);
                    } catch {
                        window.location.href = adToTrigger;
                    }
                }, 200);
                return;
            } else {
                window.location.href = contentUrl;
                return;
            }
        }
        // If no ad configured or already seen, Link handles navigation normally
    };

    const { hideNsfw } = useAuth();
    const filteredMovies = hideNsfw ? movies.filter(m => !m.is_adult) : movies;

    if (!filteredMovies || filteredMovies.length === 0) return null;

    return (
        <div className="w-full relative group">
            <Swiper
                onSwiper={(swiper) => {
                    swiperRef.current = swiper;
                }}
                modules={[Autoplay, EffectFade, Pagination]}
                effect="fade"
                fadeEffect={{ crossFade: true }}
                autoplay={{
                    delay: 5000,
                    disableOnInteraction: false,
                }}
                speed={800}
                pagination={{ clickable: true }}
                loop={true}
                allowTouchMove={true}
                touchRatio={1.2}
                grabCursor={true}
                className="w-full h-[58vh] min-h-[500px] max-h-[780px] md:h-[72vh] lg:h-[78vh] relative"
            >
                {filteredMovies.map((movie, idx) => (
                    <SwiperSlide key={movie.id}>
                        <div className="relative w-full h-full">
                            {/* Background Image (Desktop) */}
                            <div className="hidden md:block absolute inset-0">
                                <Image
                                    src={movie.banner_url_desktop || movie.poster_url || ''}
                                    alt={movie.title}
                                    fill
                                    className="object-cover"
                                    priority={idx === 0}
                                    loading={idx === 0 ? 'eager' : 'lazy'}
                                    sizes="(max-width: 768px) 100vw, 1920px"
                                />
                                <div className="absolute inset-0 bg-gradient-to-t from-[#0D0B12] via-[#0D0B12]/50 to-transparent" />
                                <div className="absolute inset-0 bg-gradient-to-r from-[#0D0B12] via-[#0D0B12]/75 to-transparent" />
                            </div>

                            {/* Background Image (Mobile) */}
                            <div className="block md:hidden absolute inset-0">
                                <Image
                                    src={movie.banner_url_mobile || movie.poster_url || ''}
                                    alt={movie.title}
                                    fill
                                    className="object-cover"
                                    priority={idx === 0}
                                    loading={idx === 0 ? 'eager' : 'lazy'}
                                    sizes="100vw"
                                />
                                <div className="absolute inset-0 bg-gradient-to-t from-[#0D0B12] via-[#0D0B12]/70 to-transparent" />
                            </div>

                            {/* Content */}
                            <div className="absolute inset-0 flex items-end md:items-center pointer-events-none">
                                <div className="container mx-auto px-4 pb-20 md:pb-0 md:pl-16 md:translate-y-8 pointer-events-none">
                                    <div className="max-w-2xl space-y-4 md:space-y-5 animate-fade-in-up">

                                        {/* Type Badge */}
                                        <div className="flex items-center gap-3 pointer-events-auto">
                                            <span className="px-3 py-1 bg-[#9273F5]/90 text-white text-[11px] font-bold uppercase tracking-[0.12em] rounded-full border border-white/15">
                                                {movie.type}
                                            </span>
                                            {movie.is_adult && (
                                                <span className="px-3 py-1 bg-[#211D2B]/90 text-[#FFB878] text-[11px] font-bold uppercase tracking-[0.12em] rounded-full border border-[#FFB878]/35">
                                                    18+
                                                </span>
                                            )}
                                            {movie.release_year && (
                                                <span className="text-[#ADA6B9] font-medium text-sm drop-shadow-md">
                                                    {movie.release_year}
                                                </span>
                                            )}
                                        </div>

                                        {/* Title */}
                                        <h1 className="text-4xl md:text-5xl lg:text-6xl font-black text-[#F4F0FA] leading-[1.04] tracking-tight drop-shadow-2xl max-w-3xl pointer-events-auto">
                                            {movie.title}
                                        </h1>

                                        {/* Description (Desktop only) */}
                                        <p className="hidden md:block text-[#E0DCE8] text-base md:text-lg leading-relaxed line-clamp-3 max-w-xl drop-shadow-md pointer-events-auto">
                                            {movie.description}
                                        </p>

                                        {/* Actions */}
                                        <div className="flex items-center gap-4 pt-4 pointer-events-auto">
                                            <Link
                                                href={getContentUrl(movie)}
                                                prefetch={true}
                                                onClick={(e) => handleBannerClick(e, movie)}
                                                className="px-8 py-3.5 np-clay-btn text-white font-bold rounded-xl flex items-center gap-2.5 transition-all hover:scale-105 group/btn cursor-pointer"
                                            >
                                                <svg className="w-5 h-5 fill-current" viewBox="0 0 24 24">
                                                    <path d="M8 5v14l11-7z" />
                                                </svg>
                                                Watch Now
                                            </Link>

                                            <Link
                                                href={getContentUrl(movie)}
                                                prefetch={true}
                                                className="px-7 py-3.5 np-ghost-btn text-white font-semibold rounded-xl flex items-center gap-2 hover:scale-105 transition-all cursor-pointer"
                                            >
                                                <svg className="w-5 h-5 text-[#ADA6B9]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                                </svg>
                                                Details
                                            </Link>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </SwiperSlide>
                ))}
            </Swiper>

            {/* Custom Navigation Arrows - Always visible, high z-index, touch & click responsive */}
            <button
                type="button"
                aria-label="Previous slide"
                onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    swiperRef.current?.slidePrev();
                }}
                className="absolute top-1/2 -translate-y-1/2 left-3 md:left-6 z-30 w-10 h-10 md:w-12 md:h-12 rounded-full bg-[#17141F]/80 backdrop-blur-md border border-white/15 text-white hover:bg-[#9273F5] hover:border-[#9273F5] flex items-center justify-center transition-all duration-200 shadow-xl active:scale-90 group/nav cursor-pointer"
            >
                <svg className="w-5 h-5 md:w-6 md:h-6 text-white transition-transform group-hover/nav:-translate-x-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15 19l-7-7 7-7" />
                </svg>
            </button>

            <button
                type="button"
                aria-label="Next slide"
                onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    swiperRef.current?.slideNext();
                }}
                className="absolute top-1/2 -translate-y-1/2 right-3 md:right-6 z-30 w-10 h-10 md:w-12 md:h-12 rounded-full bg-[#17141F]/80 backdrop-blur-md border border-white/15 text-white hover:bg-[#9273F5] hover:border-[#9273F5] flex items-center justify-center transition-all duration-200 shadow-xl active:scale-90 group/nav cursor-pointer"
            >
                <svg className="w-5 h-5 md:w-6 md:h-6 text-white transition-transform group-hover/nav:translate-x-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5l7 7-7 7" />
                </svg>
            </button>

            {/* Custom Styles for Swiper Pagination */}
            <style jsx global>{`
                .swiper-pagination-bullet {
                    background: white;
                    opacity: 0.4;
                    width: 8px;
                    height: 8px;
                }
                .swiper-pagination-bullet-active {
                    background: #9273F5;
                    opacity: 1;
                    width: 24px;
                    border-radius: 4px;
                    box-shadow: 0 0 10px rgba(146, 115, 245, 0.6);
                    transition: width 0.3s ease;
                }
            `}</style>
        </div>
    );
}
