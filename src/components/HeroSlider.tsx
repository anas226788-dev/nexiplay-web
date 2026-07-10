'use client';

import { useState, useEffect, useRef } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { Swiper, SwiperSlide } from 'swiper/react';
import { Autoplay, EffectFade, Pagination, Navigation } from 'swiper/modules';
import { Movie } from '@/lib/types';
import { getAppSettings, CachedAppSettings } from '@/lib/settingsCache';
import { getContentUrl } from '@/lib/urlUtils';
import { useAdultGate } from './AdultGateProvider';
import { useAuth } from '@/context/AuthContext';

import 'swiper/css';
import 'swiper/css/effect-fade';
import 'swiper/css/pagination';
import 'swiper/css/navigation';

interface HeroSliderProps {
    movies: Movie[];
}

export default function HeroSlider({ movies }: HeroSliderProps) {
    const [settings, setSettings] = useState<CachedAppSettings | null>(null);
    const adTriggeredRef = useRef(false);
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

        // Check if this movie has a per-content ad link
        if (movie.ad_link) {
            // Prevent default Link behavior
            e.preventDefault();

            // Check session storage to prevent spam (once per movie per session)
            const adKey = `ad_seen_${movie.id}`;
            const hasSeenAd = sessionStorage.getItem(adKey);

            if (!hasSeenAd) {
                // Open ad in new tab (MUST be first, directly in click handler for mobile compatibility)
                window.open(movie.ad_link, '_blank');
                sessionStorage.setItem(adKey, 'true');
            }

            // Navigate to content in same tab
            window.location.href = contentUrl;
            return;
        }

        // Fallback: Global ad system (if no per-content ad)
        if (settings?.is_ads_enabled && settings?.popunder_url) {
            const hasSeenGlobalAd = sessionStorage.getItem('trending_ad_seen');

            if (!hasSeenGlobalAd && !adTriggeredRef.current) {
                e.preventDefault();
                adTriggeredRef.current = true;
                sessionStorage.setItem('trending_ad_seen', 'true');

                window.open(settings.popunder_url, '_blank');
                window.location.href = contentUrl;
            }
        }
        // If no ad configured, Link handles navigation normally
    };

    const { hideNsfw } = useAuth();
    const filteredMovies = hideNsfw ? movies.filter(m => !m.is_adult) : movies;

    if (!filteredMovies || filteredMovies.length === 0) return null;

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
                {filteredMovies.map((movie) => (
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
                                <div className="absolute inset-0 bg-gradient-to-t from-dark-900 via-dark-900/40 to-transparent"></div>
                                <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_50%,rgba(0,0,0,0.8)_0%,transparent_100%)]"></div>
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
                                            {movie.is_adult && (
                                                <span className="px-3 py-1 bg-gradient-to-r from-red-700 to-red-600 text-white text-xs font-black uppercase tracking-wider rounded-full shadow-lg shadow-red-900/40 border border-red-500/30">
                                                    🔞 18+
                                                </span>
                                            )}
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
                                                href={getContentUrl(movie)}
                                                onClick={(e) => handleBannerClick(e, movie)}
                                                className="px-8 py-3.5 bg-red-600 hover:bg-red-700 text-white font-bold rounded-xl flex items-center gap-2 transition-all hover:scale-105 hover:shadow-lg hover:shadow-red-600/30 group/btn"
                                            >
                                                <svg className="w-6 h-6 fill-current" viewBox="0 0 24 24">
                                                    <path d="M8 5v14l11-7z" />
                                                </svg>
                                                Watch Now
                                            </Link>

                                            <Link
                                                href={getContentUrl(movie)}
                                                className="px-8 py-3.5 glass-button text-white font-bold rounded-xl flex items-center gap-2"
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

                {/* Navigation Arrows - Always visible, left and right sides */}
                <button className="swiper-button-prev !w-10 !h-10 md:!w-12 md:!h-12 !rounded-full !bg-black/40 backdrop-blur-md !border !border-white/10 !text-white hover:!bg-red-600 hover:!border-red-600 transition-all !left-3 md:!left-6 !after:!text-sm md:!after:!text-lg"></button>
                <button className="swiper-button-next !w-10 !h-10 md:!w-12 md:!h-12 !rounded-full !bg-black/40 backdrop-blur-md !border !border-white/10 !text-white hover:!bg-red-600 hover:!border-red-600 transition-all !right-3 md:!right-6 !after:!text-sm md:!after:!text-lg"></button>
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
                    font-size: 16px;
                    font-weight: bold;
                }
                @media (min-width: 768px) {
                    .swiper-button-next::after, .swiper-button-prev::after {
                        font-size: 20px;
                    }
                }
            `}</style>
        </div>
    );
}
