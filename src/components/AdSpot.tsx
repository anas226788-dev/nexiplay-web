'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import Image from 'next/image';

interface Ad {
    id: string;
    title: string;
    placement: 'home_top' | 'home_bottom' | 'movie_sidebar' | 'popup_global';
    ad_type: 'image' | 'script';
    image_url: string | null;
    script_code: string | null;
    destination_url: string | null;
    is_active: boolean;
}

interface AdSpotProps {
    placement: Ad['placement'];
    className?: string;
}

export default function AdSpot({ placement, className = '' }: AdSpotProps) {
    const [ad, setAd] = useState<Ad | null>(null);
    const [isVisible, setIsVisible] = useState(true);

    useEffect(() => {
        async function fetchAd() {
            // Fetch a random active ad for this placement
            const { data } = await supabase
                .from('ads')
                .select('*')
                .eq('placement', placement)
                .eq('is_active', true)
                .limit(1); // For now just take one. Later could randomize if multiple.

            if (data && data.length > 0) {
                // If multiple ads exist for same spot, we could pick random here
                // const randomAd = data[Math.floor(Math.random() * data.length)];
                setAd(data[0]);
            }
        }

        fetchAd();
    }, [placement]);

    if (!ad || !isVisible) return null;

    if (placement === 'popup_global') {
        return (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-fadeIn">
                <div className="relative max-w-lg w-full bg-dark-800 rounded-2xl overflow-hidden shadow-2xl border border-white/10">
                    <button
                        onClick={() => setIsVisible(false)}
                        className="absolute top-2 right-2 p-2 bg-black/50 text-white rounded-full hover:bg-red-600 transition-colors z-10"
                    >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                    <div className="p-1">
                        {ad.ad_type === 'image' && ad.image_url ? (
                            <a href={ad.destination_url || '#'} target="_blank" rel="noopener noreferrer" className="block relative aspect-video">
                                <Image
                                    src={ad.image_url}
                                    alt={ad.title}
                                    fill
                                    className="object-cover rounded-xl"
                                />
                            </a>
                        ) : (
                            <div
                                className="ad-script-container"
                                dangerouslySetInnerHTML={{ __html: ad.script_code || '' }}
                            />
                        )}
                    </div>
                </div>
            </div>
        );
    }

    // Standard Banner
    return (
        <div className={`ad-spot w-full my-6 flex justify-center ${className}`}>
            {ad.ad_type === 'image' && ad.image_url ? (
                <a
                    href={ad.destination_url || '#'}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block relative w-full h-full max-w-4xl mx-auto overflow-hidden rounded-xl shadow-lg border border-white/5 group"
                >
                    {/* "Ad" Label */}
                    <span className="absolute top-0 right-0 bg-white/10 text-[10px] text-gray-400 px-1.5 py-0.5 z-10">Ad</span>

                    <div className="relative w-full aspect-[970/250] md:aspect-[970/90]">
                        <Image
                            src={ad.image_url}
                            alt={ad.title}
                            fill
                            className="object-contain md:object-cover group-hover:opacity-90 transition-opacity"
                        />
                    </div>
                </a>
            ) : (
                <div className="text-center w-full overflow-hidden">
                    <span className="block text-[10px] text-gray-600 uppercase mb-1">Advertisement</span>
                    <div
                        className="ad-script-container inline-block"
                        dangerouslySetInnerHTML={{ __html: ad.script_code || '' }}
                    />
                </div>
            )}
        </div>
    );
}
