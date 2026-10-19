'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { getCookieConsent, setCookieConsent } from '@/lib/cookies';

export default function CookieConsent() {
    const [isVisible, setIsVisible] = useState(false);

    useEffect(() => {
        // Small delay before showing so it doesn't flash during initial render
        const timer = setTimeout(() => {
            const consent = getCookieConsent();
            if (!consent) {
                setIsVisible(true);
            }
        }, 1200);

        return () => clearTimeout(timer);
    }, []);

    const handleAcceptAll = () => {
        setCookieConsent('all');
        setIsVisible(false);
    };

    const handleEssentialOnly = () => {
        setCookieConsent('essential');
        setIsVisible(false);
    };

    if (!isVisible) return null;

    return (
        <aside
            aria-label="Cookie consent banner"
            className="fixed bottom-4 left-4 right-4 sm:left-auto sm:right-6 sm:bottom-6 sm:max-w-md z-[99998] transition-all duration-500 ease-out animate-fadeIn"
        >
            <div className="relative p-5 rounded-3xl bg-[#141022]/95 backdrop-blur-2xl border border-white/10 shadow-[0_12px_40px_rgba(0,0,0,0.6)] space-y-4">
                {/* Header with Icon */}
                <div className="flex items-start gap-3.5">
                    <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-violet-600/30 to-fuchsia-600/30 border border-violet-500/30 flex items-center justify-center shrink-0 text-xl shadow-inner">
                        🍪
                    </div>
                    <div className="space-y-1">
                        <h3 className="text-sm font-extrabold text-white tracking-tight flex items-center gap-2">
                            <span>Cookie Preferences</span>
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                        </h3>
                        <p className="text-xs text-gray-300 leading-relaxed">
                            We use cookies to maintain your playback progress, remember watchlist settings, and optimize streaming performance.
                        </p>
                    </div>
                </div>

                {/* Privacy Links & Info */}
                <div className="text-[11px] text-gray-400 flex items-center gap-3">
                    <Link href="/privacy-policy" className="hover:text-violet-300 underline underline-offset-2 transition-colors">
                        Privacy Policy
                    </Link>
                    <span>•</span>
                    <Link href="/terms" className="hover:text-violet-300 underline underline-offset-2 transition-colors">
                        Terms of Service
                    </Link>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2.5 pt-1">
                    <button
                        onClick={handleAcceptAll}
                        className="flex-1 py-2.5 px-4 rounded-xl bg-gradient-to-r from-violet-600 to-fuchsia-600 hover:from-violet-500 hover:to-fuchsia-500 text-white font-extrabold text-xs shadow-[0_0_18px_rgba(146,115,245,0.35)] transition-all active:scale-95"
                    >
                        Accept All
                    </button>
                    <button
                        onClick={handleEssentialOnly}
                        className="py-2.5 px-4 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-gray-300 hover:text-white font-bold text-xs transition-all active:scale-95"
                    >
                        Essential Only
                    </button>
                </div>
            </div>
        </aside>
    );
}
