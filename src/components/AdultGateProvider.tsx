'use client';

import { createContext, useContext, useState, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';

const ADULT_VERIFIED_KEY = 'adult_verified_time';
const EXPIRY_MS = 60000; // 1 minute

/** Check if adult verification is still valid (within 60 seconds) */
export function isAdultVerified(): boolean {
    if (typeof window === 'undefined') return false;
    const savedTime = localStorage.getItem(ADULT_VERIFIED_KEY);
    if (!savedTime) return false;
    return Date.now() - parseInt(savedTime, 10) < EXPIRY_MS;
}

interface AdultGateContextType {
    checkAdultGate: (url: string, isAdult: boolean) => void;
}

const AdultGateContext = createContext<AdultGateContextType>({
    checkAdultGate: () => {},
});

export function useAdultGate() {
    return useContext(AdultGateContext);
}

export default function AdultGateProvider({ children }: { children: React.ReactNode }) {
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isClosing, setIsClosing] = useState(false);
    const pendingUrlRef = useRef<string | null>(null);
    const router = useRouter();

    const checkAdultGate = useCallback((url: string, isAdult: boolean) => {
        // Non-adult content → navigate immediately
        if (!isAdult) {
            router.push(url);
            return;
        }

        // Adult content + verified within last 60 seconds → navigate immediately
        if (isAdultVerified()) {
            router.push(url);
            return;
        }

        // Adult content + NOT verified / expired → show modal
        pendingUrlRef.current = url;
        setIsClosing(false);
        setIsModalOpen(true);
    }, [router]);

    const handleAgree = () => {
        if (typeof window !== 'undefined') {
            localStorage.setItem(ADULT_VERIFIED_KEY, Date.now().toString());
        }
        closeModal();
        if (pendingUrlRef.current) {
            router.push(pendingUrlRef.current);
            pendingUrlRef.current = null;
        }
    };

    const closeModal = () => {
        setIsClosing(true);
        setTimeout(() => {
            setIsModalOpen(false);
            setIsClosing(false);
            pendingUrlRef.current = null;
        }, 250);
    };

    return (
        <AdultGateContext.Provider value={{ checkAdultGate }}>
            {children}

            {/* Age Verification Modal */}
            {isModalOpen && (
                <div
                    className={`fixed inset-0 z-[9999] flex items-center justify-center p-4 ${isClosing ? 'adult-gate-backdrop-out' : 'adult-gate-backdrop-in'}`}
                    onClick={closeModal}
                >
                    {/* Blur Backdrop */}
                    <div className="absolute inset-0 bg-black/70 backdrop-blur-xl" />

                    {/* Modal Card */}
                    <div
                        className={`relative max-w-md w-full rounded-2xl overflow-hidden ${isClosing ? 'adult-gate-modal-out' : 'adult-gate-modal-in'}`}
                        onClick={(e) => e.stopPropagation()}
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
                                    onClick={closeModal}
                                    className="flex-1 px-6 py-3.5 rounded-xl bg-white/5 border border-white/10 text-gray-300 font-semibold hover:bg-white/10 hover:border-white/20 transition-all duration-200 active:scale-95"
                                >
                                    Cancel
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
            )}
        </AdultGateContext.Provider>
    );
}
