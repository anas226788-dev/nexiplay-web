'use client';

import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { AppConfig, WebLaunchModalConfig } from '@/lib/types';

const DEFAULT_CONFIG: WebLaunchModalConfig = {
    title: 'NexiPlay Android is here',
    subtitle: 'Meet the smoother way to watch anywhere.',
    features: [
        'Multi-dub audio support for more language options',
        'High-quality streaming with smoother playback',
        'Built for Android phones and Smart TV screens',
        'Faster browsing with a cleaner viewing experience'
    ],
    download_btn_text: 'Get the Android app',
    dismiss_btn_text: 'Maybe later'
};

const DISMISS_DURATION_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

export default function AppLaunchModal() {
    const [isVisible, setIsVisible] = useState(false);
    const [isDownloading, setIsDownloading] = useState(false);
    const [versionName, setVersionName] = useState('1.0.0');
    const [apkUrl, setApkUrl] = useState('');
    const [modalData, setModalData] = useState<WebLaunchModalConfig>(DEFAULT_CONFIG);

    useEffect(() => {
        let isMounted = true;

        async function init() {
            try {
                // Fetch web_launch_modal configuration
                const { data, error } = await supabase
                    .from('app_config')
                    .select('*')
                    .eq('id', 'web_launch_modal')
                    .maybeSingle();

                if (error) {
                    console.warn('[AppLaunchModal] Error fetching config:', error);
                    return;
                }

                if (!data) return;

                const row = data as AppConfig;

                // If master toggle is OFF, don't show
                if (!row.force_update) {
                    return;
                }

                const ver = row.latest_version_name || '1.0.0';
                if (isMounted) {
                    setVersionName(ver);
                    setApkUrl(row.apk_url || '');

                    // Parse release_notes JSON payload
                    if (row.release_notes) {
                        try {
                            const parsed = JSON.parse(row.release_notes);
                            setModalData({
                                title: parsed.title || DEFAULT_CONFIG.title,
                                subtitle: parsed.subtitle || DEFAULT_CONFIG.subtitle,
                                features: Array.isArray(parsed.features) && parsed.features.length > 0 ? parsed.features : DEFAULT_CONFIG.features,
                                download_btn_text: parsed.download_btn_text || DEFAULT_CONFIG.download_btn_text,
                                dismiss_btn_text: parsed.dismiss_btn_text || DEFAULT_CONFIG.dismiss_btn_text
                            });
                        } catch {
                            // If release_notes is plain text
                            setModalData(prev => ({
                                ...prev,
                                subtitle: row.release_notes
                            }));
                        }
                    }
                }

                // Check localStorage dismissal
                const storageKey = `nexiplay_app_launch_dismissed_v${ver}`;
                const dismissedAt = localStorage.getItem(storageKey);
                if (dismissedAt) {
                    const elapsed = Date.now() - parseInt(dismissedAt, 10);
                    if (elapsed < DISMISS_DURATION_MS) {
                        return; // Still in cool-off period
                    }
                }

                // Delay display by 1.2s for smooth initial page load
                const timer = setTimeout(() => {
                    if (isMounted) {
                        setIsVisible(true);
                    }
                }, 1200);

                return () => clearTimeout(timer);
            } catch (err) {
                console.error('[AppLaunchModal] Initialization error:', err);
            }
        }

        init();

        // Attach global helper to allow previewing anytime from console or admin
        (window as any).showNexiPlayAppModal = () => setIsVisible(true);

        return () => {
            isMounted = false;
        };
    }, []);

    const handleDismiss = () => {
        setIsVisible(false);
        try {
            const storageKey = `nexiplay_app_launch_dismissed_v${versionName}`;
            localStorage.setItem(storageKey, Date.now().toString());
        } catch (e) {
            console.warn('[AppLaunchModal] Failed to save dismissal:', e);
        }
    };

    const handleDownload = () => {
        setIsDownloading(true);

        try {
            // Dismiss in localStorage so users don't see it again right after downloading
            const storageKey = `nexiplay_app_launch_dismissed_v${versionName}`;
            localStorage.setItem(storageKey, Date.now().toString());
        } catch (e) {
            console.warn('[AppLaunchModal] Failed to save dismissal:', e);
        }

        // Trigger download
        const targetUrl = apkUrl && apkUrl.trim() !== '' ? apkUrl : '/api/download/apk';
        
        // Create an invisible anchor tag to trigger download cleanly without breaking current page state
        const a = document.createElement('a');
        a.href = targetUrl;
        a.download = `NexiPlay-v${versionName}.apk`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);

        setTimeout(() => {
            setIsDownloading(false);
            setIsVisible(false);
        }, 1500);
    };

    if (!isVisible) return null;

    return (
        <div 
            className="fixed inset-0 z-[99999] flex items-center justify-center p-4 sm:p-6 bg-black/80 backdrop-blur-md transition-opacity duration-300 animate-fadeIn"
            role="dialog"
            aria-modal="true"
            aria-labelledby="app-launch-modal-title"
        >
            {/* Modal Container */}
            <div className="relative w-full max-w-[440px] bg-[#18191c] border border-white/10 rounded-3xl p-6 sm:p-7 shadow-[0_24px_64px_rgba(0,0,0,0.85)] text-white overflow-hidden animate-scaleUp">
                
                {/* Top Bar: Tag & Close Button */}
                <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold tracking-widest text-neutral-400 uppercase">
                        NEW RELEASE
                    </span>
                    <button
                        onClick={handleDismiss}
                        className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 active:scale-90 text-neutral-300 hover:text-white flex items-center justify-center transition-all cursor-pointer"
                        aria-label="Close modal"
                    >
                        <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                            <line x1="18" y1="6" x2="6" y2="18"></line>
                            <line x1="6" y1="6" x2="18" y2="18"></line>
                        </svg>
                    </button>
                </div>

                {/* Main Titles */}
                <div className="mt-3">
                    <h2 id="app-launch-modal-title" className="text-xl sm:text-2xl font-bold text-white tracking-tight leading-snug">
                        {modalData.title}
                    </h2>
                    <p className="text-sm text-neutral-400 mt-1.5 leading-relaxed">
                        {modalData.subtitle}
                    </p>
                </div>

                {/* Inset Features Box */}
                <div className="mt-5 rounded-2xl bg-[#121316] border border-white/5 p-4 sm:p-5 space-y-3.5">
                    {/* Inset Card Header */}
                    <div className="flex items-center justify-between pb-1">
                        <span className="text-sm font-semibold text-white">
                            Version {versionName}
                        </span>
                        <span className="px-2.5 py-0.5 rounded-full bg-white/10 text-neutral-300 text-xs font-medium">
                            Latest
                        </span>
                    </div>

                    {/* Feature Items */}
                    <div className="space-y-3 pt-1">
                        {modalData.features.map((feat, idx) => (
                            <div key={idx} className="flex items-start gap-3">
                                <div className="w-4 h-4 rounded-full border border-neutral-500/80 flex items-center justify-center shrink-0 mt-0.5">
                                    <svg className="w-2.5 h-2.5 text-neutral-300" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                        <polyline points="2.5 6 5 8.5 9.5 3.5" />
                                    </svg>
                                </div>
                                <span className="text-xs sm:text-sm text-neutral-300 leading-snug">
                                    {feat}
                                </span>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Actions */}
                <div className="mt-6 flex items-center gap-3">
                    <button
                        onClick={handleDownload}
                        disabled={isDownloading}
                        className="flex-1 bg-white hover:bg-neutral-200 active:scale-[0.98] text-black font-semibold text-sm py-3 px-4 rounded-xl transition-all flex items-center justify-center gap-2 shadow-sm cursor-pointer disabled:opacity-75"
                    >
                        {isDownloading ? (
                            <>
                                <div className="w-4 h-4 border-2 border-black/30 border-t-black rounded-full animate-spin" />
                                <span>Starting download...</span>
                            </>
                        ) : (
                            <>
                                <svg className="w-4 h-4 text-black shrink-0" fill="none" stroke="currentColor" strokeWidth="2.2" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" />
                                </svg>
                                <span>{modalData.download_btn_text}</span>
                            </>
                        )}
                    </button>

                    <button
                        onClick={handleDismiss}
                        className="px-4 py-3 rounded-xl bg-transparent hover:bg-white/5 active:scale-[0.98] border border-white/10 hover:border-white/20 text-neutral-300 font-medium text-sm transition-all flex items-center justify-center gap-1 cursor-pointer"
                    >
                        <span>{modalData.dismiss_btn_text}</span>
                        <span className="text-xs">↗</span>
                    </button>
                </div>
            </div>
        </div>
    );
}

