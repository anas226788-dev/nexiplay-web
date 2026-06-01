'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

const ADULT_VERIFIED_KEY = 'adult_verified_time';
const EXPIRY_MS = 60000; // 1 minute

/**
 * Client-side guard for direct URL access to adult content pages.
 * Wraps the page content and blocks rendering until 18+ verification is confirmed.
 * If user cancels, they are redirected to the home page.
 */
export default function AdultGateGuard({ children }: { children: React.ReactNode }) {
    const [status, setStatus] = useState<'checking' | 'verified' | 'blocked'>('checking');
    const [isClosing, setIsClosing] = useState(false);
    const router = useRouter();

    useEffect(() => {
        const savedTime = localStorage.getItem(ADULT_VERIFIED_KEY);
        if (savedTime && Date.now() - parseInt(savedTime, 10) < EXPIRY_MS) {
            setStatus('verified');
        } else {
            setStatus('blocked');
        }
    }, []);

    const handleAgree = () => {
        localStorage.setItem(ADULT_VERIFIED_KEY, Date.now().toString());
        setIsClosing(true);
        setTimeout(() => {
            setStatus('verified');
            setIsClosing(false);
        }, 300);
    };

    const handleCancel = () => {
        setIsClosing(true);
        setTimeout(() => {
            router.push('/');
        }, 250);
    };

    // Still checking localStorage — show nothing (avoids flash)
    if (status === 'checking') {
        return null;
    }

    // Verified — render page content
    if (status === 'verified') {
        return <>{children}</>;
    }

    // Blocked — show full-screen age gate overlay (content hidden behind it)
    return (
        <div className="min-h-screen relative">
            {/* Blurred placeholder background */}
            <div className="absolute inset-0 bg-dark-900" />

            {/* Age Gate Overlay */}
            <div
                className={`fixed inset-0 z-[9999] flex items-center justify-center p-4 ${isClosing ? 'adult-gate-backdrop-out' : 'adult-gate-backdrop-in'}`}
            >
                {/* Blur Backdrop */}
                <div className="absolute inset-0 bg-black/80 backdrop-blur-2xl" />

                {/* Modal Card */}
                <div
                    className={`relative max-w-md w-full rounded-2xl overflow-hidden ${isClosing ? 'adult-gate-modal-out' : 'adult-gate-modal-in'}`}
                >
                    {/* Glass Background */}
                    <div className="absolute inset-0 bg-gradient-to-br from-dark-700/80 via-dark-800/90 to-dark-900/95 backdrop-blur-2xl" />
                    <div className="absolute inset-0 border border-white/10 rounded-2xl" />

                    {/* Content */}
                    <div className="relative p-8 text-center">
                        {/* Icon */}
                        <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-red-600/20 border border-red-500/30 flex items-center justify-center">
                            <span className="text-4xl">🔞</span>
                        </div>

                        {/* Title */}
                        <h2 className="text-2xl font-black text-white mb-3 tracking-tight">
                            Age Restricted Content
                        </h2>
                        <div className="inline-block px-3 py-1 mb-5 rounded-full bg-red-600/20 border border-red-500/30">
                            <span className="text-red-400 text-xs font-bold uppercase tracking-wider">18+ Only</span>
                        </div>

                        {/* Message */}
                        <p className="text-gray-400 text-sm leading-relaxed mb-8">
                            This content is intended for users aged 18 or older.
                            By continuing, you confirm that you are at least 18 years of age.
                        </p>

                        {/* Actions */}
                        <div className="flex gap-3">
                            <button
                                onClick={handleCancel}
                                className="flex-1 px-6 py-3.5 rounded-xl bg-white/5 border border-white/10 text-gray-300 font-semibold hover:bg-white/10 hover:border-white/20 transition-all duration-200 active:scale-95"
                            >
                                Go Back
                            </button>
                            <button
                                onClick={handleAgree}
                                className="flex-1 px-6 py-3.5 rounded-xl bg-red-600 text-white font-bold hover:bg-red-500 transition-all duration-200 shadow-lg shadow-red-900/40 hover:shadow-red-800/60 active:scale-95"
                            >
                                I Am 18+
                            </button>
                        </div>

                        {/* Subtle disclaimer */}
                        <p className="text-[10px] text-gray-600 mt-4">
                            Verification is valid for 1 minute. You may be asked again after that.
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
}
