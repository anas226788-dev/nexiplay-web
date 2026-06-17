'use client';

import { useState, useEffect, useCallback, useRef } from 'react';

interface AdVerificationPopupProps {
    onVerified: () => void;
    adUrl1: string;
    adUrl2: string;
}

const COUNTDOWN_SECONDS = 10;

export default function AdVerificationPopup({ onVerified, adUrl1, adUrl2 }: AdVerificationPopupProps) {
    const [currentStep, setCurrentStep] = useState<1 | 2>(1);
    const [adClicked, setAdClicked] = useState(false);
    const [countdown, setCountdown] = useState(COUNTDOWN_SECONDS);
    const [stepComplete, setStepComplete] = useState(false);
    const [showSuccess, setShowSuccess] = useState(false);
    const countdownRef = useRef<NodeJS.Timeout | null>(null);

    // Block ESC key
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape') {
                e.preventDefault();
                e.stopPropagation();
            }
        };
        window.addEventListener('keydown', handleKeyDown, true);
        return () => window.removeEventListener('keydown', handleKeyDown, true);
    }, []);

    // Countdown timer
    useEffect(() => {
        if (!adClicked) return;

        if (countdown <= 0) {
            setStepComplete(true);
            return;
        }

        countdownRef.current = setTimeout(() => {
            setCountdown(prev => prev - 1);
        }, 1000);

        return () => {
            if (countdownRef.current) clearTimeout(countdownRef.current);
        };
    }, [adClicked, countdown]);

    const handleAdClick = useCallback(() => {
        const url = currentStep === 1 ? adUrl1 : adUrl2;
        if (url) {
            window.open(url, '_blank', 'noopener,noreferrer');
        }
        setAdClicked(true);
        setCountdown(COUNTDOWN_SECONDS);
    }, [currentStep, adUrl1, adUrl2]);

    const handleProceed = useCallback(() => {
        if (currentStep === 1) {
            setCurrentStep(2);
            setAdClicked(false);
            setCountdown(COUNTDOWN_SECONDS);
            setStepComplete(false);
        } else {
            setShowSuccess(true);
            setTimeout(() => {
                onVerified();
            }, 1200);
        }
    }, [currentStep, onVerified]);

    const progress = adClicked ? ((COUNTDOWN_SECONDS - countdown) / COUNTDOWN_SECONDS) * 100 : 0;

    if (showSuccess) {
        return (
            <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/80 backdrop-blur-xl" style={{ userSelect: 'none' }}>
                <div className="flex flex-col items-center gap-4 animate-pulse">
                    <div className="w-20 h-20 rounded-full bg-gradient-to-br from-emerald-400 to-cyan-400 flex items-center justify-center shadow-[0_0_60px_rgba(0,255,200,0.4)]">
                        <svg className="w-10 h-10 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                        </svg>
                    </div>
                    <p className="text-white font-bold text-lg">Verification Complete!</p>
                    <p className="text-cyan-300/70 text-sm">Unlocking your stream...</p>
                </div>
            </div>
        );
    }

    return (
        <div
            className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/85 backdrop-blur-xl p-4"
            style={{ userSelect: 'none' }}
            onClick={(e) => e.stopPropagation()}
        >
            {/* Ambient glow */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] rounded-full bg-cyan-500/5 blur-[120px] pointer-events-none" />

            {/* Main Card */}
            <div className="relative w-full max-w-md rounded-3xl overflow-hidden">
                {/* Animated border glow */}
                <div className="absolute -inset-[1px] rounded-3xl bg-gradient-to-b from-cyan-500/30 via-cyan-500/10 to-transparent pointer-events-none" />

                <div className="relative bg-[#0d1117]/95 backdrop-blur-2xl rounded-3xl p-8 border border-white/[0.06]">

                    {/* Step indicator */}
                    <div className="flex items-center justify-center gap-3 mb-7">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-black transition-all duration-500 ${
                            currentStep >= 1 
                                ? 'bg-gradient-to-br from-cyan-400 to-emerald-400 text-black shadow-[0_0_20px_rgba(0,255,200,0.3)]' 
                                : 'bg-white/10 text-gray-500'
                        }`}>1</div>
                        <div className={`w-12 h-[2px] transition-all duration-700 ${
                            currentStep >= 2 ? 'bg-gradient-to-r from-cyan-400 to-emerald-400' : 'bg-white/10'
                        }`} />
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-black transition-all duration-500 ${
                            currentStep >= 2 
                                ? 'bg-gradient-to-br from-cyan-400 to-emerald-400 text-black shadow-[0_0_20px_rgba(0,255,200,0.3)]' 
                                : 'bg-white/10 text-gray-500'
                        }`}>2</div>
                    </div>

                    {/* Shield / Lock Icon */}
                    <div className="flex justify-center mb-5">
                        <div className="relative">
                            <div className={`w-16 h-16 rounded-2xl flex items-center justify-center transition-all duration-500 ${
                                currentStep === 1
                                    ? 'bg-gradient-to-br from-cyan-500/20 to-emerald-500/10 border border-cyan-500/20'
                                    : 'bg-gradient-to-br from-amber-500/20 to-orange-500/10 border border-amber-500/20'
                            }`}>
                                {currentStep === 1 ? (
                                    <svg className="w-8 h-8 text-cyan-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" />
                                    </svg>
                                ) : (
                                    <svg className="w-8 h-8 text-amber-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" />
                                    </svg>
                                )}
                            </div>
                            {/* Pulse ring */}
                            <div className={`absolute inset-0 rounded-2xl animate-ping opacity-20 ${
                                currentStep === 1 ? 'bg-cyan-500' : 'bg-amber-500'
                            }`} style={{ animationDuration: '2s' }} />
                        </div>
                    </div>

                    {/* Badge */}
                    <div className="flex justify-center mb-4">
                        <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest ${
                            currentStep === 1
                                ? 'bg-cyan-500/10 text-cyan-400 border border-cyan-500/20'
                                : 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                        }`}>
                            <span className={`w-1.5 h-1.5 rounded-full animate-pulse ${
                                currentStep === 1 ? 'bg-cyan-400' : 'bg-amber-400'
                            }`} />
                            {currentStep === 1 ? 'Secure Scanning' : 'Final Verification'}
                        </span>
                    </div>

                    {/* Title */}
                    <h2 className="text-center text-white font-black text-xl mb-2">
                        {currentStep === 1 ? 'Scanning Link...' : 'Almost There...'}
                    </h2>
                    <p className="text-center text-gray-400 text-sm mb-5 leading-relaxed">
                        {currentStep === 1
                            ? 'Please wait while we establish a secure connection.'
                            : 'Complete the final verification to unlock your stream.'}
                    </p>

                    {/* Support message */}
                    <div className="bg-white/[0.03] border border-white/[0.06] rounded-xl p-4 mb-5">
                        <p className="text-center text-gray-400/80 text-[11px] leading-relaxed">
                            <span className="text-cyan-400/90 font-bold">💡 Why this step?</span>
                            <br />
                            Nothing in the world is truly free. Our streaming servers cost real money to run — by completing this quick verification, you&apos;re directly supporting our content providers. 
                            <span className="text-white/60 font-semibold"> Thank you for keeping Nexiplay alive! ❤️</span>
                        </p>
                    </div>

                    {/* Warning */}
                    <div className="flex items-center justify-center gap-2 mb-5">
                        <span className="text-[11px] text-yellow-500/70 font-bold flex items-center gap-1.5">
                            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
                            </svg>
                            Please Minimize/Ignore any Pop-up Ads
                        </span>
                    </div>

                    {/* Progress bar (visible during countdown) */}
                    {adClicked && !stepComplete && (
                        <div className="w-full h-1.5 bg-white/5 rounded-full mb-5 overflow-hidden">
                            <div
                                className={`h-full rounded-full transition-all duration-1000 ease-linear ${
                                    currentStep === 1
                                        ? 'bg-gradient-to-r from-cyan-500 to-emerald-400'
                                        : 'bg-gradient-to-r from-amber-500 to-orange-400'
                                }`}
                                style={{ width: `${progress}%` }}
                            />
                        </div>
                    )}

                    {/* Action Button */}
                    {!adClicked ? (
                        <button
                            onClick={handleAdClick}
                            className={`w-full py-4 rounded-2xl font-black text-sm tracking-wide transition-all duration-300 flex items-center justify-center gap-2 ${
                                currentStep === 1
                                    ? 'bg-gradient-to-r from-cyan-500 to-emerald-400 text-black hover:shadow-[0_0_40px_rgba(0,255,200,0.25)] hover:scale-[1.02] active:scale-[0.98]'
                                    : 'bg-gradient-to-r from-amber-500 to-orange-400 text-black hover:shadow-[0_0_40px_rgba(255,180,0,0.25)] hover:scale-[1.02] active:scale-[0.98]'
                            }`}
                        >
                            {currentStep === 1 ? 'Click to Verify' : 'Complete Verification'}
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
                            </svg>
                        </button>
                    ) : !stepComplete ? (
                        <button
                            disabled
                            className="w-full py-4 rounded-2xl font-black text-sm tracking-wide bg-white/5 text-gray-400 border border-white/10 cursor-not-allowed flex items-center justify-center gap-2"
                        >
                            <div className="w-4 h-4 border-2 border-gray-500 border-t-transparent rounded-full animate-spin" />
                            Verifying... ({countdown}s)
                        </button>
                    ) : (
                        <button
                            onClick={handleProceed}
                            className={`w-full py-4 rounded-2xl font-black text-sm tracking-wide transition-all duration-300 flex items-center justify-center gap-2 animate-pulse ${
                                currentStep === 1
                                    ? 'bg-gradient-to-r from-cyan-500 to-emerald-400 text-black hover:shadow-[0_0_40px_rgba(0,255,200,0.25)]'
                                    : 'bg-gradient-to-r from-emerald-500 to-green-400 text-black hover:shadow-[0_0_40px_rgba(0,255,100,0.25)]'
                            }`}
                        >
                            {currentStep === 1 ? 'Proceed to Step 2' : '🎬 Unlock Stream'}
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
                            </svg>
                        </button>
                    )}

                    {/* Footer info */}
                    <div className="mt-5 flex items-center justify-center">
                        <span className="text-[9px] text-gray-600 uppercase tracking-widest font-bold">
                            Encryption: AES-256 • ID: {Math.random().toString(36).substring(2, 7).toUpperCase()}
                        </span>
                    </div>
                </div>
            </div>
        </div>
    );
}
