'use client';

import { useState, useEffect, useRef } from 'react';
import { Movie, Season, Episode } from '@/lib/types';
import { useAdSettings } from '@/hooks/useAdSettings';
import { canRequestPlayerFullscreen, FULLSCREEN_IFRAME_ATTRS, requestPlayerFullscreen } from '@/lib/playerFullscreen';

interface StreamingPlayerProps {
    movie: Movie;
    seasons?: Season[];
}

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

function HLSVideoPlayer({ src }: { src: string }) {
    const videoRef = useRef<HTMLVideoElement>(null);
    const hlsRef = useRef<any>(null);
    const [hlsLoaded, setHlsLoaded] = useState(false);
    const [audioTracks, setAudioTracks] = useState<any[]>([]);
    const [currentTrackIndex, setCurrentTrackIndex] = useState<number>(-1);

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

        if (!hlsLoaded || !videoRef.current) return;

        const video = videoRef.current;
        const Hls = (window as any).Hls;

        if (hlsRef.current) {
            hlsRef.current.destroy();
            hlsRef.current = null;
        }

        if (Hls.isSupported()) {
            const hls = new Hls({
                maxMaxBufferLength: 30,
                enableWorker: true,
                lowLatencyMode: true
            });
            hlsRef.current = hls;
            hls.loadSource(src);
            hls.attachMedia(video);
            
            hls.on(Hls.Events.MANIFEST_PARSED, () => {
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
                    switch (data.type) {
                        case Hls.ErrorTypes.NETWORK_ERROR:
                            hls.startLoad();
                            break;
                        case Hls.ErrorTypes.MEDIA_ERROR:
                            hls.recoverMediaError();
                            break;
                        default:
                            hls.destroy();
                            break;
                    }
                }
            });
        } else if (video.canPlayType('application/vnd.apple.mpegurl')) {
            video.src = src;
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
        
        return () => {
            video.removeEventListener('loadedmetadata', handleLoadedMetadata);
            if (hlsRef.current) {
                hlsRef.current.destroy();
                hlsRef.current = null;
            }
        };
    }, [src, hlsLoaded]);

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

    return (
        <div className="absolute inset-0 w-full h-full bg-black flex flex-col justify-between">
            <div className="relative w-full flex-grow">
                <video
                    ref={videoRef}
                    controls
                    className="absolute inset-0 w-full h-full object-contain"
                    autoPlay
                    playsInline
                />
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

export default function StreamingPlayer({ movie, seasons = [] }: StreamingPlayerProps) {
    const isSeriesOrAnime = movie.type === 'series' || movie.type === 'anime';
    const playerShellRef = useRef<HTMLDivElement>(null);
    const playerIframeRef = useRef<HTMLIFrameElement>(null);

    // Stream state
    const [currentSeasonNum, setCurrentSeasonNum] = useState<number>(1);
    const [currentEpisodeNum, setCurrentEpisodeNum] = useState<number>(1);
    const [activeServerId, setActiveServerId] = useState<string>('');
    const [sandboxMode, setSandboxMode] = useState<boolean>(true);
    const [canUseFullscreenAssist, setCanUseFullscreenAssist] = useState(false);

    const sortedSeasons = [...seasons].sort((a, b) => a.season_number - b.season_number);
    const activeSeason = sortedSeasons.find(s => s.season_number === currentSeasonNum) || sortedSeasons[0];
    const episodes = activeSeason?.episodes?.sort((a, b) => a.episode_number - b.episode_number) || [];
    const activeEpisode = episodes.find(e => e.episode_number === currentEpisodeNum) || episodes[0];

    useEffect(() => {
        setCanUseFullscreenAssist(canRequestPlayerFullscreen());
    }, []);

    // Determine if there is a custom override link
    const getCustomUrl = (): string | null => {
        if (!isSeriesOrAnime) {
            return movie.streaming_url || null;
        }
        return activeEpisode?.streaming_url || null;
    };

    const customUrl = getCustomUrl();

    const { settings: adSettings } = useAdSettings();

    const isServerEnabled = (serverId: string) => {
        if (!adSettings || !adSettings.socialBarCode) return true;
        const enabledList = adSettings.socialBarCode.split(',').map(s => s.trim().toLowerCase());
        return enabledList.includes(serverId.toLowerCase());
    };

    // Available Servers list
    const availableServers = SERVERS.filter(srv => {
        if (srv.animeOnly && movie.type !== 'anime') return false;
        if (srv.movieOnly && isSeriesOrAnime) return false;
        return true;
    });

    // Auto-select server on mount or when custom link changes
    useEffect(() => {
        const customServerId = movie.scraper_source === 'toonplay' ? 'toonplay' : 'custom';
        if (customUrl && isServerEnabled(customServerId)) {
            setActiveServerId('custom');
        } else {
            const firstEnabled = availableServers.find(srv => isServerEnabled(srv.id));
            if (firstEnabled) {
                setActiveServerId(firstEnabled.id);
            } else if (customUrl && isServerEnabled(customServerId)) {
                setActiveServerId('custom');
            } else {
                setActiveServerId('');
            }
        }
    }, [customUrl, movie.id, currentEpisodeNum, currentSeasonNum, adSettings]);

    // Build the final iframe src
    const getEmbedUrl = (): string => {
        if (activeServerId === 'custom') {
            return normalizePlayerUrl(customUrl || '');
        }
        const server = availableServers.find(s => s.id === activeServerId);
        if (!server) return '';

        const serverUrl = isSeriesOrAnime
            ? server.getUrl(movie.id, movie.tmdb_id || undefined, movie.imdb_id || undefined, movie.mal_id || undefined, currentSeasonNum, currentEpisodeNum) || ''
            : server.getUrl(movie.id, movie.tmdb_id || undefined, movie.imdb_id || undefined, movie.mal_id || undefined) || '';
        return normalizePlayerUrl(serverUrl);
    };

    const embedUrl = getEmbedUrl();

    const isM3U8 = customUrl ? (
        customUrl.toLowerCase().includes('.m3u8') || 
        customUrl.toLowerCase().includes('google-proxy') || 
        customUrl.toLowerCase().includes('streamindia') ||
        customUrl.toLowerCase().includes('fallback.streamindia.co.in/sources')
    ) : false;
    const isYouTubeActive = embedUrl ? !!getYouTubeVideoId(embedUrl) : false;
    const isIframePlayerActive = !!embedUrl && !(activeServerId === 'custom' && isM3U8);

    const handlePlayerFullscreenRequest = () => {
        requestPlayerFullscreen(playerShellRef.current, playerIframeRef.current);
    };

    // Check if we can play this content (needs either IDs or custom URL)
    const hasIdentifiers = movie.tmdb_id || movie.imdb_id || movie.mal_id || customUrl;

    if (!hasIdentifiers) {
        return (
            <div className="bg-dark-900 border border-dashed border-white/10 rounded-2xl p-8 text-center text-gray-400">
                <span className="text-4xl block mb-3">⏳</span>
                <h4 className="text-white font-bold mb-1">Streaming Unavailable</h4>
                <p className="text-sm">We are still updating the streaming servers for this content. Check back soon!</p>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Player controls / Info */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-4 bg-dark-900/50 rounded-2xl border border-white/5">
                {/* Server Switcher */}
                <div className="flex flex-wrap gap-2 items-center">
                    <span className="text-xs font-bold text-gray-500 uppercase tracking-wider mr-2">Servers:</span>
                    {customUrl && isServerEnabled(movie.scraper_source === 'toonplay' ? 'toonplay' : 'custom') && (
                        <button
                            onClick={() => setActiveServerId('custom')}
                            className={`px-4 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                                activeServerId === 'custom'
                                    ? 'bg-red-600 text-white shadow-lg shadow-red-900/30'
                                    : 'bg-dark-850 text-gray-400 hover:bg-dark-750 hover:text-white'
                            }`}
                        >
                            <span>{movie.scraper_source === 'toonplay' ? '🔒' : '⭐'}</span>
                            <span>{movie.scraper_source === 'toonplay' ? 'Nexiplay Private Server' : 'Server Nexiplay'}</span>
                        </button>
                    )}
                    {availableServers.filter(srv => isServerEnabled(srv.id)).map((srv) => {
                        const url = isSeriesOrAnime 
                            ? srv.getUrl(movie.id, movie.tmdb_id || undefined, movie.imdb_id || undefined, movie.mal_id || undefined, currentSeasonNum, currentEpisodeNum)
                            : srv.getUrl(movie.id, movie.tmdb_id || undefined, movie.imdb_id || undefined, movie.mal_id || undefined);
                        if (!url) return null;

                        return (
                            <button
                                key={srv.id}
                                onClick={() => setActiveServerId(srv.id)}
                                className={`px-4 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                                    activeServerId === srv.id
                                        ? 'bg-red-600 text-white shadow-lg shadow-red-900/30'
                                        : 'bg-dark-850 text-gray-400 hover:bg-dark-750 hover:text-white'
                                    }`}
                            >
                                <span>{srv.icon}</span>
                                <span>{srv.name}</span>
                            </button>
                        );
                    })}
                </div>

                {/* Sandbox Ad Block Toggle */}
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

            {/* Video Container (Responsive Iframe or Native HLS Player) */}
            <div
                ref={playerShellRef}
                className="nexiplay-player-shell relative w-full aspect-video bg-black rounded-2xl overflow-hidden shadow-2xl border border-white/10 group"
            >
                {embedUrl ? (
                    activeServerId === 'custom' && isM3U8 ? (
                        <HLSVideoPlayer src={`/api/proxy-stream?url=${encodeURIComponent(embedUrl)}`} />
                    ) : (
                        <iframe
                            ref={playerIframeRef}
                            src={embedUrl}
                            title="Streaming player"
                            className="nexiplay-player-frame absolute inset-0 w-full h-full"
                            {...FULLSCREEN_IFRAME_ATTRS}
                            // If sandboxMode is enabled, exclude allow-popups and allow-top-navigation to block ads
                            sandbox={
                                sandboxMode && activeServerId !== 'custom'
                                    ? "allow-scripts allow-same-origin allow-forms"
                                    : undefined
                            }
                            referrerPolicy={isYouTubeActive ? 'strict-origin-when-cross-origin' : 'no-referrer'}
                        />
                    )
                ) : (
                    <div className="absolute inset-0 flex flex-col items-center justify-center text-gray-400 p-6">
                        <span className="text-3xl animate-bounce mb-2">🎞️</span>
                        <p className="font-bold">Select Server or Episode to start playback</p>
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

            {/* TV Show / Anime Episode Selector */}
            {isSeriesOrAnime && sortedSeasons.length > 0 && (
                <div className="bg-dark-900/30 p-6 rounded-2xl border border-white/5 space-y-4">
                    {/* Season selection */}
                    {sortedSeasons.length > 1 && (
                        <div className="flex flex-wrap gap-2 items-center">
                            <span className="text-xs font-bold text-gray-400 uppercase mr-2">Season:</span>
                            {sortedSeasons.map((season) => (
                                <button
                                    key={season.id}
                                    onClick={() => {
                                        setCurrentSeasonNum(season.season_number);
                                        setCurrentEpisodeNum(1);
                                    }}
                                    className={`px-4 py-2 rounded-lg text-xs font-black transition-all ${
                                        currentSeasonNum === season.season_number
                                            ? 'bg-red-600 text-white shadow-lg'
                                            : 'bg-dark-800 text-gray-400 hover:bg-dark-750 hover:text-white'
                                    }`}
                                >
                                    S{season.season_number}
                                </button>
                            ))}
                        </div>
                    )}

                    {/* Episode selection */}
                    <div className="space-y-2">
                        <span className="text-xs font-bold text-gray-400 uppercase block mb-2">
                            Select Episode: {activeEpisode?.episode_title ? `(S${currentSeasonNum} E${currentEpisodeNum} - ${activeEpisode.episode_title})` : `(Episode ${currentEpisodeNum})`}
                        </span>
                        <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-10 gap-2">
                            {episodes.map((ep) => (
                                <button
                                    key={ep.id}
                                    onClick={() => setCurrentEpisodeNum(ep.episode_number)}
                                    className={`py-3 rounded-lg text-xs font-bold transition-all text-center flex flex-col items-center justify-center relative ${
                                        currentEpisodeNum === ep.episode_number
                                            ? 'bg-gradient-to-r from-red-600 to-orange-600 text-white shadow-lg scale-105'
                                            : 'bg-dark-850 hover:bg-dark-750 text-gray-300 border border-white/5'
                                    }`}
                                >
                                    <span className="text-[10px] opacity-65 mb-0.5">EP</span>
                                    <span className="text-sm font-black">{ep.episode_number}</span>
                                    
                                    {/* Indicator for custom stream URL overrides */}
                                    {ep.streaming_url && (
                                        <span className="absolute top-1 right-1 w-1.5 h-1.5 bg-purple-500 rounded-full" title="Custom stream override available" />
                                    )}
                                </button>
                            ))}
                        </div>
                    </div>
                </div>
            )}

            {/* Helper Notice */}
            <div className="text-xs text-gray-500 bg-white/5 p-4 rounded-xl border border-white/5 flex gap-2">
                <span className="text-sm">💡</span>
                <p>
                    <strong>Tip:</strong> If the video shows an error or fails to load, try switching servers. 
                    Some servers block sandboxing; if you see a "Disable Adblock" message, toggle 
                    <strong> Compatible Mode</strong> above to restore playback.
                </p>
            </div>
        </div>
    );
}
