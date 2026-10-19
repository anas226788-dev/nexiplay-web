'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import Image from 'next/image';
import { LiveChannel } from '@/lib/liveTvData';

interface LiveTvPlayerProps {
    channel: LiveChannel;
    onToggleFavorite?: (channelId: string) => void;
    isFavorite?: boolean;
}

export default function LiveTvPlayer({
    channel,
    onToggleFavorite,
    isFavorite = false,
}: LiveTvPlayerProps) {
    const videoRef = useRef<HTMLVideoElement>(null);
    const audioRef = useRef<HTMLAudioElement>(null);
    const containerRef = useRef<HTMLDivElement>(null);

    const [isLoading, setIsLoading] = useState(true);
    const [hasError, setHasError] = useState(false);
    const [isPlaying, setIsPlaying] = useState(true);
    const [isMuted, setIsMuted] = useState(false);
    const [volume, setVolume] = useState(1);
    const [isFullscreen, setIsFullscreen] = useState(false);
    const [currentUrl, setCurrentUrl] = useState(channel.streamUrl);
    const [usingBackup, setUsingBackup] = useState(false);

    // Reset stream when channel changes
    useEffect(() => {
        setCurrentUrl(channel.streamUrl);
        setUsingBackup(false);
        setHasError(false);
        setIsLoading(true);
        setIsPlaying(true);
    }, [channel]);

    // Handle HLS Video Player
    useEffect(() => {
        if (channel.streamType !== 'hls' || !videoRef.current) return;
        const video = videoRef.current;
        let hlsInstance: any = null;
        let isCancelled = false;

        setIsLoading(true);
        setHasError(false);

        // Native Safari/iOS HLS
        if (video.canPlayType('application/vnd.apple.mpegurl')) {
            video.src = currentUrl;
            video
                .play()
                .then(() => {
                    if (!isCancelled) {
                        setIsPlaying(true);
                        setIsLoading(false);
                    }
                })
                .catch(() => {
                    if (!isCancelled) setIsLoading(false);
                });
        } else {
            const win = window as any;
            const initHls = () => {
                if (isCancelled || !videoRef.current) return;
                if (win.Hls && win.Hls.isSupported()) {
                    hlsInstance = new win.Hls({
                        enableWorker: true,
                        backBufferLength: 60,
                        maxBufferLength: 30,
                        liveSyncDurationCount: 3,
                        manifestLoadingTimeOut: 12000,
                    });

                    hlsInstance.loadSource(currentUrl);
                    hlsInstance.attachMedia(video);

                    hlsInstance.on(win.Hls.Events.MANIFEST_PARSED, () => {
                        if (!isCancelled) {
                            setIsLoading(false);
                            video.play().catch(() => {});
                        }
                    });

                    hlsInstance.on(win.Hls.Events.ERROR, (_event: any, data: any) => {
                        if (data.fatal) {
                            console.warn('[LiveTV HLS Error]', data);
                            if (data.type === win.Hls.ErrorTypes.NETWORK_ERROR) {
                                hlsInstance.startLoad();
                            } else if (data.type === win.Hls.ErrorTypes.MEDIA_ERROR) {
                                hlsInstance.recoverMediaError();
                            } else {
                                if (!isCancelled) setHasError(true);
                                hlsInstance.destroy();
                            }
                        }
                    });
                } else {
                    video.src = currentUrl;
                }
            };

            if (win.Hls) {
                initHls();
            } else {
                const script = document.createElement('script');
                script.src = 'https://cdn.jsdelivr.net/npm/hls.js@1.5.8/dist/hls.min.js';
                script.onload = initHls;
                script.onerror = () => {
                    if (!isCancelled) setHasError(true);
                };
                document.head.appendChild(script);
            }
        }

        return () => {
            isCancelled = true;
            if (hlsInstance) {
                hlsInstance.destroy();
            }
        };
    }, [currentUrl, channel.streamType]);

    // Handle Audio for Radio Streams
    useEffect(() => {
        if (channel.streamType !== 'audio' || !audioRef.current) return;
        const audio = audioRef.current;
        setIsLoading(true);
        setHasError(false);

        audio.src = currentUrl;
        audio
            .play()
            .then(() => {
                setIsPlaying(true);
                setIsLoading(false);
            })
            .catch(() => {
                setIsLoading(false);
            });
    }, [currentUrl, channel.streamType]);

    const togglePlay = useCallback(() => {
        if (channel.streamType === 'hls' && videoRef.current) {
            if (videoRef.current.paused) {
                videoRef.current.play();
                setIsPlaying(true);
            } else {
                videoRef.current.pause();
                setIsPlaying(false);
            }
        } else if (channel.streamType === 'audio' && audioRef.current) {
            if (audioRef.current.paused) {
                audioRef.current.play();
                setIsPlaying(true);
            } else {
                audioRef.current.pause();
                setIsPlaying(false);
            }
        }
    }, [channel.streamType]);

    const toggleMute = useCallback(() => {
        if (videoRef.current) videoRef.current.muted = !isMuted;
        if (audioRef.current) audioRef.current.muted = !isMuted;
        setIsMuted(!isMuted);
    }, [isMuted]);

    const handleVolumeChange = useCallback((newVol: number) => {
        setVolume(newVol);
        if (videoRef.current) {
            videoRef.current.volume = newVol;
            videoRef.current.muted = newVol === 0;
        }
        if (audioRef.current) {
            audioRef.current.volume = newVol;
            audioRef.current.muted = newVol === 0;
        }
        setIsMuted(newVol === 0);
    }, []);

    const toggleFullscreen = useCallback(() => {
        if (!containerRef.current) return;
        if (!document.fullscreenElement) {
            containerRef.current.requestFullscreen().catch(() => {});
            setIsFullscreen(true);
        } else {
            document.exitFullscreen().catch(() => {});
            setIsFullscreen(false);
        }
    }, []);

    const togglePip = useCallback(async () => {
        if (videoRef.current && document.pictureInPictureEnabled) {
            try {
                if (document.pictureInPictureElement) {
                    await document.exitPictureInPicture();
                } else {
                    await videoRef.current.requestPictureInPicture();
                }
            } catch (err) {
                console.error('PiP Error:', err);
            }
        }
    }, []);

    const handleRetry = () => {
        setHasError(false);
        setIsLoading(true);
        if (channel.backupStreamUrl && !usingBackup) {
            setUsingBackup(true);
            setCurrentUrl(channel.backupStreamUrl);
        } else {
            setUsingBackup(false);
            setCurrentUrl(channel.streamUrl + (channel.streamUrl.includes('?') ? '&' : '?') + 't=' + Date.now());
        }
    };

    return (
        <div 
            ref={containerRef}
            className="w-full rounded-2xl overflow-hidden bg-[#0A090F] border border-white/10 shadow-2xl relative group"
        >
            {/* Header / Info Bar Above Player */}
            <div className="px-4 py-3 bg-[#13111A] border-b border-white/10 flex items-center justify-between gap-3">
                <div className="flex items-center gap-3 min-w-0">
                    <div className="w-9 h-9 rounded-xl overflow-hidden bg-[#1E1B29] border border-white/10 shrink-0 relative">
                        <Image
                            src={channel.logo}
                            alt={channel.name}
                            fill
                            className="object-cover"
                        />
                    </div>
                    <div className="min-w-0">
                        <div className="flex items-center gap-2">
                            <h2 className="text-white font-bold text-sm md:text-base truncate">
                                {channel.name}
                            </h2>
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-rose-500/20 text-rose-400 border border-rose-500/30">
                                <span className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-pulse" />
                                LIVE
                            </span>
                        </div>
                        <p className="text-xs text-gray-400 truncate">
                            {channel.country} · {channel.language} {channel.quality ? `· ${channel.quality}` : ''}
                        </p>
                    </div>
                </div>

                {/* Right controls */}
                <div className="flex items-center gap-2 shrink-0">
                    {onToggleFavorite && (
                        <button
                            onClick={() => onToggleFavorite(channel.id)}
                            className={`p-2 rounded-xl border transition-all ${
                                isFavorite 
                                    ? 'bg-rose-500/20 text-rose-400 border-rose-500/40' 
                                    : 'bg-white/5 text-gray-400 border-white/10 hover:text-white hover:bg-white/10'
                            }`}
                            title={isFavorite ? 'Remove from favorites' : 'Add to favorites'}
                        >
                            <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24">
                                <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
                            </svg>
                        </button>
                    )}
                    <button
                        onClick={toggleFullscreen}
                        className="p-2 rounded-xl bg-white/5 text-gray-300 border border-white/10 hover:bg-white/10 hover:text-white transition-all hidden sm:flex"
                        title="Fullscreen"
                    >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
                        </svg>
                    </button>
                </div>
            </div>

            {/* Main Stage */}
            <div className="relative aspect-video w-full bg-black flex items-center justify-center overflow-hidden">
                {/* 1. HLS Video Player */}
                {channel.streamType === 'hls' && (
                    <video
                        ref={videoRef}
                        className="w-full h-full object-contain"
                        playsInline
                        autoPlay
                        onWaiting={() => setIsLoading(true)}
                        onPlaying={() => setIsLoading(false)}
                        onError={() => setHasError(true)}
                    />
                )}

                {/* 2. Live Radio Audio Visualizer */}
                {channel.streamType === 'audio' && (
                    <div className="w-full h-full relative flex flex-col items-center justify-center bg-gradient-to-b from-[#151221] via-[#0C0B12] to-black p-6">
                        <audio
                            ref={audioRef}
                            autoPlay
                            onWaiting={() => setIsLoading(true)}
                            onPlaying={() => setIsLoading(false)}
                            onError={() => setHasError(true)}
                        />

                        {/* Animated Glowing Vinyl Record */}
                        <div className="relative mb-6">
                            <div className={`w-32 h-32 md:w-44 md:h-44 rounded-full border-4 border-[#9273F5]/40 shadow-[0_0_40px_rgba(146,115,245,0.35)] relative overflow-hidden flex items-center justify-center ${isPlaying ? 'animate-[spin_12s_linear_infinite]' : ''}`}>
                                <Image
                                    src={channel.logo}
                                    alt={channel.name}
                                    fill
                                    className="object-cover"
                                />
                                <div className="w-8 h-8 rounded-full bg-[#0D0B12] border-2 border-white/20 absolute z-10" />
                            </div>
                            <div className="absolute -inset-3 rounded-full bg-gradient-to-r from-violet-600/20 via-rose-500/20 to-purple-600/20 blur-xl pointer-events-none -z-10" />
                        </div>

                        {/* Frequency Wave Animation */}
                        <div className="flex items-end justify-center gap-1.5 h-10 mb-4">
                            {[40, 75, 55, 90, 60, 100, 70, 85, 45, 95, 65, 80, 50, 90, 70].map((h, i) => (
                                <span
                                    key={i}
                                    className={`w-1.5 rounded-full bg-gradient-to-t from-violet-600 to-rose-400 transition-all duration-300 ${isPlaying ? 'animate-pulse' : 'opacity-40'}`}
                                    style={{
                                        height: isPlaying ? `${Math.max(15, (h * (i % 2 === 0 ? 0.9 : 1.2)) % 100)}%` : '20%',
                                        animationDelay: `${i * 80}ms`,
                                    }}
                                />
                            ))}
                        </div>

                        <div className="text-center max-w-md">
                            <h3 className="text-lg md:text-xl font-bold text-white mb-1">{channel.name}</h3>
                            <p className="text-xs md:text-sm text-gray-400 line-clamp-1">{channel.description}</p>
                        </div>
                    </div>
                )}

                {/* 3. Embed Player */}
                {channel.streamType === 'embed' && (
                    <iframe
                        src={currentUrl}
                        title={channel.name}
                        className="w-full h-full border-0"
                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                        allowFullScreen
                    />
                )}

                {/* Loading Spinner */}
                {isLoading && !hasError && (
                    <div className="absolute inset-0 bg-black/60 backdrop-blur-sm flex flex-col items-center justify-center gap-3 z-20 pointer-events-none">
                        <div className="w-12 h-12 rounded-full border-4 border-violet-500/20 border-t-violet-500 animate-spin" />
                        <span className="text-xs md:text-sm font-semibold text-gray-300 tracking-wider">
                            Connecting Live Stream...
                        </span>
                    </div>
                )}

                {/* Error & Fallback Banner */}
                {hasError && (
                    <div className="absolute inset-0 bg-[#0E0C14]/95 flex flex-col items-center justify-center p-6 text-center z-20">
                        <div className="w-14 h-14 rounded-full bg-rose-500/10 border border-rose-500/30 flex items-center justify-center text-rose-400 mb-3 text-2xl">
                            📡
                        </div>
                        <h4 className="text-white font-bold text-base mb-1">Stream Temporarily Unavailable</h4>
                        <p className="text-xs text-gray-400 max-w-sm mb-4">
                            The upstream broadcast server is currently buffering or geoblocked. You can retry or switch to an alternate backup stream.
                        </p>
                        <div className="flex flex-wrap items-center justify-center gap-3">
                            <button
                                onClick={handleRetry}
                                className="px-4 py-2 bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-500 hover:to-purple-500 text-white text-xs font-bold rounded-xl transition-all shadow-lg shadow-violet-900/30 flex items-center gap-2"
                            >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                                </svg>
                                {channel.backupStreamUrl && !usingBackup ? 'Try Backup Stream' : 'Retry Stream'}
                            </button>
                        </div>
                    </div>
                )}
            </div>

            {/* Bottom Playback Control Bar */}
            <div className="px-4 py-2.5 bg-[#100E17] border-t border-white/10 flex items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                    <button
                        onClick={togglePlay}
                        className="w-8 h-8 rounded-lg bg-white/5 hover:bg-white/10 text-white flex items-center justify-center transition-all"
                        title={isPlaying ? 'Pause' : 'Play'}
                    >
                        {isPlaying ? (
                            <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24">
                                <path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z" />
                            </svg>
                        ) : (
                            <svg className="w-4 h-4 fill-current ml-0.5" viewBox="0 0 24 24">
                                <path d="M8 5v14l11-7z" />
                            </svg>
                        )}
                    </button>

                    {/* Mute & Volume Slider */}
                    <div className="flex items-center gap-2 group/vol">
                        <button
                            onClick={toggleMute}
                            className="text-gray-400 hover:text-white transition-colors"
                            title={isMuted ? 'Unmute' : 'Mute'}
                        >
                            {isMuted || volume === 0 ? (
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2" />
                                </svg>
                            ) : (
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
                                </svg>
                            )}
                        </button>
                        <input
                            type="range"
                            min="0"
                            max="1"
                            step="0.05"
                            value={isMuted ? 0 : volume}
                            onChange={(e) => handleVolumeChange(parseFloat(e.target.value))}
                            className="w-16 md:w-20 h-1 bg-white/20 rounded-lg appearance-none cursor-pointer accent-[#9273F5]"
                        />
                    </div>
                </div>

                <div className="flex items-center gap-3 text-xs text-gray-400">
                    <span className="hidden sm:inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-white/5 border border-white/10 text-gray-300 font-mono text-[11px]">
                        📡 {channel.quality || 'Auto HD'}
                    </span>

                    {channel.streamType === 'hls' && (
                        <button
                            onClick={togglePip}
                            className="p-1.5 rounded-lg hover:bg-white/10 text-gray-400 hover:text-white transition-colors hidden md:block"
                            title="Picture in Picture"
                        >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                            </svg>
                        </button>
                    )}

                    <button
                        onClick={toggleFullscreen}
                        className="p-1.5 rounded-lg hover:bg-white/10 text-gray-400 hover:text-white transition-colors"
                        title="Fullscreen"
                    >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
                        </svg>
                    </button>
                </div>
            </div>
        </div>
    );
}
