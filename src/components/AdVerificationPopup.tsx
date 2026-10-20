'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { createPortal } from 'react-dom';
import { openAdTab } from '@/components/ads/PopunderAd';

interface AdVerificationPopupProps {
    onVerified: () => void;
    adUrl1: string;
    adUrl2?: string;
    contentType?: 'stream' | 'download' | 'novel';
    onClose?: () => void;
}

const COUNTDOWN_SECONDS = 3;

export default function AdVerificationPopup({
    onVerified,
    adUrl1,
    adUrl2,
    contentType = 'download',
    onClose,
}: AdVerificationPopupProps) {
    const [isMounted, setIsMounted] = useState(false);
    const [adClicked, setAdClicked] = useState(false);
    const [countdown, setCountdown] = useState(COUNTDOWN_SECONDS);
    const [stepComplete, setStepComplete] = useState(false);
    const [showSuccess, setShowSuccess] = useState(false);
    const countdownRef = useRef<NodeJS.Timeout | null>(null);

    useEffect(() => {
        setIsMounted(true);
    }, []);

    // Allow ESC key to close if onClose is provided
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape') {
                e.preventDefault();
                if (onClose) onClose();
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [onClose]);

    // Fast 3-second countdown timer
    useEffect(() => {
        if (!adClicked) return;

        if (countdown <= 0) {
            setStepComplete(true);
            setShowSuccess(true);
            const timer = setTimeout(() => {
                onVerified();
            }, 600);
            return () => clearTimeout(timer);
        }

        countdownRef.current = setTimeout(() => {
            setCountdown(prev => Math.max(0, prev - 1));
        }, 1000);

        return () => {
            if (countdownRef.current) clearTimeout(countdownRef.current);
        };
    }, [adClicked, countdown, onVerified]);

    const handleAdClick = useCallback(() => {
        const targetAdUrl = adUrl1 || adUrl2 || 'https://nexiplay.live';

        if (targetAdUrl) {
            try {
                sessionStorage.setItem('nexiplay_splash_seen', 'true');
                localStorage.setItem('nexiplay_splash_seen', Date.now().toString());
            } catch {}

            // Open advertisement in a separate background / new tab
            try {
                const adWin = window.open(targetAdUrl, '_blank', 'noopener,noreferrer');
                if (!adWin) {
                    openAdTab(targetAdUrl);
                }
            } catch {
                openAdTab(targetAdUrl);
            }
        }

        setAdClicked(true);
    }, [adUrl1, adUrl2]);

    const progress = adClicked ? ((COUNTDOWN_SECONDS - countdown) / COUNTDOWN_SECONDS) * 100 : 0;

    if (!isMounted || typeof document === 'undefined') {
        return null;
    }

    if (showSuccess) {
        return createPortal(
            <div
                id="np-cloud-gateway"
                className="fixed inset-0 z-[99999] flex items-center justify-center bg-black/85 backdrop-blur-md p-4 animate-in fade-in duration-150"
                style={{ userSelect: 'none' }}
            >
                <div className="flex flex-col items-center gap-3 p-6 sm:p-7 rounded-3xl bg-[#141221] border border-emerald-500/40 shadow-[0_25px_80px_rgba(0,0,0,0.95)]">
                    <div className="w-14 h-14 rounded-2xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center justify-center shadow-[0_0_40px_rgba(16,185,129,0.3)]">
                        <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                        </svg>
                    </div>
                    <p className="text-white font-extrabold text-base">Access Granted</p>
                    <p className="text-emerald-400/80 text-xs font-medium">Opening your {contentType} link...</p>
                </div>
            </div>,
            document.body
        );
    }

    return createPortal(
        <div
            id="np-cloud-gateway"
            className="fixed inset-0 z-[99999] flex items-center justify-center bg-black/85 backdrop-blur-md p-4 animate-in fade-in duration-150"
            style={{ userSelect: 'none' }}
            onClick={(e) => {
                if (e.target === e.currentTarget && onClose) onClose();
            }}
        >
            {/* Modal Card - 100% Solid Opaque Background */}
            <div
                className="relative w-full max-w-sm rounded-3xl overflow-hidden bg-[#151221] border border-white/20 shadow-[0_25px_80px_rgba(0,0,0,0.95)] p-6 sm:p-7 space-y-5 animate-in zoom-in-95 duration-150"
                onClick={(e) => e.stopPropagation()}
            >
                {/* Close Button */}
                {onClose && (
                    <button
                        type="button"
                        onClick={onClose}
                        className="absolute top-4 right-4 w-8 h-8 rounded-full bg-white/5 hover:bg-white/15 text-gray-400 hover:text-white flex items-center justify-center transition-colors cursor-pointer text-sm font-bold"
                        title="Close"
                    >
                        ✕
                    </button>
                )}

                {/* Header Icon */}
                <div className="flex justify-center pt-1">
                    <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-violet-600/30 to-indigo-600/30 border border-violet-500/40 flex items-center justify-center text-violet-400 shadow-lg shadow-violet-900/40 text-2xl">
                        ⚡
                    </div>
                </div>

                {/* Title & Concise Subtitle */}
                <div className="text-center space-y-1">
                    <h3 className="text-lg font-black text-white">
                        {contentType === 'stream' ? 'Stream Gateway' : 'Download Gateway'}
                    </h3>
                    <p className="text-xs text-gray-400 font-medium">
                        Click continue to verify and open your direct cloud mirror.
                    </p>
                </div>

                {/* Progress Bar (during verification countdown) */}
                {adClicked && !stepComplete && (
                    <div className="w-full h-1.5 bg-white/10 rounded-full overflow-hidden">
                        <div
                            className="h-full bg-gradient-to-r from-violet-500 to-indigo-500 rounded-full transition-all duration-1000 ease-linear"
                            style={{ width: `${progress}%` }}
                        />
                    </div>
                )}

                {/* Action Button */}
                {!adClicked ? (
                    <div className="space-y-2">
                        <button
                            type="button"
                            onClick={handleAdClick}
                            className="w-full py-3.5 rounded-2xl font-extrabold text-sm tracking-wide bg-gradient-to-r from-violet-600 via-purple-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white shadow-lg shadow-violet-600/30 hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center justify-center gap-2 cursor-pointer"
                        >
                            <span>Continue to Download</span>
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2.5}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
                            </svg>
                        </button>
                        {onClose && (
                            <button
                                type="button"
                                onClick={onClose}
                                className="w-full py-2 text-xs font-semibold text-gray-400 hover:text-white transition-colors cursor-pointer"
                            >
                                Cancel
                            </button>
                        )}
                    </div>
                ) : (
                    <div className="w-full py-3.5 rounded-2xl font-bold text-xs text-gray-200 bg-white/5 border border-white/10 flex items-center justify-center gap-2.5">
                        <div className="w-4 h-4 border-2 border-violet-400 border-t-transparent rounded-full animate-spin" />
                        <span>Verifying connection ({countdown}s)...</span>
                    </div>
                )}
            </div>
        </div>,
        document.body
    );
}
