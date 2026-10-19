'use client';

import { useState, useEffect } from 'react';
import { DownloadLink } from '@/lib/types';
import { useAdSettings } from '@/hooks/useAdSettings';
import { useTutorial } from '@/context/TutorialContext';
import { useAuth } from '@/context/AuthContext';
import AdVerificationPopup from './AdVerificationPopup';

// ── localStorage helpers for download verification ──
const checkDownloadVerified = (contentId: string, contentType: string): boolean => {
    if (typeof window === 'undefined') return false;
    try {
        const raw = localStorage.getItem('nexiplay_download_verification');
        if (!raw) return false;
        const records = JSON.parse(raw);
        const record = records[contentId];
        if (!record) return false;

        const now = Date.now();
        const verifiedAt = record.verifiedAt;

        if (contentType === 'movie') {
            // Movies: 24 hour cooldown
            return now - verifiedAt < 24 * 60 * 60 * 1000;
        } else {
            // Series/Anime: 25 minute cooldown
            return now - verifiedAt < 25 * 60 * 1000;
        }
    } catch {
        return false;
    }
};

const saveDownloadVerification = (contentId: string, contentType: string) => {
    if (typeof window === 'undefined') return;
    try {
        const raw = localStorage.getItem('nexiplay_download_verification') || '{}';
        const records = JSON.parse(raw);
        records[contentId] = {
            verifiedAt: Date.now(),
            contentType,
        };
        localStorage.setItem('nexiplay_download_verification', JSON.stringify(records));
    } catch (e) {
        console.error('Failed to save download verification:', e);
    }
};

interface DownloadPanelProps {
    downloadLinks: DownloadLink[];
    contentId: string;
    contentType: string;
    tmdbId?: string | number | null;
    imdbId?: string | null;
    title?: string;
}

const RESOLUTIONS = ['360p', '480p', '720p', '1080p'] as const;

const PROVIDER_CONFIG = {
    gdrive_link: { name: 'Google Drive', badge: 'High Speed Server', color: 'from-blue-600 via-indigo-600 to-blue-700' },
    mega_link: { name: 'Mega Cloud', badge: 'Fastest Direct', color: 'from-red-600 via-rose-600 to-red-700' },
    mediafire_link: { name: 'MediaFire', badge: 'Direct Mirror', color: 'from-orange-500 via-amber-600 to-orange-600' },
    terabox_link: { name: 'TeraBox', badge: 'Free Cloud Storage', color: 'from-cyan-600 via-teal-600 to-cyan-700' },
    pcloud_link: { name: 'pCloud', badge: 'Direct Cloud', color: 'from-emerald-600 via-teal-600 to-green-700' },
    youtube_link: { name: 'YouTube', badge: 'Stream Mirror', color: 'from-red-500 via-rose-600 to-pink-600' },
} as const;

type ProviderKey = keyof typeof PROVIDER_CONFIG;

// Real SVG Provider Icons
const ProviderSvg = ({ providerKey }: { providerKey: ProviderKey }) => {
    switch (providerKey) {
        case 'gdrive_link':
            return (
                <svg className="w-5 h-5 fill-current" viewBox="0 0 24 24">
                    <path d="M7.71 3.5L1.15 15l3.43 6 6.55-11.5M9.73 15L6.3 21h13.12l3.43-6M22.85 15l-6.57-11.5H9.71l6.57 11.5" />
                </svg>
            );
        case 'mega_link':
            return (
                <svg className="w-5 h-5 fill-current" viewBox="0 0 24 24">
                    <path d="M19.35 10.04C18.67 6.59 15.64 4 12 4 9.11 4 6.6 5.64 5.35 8.04 2.34 8.36 0 10.91 0 14c0 3.31 2.69 6 6 6h13c2.76 0 5-2.24 5-5 0-2.64-2.05-4.78-4.65-4.96zM17 13l-5 5-5-5h3V9h4v4h3z" />
                </svg>
            );
        case 'mediafire_link':
            return (
                <svg className="w-5 h-5 fill-current" viewBox="0 0 24 24">
                    <path d="M12 2c1.1 0 2 .9 2 2 0 .74-.4 1.38-1 1.72v1.56c3.06.44 5.5 2.87 5.92 5.92h1.56c.34-.6.98-1 1.72-1 1.1 0 2 .9 2 2s-.9 2-2 2c-.74 0-1.38-.4-1.72-1h-1.56c-.42 3.05-2.86 5.48-5.92 5.92v1.56c.6.34 1 .98 1 1.72 0 1.1-.9 2-2 2s-2-.9-2-2c0-.74.4-1.38 1-1.72v-1.56C8.44 19.48 6 17.05 5.58 14H4.02C3.68 14.6 3.04 15 2.3 15c-1.1 0-2-.9-2-2s.9-2 2-2c.74 0 1.38.4 1.72 1h1.56C6 8.95 8.44 6.52 11.5 6.08V4.52C10.9 4.18 10.5 3.54 10.5 2.8c0-1.1.9-2 2-2z" />
                </svg>
            );
        case 'terabox_link':
            return (
                <svg className="w-5 h-5 fill-current" viewBox="0 0 24 24">
                    <path d="M21 16.5l-9 5.25-9-5.25V7.5l9-5.25 9 5.25v9zM12 4.125L4.875 8.25 12 12.375l7.125-4.125L12 4.125zM4.5 9.75v5.625L11.25 19.5V13.875L4.5 9.75zm8.25 9.75L19.5 15.375V9.75l-6.75 4.125V19.5z" />
                </svg>
            );
        default:
            return (
                <svg className="w-5 h-5 fill-none stroke-current" viewBox="0 0 24 24" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                </svg>
            );
    }
};

export default function DownloadPanel({
    downloadLinks,
    contentId,
    contentType,
    tmdbId,
    imdbId,
    title,
}: DownloadPanelProps) {
    // Group links by resolution
    const linksByResolution = downloadLinks.reduce((acc, link) => {
        acc[link.resolution] = link;
        return acc;
    }, {} as Record<string, DownloadLink>);

    // Check if resolution has any links
    const hasLinks = (resolution: string) => {
        const link = linksByResolution[resolution];
        if (!link) return false;
        return Object.keys(PROVIDER_CONFIG).some(key => link[key as ProviderKey]);
    };

    // Get available resolutions (ones with at least one link)
    const availableResolutions = RESOLUTIONS.filter(res => hasLinks(res));

    // Default to the best available resolution so download mirrors are immediately visible
    const initialBestRes = availableResolutions.includes('1080p')
        ? '1080p'
        : availableResolutions.includes('720p')
            ? '720p'
            : (availableResolutions[availableResolutions.length - 1] || null);

    const [activeResolution, setActiveResolution] = useState<string | null>(initialBestRes);

    useEffect(() => {
        if (!activeResolution && availableResolutions.length > 0) {
            setActiveResolution(
                availableResolutions.includes('1080p')
                    ? '1080p'
                    : availableResolutions.includes('720p')
                        ? '720p'
                        : availableResolutions[availableResolutions.length - 1]
            );
        }
    }, [availableResolutions, activeResolution]);

    const [showVerification, setShowVerification] = useState(false);
    const [pendingDownloadUrl, setPendingDownloadUrl] = useState<string | null>(null);
    const [isVerified, setIsVerified] = useState(() => checkDownloadVerified(contentId, contentType));
    const { settings: adSettings } = useAdSettings();
    const { hasTutorial, openTutorial } = useTutorial();
    const { trackEvent } = useAuth();

    // Fast Direct Download State (active only when content has no manual links)
    const [fastLoadingQuality, setFastLoadingQuality] = useState<string | null>(null);
    const [fastError, setFastError] = useState<string | null>(null);
    const [fastLinks, setFastLinks] = useState<Record<string, string>>({});
    const [fastCopiedQuality, setFastCopiedQuality] = useState<string | null>(null);

    const handleFastDownload = async (quality: string) => {
        setFastLoadingQuality(quality);
        setFastError(null);
        try {
            const targetId = tmdbId || imdbId || contentId;
            const res = await fetch('/api/download/vault', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    type: contentType === 'movie' ? 'movie' : 'tv',
                    id: targetId,
                    quality,
                    title,
                })
            });
            const data = await res.json();
            if (!res.ok || !data.success || !data.url) {
                throw new Error(data.error || 'Direct download link is temporarily unavailable.');
            }
            const cleanUrl = data.url.startsWith('/')
                ? `${window.location.origin}${data.url}`
                : data.url;
            setFastLinks(prev => ({ ...prev, [quality]: cleanUrl }));

            const a = document.createElement('a');
            a.href = cleanUrl;
            a.download = data.fileName || `${(title || 'media').replace(/[^a-zA-Z0-9_\- ]/g, '')}_${quality}.mkv`;
            a.target = '_blank';
            a.rel = 'noopener noreferrer';
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
        } catch (err: any) {
            console.error('[Direct Download Error]:', err);
            setFastError(err.message || 'Error generating link. Please try another quality.');
        } finally {
            setFastLoadingQuality(null);
        }
    };

    const handleResolutionClick = (resolution: string) => {
        setActiveResolution(resolution);
    };

    const getProviderLinks = (resolution: string) => {
        const link = linksByResolution[resolution];
        if (!link) return [];

        return (Object.keys(PROVIDER_CONFIG) as ProviderKey[])
            .filter(key => link[key])
            .map(key => ({
                key,
                url: link[key] as string,
                ...PROVIDER_CONFIG[key]
            }));
    };

    const handleDownloadClick = (url: string, provider: ProviderKey, resolution: string, e: React.MouseEvent) => {
        trackEvent({
            event_type: 'download',
            movie_id: contentId,
            content_type: contentType,
            provider: PROVIDER_CONFIG[provider].name,
            resolution,
            metadata: {
                provider_key: provider,
                url_host: (() => {
                    try {
                        return new URL(url).hostname;
                    } catch {
                        return null;
                    }
                })()
            }
        });

        const verificationEnabled = adSettings?.isDownloadVerificationEnabled ?? false;
        
        if (!verificationEnabled) {
            return;
        }

        const verified = checkDownloadVerified(contentId, contentType);
        if (verified) {
            setIsVerified(true);
            return;
        }

        e.preventDefault();
        e.stopPropagation();
        setPendingDownloadUrl(url);
        setShowVerification(true);
    };

    const handleVerificationComplete = () => {
        saveDownloadVerification(contentId, contentType);
        setIsVerified(true);
        setShowVerification(false);

        if (pendingDownloadUrl) {
            window.open(pendingDownloadUrl, '_blank', 'noopener,noreferrer');
            setPendingDownloadUrl(null);
        }
    };

    if (availableResolutions.length === 0) {
        return (
            <div className="space-y-4">
                {/* Clean Direct Fast Download Card */}
                <div className="p-5 sm:p-6 bg-gradient-to-br from-violet-950/20 via-[#0e0e12] to-black rounded-3xl border border-violet-500/25 shadow-xl space-y-4">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-white/5 pb-4">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-violet-600 to-indigo-600 flex items-center justify-center text-white shadow-lg shadow-violet-950/40 shrink-0">
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
                                </svg>
                            </div>
                            <div>
                                <h3 className="text-base sm:text-lg font-black text-white flex items-center gap-2">
                                    <span>Fast Direct Download</span>
                                    <span className="px-2 py-0.5 text-[9px] font-black uppercase tracking-wider bg-violet-500/20 text-violet-300 border border-violet-500/30 rounded-md">
                                        DIRECT MKV
                                    </span>
                                </h3>
                                <p className="text-xs text-gray-400">
                                    High Speed Multi-threaded Download • Supports IDM, 1DM & Browser
                                </p>
                            </div>
                        </div>
                    </div>

                    {fastError && (
                        <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-xl text-xs text-red-300 flex items-center justify-between">
                            <span>⚠️ {fastError}</span>
                            <button onClick={() => setFastError(null)} className="text-xs underline ml-2">Dismiss</button>
                        </div>
                    )}

                    {/* 4 Quality Direct Download Buttons */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                        {[
                            { q: '1080p', label: '1080p Full HD', badge: 'Ultra HD', color: 'from-violet-600 to-purple-600' },
                            { q: '720p', label: '720p HD', badge: 'Recommended', color: 'from-blue-600 to-cyan-600' },
                            { q: '480p', label: '480p Standard', badge: 'Standard', color: 'from-emerald-600 to-teal-600' },
                            { q: '360p', label: '360p Data Saver', badge: 'Data Saver', color: 'from-amber-600 to-orange-600' },
                        ].map(({ q, label, badge, color }) => {
                            const isLoading = fastLoadingQuality === q;
                            const hasLink = !!fastLinks[q];
                            const isCopied = fastCopiedQuality === q;

                            return (
                                <div
                                    key={q}
                                    className="p-3.5 bg-white/[0.02] border border-white/5 rounded-2xl hover:border-violet-500/40 transition-all flex flex-col justify-between gap-3 group"
                                >
                                    <div className="flex items-center justify-between">
                                        <span className="text-xs font-bold text-white group-hover:text-violet-300 transition-colors">
                                            {label}
                                        </span>
                                        <span className="text-[9px] font-black uppercase text-gray-400 bg-white/5 px-1.5 py-0.5 rounded">
                                            {badge}
                                        </span>
                                    </div>

                                    <div className="flex items-center gap-1.5">
                                        <button
                                            onClick={() => handleFastDownload(q)}
                                            disabled={isLoading}
                                            className={`flex-1 py-2 px-3 rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 transition-all text-white bg-gradient-to-r ${color} hover:opacity-90 active:scale-95 disabled:opacity-50 cursor-pointer shadow-md`}
                                        >
                                            {isLoading ? (
                                                <>
                                                    <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                                                    <span className="text-[11px]">Fetching...</span>
                                                </>
                                            ) : hasLink ? (
                                                <>
                                                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2.5}>
                                                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                                                    </svg>
                                                    <span className="text-[11px]">Download Again</span>
                                                </>
                                            ) : (
                                                <>
                                                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2.5}>
                                                        <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                                                    </svg>
                                                    <span className="text-[11px]">Download</span>
                                                </>
                                            )}
                                        </button>

                                        {hasLink && (
                                            <button
                                                onClick={() => {
                                                    navigator.clipboard.writeText(fastLinks[q]);
                                                    setFastCopiedQuality(q);
                                                    setTimeout(() => setFastCopiedQuality(null), 2000);
                                                }}
                                                className="p-2 bg-white/5 hover:bg-white/10 rounded-xl text-xs text-gray-300 hover:text-white transition-all shrink-0 cursor-pointer"
                                                title="Copy Direct Link"
                                            >
                                                {isCopied ? '✓' : '📋'}
                                            </button>
                                        )}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Verification Popup */}
            {showVerification && (
                <AdVerificationPopup
                    onVerified={handleVerificationComplete}
                    adUrl1={adSettings?.downloadAdUrl1 || adSettings?.directLinkUrl || 'https://nexiplay.live'}
                    adUrl2={adSettings?.downloadAdUrl2 || adSettings?.popunderUrl || 'https://nexiplay.live'}
                    onClose={() => setShowVerification(false)}
                    contentType="download"
                />
            )}

            {/* Quality Selector */}
            <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">
                    Select Quality:
                </span>
            </div>

            {/* Glowing Resolution Cards */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 sm:gap-3.5">
                {RESOLUTIONS.map((resolution) => {
                    const isAvailable = hasLinks(resolution);
                    const isActive = activeResolution === resolution;
                    const link = linksByResolution[resolution];

                    return (
                        <button
                            key={resolution}
                            onClick={() => isAvailable && handleResolutionClick(resolution)}
                            disabled={!isAvailable}
                            className={`
                                p-3.5 sm:p-4 rounded-2xl font-bold transition-all duration-300 flex flex-col items-center justify-center gap-1.5 text-center cursor-pointer relative overflow-hidden group
                                ${isActive
                                    ? 'bg-gradient-to-r from-violet-600 via-purple-600 to-indigo-600 text-white shadow-xl shadow-violet-600/40 ring-2 ring-violet-400 scale-[1.03]'
                                    : isAvailable
                                        ? 'bg-[#141625]/90 hover:bg-[#1D2138] text-gray-200 border border-white/10 hover:border-violet-500/50 hover:scale-[1.01]'
                                        : 'bg-[#0E0F1A]/50 text-gray-600 border border-white/5 cursor-not-allowed opacity-40'
                                }
                            `}
                        >
                            <div className="flex items-center gap-1.5">
                                <svg className={`w-4 h-4 ${isActive ? 'text-white' : isAvailable ? 'text-violet-400' : 'text-gray-600'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2.5}>
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                                </svg>
                                <span className="text-sm sm:text-base font-extrabold">{resolution}</span>
                            </div>
                            {link?.file_size && isAvailable ? (
                                <span className={`text-[10px] sm:text-[11px] font-semibold px-2 py-0.5 rounded-full ${isActive ? 'bg-white/20 text-white' : 'bg-white/5 text-gray-400'}`}>
                                    {link.file_size}
                                </span>
                            ) : (
                                <span className="text-[10px] opacity-60">
                                    {isAvailable ? 'HD Video' : 'Unavailable'}
                                </span>
                            )}
                        </button>
                    );
                })}
            </div>

            {/* Selected Quality Cloud Mirrors Panel */}
            {activeResolution && (
                <div className="rounded-2xl bg-[#141625]/95 border border-white/10 p-4 sm:p-6 shadow-2xl space-y-4">
                    <div className="flex items-center justify-between border-b border-white/[0.08] pb-3">
                        <div className="flex items-center gap-2">
                            <span className="text-sm font-extrabold text-white">
                                Cloud Mirrors ({activeResolution})
                            </span>
                            {linksByResolution[activeResolution]?.file_size && (
                                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-violet-500/20 text-violet-300 border border-violet-500/30">
                                    {linksByResolution[activeResolution].file_size}
                                </span>
                            )}
                        </div>
                        <span className="text-[11px] font-semibold text-emerald-400 flex items-center gap-1.5">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                            Online
                        </span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {getProviderLinks(activeResolution).map((provider) => {
                            const linkObj = linksByResolution[activeResolution];
                            const isExpired = linkObj?.link_status?.[provider.key] === 'EXPIRED';
                            const showTutorial = hasTutorial(provider.key);

                            return (
                                <div key={provider.key} className="flex flex-col gap-2">
                                    <div className="flex gap-2">
                                        {/* Prominent High-Visibility Download Button Card */}
                                        <a
                                            href={isExpired ? '#' : provider.url}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            onClick={(e) => {
                                                if (isExpired) {
                                                    e.preventDefault();
                                                    return;
                                                }
                                                handleDownloadClick(provider.url, provider.key, activeResolution, e);
                                            }}
                                            className={`
                                                flex items-center gap-3.5 p-4 rounded-xl min-h-[56px]
                                                bg-gradient-to-r ${provider.color}
                                                text-white font-bold
                                                shadow-lg shadow-black/40 hover:scale-[1.02] active:scale-[0.98]
                                                transition-all duration-200 group flex-1 cursor-pointer
                                                ${isExpired ? 'grayscale opacity-70 cursor-not-allowed' : ''}
                                            `}
                                        >
                                            <span className="w-9 h-9 rounded-xl bg-black/25 flex items-center justify-center shrink-0 shadow-inner">
                                                <ProviderSvg providerKey={provider.key} />
                                            </span>
                                            <div className="flex-1 flex flex-col min-w-0 justify-center">
                                                <div className="flex items-center justify-between">
                                                    <span className="text-sm font-extrabold truncate">{provider.name}</span>
                                                    <span className="text-[10px] font-bold uppercase tracking-wider bg-black/30 px-2.5 py-0.5 rounded-full text-white/90">
                                                        {provider.badge}
                                                    </span>
                                                </div>
                                            </div>
                                            <svg
                                                className="w-5 h-5 shrink-0 opacity-80 group-hover:translate-x-1 group-hover:opacity-100 transition-all"
                                                fill="none"
                                                stroke="currentColor"
                                                viewBox="0 0 24 24"
                                                strokeWidth={2.5}
                                            >
                                                <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                                            </svg>
                                        </a>

                                        {/* Tutorial Button */}
                                        {showTutorial && (
                                            <button
                                                onClick={() => openTutorial(provider.key)}
                                                className="flex items-center justify-center gap-1.5 px-3 py-3 min-h-[56px] rounded-xl
                                                    bg-white/[0.07] backdrop-blur-sm border border-white/10
                                                    text-gray-300 hover:text-white hover:bg-white/[0.12] hover:border-white/20
                                                    active:scale-[0.97] transition-all duration-200
                                                    text-xs font-semibold whitespace-nowrap cursor-pointer shrink-0"
                                                title="How to download from this host"
                                            >
                                                <svg className="w-4 h-4 text-cyan-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                                                    <path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                                </svg>
                                                <span className="hidden sm:inline">Guide</span>
                                            </button>
                                        )}
                                    </div>
                                </div>
                            );
                        })}
                    </div>

                    {getProviderLinks(activeResolution).length === 0 && (
                        <p className="text-center text-gray-400 py-4">
                            No links available for {activeResolution} yet ⏳
                        </p>
                    )}
                </div>
            )}
        </div>
    );
}
