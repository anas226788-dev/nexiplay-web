'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { Movie, Season, Episode } from '@/lib/types';
import { useAdSettings } from '@/hooks/useAdSettings';
import { supabase } from '@/lib/supabase';
import { AdBanner, NativeAd } from '@/components/ads';
import CommentSection from '@/components/CommentSection';
import RelatedPosts from '@/components/RelatedPosts';
import AdVerificationPopup from '@/components/AdVerificationPopup';
import { canRequestPlayerFullscreen, FULLSCREEN_IFRAME_ATTRS, requestPlayerFullscreen } from '@/lib/playerFullscreen';
import { useAuth } from '@/context/AuthContext';

interface WatchPageClientProps {
    movie: Movie;
    seasons?: Season[];
    type: string;
    slug: string;
}

const checkIsContentVerified = (contentId: string, contentType: string): boolean => {
    if (typeof window === 'undefined') return false;
    try {
        const raw = localStorage.getItem('nexiplay_verification_records');
        if (!raw) return false;
        const records = JSON.parse(raw);
        const record = records[contentId];
        if (!record) return false;

        const now = Date.now();
        const verifiedAt = record.verifiedAt;

        if (contentType === 'movie') {
            // For movies, daily verify (24 hours)
            const ONE_DAY_MS = 24 * 60 * 60 * 1000;
            return now - verifiedAt < ONE_DAY_MS;
        } else {
            // For series/anime, 25 minutes
            const TWENTY_FIVE_MIN_MS = 25 * 60 * 1000;
            return now - verifiedAt < TWENTY_FIVE_MIN_MS;
        }
    } catch (e) {
        return false;
    }
};

const saveContentVerification = (contentId: string, contentType: string) => {
    if (typeof window === 'undefined') return;
    try {
        const raw = localStorage.getItem('nexiplay_verification_records') || '{}';
        const records = JSON.parse(raw);
        records[contentId] = {
            verifiedAt: Date.now(),
            contentType: contentType
        };
        localStorage.setItem('nexiplay_verification_records', JSON.stringify(records));
    } catch (e) {
        console.error('Failed to save verification:', e);
    }
};

interface Server {
    id: string;
    name: string;
    icon: string;
    getUrl: (movieId: string, tmdbId?: string, imdbId?: string, malId?: string, season?: number, episode?: number) => string | null;
    animeOnly?: boolean;
    movieOnly?: boolean;
}

const BUILT_IN_SERVERS: Server[] = [
    {
        id: 'vidsrc_to',
        name: 'Server VidSrc (Pro)',
        icon: '⚡',
        getUrl: (id, tmdb, imdb, mal, s, e) => {
            if (!tmdb) return null;
            return s !== undefined && e !== undefined
                ? `https://vidsrc.to/embed/tv/${tmdb}/${s}/${e}`
                : `https://vidsrc.to/embed/movie/${tmdb}`;
        }
    },
    {
        id: 'vidsrc_me',
        name: 'Server VidSrc.me',
        icon: '🚀',
        getUrl: (id, tmdb, imdb, mal, s, e) => {
            if (!tmdb) return null;
            return s !== undefined && e !== undefined
                ? `https://vidsrc.me/embed/tv?tmdb=${tmdb}&season=${s}&episode=${e}`
                : `https://vidsrc.me/embed/movie?tmdb=${tmdb}`;
        }
    }
];

const SERVERS: Server[] = BUILT_IN_SERVERS;

const AD_BLOCK_SANDBOX =
    'allow-scripts allow-same-origin allow-forms allow-popups allow-presentation allow-pointer-lock allow-orientation-lock allow-modals allow-downloads allow-storage-access-by-user-activation';

const DISABLED_MULTI_SERVER_IDS = new Set(['muse_india', 'anione_india']);

type MultiScraperServerConfig = {
    mode?: string;
    url?: string;
    urls?: Record<string, string>;
    episodeUrls?: Record<string, string>;
};

function normalizeConfiguredServerUrl(serverKey: string, url: string): string {
    const cleanUrl = url.trim();
    if (serverKey.toLowerCase() === 'toonstream' && /^\d+$/.test(cleanUrl)) {
        return `https://toonstream.vip/?trembed=${cleanUrl}`;
    }
    return normalizePlayerUrl(cleanUrl);
}

function getYouTubeVideoId(urlOrId: string): string | null {
    const input = urlOrId.trim();
    if (/^[a-zA-Z0-9_-]{11}$/.test(input)) return input;

    try {
        const parsed = new URL(input);
        const host = parsed.hostname.replace(/^www\./, '').toLowerCase();

        if (host === 'youtu.be') {
            const id = parsed.pathname.split('/').filter(Boolean)[0];
            return id && /^[a-zA-Z0-9_-]{11}$/.test(id) ? id : null;
        }

        if (host.endsWith('youtube.com') || host.endsWith('youtube-nocookie.com')) {
            const watchId = parsed.searchParams.get('v');
            if (watchId && /^[a-zA-Z0-9_-]{11}$/.test(watchId)) return watchId;

            const parts = parsed.pathname.split('/').filter(Boolean);
            const marker = ['embed', 'shorts', 'live'].find(part => parts.includes(part));
            if (marker) {
                const id = parts[parts.indexOf(marker) + 1];
                return id && /^[a-zA-Z0-9_-]{11}$/.test(id) ? id : null;
            }
        }
    } catch {
        const match = input.match(/(?:v=|youtu\.be\/|embed\/|shorts\/|live\/)([a-zA-Z0-9_-]{11})/);
        if (match) return match[1];
    }

    return null;
}

function normalizePlayerUrl(url: string): string {
    const cleanUrl = url.trim();
    const youtubeId = getYouTubeVideoId(cleanUrl);
    if (!youtubeId) return cleanUrl;
    return `https://www.youtube-nocookie.com/embed/${youtubeId}?rel=0&modestbranding=1&playsinline=1&iv_load_policy=3&fs=1`;
}

function HLSVideoPlayer({ src, onEnded }: { src: string; onEnded?: () => void }) {
    const videoRef = useRef<HTMLVideoElement>(null);
    const hlsRef = useRef<any>(null);
    const [hlsLoaded, setHlsLoaded] = useState(false);
    const [audioTracks, setAudioTracks] = useState<any[]>([]);
    const [currentTrackIndex, setCurrentTrackIndex] = useState<number>(-1);

    // Error handling state
    const [videoError, setVideoError] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const retryCountRef = useRef(0);
    const loadingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
    const MAX_RETRIES = 3;

    const [leftSkipActive, setLeftSkipActive] = useState(false);
    const [rightSkipActive, setRightSkipActive] = useState(false);
    const [accumulatedSkip, setAccumulatedSkip] = useState(0);

    // Custom controls state
    const containerRef = useRef<HTMLDivElement>(null);
    const [playbackSpeed, setPlaybackSpeed] = useState<number>(1.0);
    const [showSpeedMenu, setShowSpeedMenu] = useState<boolean>(false);
    const [isFullscreen, setIsFullscreen] = useState<boolean>(false);
    const [customSpeedVal, setCustomSpeedVal] = useState<string>('1.0');

    // Quality controls state
    const [hlsLevels, setHlsLevels] = useState<any[]>([]);
    const [currentQualityIndex, setCurrentQualityIndex] = useState<number>(-1);
    const [showQualityMenu, setShowQualityMenu] = useState<boolean>(false);

    const leftSkipActiveRef = useRef(false);
    const rightSkipActiveRef = useRef(false);
    const skipTimeoutRef = useRef<NodeJS.Timeout | null>(null);
    const lastTapRef = useRef<{ time: number; x: number }>({ time: 0, x: 0 });
    const clickTimeoutRef = useRef<NodeJS.Timeout | null>(null);

    const setLeftActive = (val: boolean) => {
        leftSkipActiveRef.current = val;
        setLeftSkipActive(val);
    };

    const setRightActive = (val: boolean) => {
        rightSkipActiveRef.current = val;
        setRightSkipActive(val);
    };

    const triggerSkip = (side: 'left' | 'right') => {
        if (skipTimeoutRef.current) {
            clearTimeout(skipTimeoutRef.current);
        }

        const currentActiveSide = leftSkipActiveRef.current ? 'left' : (rightSkipActiveRef.current ? 'right' : null);
        
        if (currentActiveSide && currentActiveSide !== side) {
            setLeftActive(false);
            setRightActive(false);
            setAccumulatedSkip(0);
        }

        if (videoRef.current) {
            if (side === 'left') {
                videoRef.current.currentTime = Math.max(0, videoRef.current.currentTime - 10);
            } else {
                videoRef.current.currentTime = Math.min(videoRef.current.duration || 0, videoRef.current.currentTime + 10);
            }
        }

        setAccumulatedSkip(prev => prev + 10);
        
        if (side === 'left') {
            setLeftActive(true);
            setRightActive(false);
        } else {
            setRightActive(true);
            setLeftActive(false);
        }

        skipTimeoutRef.current = setTimeout(() => {
            setLeftActive(false);
            setRightActive(false);
            setAccumulatedSkip(0);
        }, 800);
    };

    const triggerSkipRef = useRef<((side: 'left' | 'right') => void) | null>(null);
    triggerSkipRef.current = triggerSkip;

    const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
        const rect = e.currentTarget.getBoundingClientRect();
        const clickX = e.clientX - rect.left;
        const isLeft = clickX < rect.width / 2;
        
        const currentTime = new Date().getTime();
        const tapDelay = currentTime - lastTapRef.current.time;
        
        if (tapDelay < 350 && tapDelay > 0) {
            // Double click/tap detected!
            if (clickTimeoutRef.current) {
                clearTimeout(clickTimeoutRef.current);
                clickTimeoutRef.current = null;
            }
            
            triggerSkip(isLeft ? 'left' : 'right');
        } else {
            // Single tap/click - delay toggle to wait for double tap
            lastTapRef.current = { time: currentTime, x: clickX };
            
            if (clickTimeoutRef.current) clearTimeout(clickTimeoutRef.current);
            
            clickTimeoutRef.current = setTimeout(() => {
                if (videoRef.current) {
                    if (videoRef.current.paused) {
                        videoRef.current.play().catch(() => {});
                    } else {
                        videoRef.current.pause();
                    }
                }
                clickTimeoutRef.current = null;
            }, 250);
        }
    };

    // Keyboard hotkeys (ArrowLeft/ArrowRight to skip, Space to play/pause)
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (document.activeElement?.tagName === 'INPUT' || document.activeElement?.tagName === 'TEXTAREA') {
                return;
            }

            if (e.key === 'ArrowLeft') {
                e.preventDefault();
                if (triggerSkipRef.current) triggerSkipRef.current('left');
            } else if (e.key === 'ArrowRight') {
                e.preventDefault();
                if (triggerSkipRef.current) triggerSkipRef.current('right');
            } else if (e.key === ' ' || e.key === 'Spacebar') {
                e.preventDefault();
                if (videoRef.current) {
                    if (videoRef.current.paused) {
                        videoRef.current.play().catch(() => {});
                    } else {
                        videoRef.current.pause();
                    }
                }
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => {
            window.removeEventListener('keydown', handleKeyDown);
        };
    }, []);

    useEffect(() => {
        if ((window as any).Hls) {
            setHlsLoaded(true);
            return;
        }

        const script = document.createElement('script');
        script.src = 'https://cdn.jsdelivr.net/npm/hls.js@1.5.8/dist/hls.min.js';
        script.async = true;
        script.onload = () => setHlsLoaded(true);
        document.body.appendChild(script);
    }, []);

    useEffect(() => {
        setAudioTracks([]);
        setCurrentTrackIndex(-1);
        setVideoError(null);
        setIsLoading(true);
        retryCountRef.current = 0;

        if (!hlsLoaded || !videoRef.current) return;

        const video = videoRef.current;
        const Hls = (window as any).Hls;

        if (hlsRef.current) {
            hlsRef.current.destroy();
            hlsRef.current = null;
        }

        // Loading timeout — if video doesn't start within 20s, show error
        if (loadingTimeoutRef.current) clearTimeout(loadingTimeoutRef.current);
        loadingTimeoutRef.current = setTimeout(() => {
            if (video.readyState < 2) {
                setVideoError('Video failed to load. No response from server.');
                setIsLoading(false);
            }
        }, 20000);

        const isMp4 = src.toLowerCase().includes('.mp4') || src.includes('mp4');

        if (Hls.isSupported() && !isMp4) {
            const hls = new Hls({
                maxMaxBufferLength: 30,
                enableWorker: true,
                lowLatencyMode: true
            });
            hlsRef.current = hls;
            hls.loadSource(src);
            hls.attachMedia(video);
            
            hls.on(Hls.Events.MANIFEST_PARSED, () => {
                setIsLoading(false);
                setVideoError(null);
                if (loadingTimeoutRef.current) clearTimeout(loadingTimeoutRef.current);
                
                // Read and set quality levels
                const levels = hls.levels || [];
                setHlsLevels(levels);
                setCurrentQualityIndex(hls.currentLevel);

                const tracks = hls.audioTracks || [];
                setAudioTracks(tracks);
                setCurrentTrackIndex(hls.audioTrack);
                
                if (tracks.length > 0) {
                    const hindiIdx = tracks.findIndex((t: any) => 
                        t.name.toLowerCase().includes('hindi') || 
                        t.name.toLowerCase().includes('hin') ||
                        t.lang?.toLowerCase().startsWith('hi')
                    );
                    if (hindiIdx !== -1) {
                        console.log(`[HLSPlayer] Auto-switched to Hindi audio track (index ${hindiIdx})`);
                        hls.audioTrack = hindiIdx;
                        setCurrentTrackIndex(hindiIdx);
                    }
                }
            });

            hls.on(Hls.Events.AUDIO_TRACK_SWITCHED, (event: any, data: any) => {
                setCurrentTrackIndex(data.id);
            });

            hls.on(Hls.Events.ERROR, function (event: any, data: any) {
                if (data.fatal) {
                    retryCountRef.current++;
                    console.warn(`[HLSPlayer] Fatal error (attempt ${retryCountRef.current}/${MAX_RETRIES}):`, data.type, data.details);

                    if (retryCountRef.current >= MAX_RETRIES) {
                        // Max retries reached — show error
                        setVideoError('Video could not be loaded. Server or link issue.');
                        setIsLoading(false);
                        if (loadingTimeoutRef.current) clearTimeout(loadingTimeoutRef.current);
                        hls.destroy();
                        return;
                    }

                    switch (data.type) {
                        case Hls.ErrorTypes.NETWORK_ERROR:
                            hls.startLoad();
                            break;
                        case Hls.ErrorTypes.MEDIA_ERROR:
                            hls.recoverMediaError();
                            break;
                        default:
                            setVideoError('Unable to play this video.');
                            setIsLoading(false);
                            if (loadingTimeoutRef.current) clearTimeout(loadingTimeoutRef.current);
                            hls.destroy();
                            break;
                    }
                }
            });
        } else {
            video.src = src;
            
            // For non-HLS (mp4), listen for native errors
            video.onerror = () => {
                setVideoError('Video failed to load.');
                setIsLoading(false);
                if (loadingTimeoutRef.current) clearTimeout(loadingTimeoutRef.current);
            };
        }

        const handleLoadedMetadata = () => {
            const nativeTracks = (video as any).audioTracks;
            if (nativeTracks && nativeTracks.length > 0) {
                const tracksList = [];
                let activeIdx = 0;
                let hasHindi = false;
                let hindiIdx = -1;

                for (let i = 0; i < nativeTracks.length; i++) {
                    const track = nativeTracks[i];
                    tracksList.push({
                        name: track.label || track.language || `Track ${i + 1}`,
                        lang: track.language,
                        id: i
                    });

                    const isHindi = track.language?.toLowerCase().startsWith('hi') ||
                                    track.label?.toLowerCase().includes('hindi') ||
                                    track.label?.toLowerCase().includes('hin');
                    
                    if (isHindi) {
                        hasHindi = true;
                        hindiIdx = i;
                    }

                    if (track.enabled) {
                        activeIdx = i;
                    }
                }

                if (hasHindi && hindiIdx !== -1) {
                    for (let i = 0; i < nativeTracks.length; i++) {
                        nativeTracks[i].enabled = (i === hindiIdx);
                    }
                    activeIdx = hindiIdx;
                    console.log(`[HLSPlayer] Native audio auto-switched to Hindi track`);
                }

                setAudioTracks(tracksList);
                setCurrentTrackIndex(activeIdx);
            }
        };
        video.addEventListener('loadedmetadata', handleLoadedMetadata);

        // Clear loading when video can play
        const handleCanPlay = () => {
            setIsLoading(false);
            setVideoError(null);
            if (loadingTimeoutRef.current) clearTimeout(loadingTimeoutRef.current);
        };
        video.addEventListener('canplay', handleCanPlay);
        
        return () => {
            video.removeEventListener('loadedmetadata', handleLoadedMetadata);
            video.removeEventListener('canplay', handleCanPlay);
            if (loadingTimeoutRef.current) clearTimeout(loadingTimeoutRef.current);
            if (hlsRef.current) {
                hlsRef.current.destroy();
                hlsRef.current = null;
            }
        };
    }, [src, hlsLoaded]);

    // Handle playback speed changes
    useEffect(() => {
        if (videoRef.current) {
            videoRef.current.playbackRate = playbackSpeed;
        }
    }, [playbackSpeed]);

    // Reset playback speed and quality on source changes
    useEffect(() => {
        setPlaybackSpeed(1.0);
        setCustomSpeedVal('1.0');
        setHlsLevels([]);
        setCurrentQualityIndex(-1);
        setShowQualityMenu(false);
    }, [src]);

    // Keep custom input in sync with current speed
    useEffect(() => {
        setCustomSpeedVal(String(playbackSpeed));
    }, [playbackSpeed]);

    // Listen for fullscreen change events
    useEffect(() => {
        const handleFullscreenChange = () => {
            const isFS = !!(document.fullscreenElement || (document as any).webkitFullscreenElement);
            setIsFullscreen(isFS);
            if (!isFS) {
                if (screen.orientation && screen.orientation.unlock) {
                    try {
                        screen.orientation.unlock();
                    } catch (e) {}
                }
            }
        };
        document.addEventListener('fullscreenchange', handleFullscreenChange);
        document.addEventListener('webkitfullscreenchange', handleFullscreenChange);
        return () => {
            document.removeEventListener('fullscreenchange', handleFullscreenChange);
            document.removeEventListener('webkitfullscreenchange', handleFullscreenChange);
        };
    }, []);

    const toggleFullscreen = () => {
        const container = containerRef.current;
        const video = videoRef.current;
        if (!container || !video) return;

        const isFS = !!(document.fullscreenElement || (document as any).webkitFullscreenElement);
        const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as any).MSStream;

        if (!isFS) {
            // iOS Native Fullscreen auto-rotates natively
            if (isIOS && (video as any).webkitEnterFullscreen) {
                (video as any).webkitEnterFullscreen();
                return;
            }

            const req = container.requestFullscreen || (container as any).webkitRequestFullscreen || (container as any).mozRequestFullScreen || (container as any).msRequestFullscreen;
            if (req) {
                req.call(container).then(() => {
                    // Lock orientation to landscape on Android Chrome
                    if (screen.orientation && (screen.orientation as any).lock) {
                        (screen.orientation as any).lock('landscape').catch((err: any) => {
                            console.warn("Screen orientation lock failed:", err);
                        });
                    }
                }).catch(() => {
                    if ((video as any).webkitEnterFullscreen) {
                        (video as any).webkitEnterFullscreen();
                    }
                });
            } else if ((video as any).webkitEnterFullscreen) {
                (video as any).webkitEnterFullscreen();
            }
        } else {
            const exit = document.exitFullscreen || (document as any).webkitExitFullscreen || (document as any).mozCancelFullScreen || (document as any).msExitFullscreen;
            if (exit) {
                exit.call(document);
            }
        }
    };

    const handleQualityChange = (index: number) => {
        if (hlsRef.current) {
            hlsRef.current.currentLevel = index;
            hlsRef.current.nextLevel = index;
            setCurrentQualityIndex(index);
            setShowQualityMenu(false);
        }
    };

    const getQualityLabel = (level: any, idx: number) => {
        if (!level) return 'Auto';
        if (level.height) return `${level.height}p`;
        if (level.name) return level.name;
        return `Quality ${idx + 1}`;
    };

    // Set up onEnded event listener
    useEffect(() => {
        const video = videoRef.current;
        if (!video) return;

        const handleEnded = () => {
            if (onEnded) onEnded();
        };

        video.addEventListener('ended', handleEnded);
        return () => {
            video.removeEventListener('ended', handleEnded);
        };
    }, [onEnded]);

    const handleAudioTrackChange = (index: number) => {
        if (hlsRef.current) {
            hlsRef.current.audioTrack = index;
            setCurrentTrackIndex(index);
        } else if (videoRef.current && (videoRef.current as any).audioTracks) {
            const nativeTracks = (videoRef.current as any).audioTracks;
            for (let i = 0; i < nativeTracks.length; i++) {
                nativeTracks[i].enabled = (i === index);
            }
            setCurrentTrackIndex(index);
        }
    };

    const handleRetry = () => {
        setVideoError(null);
        setIsLoading(true);
        retryCountRef.current = 0;
        if (hlsRef.current) {
            hlsRef.current.destroy();
            hlsRef.current = null;
        }
        if (videoRef.current) {
            videoRef.current.src = '';
        }
        // Re-trigger the effect by toggling hlsLoaded
        setHlsLoaded(false);
        setTimeout(() => {
            if ((window as any).Hls) setHlsLoaded(true);
        }, 100);
    };

    return (
        <div ref={containerRef} className="absolute inset-0 w-full h-full bg-[#000000] flex flex-col justify-between group">
            <style dangerouslySetInnerHTML={{__html: `
                @keyframes rippleExpandLeft {
                    0% {
                        transform: translate(-50%, -50%) scale(0.2);
                        opacity: 0;
                    }
                    30% {
                        opacity: 1;
                    }
                    100% {
                        transform: translate(-50%, -50%) scale(1);
                        opacity: 0;
                    }
                }
                @keyframes rippleExpandRight {
                    0% {
                        transform: translate(50%, -50%) scale(0.2);
                        opacity: 0;
                    }
                    30% {
                        opacity: 1;
                    }
                    100% {
                        transform: translate(50%, -50%) scale(1);
                        opacity: 0;
                    }
                }
                .animate-ripple-expand-left {
                    animation: rippleExpandLeft 0.8s cubic-bezier(0.1, 0.8, 0.3, 1) forwards;
                }
                .animate-ripple-expand-right {
                    animation: rippleExpandRight 0.8s cubic-bezier(0.1, 0.8, 0.3, 1) forwards;
                }
                @keyframes flashChevron {
                    0%, 100% { opacity: 0.2; }
                    50% { opacity: 1; }
                }
                .animate-chevron-1-right {
                    animation: flashChevron 0.6s infinite;
                }
                .animate-chevron-2-right {
                    animation: flashChevron 0.6s infinite;
                    animation-delay: 0.15s;
                }
                .animate-chevron-3-right {
                    animation: flashChevron 0.6s infinite;
                    animation-delay: 0.3s;
                }
                .animate-chevron-1-left {
                    animation: flashChevron 0.6s infinite;
                }
                .animate-chevron-2-left {
                    animation: flashChevron 0.6s infinite;
                    animation-delay: 0.15s;
                }
                .animate-chevron-3-left {
                    animation: flashChevron 0.6s infinite;
                    animation-delay: 0.3s;
                }
            `}} />

            <div className="relative w-full flex-grow overflow-hidden">
                {/* Error Overlay */}
                {videoError && (
                    <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-sm">
                        <div className="flex flex-col items-center gap-4 p-6 max-w-md text-center">
                            <div className="w-16 h-16 rounded-full bg-red-500/20 flex items-center justify-center">
                                <svg className="w-8 h-8 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
                                </svg>
                            </div>
                            <div>
                                <h3 className="text-white font-bold text-lg mb-1">Video Unavailable</h3>
                                <p className="text-gray-400 text-sm">{videoError}</p>
                            </div>
                            <div className="flex gap-3">
                                <button
                                    onClick={handleRetry}
                                    className="px-5 py-2.5 bg-gradient-to-r from-red-600 to-orange-600 text-white font-bold text-sm rounded-xl hover:from-red-500 hover:to-orange-500 transition-all shadow-lg shadow-red-900/30 flex items-center gap-2"
                                >
                                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182" />
                                    </svg>
                                    Retry
                                </button>
                            </div>
                            <p className="text-gray-500 text-xs mt-2">Try switching to a different server if the problem persists.</p>
                        </div>
                    </div>
                )}

                {/* Loading Spinner */}
                {isLoading && !videoError && (
                    <div className="absolute inset-0 z-40 flex items-center justify-center bg-black/60 pointer-events-none">
                        <div className="flex flex-col items-center gap-3">
                            <div className="w-10 h-10 border-3 border-white/20 border-t-red-500 rounded-full animate-spin" />
                            <span className="text-gray-400 text-xs font-medium">Loading video...</span>
                        </div>
                    </div>
                )}

                <video
                    ref={videoRef}
                    controls
                    className={`absolute inset-0 w-full h-full object-contain ${videoError ? 'hidden' : ''}`}
                    autoPlay
                    playsInline
                />

                {/* Floating custom controls (Speed & Quality & Fullscreen) */}
                {!videoError && !isLoading && (
                    <div className="absolute top-4 right-4 z-30 flex items-center gap-2 bg-black/60 backdrop-blur-md border border-white/10 rounded-xl p-1 md:p-1.5 shadow-lg">
                        {/* Quality Selector */}
                        {hlsLevels.length > 0 && (
                            <div className="relative">
                                <button
                                    onClick={() => {
                                        setShowQualityMenu(!showQualityMenu);
                                        setShowSpeedMenu(false);
                                    }}
                                    className="px-2.5 py-1 text-[10px] md:text-xs font-black text-white bg-white/5 hover:bg-white/15 rounded-lg transition-all flex items-center gap-1 border border-white/5"
                                >
                                    <span>⚙️</span>
                                    <span>
                                        {currentQualityIndex === -1 
                                            ? 'Auto' 
                                            : getQualityLabel(hlsLevels[currentQualityIndex], currentQualityIndex)}
                                    </span>
                                </button>
                                
                                {showQualityMenu && (
                                    <div className="absolute right-0 mt-2 w-28 bg-[#0f0f0f]/95 backdrop-blur-md border border-white/10 rounded-xl shadow-2xl overflow-hidden py-1 z-50 max-h-60 overflow-y-auto scrollbar-thin scrollbar-thumb-white/10">
                                        <button
                                            onClick={() => handleQualityChange(-1)}
                                            className={`w-full text-left px-3.5 py-1.5 text-[10px] md:text-xs font-black transition-colors ${
                                                currentQualityIndex === -1
                                                    ? 'bg-red-600 text-white'
                                                    : 'text-gray-300 hover:bg-white/15 hover:text-white'
                                            }`}
                                        >
                                            Auto
                                        </button>
                                        {hlsLevels.map((level, idx) => (
                                            <button
                                                key={idx}
                                                onClick={() => handleQualityChange(idx)}
                                                className={`w-full text-left px-3.5 py-1.5 text-[10px] md:text-xs font-black transition-colors ${
                                                    currentQualityIndex === idx
                                                        ? 'bg-red-600 text-white'
                                                        : 'text-gray-300 hover:bg-white/15 hover:text-white'
                                                }`}
                                            >
                                                {getQualityLabel(level, idx)}
                                            </button>
                                        ))}
                                    </div>
                                )}
                            </div>
                        )}

                        {/* Speed Selector */}
                        <div className="relative">
                            <button
                                onClick={() => {
                                    setShowSpeedMenu(!showSpeedMenu);
                                    setShowQualityMenu(false);
                                }}
                                className="px-2.5 py-1 text-[10px] md:text-xs font-black text-white bg-white/5 hover:bg-white/15 rounded-lg transition-all flex items-center gap-1 border border-white/5"
                            >
                                <span>⏱️</span>
                                <span>{playbackSpeed === 1.0 ? 'Normal' : `${playbackSpeed}x`}</span>
                            </button>
                            
                            {showSpeedMenu && (
                                <div className="absolute right-0 mt-2 w-32 bg-[#0f0f0f]/95 backdrop-blur-md border border-white/10 rounded-xl shadow-2xl overflow-hidden py-1 z-50 max-h-64 overflow-y-auto scrollbar-thin scrollbar-thumb-white/10">
                                    {[0.25, 0.5, 0.75, 1.0, 1.25, 1.5, 1.75, 2.0, 2.5, 3.0].map((speed) => (
                                        <button
                                            key={speed}
                                            onClick={() => {
                                                setPlaybackSpeed(speed);
                                                setShowSpeedMenu(false);
                                            }}
                                            className={`w-full text-left px-3.5 py-1.5 text-[10px] md:text-xs font-black transition-colors ${
                                                playbackSpeed === speed
                                                    ? 'bg-red-600 text-white'
                                                    : 'text-gray-300 hover:bg-white/15 hover:text-white'
                                            }`}
                                        >
                                            {speed === 1.0 ? '1.0x (Normal)' : `${speed}x`}
                                        </button>
                                    ))}
                                    
                                    {/* Custom Speed Form */}
                                    <div className="border-t border-white/10 px-3 py-2 mt-1 bg-white/[0.02]">
                                        <span className="text-[9px] text-gray-500 font-black uppercase tracking-wider block mb-1">Custom Speed</span>
                                        <div className="flex items-center gap-1.5">
                                            <input
                                                type="number"
                                                min="0.1"
                                                max="5.0"
                                                step="0.05"
                                                value={customSpeedVal}
                                                onChange={(e) => setCustomSpeedVal(e.target.value)}
                                                placeholder="1.0"
                                                className="w-12 px-1.5 py-1 text-[10px] bg-white/5 border border-white/10 rounded-lg text-white focus:outline-none focus:border-red-500 font-black text-center"
                                            />
                                            <button
                                                onClick={() => {
                                                    const val = parseFloat(customSpeedVal);
                                                    if (!isNaN(val) && val >= 0.1 && val <= 5.0) {
                                                        setPlaybackSpeed(val);
                                                        setShowSpeedMenu(false);
                                                    } else {
                                                        alert("Please enter a speed between 0.1 and 5.0");
                                                    }
                                                }}
                                                className="px-2 py-1 bg-gradient-to-r from-red-600 to-orange-600 hover:from-red-500 hover:to-orange-500 rounded-lg text-[9px] font-black text-white shadow-md transition-all active:scale-95"
                                            >
                                                Set
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Fullscreen Button */}
                        <button
                            onClick={toggleFullscreen}
                            className="p-1.5 text-white bg-white/5 hover:bg-white/15 rounded-lg transition-all"
                            aria-label="Toggle Fullscreen"
                        >
                            {isFullscreen ? (
                                <svg className="w-3.5 h-3.5 md:w-4.5 md:h-4.5 fill-current" viewBox="0 0 24 24">
                                    <path d="M5 16h3v3h2v-5H5v2zm3-8H5v2h5V5H8v3zm6 11h2v-3h3v-2h-5v5zm2-11V5h-2v5h5V8h-3z" />
                                </svg>
                            ) : (
                                <svg className="w-3.5 h-3.5 md:w-4.5 md:h-4.5 fill-current" viewBox="0 0 24 24">
                                    <path d="M7 14H5v5h5v-2H7v-3zm-2-4h2V7h3V5H5v5zm12 7h-3v2h5v-5h-2v3zM14 5v2h3v3h2V5h-5z" />
                                </svg>
                            )}
                        </button>
                    </div>
                )}
                
                {/* Click overlay for double-click skip & play/pause toggling */}
                <div 
                    onPointerDown={handlePointerDown}
                    className="absolute top-0 left-0 w-full h-[85%] cursor-pointer z-10 select-none touch-none"
                />

                {/* Left Skip Overlay */}
                {leftSkipActive && (
                    <div className="absolute left-0 top-0 bottom-0 w-1/2 pointer-events-none z-20 overflow-hidden rounded-l-3xl flex flex-col items-center justify-center">
                        {/* Ripple background */}
                        <div className="absolute left-0 top-1/2 -translate-y-1/2 w-[180%] aspect-square bg-white/[0.04] rounded-full animate-ripple-expand-left" />
                        
                        {/* Chevrons and text */}
                        <div className="relative z-30 flex flex-col items-center justify-center">
                            <div className="flex items-center justify-center gap-0.5 text-white mb-2">
                                <svg className="w-6 h-6 animate-chevron-3-left fill-current text-white/90" viewBox="0 0 24 24">
                                    <path d="M15.41 7.41L14 6l-6 6 6 6 1.41-1.41L10.83 12z"/>
                                </svg>
                                <svg className="w-6 h-6 animate-chevron-2-left fill-current text-white/90" viewBox="0 0 24 24">
                                    <path d="M15.41 7.41L14 6l-6 6 6 6 1.41-1.41L10.83 12z"/>
                                </svg>
                                <svg className="w-6 h-6 animate-chevron-1-left fill-current text-white/90" viewBox="0 0 24 24">
                                    <path d="M15.41 7.41L14 6l-6 6 6 6 1.41-1.41L10.83 12z"/>
                                </svg>
                            </div>
                            <span className="text-xs font-black text-white/90 tracking-widest uppercase bg-black/30 px-3 py-1 rounded-full backdrop-blur-sm border border-white/5 shadow-md">
                                {accumulatedSkip}s
                            </span>
                        </div>
                    </div>
                )}

                {/* Right Skip Overlay */}
                {rightSkipActive && (
                    <div className="absolute right-0 top-0 bottom-0 w-1/2 pointer-events-none z-20 overflow-hidden rounded-r-3xl flex flex-col items-center justify-center">
                        {/* Ripple background */}
                        <div className="absolute right-0 top-1/2 -translate-y-1/2 w-[180%] aspect-square bg-white/[0.04] rounded-full animate-ripple-expand-right" />
                        
                        {/* Chevrons and text */}
                        <div className="relative z-30 flex flex-col items-center justify-center">
                            <div className="flex items-center justify-center gap-0.5 text-white mb-2">
                                <svg className="w-6 h-6 animate-chevron-1-right fill-current text-white/90" viewBox="0 0 24 24">
                                    <path d="M10 6L8.59 7.41 13.17 12l-4.58 4.59L10 18l6-6z"/>
                                </svg>
                                <svg className="w-6 h-6 animate-chevron-2-right fill-current text-white/90" viewBox="0 0 24 24">
                                    <path d="M10 6L8.59 7.41 13.17 12l-4.58 4.59L10 18l6-6z"/>
                                </svg>
                                <svg className="w-6 h-6 animate-chevron-3-right fill-current text-white/90" viewBox="0 0 24 24">
                                    <path d="M10 6L8.59 7.41 13.17 12l-4.58 4.59L10 18l6-6z"/>
                                </svg>
                            </div>
                            <span className="text-xs font-black text-white/90 tracking-widest uppercase bg-black/30 px-3 py-1 rounded-full backdrop-blur-sm border border-white/5 shadow-md">
                                {accumulatedSkip}s
                            </span>
                        </div>
                    </div>
                )}
            </div>
            {audioTracks.length > 1 && (
                <div className="absolute bottom-16 left-4 right-4 z-50 bg-black/85 backdrop-blur-md p-3 rounded-xl border border-white/10 shadow-2xl flex items-center justify-between gap-4">
                    <div className="flex items-center gap-2">
                        <span className="text-sm">🎧</span>
                        <span className="text-xs font-bold text-gray-300 uppercase tracking-wider">Audio Tracks:</span>
                    </div>
                    <div className="flex flex-wrap gap-1.5 justify-end">
                        {audioTracks.map((track, idx) => (
                            <button
                                key={idx}
                                onClick={() => handleAudioTrackChange(idx)}
                                className={`px-3 py-1.5 rounded-lg text-xs font-black transition-all flex items-center gap-1 ${
                                    currentTrackIndex === idx
                                        ? 'bg-gradient-to-r from-red-600 to-orange-600 text-white shadow-lg shadow-red-900/20 scale-105'
                                        : 'bg-white/5 text-gray-300 hover:bg-white/10 hover:text-white'
                                }`}
                            >
                                <span>{currentTrackIndex === idx ? '🟢' : '⚪'}</span>
                                <span>{track.name || `Track ${idx + 1}`}</span>
                            </button>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}

export default function WatchPageClient({ movie, seasons = [], type, slug }: WatchPageClientProps) {
    const isSeriesOrAnime = movie.type === 'series' || movie.type === 'anime';

    // State
    const [currentSeasonNum, setCurrentSeasonNum] = useState<number>(1);
    const [currentEpisodeNum, setCurrentEpisodeNum] = useState<number>(1);
    const [activeServerId, setActiveServerId] = useState<string>('');
    const [sandboxMode, setSandboxMode] = useState<boolean>(true);
    const [autoNext, setAutoNext] = useState<boolean>(true);
    const [searchQuery, setSearchQuery] = useState<string>('');
    const [relatedMovies, setRelatedMovies] = useState<any[]>([]);
    const [watchedEpisodes, setWatchedEpisodes] = useState<string[]>([]);
    const [resolvedUrl, setResolvedUrl] = useState<string>('');
    const [resolvingUrl, setResolvingUrl] = useState<boolean>(false);
    const [activeEpisodeStreams, setActiveEpisodeStreams] = useState<Pick<Episode, 'streaming_url' | 'streaming_url_toonplay' | 'streaming_url_animerulz'> | null>(null);
    // ToonPlay on-demand resolution state
    const [toonplayResolvedUrl, setToonplayResolvedUrl] = useState<string>('');
    const [toonplayResolving, setToonplayResolving] = useState<boolean>(false);
    const [canUseFullscreenAssist, setCanUseFullscreenAssist] = useState(false);
    const playerShellRef = useRef<HTMLDivElement>(null);
    const playerIframeRef = useRef<HTMLIFrameElement>(null);

    // Ad Verification state
    const [isAdVerified, setIsAdVerified] = useState<boolean>(() => {
        if (typeof window !== 'undefined') {
            return checkIsContentVerified(movie.id, movie.type);
        }
        return false;
    });
    const [showAdVerification, setShowAdVerification] = useState<boolean>(false);
    const [pendingServerId, setPendingServerId] = useState<string>('');

    useEffect(() => {
        setCanUseFullscreenAssist(canRequestPlayerFullscreen());
    }, []);

    const handlePlayerFullscreenRequest = useCallback(() => {
        requestPlayerFullscreen(playerShellRef.current, playerIframeRef.current);
    }, []);

    const sortedSeasons = [...seasons].sort((a, b) => a.season_number - b.season_number);
    const activeSeason = sortedSeasons.find(s => s.season_number === currentSeasonNum) || sortedSeasons[0];
    const episodes = activeSeason?.episodes?.sort((a, b) => a.episode_number - b.episode_number) || [];
    const activeEpisode = episodes.find(e => e.episode_number === currentEpisodeNum) || episodes[0];

    const { settings: adSettings } = useAdSettings();
    const { user, trackEvent } = useAuth();

    // Load watched episodes and initial URL params on mount
    useEffect(() => {
        if (typeof window !== 'undefined') {
            const watched = JSON.parse(localStorage.getItem('watched_episodes') || '[]');
            setWatchedEpisodes(watched);

            const params = new URLSearchParams(window.location.search);
            const s = params.get('season');
            const e = params.get('episode');
            if (s) {
                const sNum = parseInt(s);
                if (!isNaN(sNum)) setCurrentSeasonNum(sNum);
            }
            if (e) {
                const eNum = parseInt(e);
                if (!isNaN(eNum)) setCurrentEpisodeNum(eNum);
            }
        }
    }, []);

    // Re-check and lock/unlock player on settings loaded, content change, or episode/season navigation
    useEffect(() => {
        console.log('[WatchPageClient] Verification check run:', {
            movieId: movie.id,
            movieType: movie.type,
            episode: currentEpisodeNum,
            season: currentSeasonNum,
            hasSettings: !!adSettings,
            isEnabled: adSettings?.isVerificationEnabled
        });
        if (adSettings) {
            console.log('[WatchPageClient] adSettings object:', adSettings);
            const isVerificationEnabled = adSettings.isVerificationEnabled;
            if (!isVerificationEnabled) {
                console.log('[WatchPageClient] verification is disabled, bypassing.');
                setIsAdVerified(true);
                setShowAdVerification(false);
                return;
            }

            const verified = checkIsContentVerified(movie.id, movie.type);
            console.log('[WatchPageClient] checkIsContentVerified result:', verified);
            setIsAdVerified(verified);
            if (!verified) {
                console.log('[WatchPageClient] Not verified, showing popup modal');
                setShowAdVerification(true);
            } else {
                console.log('[WatchPageClient] Verified, hiding popup modal');
                setShowAdVerification(false);
            }
        }
    }, [adSettings, movie.id, movie.type, currentEpisodeNum, currentSeasonNum]);

    // Update URL query parameters on season/episode change
    const updateUrlParams = (season: number, episode: number) => {
        if (typeof window !== 'undefined') {
            const url = new URL(window.location.href);
            url.searchParams.set('season', season.toString());
            url.searchParams.set('episode', episode.toString());
            window.history.pushState({}, '', url.toString());
        }
    };

    // Save watched status when active episode changes
    useEffect(() => {
        if (isSeriesOrAnime && activeEpisode?.id) {
            const watched = JSON.parse(localStorage.getItem('watched_episodes') || '[]');
            if (!watched.includes(activeEpisode.id)) {
                watched.push(activeEpisode.id);
                localStorage.setItem('watched_episodes', JSON.stringify(watched));
                setWatchedEpisodes(watched);
            }
        }
    }, [activeEpisode, isSeriesOrAnime]);

    const currentEventIdRef = useRef<string | null>(null);
    const watchTimeRef = useRef<number>(0);

    useEffect(() => {
        if (!user || !movie.id) return;

        // Generate a new UUID for this specific watch event
        const eventId = crypto.randomUUID();
        currentEventIdRef.current = eventId;
        watchTimeRef.current = 0;

        // Map server ID to friendly name
        const serverName = (() => {
            if (!activeServerId) return 'Default Server';
            if (activeServerId.startsWith('multi_')) {
                const key = activeServerId.replace('multi_', '');
                return `${key.toUpperCase()} (Multi)`;
            }
            if (activeServerId === 'toonplay') return 'Toonplay';
            if (activeServerId === 'animerulz') return 'Animerulz';
            if (activeServerId === 'custom') return 'Custom';
            
            // Find name in availableServers
            const srv = availableServers.find(s => s.id === activeServerId);
            return srv ? srv.name : activeServerId;
        })();

        // Insert initial 0m watch event
        trackEvent({
            id: eventId,
            event_type: 'watch',
            movie_id: movie.id,
            episode_id: isSeriesOrAnime ? activeEpisode?.id : null,
            content_type: movie.type,
            content_title: movie.title,
            season_number: isSeriesOrAnime ? currentSeasonNum : null,
            episode_number: isSeriesOrAnime ? currentEpisodeNum : null,
            metadata: {
                server: serverName || null,
                slug,
                server_id: activeServerId
            }
        });

        // Start interval to update watch duration in database every 10 seconds
        const timer = setInterval(async () => {
            watchTimeRef.current += 10;
            const elapsed = watchTimeRef.current;

            await supabase
                .from('user_events')
                .update({ duration_seconds: elapsed })
                .eq('id', eventId);
        }, 10000);

        return () => {
            clearInterval(timer);
        };
    }, [activeEpisode?.id, activeServerId, currentEpisodeNum, currentSeasonNum, isSeriesOrAnime, movie.id, movie.title, movie.type, slug, trackEvent, user]);

    useEffect(() => {
        if (!isSeriesOrAnime || !activeEpisode?.id) {
            setActiveEpisodeStreams(null);
            return;
        }

        let cancelled = false;

        const loadActiveEpisodeStreams = async () => {
            const { data, error } = await supabase
                .from('episodes')
                .select('streaming_url, streaming_url_toonplay, streaming_url_animerulz')
                .eq('id', activeEpisode.id)
                .single();

            if (!cancelled && !error) {
                setActiveEpisodeStreams(data || null);
            }
        };

        loadActiveEpisodeStreams();

        return () => {
            cancelled = true;
        };
    }, [isSeriesOrAnime, activeEpisode?.id, activeEpisode?.streaming_url, activeEpisode?.streaming_url_toonplay, activeEpisode?.streaming_url_animerulz]);

    // Fetch related movies for movies sidebar
    useEffect(() => {
        const fetchRelated = async () => {
            try {
                const { data } = await supabase
                    .from('movies')
                    .select('*')
                    .eq('type', movie.type)
                    .neq('id', movie.id)
                    .limit(6);
                if (data) setRelatedMovies(data);
            } catch (err) {
                console.error('Error fetching related movies:', err);
            }
        };
        fetchRelated();
    }, [movie.id, movie.type]);

    // Navigation logic
    const goToNextEpisode = () => {
        const nextEpNum = currentEpisodeNum + 1;
        const nextEp = episodes.find(e => e.episode_number === nextEpNum);
        if (nextEp) {
            setCurrentEpisodeNum(nextEpNum);
            updateUrlParams(currentSeasonNum, nextEpNum);
        } else {
            const nextSeasonNum = currentSeasonNum + 1;
            const nextSeason = sortedSeasons.find(s => s.season_number === nextSeasonNum);
            if (nextSeason) {
                setCurrentSeasonNum(nextSeasonNum);
                setCurrentEpisodeNum(1);
                updateUrlParams(nextSeasonNum, 1);
            }
        }
    };

    const goToPrevEpisode = () => {
        const prevEpNum = currentEpisodeNum - 1;
        const prevEp = episodes.find(e => e.episode_number === prevEpNum);
        if (prevEp) {
            setCurrentEpisodeNum(prevEpNum);
            updateUrlParams(currentSeasonNum, prevEpNum);
        } else if (currentSeasonNum > 1) {
            const prevSeasonNum = currentSeasonNum - 1;
            const prevSeason = sortedSeasons.find(s => s.season_number === prevSeasonNum);
            if (prevSeason && prevSeason.episodes && prevSeason.episodes.length > 0) {
                setCurrentSeasonNum(prevSeasonNum);
                const lastEpNum = Math.max(...prevSeason.episodes.map(e => e.episode_number));
                setCurrentEpisodeNum(lastEpNum);
                updateUrlParams(prevSeasonNum, lastEpNum);
            }
        }
    };

    // Determine custom URL
    const getCustomUrl = (): string | null => {
        if (!isSeriesOrAnime) {
            return movie.streaming_url || null;
        }
        return activeEpisode?.streaming_url ?? activeEpisodeStreams?.streaming_url ?? null;
    };

    const getToonplayUrl = (): string | null => {
        if (!isSeriesOrAnime) {
            return movie.streaming_url_toonplay || null;
        }
        return activeEpisode?.streaming_url_toonplay ?? activeEpisodeStreams?.streaming_url_toonplay ?? null;
    };

    // Get the toonplay series ID for on-demand resolution
    const getToonplaySeriesId = (): string | null => {
        const movieAny = movie as any;
        const tpUrl = movieAny.toonplay_url;
        if (!tpUrl) return null;
        // Extract series ID from full URL or use as-is
        const trimmed = tpUrl.trim();
        if (trimmed.startsWith('http')) {
            try {
                const urlObj = new URL(trimmed);
                const parts = urlObj.pathname.split('/').filter(Boolean);
                const lastPart = parts[parts.length - 1] || '';
                if (lastPart.startsWith('series-') || lastPart.startsWith('anime-')) {
                    return lastPart;
                }
            } catch {}
        }
        return trimmed;
    };

    const getAnimerulzUrl = (): string | null => {
        if (!isSeriesOrAnime) {
            return movie.streaming_url_animerulz || null;
        }
        return activeEpisode?.streaming_url_animerulz ?? activeEpisodeStreams?.streaming_url_animerulz ?? null;
    };

    const customUrl = getCustomUrl();
    const toonplayUrl = getToonplayUrl();
    const toonplaySeriesId = getToonplaySeriesId();
    const animerulzUrl = getAnimerulzUrl();

    // Parse JSON stream urls if present
    const parseStreamingUrlJson = (urlStr: string | null | undefined): Record<string, string> => {
        if (!urlStr) return {};
        const trimmed = urlStr.trim();
        if (trimmed.startsWith('{')) {
            try {
                return JSON.parse(trimmed);
            } catch (e) {
                console.error("Failed to parse streaming_url JSON:", e);
            }
        }
        return {};
    };

    const parseMultiScraperConfig = (raw: string | null | undefined): Record<string, MultiScraperServerConfig> => {
        if (!raw) return {};
        const trimmed = raw.trim();
        if (!trimmed.startsWith('{')) return {};
        try {
            const parsed = JSON.parse(trimmed);
            return parsed && typeof parsed === 'object' ? parsed : {};
        } catch (e) {
            console.error('Failed to parse multi scraper config:', e);
            return {};
        }
    };

    const getConfiguredMultiStreams = (): Record<string, string> => {
        const movieWithConfig = movie as unknown as { scraper_source?: string; scraper_url?: string };
        if (movieWithConfig.scraper_source !== 'multi') return {};

        const config = parseMultiScraperConfig(movieWithConfig.scraper_url);
        const streams: Record<string, string> = {};

        Object.entries(config).forEach(([serverKey, serverConfig]) => {
            if (!serverConfig) return;
            const seasonKey = String(currentSeasonNum);
            const episodeKey = `${currentSeasonNum}_${currentEpisodeNum}`;
            const rawUrl = serverConfig.mode === 'episode'
                ? serverConfig.episodeUrls?.[episodeKey]
                : serverConfig.mode === 'separate'
                    ? serverConfig.urls?.[seasonKey]
                    : serverConfig.url;

            if (rawUrl && rawUrl.trim()) {
                streams[serverKey] = normalizeConfiguredServerUrl(serverKey, rawUrl);
            }
        });

        return streams;
    };

    const episodeMultiStreams = parseStreamingUrlJson(isSeriesOrAnime ? (activeEpisode?.streaming_url ?? activeEpisodeStreams?.streaming_url) : movie.streaming_url);
    const multiStreams = {
        ...getConfiguredMultiStreams(),
        ...episodeMultiStreams
    };

    const isServerEnabled = (serverId: string) => {
        if (DISABLED_MULTI_SERVER_IDS.has(serverId.toLowerCase())) return false;
        if (!adSettings || !adSettings.socialBarCode) return true;
        const enabledList = adSettings.socialBarCode.split(',').map(s => s.trim().toLowerCase());
        return enabledList.includes(serverId.toLowerCase());
    };

    const availableServers = SERVERS.filter(srv => {
        if (srv.animeOnly && movie.type !== 'anime') return false;
        if (srv.movieOnly && isSeriesOrAnime) return false;
        return true;
    });

    // Gate server selection behind ad verification
    const handleServerSelect = useCallback((serverId: string) => {
        const verified = checkIsContentVerified(movie.id, movie.type);
        if (verified) {
            setActiveServerId(serverId);
            setIsAdVerified(true);
        } else {
            setIsAdVerified(false);
            setPendingServerId(serverId);
            setShowAdVerification(true);
        }
    }, [movie.id, movie.type]);

    const handleVerificationComplete = useCallback(() => {
        saveContentVerification(movie.id, movie.type);
        setIsAdVerified(true);
        setShowAdVerification(false);
        if (pendingServerId) {
            setActiveServerId(pendingServerId);
            setPendingServerId('');
        } else if (activeServerId) {
            // Auto-select already set the server before verification.
            // Force re-trigger by briefly clearing and re-setting it.
            const currentServer = activeServerId;
            setActiveServerId('');
            setTimeout(() => setActiveServerId(currentServer), 0);
        }
    }, [movie.id, movie.type, pendingServerId, activeServerId]);

    // Auto-select server
    useEffect(() => {
        if ((toonplaySeriesId || toonplayUrl) && isServerEnabled('toonplay')) {
            setActiveServerId('toonplay');
        } else if (animerulzUrl && isServerEnabled('animerulz')) {
            setActiveServerId('animerulz');
        } else {
            const activeMultiKeys = Object.keys(multiStreams).filter(k => isServerEnabled(k));
            if (activeMultiKeys.length > 0) {
                setActiveServerId(`multi_${activeMultiKeys[0]}`);
            } else if (customUrl && !customUrl.trim().startsWith('{') && isServerEnabled('custom')) {
                setActiveServerId('custom');
            } else {
                const firstEnabled = availableServers.find(srv => isServerEnabled(srv.id));
                if (firstEnabled) {
                    setActiveServerId(firstEnabled.id);
                } else {
                    if (toonplaySeriesId || toonplayUrl) {
                        setActiveServerId('toonplay');
                    } else if (animerulzUrl) {
                        setActiveServerId('animerulz');
                    } else {
                        const firstMulti = Object.keys(multiStreams).find(k => isServerEnabled(k));
                        if (firstMulti) {
                            setActiveServerId(`multi_${firstMulti}`);
                        } else if (customUrl && !customUrl.trim().startsWith('{')) {
                            setActiveServerId('custom');
                        } else {
                            setActiveServerId('');
                        }
                    }
                }
            }
        }
    }, [customUrl, toonplayUrl, toonplaySeriesId, animerulzUrl, movie.id, currentEpisodeNum, currentSeasonNum, adSettings, JSON.stringify(multiStreams)]);

    // Build embed URL
    const getEmbedUrl = (): string => {
        if (activeServerId.startsWith('multi_')) {
            const key = activeServerId.replace('multi_', '');
            return normalizePlayerUrl(multiStreams[key] || '');
        }
        if (activeServerId === 'custom') {
            return (customUrl && !customUrl.trim().startsWith('{')) ? normalizePlayerUrl(customUrl) : '';
        }
        if (activeServerId === 'toonplay') {
            // Use on-demand resolved URL if available, fallback to pre-stored URL
            return normalizePlayerUrl(toonplayResolvedUrl || toonplayUrl || '');
        }
        if (activeServerId === 'animerulz') {
            return normalizePlayerUrl(animerulzUrl || '');
        }
        const server = availableServers.find(s => s.id === activeServerId);
        if (!server) return '';

        const serverUrl = isSeriesOrAnime
            ? server.getUrl(movie.id, movie.tmdb_id || undefined, movie.imdb_id || undefined, movie.mal_id || undefined, currentSeasonNum, currentEpisodeNum) || ''
            : server.getUrl(movie.id, movie.tmdb_id || undefined, movie.imdb_id || undefined, movie.mal_id || undefined) || '';
        return normalizePlayerUrl(serverUrl);
    };

    const embedUrl = getEmbedUrl();

    // On-the-fly resolver for webpage URLs (ToonStream, AnimeWorld)
    useEffect(() => {
        if (!embedUrl || !isAdVerified) {
            setResolvedUrl('');
            return;
        }

        const isWebPage = embedUrl.includes('toonstream') || 
                          embedUrl.includes('watchanimeworld') ||
                          embedUrl.includes('animeworld') ||
                          embedUrl.includes('netfilm') ||
                          embedUrl.includes('moviebox') ||
                          embedUrl.includes('sflix');

        if (isWebPage) {
            setResolvingUrl(true);
            fetch(`/api/resolve-embed?url=${encodeURIComponent(embedUrl)}`)
                .then(res => res.json())
                .then(data => {
                    if (data.url) {
                        setResolvedUrl(data.url);
                    } else {
                        setResolvedUrl(embedUrl);
                    }
                })
                .catch(() => {
                    setResolvedUrl(embedUrl);
                })
                .finally(() => {
                    setResolvingUrl(false);
                });
        } else {
            setResolvedUrl(embedUrl);
        }
    }, [embedUrl, isAdVerified]);

    // On-demand ToonPlay URL resolution
    useEffect(() => {
        if (activeServerId !== 'toonplay' || !isAdVerified) {
            setToonplayResolvedUrl('');
            setToonplayResolving(false);
            return;
        }

        const seriesId = toonplaySeriesId;
        if (!seriesId) return;

        const cachedM3u8 = toonplayUrl || '';
        setToonplayResolving(true);
        setToonplayResolvedUrl('');

        const params = new URLSearchParams({
            toonplay_id: seriesId,
            season: String(currentSeasonNum),
            episode: String(currentEpisodeNum),
        });
        if (cachedM3u8) {
            params.set('cached_url', cachedM3u8);
        }

        fetch(`/api/resolve-toonplay?${params.toString()}`)
            .then(res => res.json())
            .then(data => {
                if (data.url) {
                    setToonplayResolvedUrl(data.url);
                    console.log(`[ToonPlay] Resolved S${currentSeasonNum}E${currentEpisodeNum} → ${data.source} URL`);
                } else {
                    console.warn(`[ToonPlay] Failed to resolve: ${data.error}`);
                    // Fallback to cached URL anyway
                    setToonplayResolvedUrl(cachedM3u8);
                }
            })
            .catch(err => {
                console.error('[ToonPlay] Resolve error:', err);
                setToonplayResolvedUrl(cachedM3u8);
            })
            .finally(() => {
                setToonplayResolving(false);
            });
    }, [activeServerId, isAdVerified, toonplaySeriesId, currentSeasonNum, currentEpisodeNum]);

    const getActiveStreamUrl = (): string => {
        if (activeServerId.startsWith('multi_')) {
            const key = activeServerId.replace('multi_', '');
            return multiStreams[key] || '';
        }
        if (activeServerId === 'custom') return (customUrl && !customUrl.trim().startsWith('{')) ? customUrl : '';
        if (activeServerId === 'toonplay') return toonplayUrl || '';
        if (activeServerId === 'animerulz') return animerulzUrl || '';
        return '';
    };

    const activeStreamUrl = getActiveStreamUrl();

    const isM3U8Active = resolvedUrl ? (
        resolvedUrl.toLowerCase().includes('.m3u8') || 
        resolvedUrl.toLowerCase().includes('.mp4') || 
        resolvedUrl.toLowerCase().includes('google-proxy') || 
        resolvedUrl.toLowerCase().includes('streamindia') ||
        resolvedUrl.toLowerCase().includes('fallback.streamindia.co.in/sources') ||
        resolvedUrl.toLowerCase().includes('hakunaymatata.com')
    ) : false;
    const isToonplayResolving = activeServerId === 'toonplay' && toonplayResolving;
    const isYouTubeActive = resolvedUrl ? !!getYouTubeVideoId(resolvedUrl) : false;
    const isNativeStreamActive = (
        activeServerId === 'custom' ||
        activeServerId === 'toonplay' ||
        activeServerId === 'animerulz' ||
        activeServerId.startsWith('multi_')
    ) && isM3U8Active;
    const isIframePlayerActive = !!resolvedUrl && !isNativeStreamActive;

    // Filter episodes by search query
    const filteredEpisodes = episodes.filter(ep => {
        if (!searchQuery) return true;
        const query = searchQuery.toLowerCase();
        return (
            ep.episode_number.toString() === query ||
            (ep.episode_title && ep.episode_title.toLowerCase().includes(query))
        );
    });

    // Categories names
    const categoriesList = (movie as any).movie_categories?.map((mc: any) => mc.categories?.name).join(', ') || 'N/A';

    const renderEpisodes = () => {
        if (!isSeriesOrAnime || sortedSeasons.length === 0) return null;

        return (
            <div className="glass-panel p-5 rounded-3xl space-y-4">
                
                {/* Season dropdown / title */}
                <div className="flex items-center justify-between gap-2 border-b border-white/5 pb-3">
                    <div className="flex items-center gap-2">
                        <span className="text-sm">📁</span>
                        <span className="text-sm font-black text-gray-400 uppercase tracking-wider">Episodes</span>
                    </div>
                    
                    {/* Season Selector */}
                    {sortedSeasons.length > 1 && (
                        <select
                            value={currentSeasonNum}
                            onChange={(e) => {
                                const sNum = parseInt(e.target.value);
                                setCurrentSeasonNum(sNum);
                                setCurrentEpisodeNum(1);
                                updateUrlParams(sNum, 1);
                            }}
                            className="bg-white/5 hover:bg-white/10 text-xs font-bold text-white px-3 py-1.5 rounded-lg border border-white/10 outline-none cursor-pointer transition-colors"
                        >
                            {sortedSeasons.map((season) => (
                                <option key={season.id} value={season.season_number} className="bg-[#0f0f0f]">
                                    Season {season.season_number}
                                </option>
                            ))}
                        </select>
                    )}
                </div>

                {/* Episode Search Box */}
                <div className="relative">
                    <input
                        type="text"
                        placeholder="Search episode number..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-xs text-white placeholder-gray-500 outline-none focus:border-red-500/50 transition-colors"
                    />
                    {searchQuery && (
                        <button 
                            onClick={() => setSearchQuery('')}
                            className="absolute right-3 top-3 text-xs text-gray-500 hover:text-white"
                        >
                            ✕
                        </button>
                    )}
                </div>

                {/* Episodes Grid/List */}
                <div className="max-h-[50vh] overflow-y-auto pr-1 space-y-2 custom-scrollbar">
                    {filteredEpisodes.length === 0 ? (
                        <div className="text-center py-6 text-xs text-gray-500">
                            No episodes found
                        </div>
                    ) : (
                        filteredEpisodes.map((ep) => {
                            const isActive = ep.episode_number === currentEpisodeNum;
                            const isWatched = watchedEpisodes.includes(ep.id);
                            return (
                                <button
                                    key={ep.id}
                                    onClick={() => {
                                        setCurrentEpisodeNum(ep.episode_number);
                                        updateUrlParams(currentSeasonNum, ep.episode_number);
                                    }}
                                    className={`w-full p-3 rounded-xl border text-left transition-all flex items-center justify-between gap-3 group ${
                                        isActive
                                            ? 'bg-gradient-to-r from-red-600/20 to-orange-600/10 border-red-500/50 shadow-md'
                                            : 'bg-white/[0.02] border-white/5 hover:bg-white/[0.06] hover:border-white/10'
                                    }`}
                                >
                                    <div className="flex items-center gap-3 min-w-0">
                                        <div className={`w-8 h-8 rounded-lg font-bold text-xs flex items-center justify-center flex-shrink-0 ${
                                            isActive
                                                ? 'bg-gradient-to-r from-red-600 to-orange-600 text-white'
                                                : 'bg-white/5 text-gray-400 group-hover:text-white transition-colors'
                                        }`}>
                                            {ep.episode_number}
                                        </div>
                                        <div className="min-w-0">
                                            <div className={`text-xs font-bold truncate ${isActive ? 'text-red-500' : 'text-gray-300'}`}>
                                                Episode {ep.episode_number}
                                            </div>
                                            {ep.episode_title && (
                                                <div className="text-[10px] text-gray-500 truncate mt-0.5">
                                                    {ep.episode_title}
                                                </div>
                                            )}
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-1.5 flex-shrink-0">
                                        {isActive && (
                                            <span className="text-[10px] font-black text-red-500 uppercase tracking-widest flex items-center gap-1 animate-pulse">
                                                <span>🔴</span> PLAYING
                                            </span>
                                        )}
                                        {!isActive && isWatched && (
                                            <span className="text-green-500 text-xs" title="Watched">✓</span>
                                        )}
                                    </div>
                                </button>
                            );
                        })
                    )}
                </div>
            </div>
        );
    };

    return (
        <div className="min-h-screen bg-[#050505] text-white py-6">
            {/* Background ambient lighting */}
            <div className="absolute top-0 left-0 w-full h-[60vh] overflow-hidden pointer-events-none z-0" suppressHydrationWarning>
                {movie.poster_url && (
                    <Image
                        src={movie.poster_url}
                        alt=""
                        fill
                        className="object-cover opacity-10 blur-[100px]"
                        priority
                    />
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-[#050505] to-transparent" />
            </div>

            <div className="container mx-auto px-4 max-w-7xl relative z-10 space-y-6">
                
                {/* Header navigation bar */}
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white/[0.02] border border-white/5 rounded-2xl p-4 backdrop-blur-md">
                    <div className="flex items-center gap-4">
                        <Link
                            href={`/${type}/${slug}`}
                            className="p-2.5 bg-white/5 hover:bg-white/10 rounded-xl transition-all border border-white/5 flex items-center justify-center group"
                        >
                            <svg className="w-5 h-5 text-gray-400 group-hover:text-white transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15 19l-7-7 7-7" />
                            </svg>
                        </Link>
                        <div>
                            <div className="flex items-center gap-2 text-xs text-gray-400 mb-1">
                                <Link href="/" className="hover:text-red-500 transition-colors">Home</Link>
                                <span>›</span>
                                <Link href={`/${type}`} className="hover:text-red-500 transition-colors capitalize">{type}</Link>
                                <span>›</span>
                                <span className="text-white truncate max-w-[150px]">{movie.title}</span>
                            </div>
                            <h1 className="text-xl md:text-2xl font-black text-white flex items-center gap-2">
                                {movie.title}
                                {isSeriesOrAnime && (
                                    <span className="text-red-500 font-bold text-sm md:text-base bg-red-500/10 px-2 py-0.5 rounded border border-red-500/20">
                                        S{currentSeasonNum} E{currentEpisodeNum}
                                    </span>
                                )}
                            </h1>
                        </div>
                    </div>

                    {/* Auto Next Toggle */}
                    {isSeriesOrAnime && (
                        <div className="flex items-center gap-2.5 bg-white/5 px-4 py-2.5 rounded-xl border border-white/5">
                            <label className="relative inline-flex items-center cursor-pointer">
                                <input
                                    type="checkbox"
                                    checked={autoNext}
                                    onChange={(e) => setAutoNext(e.target.checked)}
                                    className="sr-only peer"
                                />
                                <div className="w-9 h-5 bg-dark-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-red-600"></div>
                                <span className="ml-2 text-xs font-bold text-gray-300 whitespace-nowrap">
                                    ⏭️ Auto Next Episode
                                </span>
                            </label>
                        </div>
                    )}
                </div>

                {/* Main Content Grid */}
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                    
                    {/* LEFT COLUMN: Player & Info */}
                    <div className="lg:col-span-8 xl:col-span-9 space-y-6">
                        
                        {/* Video Container */}
                        <div
                            ref={playerShellRef}
                            className="nexiplay-player-shell relative w-full aspect-video bg-black rounded-3xl overflow-hidden shadow-2xl border border-white/10 group"
                        >
                            {!isAdVerified ? (
                                <div className="absolute inset-0 flex flex-col items-center justify-center text-gray-400 p-6 bg-dark-900/60 backdrop-blur-sm">
                                    <span className="text-4xl mb-3 animate-pulse">🔒</span>
                                    <p className="font-bold text-white mb-2">Stream Locked</p>
                                    <p className="text-xs text-gray-400 mb-4 text-center max-w-xs leading-relaxed">
                                        Please complete the 2-step verification popup to unlock streaming servers.
                                    </p>
                                    <button
                                        onClick={() => setShowAdVerification(true)}
                                        className="px-5 py-2.5 bg-gradient-to-r from-cyan-500 to-emerald-400 text-black font-black text-xs rounded-xl hover:shadow-[0_0_20px_rgba(0,255,200,0.3)] hover:scale-105 active:scale-95 transition-all duration-300"
                                    >
                                        Unlock Stream
                                    </button>
                                </div>
                            ) : isToonplayResolving ? (
                                <div className="absolute inset-0 flex flex-col items-center justify-center text-gray-400 p-6 bg-dark-900/60 backdrop-blur-sm">
                                    <div className="w-10 h-10 border-4 border-orange-500 border-t-transparent rounded-full animate-spin mb-4" />
                                    <p className="font-bold text-sm text-white animate-pulse">Connecting to Nexiplay Private Server...</p>
                                    <p className="text-xs text-gray-500 mt-1">Resolving fresh stream link</p>
                                </div>
                            ) : resolvingUrl ? (
                                <div className="absolute inset-0 flex flex-col items-center justify-center text-gray-400 p-6 bg-dark-900/60 backdrop-blur-sm">
                                    <div className="w-10 h-10 border-4 border-red-500 border-t-transparent rounded-full animate-spin mb-4" />
                                    <p className="font-bold text-sm text-white animate-pulse">Resolving streaming server link...</p>
                                </div>
                            ) : resolvedUrl ? (
                                isNativeStreamActive ? (
                                    <HLSVideoPlayer 
                                        src={`/api/proxy-stream?url=${encodeURIComponent(resolvedUrl)}`} 
                                        onEnded={handleVideoEnded}
                                    />
                                ) : (
                                    <iframe
                                        ref={playerIframeRef}
                                        src={resolvedUrl}
                                        title="Streaming player"
                                        className="nexiplay-player-frame absolute inset-0 w-full h-full bg-black"
                                        {...FULLSCREEN_IFRAME_ATTRS}
                                        sandbox={
                                            sandboxMode && activeServerId !== 'custom' && activeServerId !== 'toonplay' && activeServerId !== 'animerulz' && !activeServerId.startsWith('multi_')
                                                ? AD_BLOCK_SANDBOX
                                                : undefined
                                        }
                                        referrerPolicy={isYouTubeActive ? 'strict-origin-when-cross-origin' : 'no-referrer'}
                                    />
                                )
                            ) : (
                                <div className="absolute inset-0 flex flex-col items-center justify-center text-gray-400 p-6 bg-dark-900/60 backdrop-blur-sm">
                                    <span className="text-4xl animate-bounce mb-2">🎞️</span>
                                    <p className="font-bold">Select a server or episode to start streaming</p>
                                </div>
                            )}
                            {isIframePlayerActive && canUseFullscreenAssist && (
                                <button
                                    type="button"
                                    aria-label="Fullscreen"
                                    onClick={handlePlayerFullscreenRequest}
                                    className="nexiplay-fullscreen-assist absolute bottom-0 right-0 z-20 h-16 w-16 bg-transparent opacity-0 md:hidden"
                                    style={{ WebkitTapHighlightColor: 'transparent' }}
                                />
                            )}
                        </div>

                        {/* Player Navigation & Quick Settings */}
                        <div className="flex flex-wrap items-center justify-between gap-4 p-4 bg-white/[0.02] rounded-2xl border border-white/5">
                            {/* Prev / Next buttons */}
                            <div className="flex gap-2">
                                {isSeriesOrAnime && (
                                    <>
                                        <button
                                            onClick={goToPrevEpisode}
                                            disabled={currentSeasonNum === 1 && currentEpisodeNum === 1}
                                            className="px-4 py-2.5 bg-white/5 hover:bg-white/10 disabled:opacity-30 disabled:hover:bg-white/5 disabled:cursor-not-allowed rounded-xl text-xs font-bold transition-all border border-white/5 flex items-center gap-1.5"
                                        >
                                            ◀ Prev Episode
                                        </button>
                                        <button
                                            onClick={goToNextEpisode}
                                            disabled={
                                                currentSeasonNum === sortedSeasons.length &&
                                                currentEpisodeNum === episodes.length
                                            }
                                            className="px-4 py-2.5 bg-white/5 hover:bg-white/10 disabled:opacity-30 disabled:hover:bg-white/5 disabled:cursor-not-allowed rounded-xl text-xs font-bold transition-all border border-white/5 flex items-center gap-1.5"
                                        >
                                            Next Episode ▶
                                        </button>
                                    </>
                                )}
                            </div>

                            {/* Sandbox Mode / Compatible Switcher */}
                            {activeServerId !== 'custom' && (
                                <div className="flex items-center gap-2">
                                    <label className="relative inline-flex items-center cursor-pointer">
                                        <input
                                            type="checkbox"
                                            checked={sandboxMode}
                                            onChange={(e) => setSandboxMode(e.target.checked)}
                                            className="sr-only peer"
                                        />
                                        <div className="w-9 h-5 bg-dark-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-green-600"></div>
                                        <span className="ml-2.5 text-xs font-bold text-gray-300">
                                            {sandboxMode ? '🛡️ Ad-Blocker Mode (On)' : 'Compatible Mode'}
                                        </span>
                                    </label>
                                </div>
                            )}
                        </div>

                        {/* Servers Card */}
                        <div className="glass-panel p-6 rounded-3xl space-y-4">
                            <div className="flex items-center gap-2.5 border-b border-white/5 pb-3">
                                <span className="text-lg">🔒</span>
                                <h3 className="text-sm font-black text-gray-400 uppercase tracking-widest">Select Streaming Server</h3>
                            </div>
                            <div className="flex flex-wrap gap-2.5">
                                {/* Toonplay Stream Button */}
                                {(toonplaySeriesId || toonplayUrl) && isServerEnabled('toonplay') && (
                                    <button
                                        onClick={() => handleServerSelect('toonplay')}
                                        className={`px-5 py-3 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${
                                            activeServerId === 'toonplay'
                                                ? 'bg-gradient-to-r from-red-600 to-orange-600 text-white shadow-lg shadow-red-900/30'
                                                : 'bg-white/5 text-gray-400 hover:bg-white/10 hover:text-white border border-white/5'
                                        }`}
                                    >
                                        <span className="text-red-500">🔥</span>
                                        <span>Nexiplay Private Server</span>
                                    </button>
                                )}

                                {/* Animerulz Stream Button */}
                                {animerulzUrl && isServerEnabled('animerulz') && (
                                    <button
                                        onClick={() => handleServerSelect('animerulz')}
                                        className={`px-5 py-3 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${
                                            activeServerId === 'animerulz'
                                                ? 'bg-gradient-to-r from-red-600 to-orange-600 text-white shadow-lg shadow-red-900/30'
                                                : 'bg-white/5 text-gray-400 hover:bg-white/10 hover:text-white border border-white/5'
                                        }`}
                                    >
                                        <span className="text-orange-500">⚡</span>
                                        <span>Nexiplay Server</span>
                                    </button>
                                )}

                                {/* Custom/Manual Stream Button */}
                                {customUrl && !customUrl.trim().startsWith('{') && isServerEnabled('custom') && (
                                    <button
                                        onClick={() => handleServerSelect('custom')}
                                        className={`px-5 py-3 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${
                                            activeServerId === 'custom'
                                                ? 'bg-gradient-to-r from-red-600 to-orange-600 text-white shadow-lg shadow-red-900/30'
                                                : 'bg-white/5 text-gray-400 hover:bg-white/10 hover:text-white border border-white/5'
                                        }`}
                                    >
                                        <span>⭐</span>
                                        <span>Server Nexiplay</span>
                                    </button>
                                )}

                                {/* Multi Scraper Server Buttons */}
                                {Object.entries(multiStreams).map(([serverKey, streamUrl]) => {
                                    if (!streamUrl || !isServerEnabled(serverKey)) return null;
                                    
                                    const serverNames: Record<string, string> = {
                                        custom: 'Server Nexiplay',
                                        animeworld: 'AnimeWorld Server',
                                        animixstream: 'Nexiplay Ani Server',
                                        toonstream: 'Nexiplay T Server'
                                    };
                                    
                                    const serverIcons: Record<string, string> = {
                                        custom: '⭐',
                                        animeworld: '🌐',
                                        animixstream: '🚀',
                                        toonstream: '📺'
                                    };
                                    
                                    const serverColors: Record<string, string> = {
                                        custom: 'text-yellow-400',
                                        animeworld: 'text-green-400',
                                        animixstream: 'text-cyan-400',
                                        toonstream: 'text-purple-400'
                                    };

                                    const srvName = serverNames[serverKey] || `${serverKey.toUpperCase()} Server`;
                                    const srvIcon = serverIcons[serverKey] || '⭐';
                                    const srvColor = serverColors[serverKey] || 'text-orange-500';

                                    const serverId = `multi_${serverKey}`;

                                    return (
                                        <button
                                            key={serverKey}
                                            onClick={() => handleServerSelect(serverId)}
                                            className={`px-5 py-3 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${
                                                activeServerId === serverId
                                                    ? 'bg-gradient-to-r from-red-600 to-orange-600 text-white shadow-lg shadow-red-900/30'
                                                    : 'bg-white/5 text-gray-400 hover:bg-white/10 hover:text-white border border-white/5'
                                            }`}
                                        >
                                            <span className={srvColor}>{srvIcon}</span>
                                            <span>{srvName}</span>
                                        </button>
                                    );
                                })}

                                {availableServers.filter(srv => isServerEnabled(srv.id)).map((srv) => {
                                    const url = isSeriesOrAnime 
                                        ? srv.getUrl(movie.id, movie.tmdb_id || undefined, movie.imdb_id || undefined, movie.mal_id || undefined, currentSeasonNum, currentEpisodeNum)
                                        : srv.getUrl(movie.id, movie.tmdb_id || undefined, movie.imdb_id || undefined, movie.mal_id || undefined);
                                    if (!url) return null;

                                    return (
                                        <button
                                            key={srv.id}
                                            onClick={() => handleServerSelect(srv.id)}
                                            className={`px-5 py-3 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${
                                                activeServerId === srv.id
                                                    ? 'bg-gradient-to-r from-red-600 to-orange-600 text-white shadow-lg shadow-red-900/30'
                                                    : 'bg-white/5 text-gray-400 hover:bg-white/10 hover:text-white border border-white/5'
                                                }`}
                                        >
                                            <span>{srv.icon}</span>
                                            <span>{srv.name}</span>
                                        </button>
                                    );
                                })}
                            </div>
                        </div>

                        {/* Mobile Episodes selection (only visible on mobile/tablet) */}
                        {isSeriesOrAnime && sortedSeasons.length > 0 && (
                            <div className="block lg:hidden">
                                {renderEpisodes()}
                            </div>
                        )}

                        {/* Title Info & Description */}
                        <div className="glass-panel p-6 sm:p-8 rounded-3xl space-y-4">
                            <div className="flex flex-wrap gap-2.5">
                                <span className="px-3 py-1 bg-red-600 text-white text-[10px] font-black uppercase rounded tracking-wider shadow-lg shadow-red-900/40">
                                    {movie.type}
                                </span>
                                {movie.release_year && (
                                    <span className="px-3 py-1 bg-white/5 text-gray-300 text-[10px] font-bold rounded border border-white/5">
                                        {movie.release_year}
                                    </span>
                                )}
                                {movie.language && (
                                    <span className="px-3 py-1 bg-white/5 text-gray-300 text-[10px] font-bold rounded border border-white/5">
                                        {movie.language}
                                    </span>
                                )}
                            </div>

                            <h2 className="text-2xl md:text-3xl font-black text-white leading-tight">
                                {movie.title}
                                {isSeriesOrAnime && activeEpisode?.episode_title && (
                                    <span className="text-gray-400 font-normal ml-3 text-lg md:text-xl block md:inline mt-1 md:mt-0">
                                        - S{currentSeasonNum} E{currentEpisodeNum}: {activeEpisode.episode_title}
                                    </span>
                                )}
                            </h2>

                            <p className="text-gray-300 text-base md:text-lg leading-relaxed max-w-4xl border-t border-white/5 pt-4">
                                {movie.description}
                            </p>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 border-t border-white/5 pt-4 text-sm text-gray-400">
                                <div className="space-y-2">
                                    <div className="flex"><span className="font-bold text-white min-w-[100px]">Genres:</span> <span>{categoriesList}</span></div>
                                    {movie.cast_members && (
                                        <div className="flex"><span className="font-bold text-white min-w-[100px]">Cast:</span> <span className="line-clamp-2">{movie.cast_members}</span></div>
                                    )}
                                </div>
                                <div className="space-y-2">
                                    {movie.source && (
                                        <div className="flex"><span className="font-bold text-white min-w-[100px]">Source:</span> <span>{movie.source}</span></div>
                                    )}
                                    {movie.subtitle && (
                                        <div className="flex"><span className="font-bold text-white min-w-[100px]">Subtitles:</span> <span>{movie.subtitle}</span></div>
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* Banner Ad placement */}
                        <div className="w-full flex justify-center py-2">
                            <AdBanner placement="home_bottom" size="728x90" />
                        </div>

                    </div>

                    {/* RIGHT COLUMN: Sidebar (Episodes List or Related Content) */}
                    <div className="lg:col-span-4 xl:col-span-3 space-y-6">
                        
                        {isSeriesOrAnime && sortedSeasons.length > 0 && (
                            <div className="hidden lg:block">
                                {renderEpisodes()}
                            </div>
                        )}

                        {!isSeriesOrAnime && (
                            /* Sidebar for movies: Display related movies */
                            <div className="glass-panel p-5 rounded-3xl space-y-4">
                                <div className="flex items-center gap-2 border-b border-white/5 pb-3">
                                    <span className="text-sm">🎬</span>
                                    <span className="text-sm font-black text-gray-400 uppercase tracking-wider">Related Movies</span>
                                </div>
                                
                                <div className="space-y-3.5">
                                    {relatedMovies.length === 0 ? (
                                        <div className="text-center py-6 text-xs text-gray-500">
                                            No related movies found
                                        </div>
                                    ) : (
                                        relatedMovies.map((m) => (
                                            <Link
                                                key={m.id}
                                                href={`/watch/${m.type}/${m.slug}`}
                                                className="flex gap-3 bg-white/[0.01] hover:bg-white/[0.05] p-2 rounded-2xl border border-white/5 transition-all group"
                                            >
                                                <div className="relative w-14 aspect-[2/3] rounded-lg overflow-hidden flex-shrink-0 border border-white/5">
                                                    {m.poster_url ? (
                                                        <Image
                                                            src={m.poster_url}
                                                            alt={m.title}
                                                            fill
                                                            className="object-cover"
                                                        />
                                                    ) : (
                                                        <div className="w-full h-full bg-dark-800 flex items-center justify-center text-[8px] text-gray-600">
                                                            No Poster
                                                        </div>
                                                    )}
                                                </div>
                                                <div className="min-w-0 flex flex-col justify-center">
                                                    <h4 className="text-xs font-bold text-gray-200 group-hover:text-red-500 transition-colors line-clamp-2 leading-snug">
                                                        {m.title}
                                                    </h4>
                                                    <div className="flex items-center gap-2 text-[10px] text-gray-500 mt-1">
                                                        <span>{m.release_year}</span>
                                                        <span>•</span>
                                                        <span className="capitalize">{m.type}</span>
                                                    </div>
                                                </div>
                                            </Link>
                                        ))
                                    )}
                                </div>
                            </div>
                        )}

                        {/* Sidebar Ad Placement */}
                        <div className="w-full flex justify-center py-2">
                            <AdBanner placement="movie_sidebar" size="300x250" />
                        </div>
                    </div>

                </div>

                {/* Comment Section & Related Posts bottom block */}
                <div className="border-t border-white/5 pt-10 grid grid-cols-1 lg:grid-cols-12 gap-8">
                    <div className="lg:col-span-8 xl:col-span-9 space-y-8">
                        {/* Related posts bottom recommendation */}
                        <div>
                            <h3 className="text-xl font-black text-white mb-6 flex items-center gap-3">
                                <span className="w-1.5 h-6 bg-red-600 rounded-full"></span>
                                You May Also Like
                            </h3>
                            <RelatedPosts currentMovieId={movie.id} type={movie.type} />
                        </div>

                        {/* Comment section */}
                        <div>
                            <h3 className="text-xl font-black text-white mb-6 flex items-center gap-3">
                                <span className="w-1.5 h-6 bg-red-600 rounded-full"></span>
                                Discussion & Comments
                            </h3>
                            <CommentSection movieId={movie.id} />
                        </div>
                    </div>
                </div>

            </div>

            {/* 2-Step Ad Verification Popup */}
            {showAdVerification && (
                <AdVerificationPopup
                    onVerified={handleVerificationComplete}
                    adUrl1={adSettings?.verificationAdUrl1 || adSettings?.directLinkUrl || 'https://nexiplay.live'}
                    adUrl2={adSettings?.verificationAdUrl2 || adSettings?.popunderUrl || 'https://nexiplay.live'}
                />
            )}
        </div>
    );

    // Auto next / end of video handler
    function handleVideoEnded() {
        if (autoNext && isSeriesOrAnime) {
            goToNextEpisode();
        }
    }
}
