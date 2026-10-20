'use client';

import { useState, useMemo, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Season, Episode, EpisodeDownloadLink } from '@/lib/types';
import { useAdSettings } from '@/hooks/useAdSettings';
import { useTutorial } from '@/context/TutorialContext';
import { useAuth } from '@/context/AuthContext';
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
    contentTitle?: string;
    tmdbId?: string | number | null;
    imdbId?: string | null;
    initialSeason?: number;
}

const RESOLUTIONS = ['360p', '480p', '720p', '1080p'] as const;

const PROVIDER_CONFIG = {
    gdrive_link: { name: 'Google Drive', color: 'from-blue-600 via-indigo-600 to-blue-700' },
    mega_link: { name: 'Mega Cloud', color: 'from-red-600 via-rose-600 to-red-700' },
    mediafire_link: { name: 'MediaFire', color: 'from-orange-500 via-amber-600 to-orange-600' },
    terabox_link: { name: 'TeraBox', color: 'from-cyan-600 via-teal-600 to-cyan-700' },
    pcloud_link: { name: 'pCloud', color: 'from-emerald-600 via-teal-600 to-green-700' },
    youtube_link: { name: 'YouTube', color: 'from-red-500 via-rose-600 to-pink-600' },
} as const;

type ProviderKey = keyof typeof PROVIDER_CONFIG;

// Real SVG Provider Icons
const EpisodeProviderSvg = ({ providerKey }: { providerKey: ProviderKey }) => {
    switch (providerKey) {
        case 'gdrive_link':
            return (
                <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24">
                    <path d="M7.71 3.5L1.15 15l3.43 6 6.55-11.5M9.73 15L6.3 21h13.12l3.43-6M22.85 15l-6.57-11.5H9.71l6.57 11.5" />
                </svg>
            );
        case 'mega_link':
            return (
                <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24">
                    <path d="M19.35 10.04C18.67 6.59 15.64 4 12 4 9.11 4 6.6 5.64 5.35 8.04 2.34 8.36 0 10.91 0 14c0 3.31 2.69 6 6 6h13c2.76 0 5-2.24 5-5 0-2.64-2.05-4.78-4.65-4.96zM17 13l-5 5-5-5h3V9h4v4h3z" />
                </svg>
            );
        case 'mediafire_link':
            return (
                <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24">
                    <path d="M12 2c1.1 0 2 .9 2 2 0 .74-.4 1.38-1 1.72v1.56c3.06.44 5.5 2.87 5.92 5.92h1.56c.34-.6.98-1 1.72-1 1.1 0 2 .9 2 2s-.9 2-2 2c-.74 0-1.38-.4-1.72-1h-1.56c-.42 3.05-2.86 5.48-5.92 5.92v1.56c.6.34 1 .98 1 1.72 0 1.1-.9 2-2 2s-2-.9-2-2c0-.74.4-1.38 1-1.72v-1.56C8.44 19.48 6 17.05 5.58 14H4.02C3.68 14.6 3.04 15 2.3 15c-1.1 0-2-.9-2-2s.9-2 2-2c.74 0 1.38.4 1.72 1h1.56C6 8.95 8.44 6.52 11.5 6.08V4.52C10.9 4.18 10.5 3.54 10.5 2.8c0-1.1.9-2 2-2z" />
                </svg>
            );
        case 'terabox_link':
            return (
                <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24">
                    <path d="M21 16.5l-9 5.25-9-5.25V7.5l9-5.25 9 5.25v9zM12 4.125L4.875 8.25 12 12.375l7.125-4.125L12 4.125zM4.5 9.75v5.625L11.25 19.5V13.875L4.5 9.75zm8.25 9.75L19.5 15.375V9.75l-6.75 4.125V19.5z" />
                </svg>
            );
        default:
            return (
                <svg className="w-4 h-4 fill-none stroke-current" viewBox="0 0 24 24" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                </svg>
            );
    }
};

export default function EpisodeList({
    seasons,
    running_status,
    contentId = '',
    contentType = 'anime',
    contentTitle = '',
    tmdbId,
    imdbId,
    initialSeason,
}: EpisodeListProps) {
    const defaultSeason = (initialSeason && seasons.some(s => s.season_number === initialSeason))
        ? initialSeason
        : (seasons[seasons.length - 1]?.season_number || seasons[0]?.season_number || 1);
    const [activeSeason, setActiveSeason] = useState(defaultSeason);
    const [activeEpisode, setActiveEpisode] = useState<string | null>(null);
    const [activeResolution, setActiveResolution] = useState<string | null>(null);
    const [showVerification, setShowVerification] = useState(false);
    const [pendingDownloadUrl, setPendingDownloadUrl] = useState<string | null>(null);
    const [isSeasonDropdownOpen, setIsSeasonDropdownOpen] = useState(false);
    const [seasonSearchQuery, setSeasonSearchQuery] = useState('');
    const [episodeSearchQuery, setEpisodeSearchQuery] = useState('');
    const [isMounted, setIsMounted] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);
    const [fastLoadingKey, setFastLoadingKey] = useState<string | null>(null);
    const { settings: adSettings } = useAdSettings();
    const { hasTutorial, openTutorial } = useTutorial();
    const { trackEvent } = useAuth();

    useEffect(() => {
        setIsMounted(true);
    }, []);

    const handleFastEpisodeDownload = async (seasonNum: number, episodeNum: number, quality: string) => {
        const key = `${seasonNum}_${episodeNum}_${quality}`;
        setFastLoadingKey(key);
        try {
            const targetId = tmdbId || imdbId || contentId;
            const res = await fetch('/api/download/vault', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    type: 'tv',
                    id: targetId,
                    season: seasonNum,
                    episode: episodeNum,
                    quality
                })
            });
            const data = await res.json();
            if (!res.ok || !data.success || !data.url) {
                throw new Error(data.error || 'Direct download link is temporarily unavailable.');
            }
            const cleanUrl = data.url;
            const a = document.createElement('a');
            a.href = cleanUrl;
            a.download = `${(contentTitle || 'media').replace(/[^a-zA-Z0-9_\- ]/g, '')}_S${seasonNum}E${episodeNum}_${quality}.mkv`;
            a.target = '_blank';
            a.rel = 'noopener noreferrer';
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
        } catch (err: any) {
            console.error('[Direct Episode Download Error]:', err);
            alert(err.message || 'Error generating link. Please try another quality.');
        } finally {
            setFastLoadingKey(null);
        }
    };

    const handleDownloadClick = (
        url: string,
        providerName: string,
        resolution: string,
        episodeNum: number | undefined,
        seasonNum: number | undefined,
        e: React.MouseEvent
    ) => {
        trackEvent({
            event_type: 'download',
            movie_id: contentId,
            content_type: contentType,
            content_title: contentTitle || null,
            season_number: seasonNum || null,
            episode_number: episodeNum || null,
            provider: providerName,
            resolution: resolution,
            metadata: {
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

    const sortedSeasons = useMemo(() => {
        return [...seasons].sort((a, b) => a.season_number - b.season_number);
    }, [seasons]);

    const currentSeason = sortedSeasons.find(s => s.season_number === activeSeason) || sortedSeasons[0];
    const episodes = useMemo(() => {
        return currentSeason?.episodes?.sort((a, b) => a.episode_number - b.episode_number) || [];
    }, [currentSeason]);

    const filteredEpisodes = useMemo(() => {
        if (!episodeSearchQuery.trim()) return episodes;
        const q = episodeSearchQuery.toLowerCase().trim();
        return episodes.filter(e => 
            e.episode_number.toString().includes(q) ||
            (e.episode_title && e.episode_title.toLowerCase().includes(q))
        );
    }, [episodes, episodeSearchQuery]);

    const filteredSeasons = useMemo(() => {
        if (!seasonSearchQuery.trim()) return sortedSeasons;
        const q = seasonSearchQuery.toLowerCase().trim();
        return sortedSeasons.filter(s => 
            s.season_number.toString().includes(q) ||
            `season ${s.season_number}`.includes(q) ||
            (s.season_title && s.season_title.toLowerCase().includes(q))
        );
    }, [sortedSeasons, seasonSearchQuery]);

    const currentSeasonIndex = sortedSeasons.findIndex(s => s.season_number === activeSeason);
    const prevSeason = currentSeasonIndex > 0 ? sortedSeasons[currentSeasonIndex - 1] : null;
    const nextSeason = currentSeasonIndex >= 0 && currentSeasonIndex < sortedSeasons.length - 1 ? sortedSeasons[currentSeasonIndex + 1] : null;

    const selectSeason = (seasonNum: number) => {
        setActiveSeason(seasonNum);
        setActiveEpisode(null);
        setActiveResolution(null);
        setIsSeasonDropdownOpen(false);
        setSeasonSearchQuery('');
        setEpisodeSearchQuery('');
    };

    // Close dropdown on click outside or Escape
    useEffect(() => {
        const handleClickOutside = (e: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
                setIsSeasonDropdownOpen(false);
            }
        };
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape') setIsSeasonDropdownOpen(false);
        };
        document.addEventListener('mousedown', handleClickOutside);
        document.addEventListener('keydown', handleKeyDown);
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
            document.removeEventListener('keydown', handleKeyDown);
        };
    }, []);

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
                    onClose={() => setShowVerification(false)}
                    contentType="download"
                />
            )}

            {/* Season Picker Modal (Rendered into document.body with createPortal — ZERO containing block or transform issues!) */}
            {isMounted && isSeasonDropdownOpen && typeof document !== 'undefined' && createPortal(
                <div
                    className="fixed inset-0 z-[99999] flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-in fade-in duration-150"
                    onClick={() => setIsSeasonDropdownOpen(false)}
                >
                    <div
                        ref={dropdownRef}
                        className="
                            relative w-full max-w-md
                            bg-[#151221] border border-white/20
                            rounded-2xl shadow-[0_25px_80px_rgba(0,0,0,0.95)]
                            p-5 space-y-4
                            animate-in zoom-in-95 duration-150
                        "
                        onClick={(e) => e.stopPropagation()}
                    >
                        {/* Modal Header */}
                        <div className="flex items-center justify-between pb-3 border-b border-white/10">
                            <div className="flex items-center gap-2">
                                <span className="text-xl">🎬</span>
                                <span className="font-extrabold text-white text-base md:text-lg">Select Season</span>
                                <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-violet-500/20 text-violet-300 border border-violet-500/30">
                                    {sortedSeasons.length} Seasons
                                </span>
                            </div>
                            <button
                                type="button"
                                onClick={() => setIsSeasonDropdownOpen(false)}
                                className="w-8 h-8 rounded-full bg-white/5 hover:bg-white/15 text-gray-400 hover:text-white flex items-center justify-center transition-colors cursor-pointer text-sm font-bold"
                            >
                                ✕
                            </button>
                        </div>

                        {/* Search season input if > 6 seasons */}
                        {sortedSeasons.length > 6 && (
                            <div className="relative">
                                <input
                                    type="text"
                                    placeholder="Type season number (e.g. 16)..."
                                    value={seasonSearchQuery}
                                    onChange={(e) => setSeasonSearchQuery(e.target.value)}
                                    className="w-full bg-[#1F1B2E] border border-white/10 rounded-xl px-3.5 py-2.5 text-sm text-white placeholder-gray-500 outline-none focus:border-violet-500/60 transition-colors"
                                    autoFocus
                                />
                                {seasonSearchQuery && (
                                    <button
                                        type="button"
                                        onClick={() => setSeasonSearchQuery('')}
                                        className="absolute right-3 top-3 text-xs text-gray-400 hover:text-white"
                                    >
                                        ✕
                                    </button>
                                )}
                            </div>
                        )}

                        {/* Seasons List (100% opaque solid items) */}
                        <div className="max-h-[50vh] overflow-y-auto space-y-2 pr-1 custom-scrollbar">
                            {filteredSeasons.length === 0 ? (
                                <div className="text-center py-8 text-sm text-gray-400">
                                    No season found for &quot;{seasonSearchQuery}&quot;
                                </div>
                            ) : (
                                filteredSeasons.map((season) => {
                                    const isSelected = activeSeason === season.season_number;
                                    const epCount = season.episodes?.length || 0;
                                    return (
                                        <button
                                            key={season.id}
                                            type="button"
                                            onClick={() => selectSeason(season.season_number)}
                                            className={`
                                                w-full flex items-center justify-between p-3.5 rounded-xl
                                                text-left text-sm font-semibold transition-all duration-150 cursor-pointer
                                                ${isSelected
                                                    ? 'bg-gradient-to-r from-violet-600 to-indigo-600 text-white font-bold shadow-lg shadow-violet-900/50 border border-violet-400/40 scale-[1.01]'
                                                    : 'bg-[#1C182A] hover:bg-[#252038] text-gray-300 hover:text-white border border-white/5 hover:border-white/15'
                                                }
                                            `}
                                        >
                                            <div className="flex flex-col">
                                                <span className="flex items-center gap-2">
                                                    <span className="font-bold">Season {season.season_number}</span>
                                                    {isSelected && <span className="text-xs font-black text-violet-200">✓ Active</span>}
                                                </span>
                                                {season.season_title && (
                                                    <span className={`text-xs font-normal truncate max-w-[240px] ${
                                                        isSelected ? 'text-violet-100' : 'text-gray-400'
                                                    }`}>
                                                        {season.season_title}
                                                    </span>
                                                )}
                                            </div>
                                            <span className={`text-xs px-2.5 py-1 rounded-full font-bold shrink-0 ${
                                                isSelected ? 'bg-white/20 text-white' : 'bg-white/5 text-gray-400'
                                            }`}>
                                                {epCount} eps
                                            </span>
                                        </button>
                                    );
                                })
                            )}
                        </div>
                    </div>
                </div>,
                document.body
            )}

            {/* Current Season Card */}
            {currentSeason && (
                <div className="np-glass-solid rounded-np-panel border border-white/10 overflow-hidden shadow-xl">
                    {/* Unified Season Header, Selector, Episode Search & ZIP Download */}
                    <div className="p-5 md:p-6 border-b border-white/10 bg-gradient-to-b from-white/5 to-transparent">
                        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                            {/* Left: Season Switcher & Info */}
                            <div className="flex flex-wrap items-center gap-3">
                                {sortedSeasons.length > 1 ? (
                                    <div className="flex items-center gap-2">
                                        {/* Main Season Dropdown Trigger */}
                                        <button
                                            type="button"
                                            onClick={() => setIsSeasonDropdownOpen(true)}
                                            className="
                                                group flex items-center gap-2.5 px-4 py-2.5 rounded-xl
                                                bg-gradient-to-r from-violet-600/30 via-indigo-600/20 to-purple-600/20
                                                hover:from-violet-600/40 hover:to-indigo-600/30
                                                border border-violet-500/40 hover:border-violet-400/70
                                                text-white font-extrabold text-sm md:text-base
                                                transition-all duration-200 shadow-lg shadow-violet-950/30
                                                cursor-pointer active:scale-[0.98]
                                            "
                                        >
                                            <span className="flex items-center justify-center w-6 h-6 rounded-lg bg-violet-500/20 text-violet-300 border border-violet-400/30 text-xs">
                                                🎬
                                            </span>
                                            <span>Season {currentSeason.season_number}</span>
                                            <span className="text-xs text-gray-300 font-semibold px-2 py-0.5 rounded-full bg-white/10">
                                                {episodes.length} eps
                                            </span>
                                            <svg
                                                className="w-4 h-4 text-violet-400 group-hover:translate-y-0.5 transition-transform"
                                                fill="none"
                                                viewBox="0 0 24 24"
                                                stroke="currentColor"
                                                strokeWidth={2.5}
                                            >
                                                <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                                            </svg>
                                        </button>

                                        {/* Prev Season Arrow */}
                                        <button
                                            type="button"
                                            onClick={() => prevSeason && selectSeason(prevSeason.season_number)}
                                            disabled={!prevSeason}
                                            title={prevSeason ? `Previous: Season ${prevSeason.season_number}` : 'First season'}
                                            className={`
                                                flex items-center justify-center w-10 h-10 rounded-xl border transition-all
                                                ${prevSeason
                                                    ? 'bg-white/5 hover:bg-white/10 text-gray-200 hover:text-white border-white/10 cursor-pointer active:scale-95'
                                                    : 'bg-white/[0.02] text-gray-600 border-white/5 cursor-not-allowed opacity-30'
                                                }
                                            `}
                                        >
                                            ‹
                                        </button>

                                        {/* Next Season Arrow */}
                                        <button
                                            type="button"
                                            onClick={() => nextSeason && selectSeason(nextSeason.season_number)}
                                            disabled={!nextSeason}
                                            title={nextSeason ? `Next: Season ${nextSeason.season_number}` : 'Last season'}
                                            className={`
                                                flex items-center justify-center w-10 h-10 rounded-xl border transition-all
                                                ${nextSeason
                                                    ? 'bg-white/5 hover:bg-white/10 text-gray-200 hover:text-white border-white/10 cursor-pointer active:scale-95'
                                                    : 'bg-white/[0.02] text-gray-600 border-white/5 cursor-not-allowed opacity-30'
                                                }
                                            `}
                                        >
                                            ›
                                        </button>
                                    </div>
                                ) : (
                                    <div>
                                        <h3 className="text-xl md:text-2xl font-black text-[#F7F8FC] flex items-center gap-2">
                                            <span>Season {currentSeason.season_number}</span>
                                            {currentSeason.season_title && (
                                                <span className="text-[#A7AABD] font-normal text-base md:text-lg">
                                                    — {currentSeason.season_title}
                                                </span>
                                            )}
                                        </h3>
                                    </div>
                                )}

                                {/* Season details / status text */}
                                <div className="text-xs md:text-sm text-[#A7AABD] flex items-center gap-2">
                                    {sortedSeasons.length > 1 && (
                                        <span className="text-xs font-semibold text-gray-400 bg-white/5 px-2.5 py-1 rounded-lg border border-white/5">
                                            Season {currentSeason.season_number} of {sortedSeasons.length}
                                        </span>
                                    )}
                                    {episodeSearchQuery && (
                                        <span className="text-violet-400 font-semibold">
                                            ({filteredEpisodes.length} matched)
                                        </span>
                                    )}
                                    {running_status && (
                                        <span className={`text-xs font-bold px-2 py-0.5 rounded-lg border ${
                                            running_status === 'Ongoing'
                                                ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30 animate-pulse'
                                                : 'bg-white/5 text-gray-400 border-white/10'
                                        }`}>
                                            {running_status}
                                        </span>
                                    )}
                                </div>
                            </div>

                            {/* Right: Episode Search Box & ZIP Download */}
                            <div className="flex flex-wrap items-center gap-3">
                                {episodes.length > 4 && (
                                    <div className="relative w-full sm:w-auto">
                                        <input
                                            type="text"
                                            placeholder="Search ep (e.g. 480)..."
                                            value={episodeSearchQuery}
                                            onChange={(e) => setEpisodeSearchQuery(e.target.value)}
                                            className="w-full sm:w-56 bg-white/5 border border-white/10 rounded-xl px-3.5 py-2 pl-9 text-xs text-white placeholder-gray-500 outline-none focus:border-violet-500/50 transition-colors"
                                        />
                                        <span className="absolute left-3 top-2.5 text-xs text-gray-500">🔍</span>
                                        {episodeSearchQuery && (
                                            <button
                                                type="button"
                                                onClick={() => setEpisodeSearchQuery('')}
                                                className="absolute right-3 top-2.5 text-xs text-gray-400 hover:text-white cursor-pointer"
                                            >
                                                ✕
                                            </button>
                                        )}
                                    </div>
                                )}

                                {currentSeason.season_zip_link && (
                                    <a
                                        href={currentSeason.season_zip_link}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        onClick={(e) => handleDownloadClick(
                                            currentSeason.season_zip_link!,
                                            'ZIP / Full Season',
                                            'All',
                                            undefined,
                                            currentSeason.season_number,
                                            e
                                        )}
                                        className="
                                            flex items-center justify-center gap-2 px-5 py-2.5
                                            bg-gradient-to-r from-purple-600 to-indigo-600
                                            hover:from-purple-500 hover:to-indigo-500
                                            text-white font-bold rounded-xl shadow-lg shadow-purple-900/40
                                            transform hover:scale-[1.02] active:scale-[0.98] transition-all
                                            w-full sm:w-auto text-xs md:text-sm
                                        "
                                    >
                                        <span className="text-base">📦</span>
                                        <span>Download Full Season (ZIP)</span>
                                    </a>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Episodes List */}
                    <div className="p-5 md:p-6">
                        {filteredEpisodes.length === 0 ? (
                            <div className="text-center py-12 text-gray-400 space-y-3">
                                <span className="text-3xl">🔍</span>
                                <p className="text-base font-semibold">
                                    {episodeSearchQuery
                                        ? `No episodes found matching "${episodeSearchQuery}"`
                                        : 'Episodes coming soon ⏳'}
                                </p>
                                {episodeSearchQuery && (
                                    <button
                                        type="button"
                                        onClick={() => setEpisodeSearchQuery('')}
                                        className="px-4 py-1.5 rounded-xl bg-white/10 hover:bg-white/15 text-white text-xs font-bold transition-colors cursor-pointer"
                                    >
                                        Clear search filter
                                    </button>
                                )}
                            </div>
                        ) : (
                            <div className="space-y-3">
                                {filteredEpisodes.map((episode) => {
                                    const isActive = activeEpisode === episode.id;
                                    const availableRes = getAvailableResolutions(episode);

                                    return (
                                        <div key={episode.id} className="bg-[#141625] rounded-xl border border-white/10 overflow-hidden transition-colors hover:border-white/20">
                                            {/* Episode Header */}
                                            <div
                                                className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 cursor-pointer hover:bg-[#1B1E31]/50 transition-colors"
                                                onClick={() => handleEpisodeClick(episode.id)}
                                            >
                                                <div className="flex items-center gap-3">
                                                    <div className="w-10 h-10 rounded-lg bg-[#E51D48]/15 text-[#E51D48] flex items-center justify-center font-bold text-sm border border-[#E51D48]/30">
                                                        {episode.episode_number}
                                                    </div>
                                                    <div>
                                                        <h4 className="font-medium text-[#F7F8FC] flex items-center gap-2">
                                                            Episode {episode.episode_number}
                                                            {running_status === 'Ongoing' && episode.episode_number === Math.max(...episodes.map(e => e.episode_number)) && (
                                                                <span className="px-1.5 py-0.5 bg-[#E51D48]/20 text-[#E51D48] text-[10px] font-bold rounded border border-[#E51D48]/40 animate-pulse">
                                                                    NEW
                                                                </span>
                                                            )}
                                                            {episode.episode_title && (
                                                                <span className="text-[#A7AABD] font-normal ml-2">
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
                                                            const isActiveRes = activeEpisode === episode.id && activeResolution === res;
                                                            return (
                                                                <button
                                                                    key={res}
                                                                    onClick={() => handleResolutionClick(episode.id, res)}
                                                                    className={`
                                                                        px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer
                                                                        ${isActiveRes
                                                                            ? 'bg-gradient-to-r from-violet-600 to-indigo-600 text-white shadow-lg shadow-violet-600/40 ring-1 ring-violet-400 scale-105'
                                                                            : 'bg-violet-600/15 hover:bg-violet-600/25 text-violet-300 border border-violet-500/30'
                                                                        }
                                                                    `}
                                                                >
                                                                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2.5}>
                                                                        <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                                                                    </svg>
                                                                    <span>{res}</span>
                                                                    {link?.file_size && (
                                                                        <span className="text-[10px] opacity-80 ml-0.5">
                                                                            ({link.file_size})
                                                                        </span>
                                                                    )}
                                                                </button>
                                                            );
                                                        })
                                                    ) : (
                                                        <div className="flex flex-wrap items-center gap-1.5">
                                                            {['720p', '1080p', '480p', '360p'].map(q => {
                                                                const k = `${currentSeason.season_number}_${episode.episode_number}_${q}`;
                                                                const isLoading = fastLoadingKey === k;
                                                                return (
                                                                    <button
                                                                        key={q}
                                                                        onClick={() => handleFastEpisodeDownload(currentSeason.season_number, episode.episode_number, q)}
                                                                        disabled={isLoading}
                                                                        className="px-2.5 py-1.5 bg-violet-600/20 hover:bg-violet-600/35 text-violet-300 border border-violet-500/30 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 active:scale-95 disabled:opacity-50 cursor-pointer"
                                                                        title={`Fast Direct Download ${q}`}
                                                                    >
                                                                        {isLoading ? (
                                                                            <div className="w-3 h-3 border-2 border-violet-300 border-t-transparent rounded-full animate-spin" />
                                                                        ) : (
                                                                            <svg className="w-3 h-3 text-amber-300" fill="currentColor" viewBox="0 0 20 20">
                                                                                <path fillRule="evenodd" d="M11.3 1.046A1 1 0 0112 2v5h4a1 1 0 01.82 1.573l-7 10A1 1 0 018 18v-5H4a1 1 0 01-.82-1.573l7-10a1 1 0 011.12-.38z" clipRule="evenodd" />
                                                                            </svg>
                                                                        )}
                                                                        <span>{q}</span>
                                                                    </button>
                                                                );
                                                            })}
                                                        </div>
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
                                                            <h5 className="text-sm font-medium text-gray-400 mb-3 flex items-center gap-2">
                                                                <svg className="w-4 h-4 text-violet-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                                                                    <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                                                                </svg>
                                                                <span>Download Mirrors for {activeResolution}:</span>
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
                                                                                    target="_blank"
                                                                                    rel="noopener noreferrer"
                                                                                    onClick={(e) => {
                                                                                        if (isExpired) { e.preventDefault(); return; }
                                                                                        handleDownloadClick(
                                                                                            provider.url,
                                                                                            provider.name,
                                                                                            activeResolution,
                                                                                            episode.episode_number,
                                                                                            currentSeason.season_number,
                                                                                            e
                                                                                        );
                                                                                    }}
                                                                                    className={`
                                                                                        flex items-center gap-3 p-3.5 rounded-xl min-h-[48px]
                                                                                        bg-gradient-to-r ${provider.color}
                                                                                        text-white font-bold text-xs sm:text-sm
                                                                                        shadow-md hover:scale-[1.02] active:scale-[0.98]
                                                                                        transition-all duration-200
                                                                                        group flex-1 cursor-pointer
                                                                                        ${isExpired ? 'grayscale opacity-70 cursor-not-allowed' : ''}
                                                                                    `}
                                                                                >
                                                                                    <span className="w-7 h-7 rounded-lg bg-black/20 flex items-center justify-center shrink-0">
                                                                                        <EpisodeProviderSvg providerKey={provider.key as ProviderKey} />
                                                                                    </span>
                                                                                    <span className="flex-1 flex flex-col">
                                                                                        <span>{provider.name}</span>
                                                                                        {isExpired && (
                                                                                            <span className="text-[10px] bg-black/40 px-1.5 py-0.5 rounded text-red-200 w-fit mt-0.5">
                                                                                                ⚠️ Link Expired - Report to Admin
                                                                                            </span>
                                                                                        )}
                                                                                    </span>
                                                                                    <svg
                                                                                        className="w-4 h-4 opacity-75 group-hover:translate-x-1 transition-transform"
                                                                                        fill="none"
                                                                                        stroke="currentColor"
                                                                                        viewBox="0 0 24 24"
                                                                                        strokeWidth={2}
                                                                                    >
                                                                                        <path strokeLinecap="round" strokeLinejoin="round" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
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
