'use client';

import Image from 'next/image';
import { useEffect, useState } from 'react';

export default function SplashScreen() {
    const [visible, setVisible] = useState(false);
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        try {
            // Check if splash was already shown in this session or recently
            const sessionSeen = sessionStorage.getItem('nexiplay_splash_seen');
            const localSeen = localStorage.getItem('nexiplay_splash_seen');

            // If already shown anywhere, never show it again
            if (sessionSeen || localSeen) {
                return;
            }

            // Mark seen in both storages so subsequent tabs and reloads never see it
            sessionStorage.setItem('nexiplay_splash_seen', 'true');
            localStorage.setItem('nexiplay_splash_seen', Date.now().toString());

            // Only show for first visit
            setMounted(true);
            setVisible(true);

            const fadeTimer = window.setTimeout(() => setVisible(false), 1800);
            const removeTimer = window.setTimeout(() => setMounted(false), 2200);

            return () => {
                window.clearTimeout(fadeTimer);
                window.clearTimeout(removeTimer);
            };
        } catch {
            // Fallback: don't block
        }
    }, []);

    if (!mounted) return null;

    return (
        <div
            aria-label="Nexiplay is loading"
            role="status"
            className={`np-splash fixed inset-0 z-[9999] flex items-center justify-center overflow-hidden bg-[#0D0B12] transition-opacity duration-500 motion-reduce:transition-none ${visible ? 'opacity-100' : 'opacity-0'}`}
        >
            <div className="np-splash-aurora np-splash-aurora-one" />
            <div className="np-splash-aurora np-splash-aurora-two" />
            <div className="np-splash-grain" />

            <div className="np-splash-content relative flex flex-col items-center text-center px-4">
                {/* Transparent emblem with a separately typeset wordmark keeps the splash crisp. */}
                <div className="relative flex flex-col items-center">
                    <div className="absolute left-1/2 top-1/4 h-36 w-56 -translate-x-1/2 rounded-full bg-[#7228FF]/25 blur-3xl" />
                    <Image
                        src="/nexiplay-emblem.png"
                        alt="Nexiplay emblem"
                        width={512}
                        height={358}
                        priority
                        sizes="(max-width: 640px) 208px, 240px"
                        className="relative h-auto w-52 drop-shadow-[0_0_26px_rgba(146,115,245,0.5)] sm:w-60"
                    />
                    <p className="mt-1 text-2xl font-black tracking-[0.08em] text-white drop-shadow-[0_0_18px_rgba(146,115,245,0.55)] sm:text-3xl">
                        NEXI<span className="text-[#A77BFF]">PLAY</span>
                    </p>
                </div>

                {/* Elegant Loader */}
                <div className="np-splash-loader mt-6 h-[3px] w-36 overflow-hidden rounded-full bg-white/[0.09]">
                    <span />
                </div>
                <p className="np-splash-caption mt-3 text-[10px] font-semibold uppercase tracking-[0.25em] text-[#ADA6B9]/80">
                    Curating your next watch
                </p>
            </div>
        </div>
    );
}
