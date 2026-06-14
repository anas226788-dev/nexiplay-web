'use client';

import { useState, useEffect } from 'react';
import { Movie, Season, Episode } from '@/lib/types';

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

const SERVERS: Server[] = [
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
        id: 'embed_su',
        name: 'Server Embed.su',
        icon: '💿',
        getUrl: (id, tmdb, imdb, mal, s, e) => {
            if (!tmdb) return null;
            return s !== undefined && e !== undefined
                ? `https://embed.su/embed/tv/${tmdb}/${s}/${e}`
                : `https://embed.su/embed/movie/${tmdb}`;
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
    },
    {
        id: 'vidsrc_anime',
        name: 'Server AnimeSrc',
        icon: '🌸',
        animeOnly: true,
        getUrl: (id, tmdb, imdb, mal, s, e) => {
            if (!mal) return null;
            return s !== undefined && e !== undefined
                ? `https://anime.vidsrc.to/embed/anime/${mal}/${s}/${e}`
                : `https://anime.vidsrc.to/embed/anime/${mal}`;
        }
    }
];

export default function StreamingPlayer({ movie, seasons = [] }: StreamingPlayerProps) {
    const isSeriesOrAnime = movie.type === 'series' || movie.type === 'anime';

    // Stream state
    const [currentSeasonNum, setCurrentSeasonNum] = useState<number>(1);
    const [currentEpisodeNum, setCurrentEpisodeNum] = useState<number>(1);
    const [activeServerId, setActiveServerId] = useState<string>('');
    const [sandboxMode, setSandboxMode] = useState<boolean>(true);

    const sortedSeasons = [...seasons].sort((a, b) => a.season_number - b.season_number);
    const activeSeason = sortedSeasons.find(s => s.season_number === currentSeasonNum) || sortedSeasons[0];
    const episodes = activeSeason?.episodes?.sort((a, b) => a.episode_number - b.episode_number) || [];
    const activeEpisode = episodes.find(e => e.episode_number === currentEpisodeNum) || episodes[0];

    // Determine if there is a custom override link
    const getCustomUrl = (): string | null => {
        if (!isSeriesOrAnime) {
            return movie.streaming_url || null;
        }
        return activeEpisode?.streaming_url || null;
    };

    const customUrl = getCustomUrl();

    // Available Servers list
    const availableServers = SERVERS.filter(srv => {
        if (srv.animeOnly && movie.type !== 'anime') return false;
        if (srv.movieOnly && isSeriesOrAnime) return false;
        return true;
    });

    // Auto-select server on mount or when custom link changes
    useEffect(() => {
        if (customUrl) {
            setActiveServerId('custom');
        } else if (availableServers.length > 0) {
            setActiveServerId(availableServers[0].id);
        }
    }, [customUrl, movie.id, currentEpisodeNum, currentSeasonNum]);

    // Build the final iframe src
    const getEmbedUrl = (): string => {
        if (activeServerId === 'custom') {
            return customUrl || '';
        }
        const server = availableServers.find(s => s.id === activeServerId);
        if (!server) return '';

        return isSeriesOrAnime
            ? server.getUrl(movie.id, movie.tmdb_id || undefined, movie.imdb_id || undefined, movie.mal_id || undefined, currentSeasonNum, currentEpisodeNum) || ''
            : server.getUrl(movie.id, movie.tmdb_id || undefined, movie.imdb_id || undefined, movie.mal_id || undefined) || '';
    };

    const embedUrl = getEmbedUrl();

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
                    {customUrl && (
                        <button
                            onClick={() => setActiveServerId('custom')}
                            className={`px-4 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                                activeServerId === 'custom'
                                    ? 'bg-purple-600 text-white shadow-lg shadow-purple-900/30'
                                    : 'bg-dark-850 text-gray-400 hover:bg-dark-750 hover:text-white'
                            }`}
                        >
                            🤖 Server Agent
                        </button>
                    )}
                    {availableServers.map((srv) => {
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

            {/* Video Container (Responsive Iframe) */}
            <div className="relative w-full aspect-video bg-black rounded-2xl overflow-hidden shadow-2xl border border-white/10 group">
                {embedUrl ? (
                    <iframe
                        src={embedUrl}
                        className="absolute inset-0 w-full h-full"
                        allowFullScreen
                        // If sandboxMode is enabled, exclude allow-popups and allow-top-navigation to block ads
                        sandbox={
                            sandboxMode && activeServerId !== 'custom'
                                ? "allow-scripts allow-same-origin allow-forms"
                                : undefined
                        }
                        referrerPolicy="no-referrer"
                    />
                ) : (
                    <div className="absolute inset-0 flex flex-col items-center justify-center text-gray-400 p-6">
                        <span className="text-3xl animate-bounce mb-2">🎞️</span>
                        <p className="font-bold">Select Server or Episode to start playback</p>
                    </div>
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
