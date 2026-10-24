'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { createPortal } from 'react-dom';
import { openAdTab } from '@/components/ads/PopunderAd';
import { saveDownloadVerification } from '@/lib/verification';

interface AdVerificationPopupProps {
    onVerified: () => void;
    adUrl1: string;
    adUrl2?: string;
    contentType?: 'stream' | 'download' | 'novel';
    contentId?: string | number | null;
    downloadUrl?: string;
    initialStep?: 1 | 2;
    onClose?: () => void;
}

const COUNTDOWN_SECONDS = 3;

export default function AdVerificationPopup({
    onVerified,
    adUrl1,
    adUrl2,
    contentType = 'download',
    contentId,
    downloadUrl,
    initialStep,
    onClose,
}: AdVerificationPopupProps) {
    const [isMounted, setIsMounted] = useState(false);

    // Filter and sanitize Ad URLs
    const cleanUrl1 = (adUrl1 || '').trim() || 'https://conscientiouscabbagedrift.com/i34zfjnf8a?key=d1f489ba7cbff1a10bfbdbb532526ed0';
    const rawUrl2 = (adUrl2 || '').trim();
    const isDistinctSecondAd = Boolean(
        rawUrl2 &&
        rawUrl2 !== cleanUrl1 &&
        rawUrl2 !== 'https://nexiplay.live' &&
        rawUrl2 !== 'https://nexiplay.com' &&
        !rawUrl2.includes(typeof window !== 'undefined' ? window.location.hostname : 'nexiplay')
    );
    const cleanUrl2 = isDistinctSecondAd ? rawUrl2 : null;
    const totalSteps = cleanUrl2 ? 2 : 1;

    // Helper to detect if Step 2 is active via initialStep, localStorage, or URL param
    const checkIsStep2Active = (): boolean => {
        if (initialStep === 2) return true;
        if (typeof window === 'undefined') return false;
        try {
            const raw = localStorage.getItem('np_active_verification');
            if (raw) {
                const data = JSON.parse(raw);
                if (data.step === 2 && Date.now() - data.timestamp < 120000) {
                    return true;
                }
            }
            const params = new URLSearchParams(window.location.search);
            if (params.get('np_verify_step') === '2') return true;
        } catch {}
        return false;
    };

    // Step state: auto-detect if Step 2 is active
    const [currentStep, setCurrentStep] = useState<1 | 2>(() => (checkIsStep2Active() ? 2 : 1));
    const [step1Completed, setStep1Completed] = useState<boolean>(() => checkIsStep2Active());
    const [step2Completed, setStep2Completed] = useState(false);
    const [isVerifying, setIsVerifying] = useState(false);
    const [countdown, setCountdown] = useState(COUNTDOWN_SECONDS);
    const [showSuccess, setShowSuccess] = useState(false);

    // Timers & timestamp references (ensures timer works even when user switches tabs to view ad)
    const targetEndTimeRef = useRef<number | null>(null);
    const intervalRef = useRef<NodeJS.Timeout | null>(null);
    const hasTriggeredVerifiedRef = useRef(false);

    useEffect(() => {
        setIsMounted(true);
        if (checkIsStep2Active()) {
            setCurrentStep(2);
            setStep1Completed(true);
        }
        // Silently clean up np_verify query parameters from address bar if present
        try {
            const params = new URLSearchParams(window.location.search);
            if (params.get('np_verify_step')) {
                const cleanUrl = new URL(window.location.href);
                cleanUrl.searchParams.delete('np_verify_step');
                cleanUrl.searchParams.delete('np_verify_cid');
                cleanUrl.searchParams.delete('np_verify_type');
                cleanUrl.searchParams.delete('np_verify_dl');
                window.history.replaceState({}, '', cleanUrl.toString());
            }
        } catch (e) {}
    }, [initialStep]);

    // Allow ESC key to close
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape' && onClose) {
                e.preventDefault();
                onClose();
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [onClose]);

    // Handle Countdown ticking with Date.now() timestamp check
    const checkTimerProgress = useCallback(() => {
        if (!targetEndTimeRef.current) return;
        const remainingMs = targetEndTimeRef.current - Date.now();
        const remainingSec = Math.max(0, Math.ceil(remainingMs / 1000));
        setCountdown(remainingSec);

        if (remainingMs <= 0) {
            // Timer finished
            if (intervalRef.current) {
                clearInterval(intervalRef.current);
                intervalRef.current = null;
            }
            targetEndTimeRef.current = null;
            setIsVerifying(false);

            if (currentStep === 1) {
                setStep1Completed(true);
                if (totalSteps === 1) {
                    triggerFinalSuccess();
                } else {
                    setCurrentStep(2);
                    setCountdown(COUNTDOWN_SECONDS);
                }
            } else {
                setStep2Completed(true);
                triggerFinalSuccess();
            }
        }
    }, [currentStep, totalSteps]);

    // Visibility change listener: When user switches back from the ad tab to Nexiplay tab, instantly recalculate progress
    useEffect(() => {
        const handleVisibilityChange = () => {
            if (document.visibilityState === 'visible' && isVerifying) {
                checkTimerProgress();
            }
        };
        document.addEventListener('visibilitychange', handleVisibilityChange);
        return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
    }, [isVerifying, checkTimerProgress]);

    // Active Interval for countdown
    useEffect(() => {
        if (isVerifying && targetEndTimeRef.current) {
            intervalRef.current = setInterval(() => {
                checkTimerProgress();
            }, 300);
        } else {
            if (intervalRef.current) {
                clearInterval(intervalRef.current);
                intervalRef.current = null;
            }
        }
        return () => {
            if (intervalRef.current) {
                clearInterval(intervalRef.current);
                intervalRef.current = null;
            }
        };
    }, [isVerifying, checkTimerProgress]);

    // Complete the verification flow
    const triggerFinalSuccess = () => {
        if (hasTriggeredVerifiedRef.current) return;
        hasTriggeredVerifiedRef.current = true;
        setShowSuccess(true);

        // 1. Immediately persist verification record in localStorage
        if (contentId) {
            saveDownloadVerification(contentId, contentType);
        } else {
            saveDownloadVerification('global', contentType);
        }

        // 2. Notify parent listener
        onVerified();

        // 3. Attempt to auto-open download URL if provided
        if (downloadUrl && typeof window !== 'undefined') {
            try {
                const win = window.open(downloadUrl, '_blank');
                if (win) {
                    try { win.blur(); window.focus(); } catch {}
                }
            } catch (e) {}
        }
    };

    // User clicks Step 1 (True Tab-Under: Nexiplay Step 2 in front, Ad 1 in back tab)
    const handleStep1Click = () => {
        if (isVerifying) return;
        try {
            sessionStorage.setItem('nexiplay_splash_seen', 'true');
            localStorage.setItem('nexiplay_splash_seen', Date.now().toString());
        } catch {}

        if (totalSteps === 2) {
            // Save Step 2 state in localStorage so the new tab is 100% guaranteed to resume at Step 2
            try {
                localStorage.setItem('np_active_verification', JSON.stringify({
                    step: 2,
                    contentId: contentId ? String(contentId) : null,
                    contentType,
                    downloadUrl: downloadUrl || null,
                    timestamp: Date.now()
                }));
            } catch {}

            // True Tab-Under for Step 1:
            try {
                const nextUrl = new URL(window.location.href);
                nextUrl.searchParams.set('np_verify_step', '2');
                if (contentId) nextUrl.searchParams.set('np_verify_cid', String(contentId));
                if (contentType) nextUrl.searchParams.set('np_verify_type', contentType);
                if (downloadUrl) nextUrl.searchParams.set('np_verify_dl', encodeURIComponent(downloadUrl));

                const newTab = window.open(nextUrl.toString(), '_blank');
                if (newTab) {
                    // Current tab (now in background / back tab) navigates to Ad 1:
                    setTimeout(() => {
                        try {
                            window.location.replace(cleanUrl1);
                        } catch {
                            window.location.href = cleanUrl1;
                        }
                    }, 80);
                    return;
                }
            } catch (e) {}
        } else {
            // totalSteps === 1: User finishes verification in 1 step!
            if (contentId) {
                saveDownloadVerification(contentId, contentType);
            } else {
                saveDownloadVerification('global', contentType);
            }
            onVerified();

            if (downloadUrl) {
                try {
                    const dlTab = window.open(downloadUrl, '_blank');
                    if (dlTab) {
                        setTimeout(() => {
                            try {
                                window.location.replace(cleanUrl1);
                            } catch {
                                window.location.href = cleanUrl1;
                            }
                        }, 80);
                        return;
                    }
                } catch (e) {}
            }
        }

        // Fallback if browser blocked opening new tab: keep user on this tab with countdown
        openAdTab(cleanUrl1);
        targetEndTimeRef.current = Date.now() + COUNTDOWN_SECONDS * 1000;
        setCountdown(COUNTDOWN_SECONDS);
        setIsVerifying(true);
    };

    // User clicks Step 2 (True Tab-Under: Download mirror in front, Ad 2 in back tab)
    const handleStep2Click = () => {
        if (isVerifying) return;
        const targetAd = cleanUrl2 || cleanUrl1;

        // Clean active verification payload
        try {
            localStorage.removeItem('np_active_verification');
        } catch {}

        // 1. Immediately persist verification record in localStorage
        if (contentId) {
            saveDownloadVerification(contentId, contentType);
        } else {
            saveDownloadVerification('global', contentType);
        }
        onVerified();

        // 2. True Tab-Under for Final Step:
        if (downloadUrl) {
            try {
                // Open direct download / mirror in active FOREGROUND tab:
                const dlTab = window.open(downloadUrl, '_blank');
                if (dlTab) {
                    // Current tab (now in background / back tab) replaces with Ad 2:
                    setTimeout(() => {
                        try {
                            window.location.replace(targetAd);
                        } catch {
                            window.location.href = targetAd;
                        }
                    }, 80);
                    return;
                }
            } catch (e) {}
        }

        // Fallback if no downloadUrl or popup blocked: in-page countdown
        openAdTab(targetAd);
        targetEndTimeRef.current = Date.now() + COUNTDOWN_SECONDS * 1000;
        setCountdown(COUNTDOWN_SECONDS);
        setIsVerifying(true);
    };

    const progress = isVerifying
        ? Math.min(100, Math.max(0, ((COUNTDOWN_SECONDS - countdown) / COUNTDOWN_SECONDS) * 100))
        : 0;

    if (!isMounted || typeof document === 'undefined') {
        return null;
    }

    // Modal Content
    const modalContent = (
        <div
            id="ad-verification-modal"
            data-verification-modal="true"
            className="ad-verification-popup fixed inset-0 z-[99999] flex items-center justify-center bg-black/85 backdrop-blur-md p-4 animate-in fade-in duration-150"
            style={{ userSelect: 'none' }}
            onClick={(e) => {
                if (e.target === e.currentTarget && onClose) onClose();
            }}
        >
            <div
                id="np-cloud-gateway"
                className="relative w-full max-w-sm rounded-3xl overflow-hidden bg-[#141221] border border-white/20 shadow-[0_25px_80px_rgba(0,0,0,0.95)] p-6 sm:p-7 space-y-5 animate-in zoom-in-95 duration-150"
                onClick={(e) => e.stopPropagation()}
            >
                {/* Close Button */}
                {onClose && (
                    <button
                        type="button"
                        onClick={onClose}
                        className="absolute top-4 right-4 w-8 h-8 rounded-full bg-white/5 hover:bg-white/15 text-gray-400 hover:text-white flex items-center justify-center transition-colors cursor-pointer text-sm font-bold z-10"
                        title="Close"
                    >
                        ✕
                    </button>
                )}

                {/* ── SUCCESS STATE ── */}
                {showSuccess ? (
                    <div className="flex flex-col items-center text-center gap-4 py-2 animate-in zoom-in-95 duration-200">
                        <div className="w-16 h-16 rounded-2xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center justify-center shadow-[0_0_40px_rgba(16,185,129,0.35)] animate-bounce">
                            <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                            </svg>
                        </div>
                        <div className="space-y-1">
                            <h3 className="text-xl font-black text-white">Access Granted!</h3>
                            <p className="text-xs text-emerald-400 font-semibold">
                                {contentType === 'download'
                                    ? 'Your cloud mirror download link is unlocked.'
                                    : `Your ${contentType} has been unlocked.`}
                            </p>
                        </div>

                        {/* Direct Download Button (Reliable 100% user-gesture click) */}
                        {downloadUrl ? (
                            <div className="w-full pt-2 space-y-2">
                                <a
                                    href={downloadUrl}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    onClick={() => {
                                        if (onClose) onClose();
                                    }}
                                    className="w-full py-3.5 rounded-2xl font-black text-sm tracking-wide bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-black shadow-lg shadow-emerald-500/30 hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center justify-center gap-2 cursor-pointer"
                                >
                                    <span>Download Now</span>
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2.5}>
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                                    </svg>
                                </a>
                                <p className="text-[10px] text-gray-500 font-medium">
                                    Click above if your download did not start automatically.
                                </p>
                            </div>
                        ) : (
                            <div className="w-full pt-2">
                                <button
                                    type="button"
                                    onClick={() => {
                                        if (onClose) onClose();
                                    }}
                                    className="w-full py-3 rounded-2xl font-extrabold text-xs bg-white/10 hover:bg-white/20 text-white transition-colors cursor-pointer"
                                >
                                    Continue
                                </button>
                            </div>
                        )}
                    </div>
                ) : (
                    /* ── VERIFICATION GATEWAY STATE ── */
                    <>
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
                                {totalSteps === 2
                                    ? currentStep === 1
                                        ? 'Step 1 of 2: Click continue to scan cloud server.'
                                        : 'Step 2 of 2: Click below to unlock your direct mirror.'
                                    : 'Click continue to verify and unlock your direct cloud mirror.'}
                            </p>
                        </div>

                        {/* Stepper Indicator (shown only when 2 steps are configured) */}
                        {totalSteps === 2 && (
                            <div className="flex items-center justify-center gap-2 pt-1 pb-1">
                                <div className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-extrabold transition-all ${
                                    step1Completed
                                        ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                                        : currentStep === 1
                                            ? 'bg-violet-500/20 text-violet-300 border border-violet-500/40 shadow-sm shadow-violet-500/30'
                                            : 'bg-white/5 text-gray-500 border border-white/5'
                                }`}>
                                    <span>{step1Completed ? '✓' : '1'}</span>
                                    <span>Scanning</span>
                                </div>

                                <div className={`w-6 h-0.5 rounded-full transition-colors ${
                                    step1Completed ? 'bg-emerald-500/50' : 'bg-white/10'
                                }`} />

                                <div className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-extrabold transition-all ${
                                    step2Completed
                                        ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                                        : currentStep === 2
                                            ? 'bg-violet-500/20 text-violet-300 border border-violet-500/40 shadow-sm shadow-violet-500/30'
                                            : 'bg-white/5 text-gray-500 border border-white/5'
                                }`}>
                                    <span>{step2Completed ? '✓' : '2'}</span>
                                    <span>Unlock</span>
                                </div>
                            </div>
                        )}

                        {/* Progress Bar (during countdown) */}
                        {isVerifying && (
                            <div className="w-full h-2 bg-white/10 rounded-full overflow-hidden">
                                <div
                                    className="h-full bg-gradient-to-r from-violet-500 via-purple-500 to-indigo-500 rounded-full transition-all duration-300 ease-linear shadow-[0_0_12px_rgba(139,92,246,0.6)]"
                                    style={{ width: `${progress}%` }}
                                />
                            </div>
                        )}

                        {/* Action Buttons */}
                        <div className="space-y-2 pt-1">
                            {isVerifying ? (
                                <div className="w-full py-3.5 rounded-2xl font-bold text-xs text-gray-200 bg-white/5 border border-white/10 flex items-center justify-center gap-2.5">
                                    <div className="w-4 h-4 border-2 border-violet-400 border-t-transparent rounded-full animate-spin" />
                                    <span>
                                        {currentStep === 1 ? 'Scanning connection' : 'Unlocking download'} ({countdown}s)...
                                    </span>
                                </div>
                            ) : currentStep === 1 ? (
                                <button
                                    type="button"
                                    onClick={handleStep1Click}
                                    className="w-full py-3.5 rounded-2xl font-extrabold text-sm tracking-wide bg-gradient-to-r from-violet-600 via-purple-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white shadow-lg shadow-violet-600/30 hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center justify-center gap-2 cursor-pointer"
                                >
                                    <span>{totalSteps === 2 ? 'Continue to Step 1' : 'Continue to Download'}</span>
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2.5}>
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
                                    </svg>
                                </button>
                            ) : (
                                <button
                                    type="button"
                                    onClick={handleStep2Click}
                                    className="w-full py-3.5 rounded-2xl font-extrabold text-sm tracking-wide bg-gradient-to-r from-indigo-600 via-purple-600 to-emerald-600 hover:from-indigo-500 hover:to-emerald-500 text-white shadow-lg shadow-indigo-600/30 hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center justify-center gap-2 cursor-pointer animate-pulse"
                                >
                                    <span>Proceed to Final Step ➔</span>
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2.5}>
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
                                    </svg>
                                </button>
                            )}

                            {onClose && (
                                <button
                                    type="button"
                                    onClick={onClose}
                                    className="w-full py-1.5 text-xs font-semibold text-gray-400 hover:text-white transition-colors cursor-pointer"
                                >
                                    Cancel
                                </button>
                            )}

                            <p className="text-[10px] text-gray-500 text-center font-medium pt-0.5">
                                Opens sponsor in a new tab • Return here to unlock
                            </p>
                        </div>
                    </>
                )}
            </div>
        </div>
    );

    return createPortal(modalContent, document.body);
}
