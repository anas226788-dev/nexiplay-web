'use client';

import { useState } from 'react';
import { Season, Episode, EpisodeDownloadLink } from '@/lib/types';
import { useAdSettings } from '@/hooks/useAdSettings';
import { useTutorial } from '@/context/TutorialContext';
import AdVerificationPopup from './AdVerificationPopup';

// ── Download verification helpers ──
const checkDownloadVerified = (contentId: string, contentType: string): boolean => {
    if (typeof window === 'undefined') return false;
    try {
        const raw = localStorage.getItem('nexiplay_download_verification');
        if (!raw) return false;
        const records = JSON.parse(raw);
        const record = records[contentId];
        if (!record) return false;
        const now = Date.now();
        if (contentType === 'movie') {
            return now - record.verifiedAt < 24 * 60 * 60 * 1000;
        } else {
            return now - record.verifiedAt < 25 * 60 * 1000;
        }
    } catch { return false; }
};

const saveDownloadVerification = (contentId: string, contentType: string) => {
    if (typeof window === 'undefined') return;
    try {
        const raw = localStorage.getItem('nexiplay_download_verification') || '{}';
        const records = JSON.parse(raw);
        records[contentId] = { verifiedAt: Date.now(), contentType };
        localStorage.setItem('nexiplay_download_verification', JSON.stringify(records));
    } catch {}
};

interface EpisodeListProps {
    seasons: Season[];
    running_status?: 'Ongoing' | 'Completed' | 'Hiatus';
    contentId?: string;
    contentType?: string;
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

export default function EpisodeList({ seasons, running_status, contentId = '', contentType = 'anime' }: EpisodeListProps) {
    const [activeSeason, setActiveSeason] = useState(seasons[0]?.season_number || 1);
    const [activeEpisode, setActiveEpisode] = useState<string | null>(null);
    const [activeResolution, setActiveResolution] = useState<string | null>(null);
    const [showVerification, setShowVerification] = useState(false);
    const [pendingDownloadUrl, setPendingDownloadUrl] = useState<string | null>(null);
    const { settings: adSettings } = useAdSettings();
    const { hasTutorial, openTutorial } = useTutorial();

    const handleDownloadClick = (url: string, e: React.MouseEvent) => {
        const verificationEnabled = adSettings?.isDownloadVerificationEnabled ?? false;
        if (!verificationEnabled) return;
        const verified = checkDownloadVerified(contentId, contentType);
        if (verified) return;
        e.preventDefault();
        e.stopPropagation();
        setPendingDownloadUrl(url);
        setShowVerification(true);
    };

    const handleVerificationComplete = () => {
        saveDownloadVerification(contentId, contentType);
        setShowVerification(false);
        if (pendingDownloadUrl) {
            window.open(pendingDownloadUrl, '_blank', 'noopener,noreferrer');
            setPendingDownloadUrl(null);
        }
    };

    const currentSeason = seasons.find(s => s.season_number === activeSeason);
    const episodes = currentSeason?.episodes?.sort((a, b) => a.episode_number - b.episode_number) || [];

    // Check if resolution has any links
    const hasLinks = (episode: Episode, resolution: string) => {
        const link = episode.download_links?.find(l => l.resolution === resolution);
        if (!link) return false;
        return Object.keys(PROVIDER_CONFIG).some(key => link[key as ProviderKey]);
    };

    // Get available resolutions for episode
    const getAvailableResolutions = (episode: Episode) => {
        return RESOLUTIONS.filter(res => hasLinks(episode, res));
    };

    // Get provider links for resolution
    const getProviderLinks = (episode: Episode, resolution: string) => {
        const link = episode.download_links?.find(l => l.resolution === resolution);
        if (!link) return [];

        return (Object.keys(PROVIDER_CONFIG) as ProviderKey[])
            .filter(key => link[key])
            .map(key => ({
                key,
                url: link[key] as string,
                ...PROVIDER_CONFIG[key]
            }));
    };

    const handleEpisodeClick = (episodeId: string) => {
        if (activeEpisode === episodeId) {
            setActiveEpisode(null);
            setActiveResolution(null);
        } else {
            setActiveEpisode(episodeId);
            setActiveResolution(null);
        }
    };

    const handleResolutionClick = (episodeId: string, resolution: string) => {
        if (activeEpisode === episodeId && activeResolution === resolution) {
            setActiveResolution(null);
        } else {
            setActiveEpisode(episodeId);
            setActiveResolution(resolution);
        }
    };

    if (seasons.length === 0) {
        return (
            <div className="text-center py-8 text-gray-400">
                <p className="text-lg">Episodes coming soon ⏳</p>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Download Verification Popup */}
            {showVerification && (
                <AdVerificationPopup
                    onVerified={handleVerificationComplete}
                    adUrl1={adSettings?.downloadAdUrl1 || adSettings?.directLinkUrl || 'https://nexiplay.live'}
                    adUrl2={adSettings?.downloadAdUrl2 || adSettings?.popunderUrl || 'https://nexiplay.live'}
                />
            )}
            {/* Season Tabs */}
            <div className="flex flex-wrap gap-2">
                <span className="text-white font-medium py-2 mr-2">Season:</span>
                {seasons
                    .sort((a, b) => a.season_number - b.season_number)
                    .map((season) => (
                        <button
                            key={season.id}
                            onClick={() => {
                                setActiveSeason(season.season_number);
                                setActiveEpisode(null);
                                setActiveResolution(null);
                            }}
                            className={`
                                px-5 py-2 rounded-lg font-bold text-sm transition-all
                                ${activeSeason === season.season_number
                                    ? 'bg-red-600 text-white shadow-lg shadow-red-900/30 scale-105'
                                    : 'bg-dark-700 text-gray-400 hover:bg-dark-600 hover:text-white border border-white/5'
                                }
                            `}
                        >
                            {season.season_number}
                        </button>
                    ))}
            </div>

            {/* Current Season Card */}
            {currentSeason && (
                <div className="bg-dark-800/80 rounded-2xl border border-white/5 overflow-hidden shadow-xl">
                    {/* Season Header & ZIP Download */}
                    <div className="p-6 border-b border-white/5 bg-gradient-to-b from-white/5 to-transparent">
                        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                            <div>
                                <h3 className="text-xl font-bold text-white mb-1">
                                    Season {currentSeason.season_number}
                                    {currentSeason.season_title && <span className="text-gray-400 font-normal ml-2">{currentSeason.season_title}</span>}
                                </h3>
                                <p className="text-sm text-gray-400">{episodes.length} Episodes</p>
                            </div>

                            {/* ZIP Download Button */}
                            {currentSeason.season_zip_link && (
                                <a
                                    href={currentSeason.season_zip_link}
                                    onClick={(e) => handleDownloadClick(currentSeason.season_zip_link!, e)}
                                    className="
                                        flex items-center justify-center gap-2 px-6 py-3
                                        bg-gradient-to-r from-purple-600 to-indigo-600
                                        hover:from-purple-500 hover:to-indigo-500
                                        text-white font-bold rounded-xl shadow-lg shadow-purple-900/40
                                        transform hover:scale-[1.02] active:scale-[0.98] transition-all
                                        w-full md:w-auto
                                    "
                                >
                                    <span className="text-xl">📦</span>
                                    <span>Download Full Season (ZIP)</span>
                                </a>
                            )}
                        </div>
                    </div>

                    {/* Episodes List */}
                    <div className="p-6">
                        {episodes.length === 0 ? (
                            <div className="text-center py-8 text-gray-400">
                                <p>Episodes coming soon ⏳</p>
                            </div>
                        ) : (
                            <div className="space-y-3">
                                {episodes.map((episode) => {
                                    const isActive = activeEpisode === episode.id;
                                    const availableRes = getAvailableResolutions(episode);

                                    return (
                                        <div key={episode.id} className="bg-dark-700/50 rounded-xl border border-white/5 overflow-hidden">
                                            {/* Episode Header */}
                                            <div
                                                className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 cursor-pointer hover:bg-dark-600/50 transition-colors"
                                                onClick={() => handleEpisodeClick(episode.id)}
                                            >
                                                <div className="flex items-center gap-3">
                                                    <div className="w-10 h-10 rounded-lg bg-red-600/20 text-red-400 flex items-center justify-center font-bold text-sm">
                                                        {episode.episode_number}
                                                    </div>
                                                    <div>
                                                        <h4 className="font-medium text-white flex items-center gap-2">
                                                            Episode {episode.episode_number}
                                                            {running_status === 'Ongoing' && episode.episode_number === Math.max(...episodes.map(e => e.episode_number)) && (
                                                                <span className="px-1.5 py-0.5 bg-red-600/20 text-red-500 text-[10px] font-bold rounded border border-red-500/20 animate-pulse">
                                                                    NEW
                                                                </span>
                                                            )}
                                                            {episode.episode_title && (
                                                                <span className="text-gray-400 font-normal ml-2">
                                                                    - {episode.episode_title}
                                                                </span>
                                                            )}
                                                        </h4>
                                                    </div>
                                                </div>

                                                {/* Resolution Buttons */}
                                                <div className="flex flex-wrap gap-2" onClick={(e) => e.stopPropagation()}>
                                                    {availableRes.length > 0 ? (
                                                        availableRes.map((res) => {
                                                            const link = episode.download_links?.find(l => l.resolution === res);
                                                            return (
                                                                <button
                                                                    key={res}
                                                                    onClick={() => handleResolutionClick(episode.id, res)}
                                                                    className={`
                                                            px-3 py-1.5 rounded-lg text-xs font-bold transition-all
                                                            ${activeEpisode === episode.id && activeResolution === res
                                                                            ? 'bg-red-600 text-white scale-105'
                                                                            : 'bg-white/5 text-gray-300 hover:bg-white/10 border border-white/10'
                                                                        }
                                                        `}
                                                                >
                                                                    {res}
                                                                    {link?.file_size && (
                                                                        <span className="text-[10px] opacity-70 ml-1">
                                                                            ({link.file_size})
                                                                        </span>
                                                                    )}
                                                                </button>
                                                            );
                                                        })
                                                    ) : (
                                                        <span className="text-xs text-gray-500">No links yet</span>
                                                    )}
                                                </div>
                                            </div>

                                            {/* Download Links Panel */}
                                            <div
                                                className={`
                                        overflow-hidden transition-all duration-300 ease-out
                                        ${isActive && activeResolution ? 'max-h-[400px] opacity-100' : 'max-h-0 opacity-0'}
                                    `}
                                            >
                                                {activeResolution && (
                                                    <div className="p-4 pt-0">
                                                        <div className="bg-dark-800/50 p-4 rounded-xl border border-white/5">
                                                            <h5 className="text-sm font-medium text-gray-400 mb-3">
                                                                Download {activeResolution}:
                                                            </h5>
                                                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                                                {getProviderLinks(episode, activeResolution).map((provider) => {
                                                                    const linkObj = episode.download_links?.find(l => l.resolution === activeResolution);
                                                                    const isExpired = linkObj?.link_status?.[provider.key] === 'EXPIRED';
                                                                    const showTutorial = hasTutorial(provider.key);

                                                                    return (
                                                                        <div key={provider.key} className="flex flex-col gap-1.5">
                                                                            <div className="flex flex-col sm:flex-row gap-1.5">
                                                                                {/* Download Button */}
                                                                                <a
                                                                                    href={isExpired ? '#' : provider.url}
                                                                                    rel="noopener noreferrer"
                                                                                    onClick={(e) => {
                                                                                        if (isExpired) { e.preventDefault(); return; }
                                                                                        handleDownloadClick(provider.url, e);
                                                                                    }}
                                                                                    className={`
                                                                                        flex items-center gap-3 p-3 rounded-lg min-h-[44px]
                                                                                        bg-gradient-to-r ${provider.color}
                                                                                        text-white font-medium text-sm
                                                                                        hover:scale-[1.02] hover:shadow-lg
                                                                                        active:scale-[0.98]
                                                                                        transition-all duration-200
                                                                                        group flex-1
                                                                                        ${isExpired ? 'grayscale opacity-70 cursor-not-allowed' : ''}
                                                                                    `}
                                                                                >
                                                                                    <span className="text-xl group-hover:scale-110 transition-transform">
                                                                                        {provider.icon}
                                                                                    </span>
                                                                                    <span className="flex-1 flex flex-col">
                                                                                        {provider.name}
                                                                                        {isExpired && (
                                                                                            <span className="text-[10px] bg-black/40 px-1.5 py-0.5 rounded text-red-200 w-fit mt-0.5">
                                                                                                ⚠️ Link Expired - Report to Admin
                                                                                            </span>
                                                                                        )}
                                                                                    </span>
                                                                                    <svg
                                                                                        className="w-4 h-4 opacity-70 group-hover:translate-x-1 transition-transform"
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
                                                                                        className="flex items-center justify-center gap-1.5 px-3 py-2 min-h-[44px] rounded-lg
                                                                                            bg-white/[0.07] backdrop-blur-sm border border-white/10
                                                                                            text-gray-300 hover:text-white hover:bg-white/[0.12] hover:border-white/20
                                                                                            active:scale-[0.97] transition-all duration-200
                                                                                            text-xs font-medium whitespace-nowrap
                                                                                            sm:w-auto w-full"
                                                                                    >
                                                                                        <svg className="w-3.5 h-3.5 flex-shrink-0 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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

                                                            {getProviderLinks(episode, activeResolution).length === 0 && (
                                                                <p className="text-center text-gray-500 py-2">
                                                                    Download links coming soon ⏳
                                                                </p>
                                                            )}
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}
