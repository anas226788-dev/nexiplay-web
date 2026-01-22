'use client';

import { useState, useEffect, useRef } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { Swiper, SwiperSlide } from 'swiper/react';
import { Autoplay, EffectFade, Pagination, Navigation } from 'swiper/modules';
import { Movie, AppSettings } from '@/lib/types';
import { supabase } from '@/lib/supabase';

import 'swiper/css';
import 'swiper/css/effect-fade';
import 'swiper/css/pagination';
import 'swiper/css/navigation';

interface HeroSliderProps {
    movies: Movie[];
}

export default function HeroSlider({ movies }: HeroSliderProps) {
    const [settings, setSettings] = useState<AppSettings | null>(null);
    const adTriggeredRef = useRef(false);

    useEffect(() => {
        // Fetch Ad settings
        async function fetchSettings() {
            const { data } = await supabase.from('app_settings').select('*').single();
            if (data) setSettings(data);
        }
        fetchSettings();
    }, []);

    const handleBannerClick = (e: React.MouseEvent, movieSlug: string, type: string, releaseYear: number) => {
        // Construct standard URL
        const movieUrl = `/${type === 'series' ? 'series' : type === 'anime' ? 'anime' : 'movies'}/${movieSlug}-${releaseYear}`;

        // Standard link behavior if no ads enabled or already seen
        if (!settings?.is_ads_enabled || !settings?.popunder_url) {
            return; // Let Link handle it
        }

        // Check session storage
        const hasSeenAd = sessionStorage.getItem('trending_ad_seen');

        if (!hasSeenAd && !adTriggeredRef.current) {
            e.preventDefault(); // Stop immediate navigation
            adTriggeredRef.current = true;
            sessionStorage.setItem('trending_ad_seen', 'true');

            // 1. Open Ad in New Tab
            window.open(settings.popunder_url, '_blank');

            // 2. Navigate to content in current tab after small delay
            setTimeout(() => {
                window.location.href = movieUrl;
            }, 100);
        }
    };

    if (!movies || movies.length === 0) return null;

    return (
        <div className="w-full relative group">
            <Swiper
                modules={[Autoplay, EffectFade, Pagination, Navigation]}
                effect="fade"
                autoplay={{
                    delay: 5000,
                    disableOnInteraction: false,
                }}
                speed={1000}
                pagination={{ clickable: true }}
                navigation={{
                    nextEl: '.swiper-button-next',
                    prevEl: '.swiper-button-prev',
                }}
                loop={true}
                className="w-full h-[60vh] md:h-[80vh] lg:h-[85vh] relative"
            >
                {movies.map((movie) => (
                    <SwiperSlide key={movie.id}>
                        <div className="relative w-full h-full">
                            {/* Background Image (Desktop) */}
                            <div className="hidden md:block absolute inset-0">
                                <Image
                                    src={movie.banner_url_desktop || movie.poster_url || ''}
                                    alt={movie.title}
                                    fill
                                    className="object-cover"
                                    priority
                                />
                                <div className="absolute inset-0 bg-gradient-to-t from-dark-900 via-dark-900/60 to-transparent"></div>
                                <div className="absolute inset-0 bg-gradient-to-r from-dark-900 via-dark-900/40 to-transparent"></div>
                            </div>

                            {/* Background Image (Mobile) */}
                            <div className="block md:hidden absolute inset-0">
                                <Image
                                    src={movie.banner_url_mobile || movie.poster_url || ''}
                                    alt={movie.title}
                                    fill
                                    className="object-cover"
                                    priority
                                />
                                <div className="absolute inset-0 bg-gradient-to-t from-dark-900 via-transparent to-transparent"></div>
                            </div>

                            {/* Content */}
                            <div className="absolute inset-0 flex items-end md:items-center">
                                <div className="container mx-auto px-4 pb-20 md:pb-0 md:pl-16">
                                    <div className="max-w-2xl space-y-4 animate-fade-in-up">

                                        {/* Type Badge */}
                                        <div className="flex items-center gap-3">
                                            <span className="px-3 py-1 bg-red-600 text-white text-xs font-bold uppercase tracking-wider rounded-full shadow-lg shadow-red-600/20">
                                                {movie.type}
                                            </span>
                                            {movie.release_year && (
                                                <span className="text-gray-300 font-medium text-sm drop-shadow-md">
                                                    {movie.release_year}
                                                </span>
                                            )}
                                        </div>

                                        {/* Title */}
                                        <h1 className="text-4xl md:text-6xl font-black text-white leading-tight drop-shadow-2xl">
                                            {movie.title}
                                        </h1>

                                        {/* Description (Desktop only) */}
                                        <p className="hidden md:block text-gray-300 text-lg line-clamp-3 max-w-xl drop-shadow-md">
                                            {movie.description}
                                        </p>

                                        {/* Actions */}
                                        <div className="flex items-center gap-4 pt-4">
                                            <Link
                                                href={`/${movie.type === 'series' ? 'series' : movie.type === 'anime' ? 'anime' : 'movies'}/${movie.slug}-${movie.release_year}`}
                                                onClick={(e) => handleBannerClick(e, movie.slug, movie.type, movie.release_year || 0)}
                                                className="px-8 py-3.5 bg-red-600 hover:bg-red-700 text-white font-bold rounded-xl flex items-center gap-2 transition-all hover:scale-105 hover:shadow-lg hover:shadow-red-600/30 group/btn"
                                            >
                                                <svg className="w-6 h-6 fill-current" viewBox="0 0 24 24">
                                                    <path d="M8 5v14l11-7z" />
                                                </svg>
                                                Watch Now
                                            </Link>

                                            <Link
                                                href={`/${movie.type === 'series' ? 'series' : movie.type === 'anime' ? 'anime' : 'movies'}/${movie.slug}-${movie.release_year}`}
                                                className="px-8 py-3.5 bg-white/10 hover:bg-white/20 backdrop-blur-md text-white font-bold rounded-xl flex items-center gap-2 transition-all hover:scale-105 border border-white/10"
                                            >
                                                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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

                {/* Custom Navigation Buttons (Visible on hover) */}
                <div className="hidden md:flex absolute bottom-8 right-16 gap-2 z-10 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button className="swiper-button-prev w-12 h-12 rounded-full bg-white/10 backdrop-blur-md border border-white/10 flex items-center justify-center text-white hover:bg-red-600 hover:border-red-600 transition-all"></button>
                    <button className="swiper-button-next w-12 h-12 rounded-full bg-white/10 backdrop-blur-md border border-white/10 flex items-center justify-center text-white hover:bg-red-600 hover:border-red-600 transition-all"></button>
                </div>
            </Swiper>

            {/* Custom Styles for Swiper Pagination */}
            <style jsx global>{`
                .swiper-pagination-bullet {
                    background: white;
                    opacity: 0.5;
                    width: 10px;
                    height: 10px;
                }
                .swiper-pagination-bullet-active {
                    background: #dc2626;
                    opacity: 1;
                    width: 24px;
                    border-radius: 5px;
                    transition: width 0.3s ease;
                }
                .swiper-button-next::after, .swiper-button-prev::after {
                    font-size: 20px;
                    font-weight: bold;
                }
            `}</style>
        </div>
    );
}
