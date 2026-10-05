'use client';

import { useState } from 'react';
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
}

const RESOLUTIONS = ['360p', '480p', '720p', '1080p'] as const;

const PROVIDER_CONFIG = {
    mega_link: { name: 'Mega', icon: '☁️', color: 'from-red-600 to-red-700' },
    gdrive_link: { name: 'Google Drive', icon: '📁', color: 'from-blue-600 to-blue-700' },
    mediafire_link: { name: 'MediaFire', icon: '🔥', color: 'from-orange-500 to-orange-600' },
    terabox_link: { name: 'TeraBox', icon: '📦', color: 'from-cyan-500 to-cyan-600' },
    pcloud_link: { name: 'pCloud', icon: '💾', color: 'from-green-500 to-green-600' },
    youtube_link: { name: 'YouTube', icon: '▶️', color: 'from-red-500 to-pink-600' },
} as const;

type ProviderKey = keyof typeof PROVIDER_CONFIG;

export default function DownloadPanel({ downloadLinks, contentId, contentType }: DownloadPanelProps) {
    const [activeResolution, setActiveResolution] = useState<string | null>(null);
    const [showVerification, setShowVerification] = useState(false);
    const [pendingDownloadUrl, setPendingDownloadUrl] = useState<string | null>(null);
    const [isVerified, setIsVerified] = useState(() => checkDownloadVerified(contentId, contentType));
    const { settings: adSettings } = useAdSettings();
    const { hasTutorial, openTutorial } = useTutorial();
    const { trackEvent } = useAuth();

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

    const handleResolutionClick = (resolution: string) => {
        setActiveResolution(activeResolution === resolution ? null : resolution);
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
            // Verification disabled — allow direct download
            return;
        }

        const verified = checkDownloadVerified(contentId, contentType);
        if (verified) {
            // Already verified — allow direct download
            setIsVerified(true);
            return;
        }

        // Not verified — block and show popup
        e.preventDefault();
        e.stopPropagation();
        setPendingDownloadUrl(url);
        setShowVerification(true);
    };

    const handleVerificationComplete = () => {
        saveDownloadVerification(contentId, contentType);
        setIsVerified(true);
        setShowVerification(false);

        // Auto-open the pending download
        if (pendingDownloadUrl) {
            window.open(pendingDownloadUrl, '_blank', 'noopener,noreferrer');
            setPendingDownloadUrl(null);
        }
    };

    if (availableResolutions.length === 0) {
        return (
            <div className="text-center py-8 text-gray-400">
                <p className="text-lg">Download links coming soon ⏳</p>
            </div>
        );
    }

    return (
        <div className="space-y-4">
            {/* Verification Popup */}
            {showVerification && (
                <AdVerificationPopup
                    onVerified={handleVerificationComplete}
                    adUrl1={adSettings?.downloadAdUrl1 || adSettings?.directLinkUrl || 'https://nexiplay.live'}
                    adUrl2={adSettings?.downloadAdUrl2 || adSettings?.popunderUrl || 'https://nexiplay.live'}
                />
            )}

            {/* Resolution Buttons */}
            <div className="flex flex-wrap gap-2 sm:gap-3">
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
                                flex-1 sm:flex-none px-6 py-3 rounded-xl font-bold text-sm sm:text-base
                                transition-all duration-300 border
                                ${isActive
                                    ? 'bg-red-600 text-white border-red-500 shadow-lg shadow-red-900/30 scale-105'
                                    : isAvailable
                                        ? 'bg-dark-700 text-white border-white/10 hover:bg-dark-600 hover:border-white/20'
                                        : 'bg-dark-800 text-gray-600 border-white/5 cursor-not-allowed opacity-50'
                                }
                            `}
                        >
                            <span className="block">{resolution}</span>
                            {link?.file_size && isAvailable && (
                                <span className="block text-xs opacity-70 mt-0.5">{link.file_size}</span>
                            )}
                        </button>
                    );
                })}
            </div>

            {/* Animated Panel */}
            <div
                className={`
                    overflow-hidden transition-all duration-300 ease-out
                    ${activeResolution ? 'max-h-[600px] opacity-100' : 'max-h-0 opacity-0'}
                `}
            >
                {activeResolution && (
                    <div className="glass p-4 sm:p-6 rounded-2xl border border-white/10 shadow-2xl shadow-black/50 mt-2">
                        <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                            <span className="w-1 h-6 bg-red-500 rounded-full"></span>
                            Download {activeResolution}
                            {linksByResolution[activeResolution]?.file_size && (
                                <span className="text-sm font-normal text-gray-400">
                                    ({linksByResolution[activeResolution].file_size})
                                </span>
                            )}
                        </h3>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            {getProviderLinks(activeResolution).map((provider) => {
                                const linkObj = linksByResolution[activeResolution];
                                const isExpired = linkObj?.link_status?.[provider.key] === 'EXPIRED';
                                const showTutorial = hasTutorial(provider.key);

                                return (
                                    <div key={provider.key} className="flex flex-col gap-2">
                                        <div className={`flex flex-col sm:flex-row gap-2 ${showTutorial ? '' : ''}`}>
                                            {/* Download Button */}
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
                                                    flex items-center gap-3 p-4 rounded-xl min-h-[44px]
                                                    bg-gradient-to-r ${provider.color}
                                                    text-white font-semibold
                                                    hover:scale-[1.02] hover:shadow-lg
                                                    active:scale-[0.98]
                                                    transition-all duration-200
                                                    group flex-1
                                                    ${isExpired ? 'grayscale opacity-70 cursor-not-allowed' : ''}
                                                `}
                                            >
                                                <span className="text-2xl group-hover:scale-110 transition-transform">
                                                    {provider.icon}
                                                </span>
                                                <span className="flex-1 flex flex-col">
                                                    {provider.name}
                                                    {isExpired && (
                                                        <span className="text-[10px] bg-black/40 px-2 py-1 rounded text-red-200 w-fit mt-1 font-normal">
                                                            ⚠️ Link Expired - Report to Admin
                                                        </span>
                                                    )}
                                                </span>
                                                <svg
                                                    className="w-5 h-5 opacity-70 group-hover:translate-x-1 transition-transform"
                                                    fill="none"
                                                    stroke="currentColor"
                                                    viewBox="0 0 24 24"
                                                >
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                                                </svg>
                                            </a>

                                            {/* Tutorial Button */}
                                            {showTutorial && (
                                                <button
                                                    onClick={() => openTutorial(provider.key)}
                                                    className="flex items-center justify-center gap-2 px-4 py-3 min-h-[44px] rounded-xl
                                                        bg-white/[0.07] backdrop-blur-sm border border-white/10
                                                        text-gray-300 hover:text-white hover:bg-white/[0.12] hover:border-white/20
                                                        active:scale-[0.97] transition-all duration-200
                                                        text-sm font-medium whitespace-nowrap
                                                        sm:w-auto w-full"
                                                >
                                                    <svg className="w-4 h-4 flex-shrink-0 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                                    </svg>
                                                    How to download?
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
        </div>
    );
}
