'use client';

import { useState, useEffect, useCallback, useMemo, useRef } from 'react';

interface Game {
    id: string;
    title: string;
    category: string;
    categories: string[];
    thumbnailUrl: string;
    thumbnailUrl100?: string;
    url: string;
    description: string;
    orientation?: string;
    rkScore?: number;
    featured?: boolean;
}

// ────────────────────────────────────────────────────────────
// PREMIUM VECTOR SVG CATEGORY ICONS
// ────────────────────────────────────────────────────────────
export function GameCategorySvgIcon({ category, className = 'w-3.5 h-3.5' }: { category: string; className?: string }) {
    const c = (category || '').toLowerCase();

    if (c === 'all') {
        return (
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" className={className}>
                <rect x="3" y="3" width="7" height="7" rx="1.5" />
                <rect x="14" y="3" width="7" height="7" rx="1.5" />
                <rect x="14" y="14" width="7" height="7" rx="1.5" />
                <rect x="3" y="14" width="7" height="7" rx="1.5" />
            </svg>
        );
    }
    if (c.includes('adventure') || c.includes('action')) {
        return (
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
                <polygon points="14.5 17.5 3 6 6 3 17.5 14.5" />
                <line x1="13" y1="19" x2="19" y2="13" />
                <line x1="16" y1="16" x2="20" y2="20" />
                <line x1="19" y1="21" x2="21" y2="19" />
                <polyline points="14.5 6.5 18 3 21 6 17.5 9.5" />
            </svg>
        );
    }
    if (c.includes('arcade')) {
        return (
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
                <rect x="4" y="2" width="16" height="20" rx="3" />
                <rect x="7" y="6" width="10" height="7" rx="1" fill="currentColor" fillOpacity="0.2" />
                <circle cx="9" cy="17" r="1.5" fill="currentColor" />
                <circle cx="15" cy="17" r="1.5" fill="currentColor" />
                <line x1="12" y1="15" x2="12" y2="19" />
            </svg>
        );
    }
    if (c.includes('puzzle') || c.includes('brain')) {
        return (
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
                <path d="M19.439 7.85c0-1.571-1.274-2.85-2.846-2.85a2.85 2.85 0 0 0-2.846 2.85v.57H9.253v-.57a2.85 2.85 0 0 0-5.693 0v4.757h.57a2.85 2.85 0 0 1 0 5.693h-.57V19a2 2 0 0 0 2 2h4.757v-.57a2.85 2.85 0 0 1 5.693 0V21H19a2 2 0 0 0 2-2v-4.757h-.561a2.85 2.85 0 0 1 0-5.693h.561V7.85h-.561Z" />
            </svg>
        );
    }
    if (c.includes('sport') || c.includes('racing')) {
        return (
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
                <path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z" />
                <line x1="4" y1="22" x2="4" y2="15" />
            </svg>
        );
    }
    if (c.includes('strategy')) {
        return (
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
                <path d="M5 20h14" />
                <path d="M7 20v-4h10v4" />
                <path d="M7 16l2-8h6l2 8" />
                <path d="M9 8V4h6v4" />
                <path d="M12 4V2" />
            </svg>
        );
    }
    if (c.includes('classic') || c.includes('retro')) {
        return (
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
                <rect x="2" y="6" width="20" height="12" rx="4" />
                <line x1="6" y1="12" x2="10" y2="12" />
                <line x1="8" y1="10" x2="8" y2="14" />
                <circle cx="15" cy="13" r="1" fill="currentColor" />
                <circle cx="18" cy="11" r="1" fill="currentColor" />
            </svg>
        );
    }
    if (c.includes('board') || c.includes('card')) {
        return (
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
                <rect x="3" y="3" width="18" height="18" rx="3" />
                <circle cx="8.5" cy="8.5" r="1.5" fill="currentColor" />
                <circle cx="15.5" cy="8.5" r="1.5" fill="currentColor" />
                <circle cx="12" cy="12" r="1.5" fill="currentColor" />
                <circle cx="8.5" cy="15.5" r="1.5" fill="currentColor" />
                <circle cx="15.5" cy="15.5" r="1.5" fill="currentColor" />
            </svg>
        );
    }
    if (c.includes('junior') || c.includes('kid')) {
        return (
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
                <circle cx="12" cy="12" r="9" />
                <path d="M9 10h.01M15 10h.01" strokeWidth="3" />
                <path d="M9.5 15a3.5 3.5 0 0 0 5 0" />
            </svg>
        );
    }

    // Default Gamepad
    return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
            <line x1="6" y1="12" x2="10" y2="12" />
            <line x1="8" y1="10" x2="8" y2="14" />
            <line x1="15" y1="13" x2="15.01" y2="13" strokeWidth="3" />
            <line x1="18" y1="11" x2="18.01" y2="11" strokeWidth="3" />
            <rect x="2" y="6" width="20" height="12" rx="4" />
        </svg>
    );
}

const CATEGORIES = [
    { id: 'All', label: 'All Games' },
    { id: 'Adventure', label: 'Action & Adventure' },
    { id: 'Arcade', label: 'Classic Arcade' },
    { id: 'Puzzles', label: 'Puzzles & Brain' },
    { id: 'Sports', label: 'Sports & Racing' },
    { id: 'Strategy', label: 'Strategy' },
    { id: 'Classics', label: 'Retro Classics' },
    { id: 'Board', label: 'Board Games' },
    { id: 'Junior', label: 'Kids & Junior' },
];

function SafeGameThumb({
    src,
    alt,
    className = 'w-full h-full object-cover',
}: {
    src?: string;
    alt: string;
    className?: string;
}) {
    const [hasError, setHasError] = useState(false);

    if (hasError || !src) {
        return (
            <div className="w-full h-full bg-gradient-to-br from-violet-950/60 via-[#181428] to-black flex flex-col items-center justify-center p-2 text-center select-none">
                <GameCategorySvgIcon category="all" className="w-6 h-6 text-violet-400 mb-1" />
                <span className="text-[10px] font-bold text-gray-400 truncate max-w-full px-1">{alt}</span>
            </div>
        );
    }

    return (
        // eslint-disable-next-line @next/next/no-img-element
        <img
            src={src}
            alt={alt}
            loading="lazy"
            onError={() => setHasError(true)}
            className={className}
        />
    );
}

export default function GamesClient() {
    const [games, setGames] = useState<Game[]>([]);
    const [loading, setLoading] = useState(true);
    const [page, setPage] = useState(1);
    const [totalGames, setTotalGames] = useState(1000);
    const [loadingMore, setLoadingMore] = useState(false);
    const [categoryCounts, setCategoryCounts] = useState<Record<string, number>>({});
    const [selectedCategory, setSelectedCategory] = useState('All');
    const [searchQuery, setSearchQuery] = useState('');
    const [sortBy, setSortBy] = useState<'popular' | 'featured' | 'name'>('popular');
    const [activeTab, setActiveTab] = useState<'all' | 'favorites' | 'recent'>('all');

    // Active Game in Theater Modal
    const [activeGame, setActiveGame] = useState<Game | null>(null);
    const [isTheaterFullscreen, setIsTheaterFullscreen] = useState(false);
    const [copiedShare, setCopiedShare] = useState(false);
    const [iframeLoading, setIframeLoading] = useState(true);
    const [showInfoDrawer, setShowInfoDrawer] = useState(false);
    const [isDockExpanded, setIsDockExpanded] = useState(false);
    const [isReloading, setIsReloading] = useState(false);
    const playerContainerRef = useRef<HTMLDivElement>(null);
    const iframeRef = useRef<HTMLIFrameElement>(null);

    // Favorites & Recent in localStorage
    const [favorites, setFavorites] = useState<string[]>([]);
    const [recentIds, setRecentIds] = useState<string[]>([]);

    useEffect(() => {
        try {
            const favStr = localStorage.getItem('nexiplay_favorite_games');
            if (favStr) setFavorites(JSON.parse(favStr));

            const recStr = localStorage.getItem('nexiplay_recent_games');
            if (recStr) setRecentIds(JSON.parse(recStr));
        } catch (_) {}
    }, []);

    // Lock body scroll when activeGame modal is open to ensure seamless mobile & desktop play
    useEffect(() => {
        if (activeGame) {
            const originalOverflow = document.body.style.overflow;
            document.body.style.overflow = 'hidden';
            return () => {
                document.body.style.overflow = originalOverflow;
            };
        }
    }, [activeGame]);

    const loadGames = useCallback(async (cat: string, q: string, sort: string) => {
        setLoading(true);
        setPage(1);
        try {
            const params = new URLSearchParams();
            if (cat && cat !== 'All') params.set('category', cat);
            if (q.trim()) params.set('q', q.trim());
            params.set('sort', sort);
            params.set('page', '1');
            params.set('limit', '60');

            const res = await fetch(`/api/games?${params.toString()}`);
            const data = await res.json();
            if (data.success && Array.isArray(data.games)) {
                setGames(data.games);
                if (typeof data.total === 'number') setTotalGames(data.total);
                if (data.categoryCounts) setCategoryCounts(data.categoryCounts);
            } else {
                setGames([]);
            }
        } catch (err) {
            console.error('Error fetching games:', err);
            setGames([]);
        } finally {
            setLoading(false);
        }
    }, []);

    const handleLoadMore = async () => {
        if (loadingMore || loading) return;
        const nextPage = page + 1;
        setLoadingMore(true);
        try {
            const params = new URLSearchParams();
            if (selectedCategory && selectedCategory !== 'All') params.set('category', selectedCategory);
            if (searchQuery.trim()) params.set('q', searchQuery.trim());
            params.set('sort', sortBy);
            params.set('page', String(nextPage));
            params.set('limit', '60');

            const res = await fetch(`/api/games?${params.toString()}`);
            const data = await res.json();
            if (data.success && Array.isArray(data.games) && data.games.length > 0) {
                setGames(prev => {
                    const existingIds = new Set(prev.map(g => g.id));
                    const newOnes = data.games.filter((g: Game) => !existingIds.has(g.id));
                    return [...prev, ...newOnes];
                });
                setPage(nextPage);
                if (typeof data.total === 'number') setTotalGames(data.total);
            }
        } catch (err) {
            console.error('Error loading more games:', err);
        } finally {
            setLoadingMore(false);
        }
    };

    useEffect(() => {
        const timeoutId = setTimeout(() => {
            loadGames(selectedCategory, searchQuery, sortBy);
        }, 200);
        return () => clearTimeout(timeoutId);
    }, [selectedCategory, searchQuery, sortBy, loadGames]);

    const handlePlayGame = (game: Game) => {
        setActiveGame(game);
        setIframeLoading(true);
        setShowInfoDrawer(false);
        try {
            const nextRecent = [game.id, ...recentIds.filter(id => id !== game.id)].slice(0, 20);
            setRecentIds(nextRecent);
            localStorage.setItem('nexiplay_recent_games', JSON.stringify(nextRecent));
        } catch (_) {}
    };

    const toggleFavorite = (e: React.MouseEvent, gameId: string) => {
        e.stopPropagation();
        const next = favorites.includes(gameId)
            ? favorites.filter(id => id !== gameId)
            : [...favorites, gameId];
        setFavorites(next);
        try {
            localStorage.setItem('nexiplay_favorite_games', JSON.stringify(next));
        } catch (_) {}
    };

    const toggleFullscreen = () => {
        if (!playerContainerRef.current) return;
        if (!document.fullscreenElement) {
            playerContainerRef.current.requestFullscreen().then(() => {
                setIsTheaterFullscreen(true);
            }).catch(() => {
                setIsTheaterFullscreen(prev => !prev);
            });
        } else {
            document.exitFullscreen().then(() => {
                setIsTheaterFullscreen(false);
            }).catch(() => {
                setIsTheaterFullscreen(false);
            });
        }
    };

    const handleReloadGame = () => {
        if (!activeGame) return;
        setIsReloading(true);
        setIframeLoading(true);
        if (iframeRef.current) {
            iframeRef.current.src = activeGame.url;
        }
        setTimeout(() => setIsReloading(false), 600);
    };

    // Keyboard shortcuts: ESC to close, F to fullscreen, R to reload
    useEffect(() => {
        if (!activeGame) return;
        const handleKeyDown = (e: KeyboardEvent) => {
            const tag = (e.target as HTMLElement)?.tagName;
            if (['INPUT', 'TEXTAREA'].includes(tag)) return;

            if (e.key === 'Escape') {
                if (showInfoDrawer) {
                    setShowInfoDrawer(false);
                } else {
                    setActiveGame(null);
                }
            } else if (e.key.toLowerCase() === 'f') {
                toggleFullscreen();
            } else if (e.key.toLowerCase() === 'r') {
                handleReloadGame();
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [activeGame, showInfoDrawer]);

    useEffect(() => {
        const onFsChange = () => {
            setIsTheaterFullscreen(!!document.fullscreenElement);
        };
        document.addEventListener('fullscreenchange', onFsChange);
        return () => document.removeEventListener('fullscreenchange', onFsChange);
    }, []);

    const handleShare = (game: Game) => {
        const shareUrl = `${window.location.origin}/games?play=${encodeURIComponent(game.title)}`;
        navigator.clipboard.writeText(shareUrl).then(() => {
            setCopiedShare(true);
            setTimeout(() => setCopiedShare(false), 2500);
        }).catch(() => {});
    };

    // Calculate dynamic genre counts
    const genreCounts = useMemo(() => {
        const counts: Record<string, number> = {};
        games.forEach((g) => {
            const cat = g.category || 'Arcade';
            counts[cat] = (counts[cat] || 0) + 1;
        });
        return counts;
    }, [games]);

    const displayedGames = useMemo(() => {
        if (activeTab === 'favorites') {
            return games.filter(g => favorites.includes(g.id));
        }
        if (activeTab === 'recent') {
            return recentIds
                .map(id => games.find(g => g.id === id))
                .filter((g): g is Game => Boolean(g));
        }
        return games;
    }, [games, activeTab, favorites, recentIds]);

    // Recommended next games list for the cinema theater dock
    const moreGames = useMemo(() => {
        if (!activeGame) return [];
        return games.filter(g => g.id !== activeGame.id).slice(0, 20);
    }, [games, activeGame]);

    return (
        <div className="min-h-screen bg-[#0A0812] text-[#F4F0FA] pt-24 md:pt-28 pb-32">
            <div className="container mx-auto px-4 max-w-6xl">
                {/* ──────────────────────────────────────────────────────── */}
                {/* Nexiplay Brand Header (Clean Modern Bold Sans-Serif)     */}
                {/* ──────────────────────────────────────────────────────── */}
                <div className="space-y-4 mb-8">
                    <div className="inline-flex items-center gap-2.5 px-3 py-1 rounded-full bg-[#9273F5]/10 border border-[#9273F5]/25 text-[#B09AFF] text-[11px] font-bold uppercase tracking-wider">
                        <span className="w-2 h-2 rounded-full bg-[#9273F5] animate-pulse" />
                        <span>Nexiplay Gaming Hub • 1,000+ HTML5 Games</span>
                    </div>

                    <div className="space-y-2">
                        <h1 className="text-3xl sm:text-4xl md:text-5xl font-black tracking-tight text-white">
                            Instant Play <span className="bg-gradient-to-r from-[#9273F5] via-[#B09AFF] to-[#57D6C0] bg-clip-text text-transparent">Online Games</span>
                        </h1>
                        <p className="text-sm sm:text-base text-[#ADA6B9] max-w-2xl font-normal leading-relaxed">
                            Play 1,000+ high-speed browser games instantly. Zero installs, zero downloads, totally free on mobile, tablet & PC with smooth touch and gamepad controls.
                        </p>
                    </div>

                    {/* Search & Sort Bar */}
                    <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 pt-2">
                        <div className="relative flex-1 max-w-md">
                            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-[#9273F5]">
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 1114 0z" />
                                </svg>
                            </div>
                            <input
                                type="text"
                                placeholder="Search 1,000+ games (e.g. moto, 2048, guns)..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="w-full pl-11 pr-10 py-3 bg-[#17141F]/80 border border-white/10 rounded-2xl text-white placeholder-[#ADA6B9]/60 text-sm focus:outline-none focus:border-[#9273F5] focus:ring-2 focus:ring-[#9273F5]/20 transition-all shadow-inner"
                            />
                            {searchQuery && (
                                <button
                                    onClick={() => setSearchQuery('')}
                                    className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-gray-400 hover:text-white text-xs"
                                >
                                    ✕
                                </button>
                            )}
                        </div>

                        {/* Sort Selector */}
                        <div className="relative shrink-0">
                            <select
                                value={sortBy}
                                onChange={(e) => setSortBy(e.target.value as any)}
                                className="px-4 py-3 rounded-2xl bg-[#17141F]/80 border border-white/10 text-white text-xs font-bold focus:outline-none focus:border-[#9273F5] cursor-pointer appearance-none pr-8 transition-colors"
                            >
                                <option value="popular">Most Popular</option>
                                <option value="featured">Featured Hits</option>
                                <option value="name">Title A-Z</option>
                            </select>
                            <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-3 text-[#9273F5]">
                                <svg className="w-3 h-3 fill-current" viewBox="0 0 24 24">
                                    <path d="M7 10l5 5 5-5z" />
                                </svg>
                            </div>
                        </div>
                    </div>
                </div>

                {/* ──────────────────────────────────────────────────────── */}
                {/* Two Filter Rows (COLLECTION & GENRE with SVG Icons)      */}
                {/* ──────────────────────────────────────────────────────── */}
                <div className="space-y-3.5 pt-2 border-t border-white/10 mb-8">
                    {/* Row 1: COLLECTION Filter (All Games, Favorites, Recently Played) */}
                    <div className="flex items-center gap-3 overflow-x-auto pb-1.5 scrollbar-hide">
                        <span className="text-[10px] font-black uppercase tracking-[0.2em] text-[#9273F5] shrink-0">
                            COLLECTION
                        </span>
                        <div className="flex items-center gap-2">
                            <button
                                onClick={() => setActiveTab('all')}
                                className={`px-4 py-1.5 rounded-full text-xs font-bold whitespace-nowrap transition-all duration-200 flex items-center gap-2 shrink-0 ${
                                    activeTab === 'all'
                                        ? 'bg-gradient-to-r from-[#9273F5] to-[#5C46B2] text-white shadow-[0_4px_16px_rgba(146,115,245,0.45)] border border-violet-400/30 scale-105'
                                        : 'bg-[#17141F]/80 text-[#ADA6B9] hover:text-white hover:bg-[#211D2D] border border-white/10'
                                }`}
                            >
                                <GameCategorySvgIcon category="all" className="w-3.5 h-3.5" />
                                <span>All Games</span>
                                <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-black ${activeTab === 'all' ? 'bg-white/25 text-white' : 'bg-white/5 text-gray-400'}`}>
                                    {totalGames || games.length}
                                </span>
                            </button>

                            <button
                                onClick={() => setActiveTab('favorites')}
                                className={`px-4 py-1.5 rounded-full text-xs font-bold whitespace-nowrap transition-all duration-200 flex items-center gap-2 shrink-0 ${
                                    activeTab === 'favorites'
                                        ? 'bg-gradient-to-r from-[#9273F5] to-[#5C46B2] text-white shadow-[0_4px_16px_rgba(146,115,245,0.45)] border border-violet-400/30 scale-105'
                                        : 'bg-[#17141F]/80 text-[#ADA6B9] hover:text-white hover:bg-[#211D2D] border border-white/10'
                                }`}
                            >
                                <svg className={`w-3.5 h-3.5 ${activeTab === 'favorites' ? 'fill-white' : 'fill-rose-500'}`} viewBox="0 0 24 24">
                                    <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/>
                                </svg>
                                <span>Favorites</span>
                                {favorites.length > 0 && (
                                    <span className="text-[10px] px-1.5 py-0.2 rounded-full font-black bg-rose-500 text-white">
                                        {favorites.length}
                                    </span>
                                )}
                            </button>

                            <button
                                onClick={() => setActiveTab('recent')}
                                className={`px-4 py-1.5 rounded-full text-xs font-bold whitespace-nowrap transition-all duration-200 flex items-center gap-2 shrink-0 ${
                                    activeTab === 'recent'
                                        ? 'bg-gradient-to-r from-[#9273F5] to-[#5C46B2] text-white shadow-[0_4px_16px_rgba(146,115,245,0.45)] border border-violet-400/30 scale-105'
                                        : 'bg-[#17141F]/80 text-[#ADA6B9] hover:text-white hover:bg-[#211D2D] border border-white/10'
                                }`}
                            >
                                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <circle cx="12" cy="12" r="10" strokeWidth="2" />
                                    <polyline points="12 6 12 12 16 14" strokeWidth="2" />
                                </svg>
                                <span>Recently Played</span>
                                {recentIds.length > 0 && (
                                    <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-black ${activeTab === 'recent' ? 'bg-white/25 text-white' : 'bg-white/5 text-gray-400'}`}>
                                        {recentIds.length}
                                    </span>
                                )}
                            </button>
                        </div>
                    </div>

                    {/* Row 2: GENRE Filter with bespoke SVG icons */}
                    {activeTab === 'all' && (
                        <div className="flex items-center gap-3 overflow-x-auto pb-1.5 scrollbar-hide">
                            <span className="text-[10px] font-black uppercase tracking-[0.2em] text-[#9273F5] shrink-0">
                                GENRE
                            </span>
                            <div className="flex items-center gap-2">
                                {CATEGORIES.map((cat) => {
                                    const isSelected = selectedCategory === cat.id;
                                    const count = cat.id === 'All' ? totalGames : categoryCounts[cat.id] || genreCounts[cat.id] || 0;

                                    return (
                                        <button
                                            key={cat.id}
                                            onClick={() => setSelectedCategory(cat.id)}
                                            className={`px-3.5 py-1.5 rounded-full text-xs font-bold whitespace-nowrap transition-all duration-200 flex items-center gap-2 shrink-0 ${
                                                isSelected
                                                    ? 'bg-gradient-to-r from-[#9273F5] to-[#5C46B2] text-white shadow-[0_4px_16px_rgba(146,115,245,0.4)] border border-violet-400/30'
                                                    : 'bg-[#17141F]/80 text-[#ADA6B9] hover:text-white hover:bg-[#211D2D] border border-white/10 hover:border-violet-500/25'
                                            }`}
                                        >
                                            <GameCategorySvgIcon category={cat.id} className={`w-3.5 h-3.5 shrink-0 ${isSelected ? 'text-white' : 'text-[#9273F5]'}`} />
                                            <span>{cat.label}</span>
                                            {count > 0 && (
                                                <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-black ${isSelected ? 'bg-white/25 text-white' : 'bg-white/5 text-gray-400'}`}>
                                                    {count}
                                                </span>
                                            )}
                                        </button>
                                    );
                                })}
                            </div>
                        </div>
                    )}
                </div>

                {/* ──────────────────────────────────────────────────────── */}
                {/* Horizontal Game Cards (5 columns - Matches Live TV Style) */}
                {/* ──────────────────────────────────────────────────────── */}
                <div className="space-y-4">
                    <div className="flex items-center justify-between border-b border-white/10 pb-3">
                        <h3 className="text-base font-bold text-white flex items-center gap-2">
                            <GameCategorySvgIcon category={selectedCategory} className="w-4 h-4 text-[#9273F5]" />
                            <span>
                                {activeTab === 'favorites'
                                    ? 'Favorite Games'
                                    : activeTab === 'recent'
                                    ? 'Recently Played'
                                    : selectedCategory === 'All'
                                    ? 'All Games'
                                    : `${selectedCategory} Games`}
                            </span>
                        </h3>
                        <span className="text-xs text-[#ADA6B9] font-mono">
                            Showing {displayedGames.length} of {totalGames} games
                        </span>
                    </div>

                    {loading ? (
                        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
                            {[...Array(15)].map((_, i) => (
                                <div key={i} className="h-20 rounded-2xl bg-[#171422] animate-pulse" />
                            ))}
                        </div>
                    ) : displayedGames.length > 0 ? (
                        <>
                            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3 sm:gap-3.5">
                            {displayedGames.map((game) => {
                                const isFav = favorites.includes(game.id);
                                const rating = ((game.rkScore || 0.82) * 5).toFixed(1);

                                return (
                                    <div
                                        key={game.id}
                                        onClick={() => handlePlayGame(game)}
                                        className="p-3 rounded-2xl bg-[#14121E]/95 hover:bg-[#1E1933] border border-white/[0.08] hover:border-[#9273F5]/45 transition-all duration-300 shadow-md hover:shadow-[0_8px_25px_rgba(146,115,245,0.2)] hover:-translate-y-0.5 group cursor-pointer flex items-center gap-3.5 relative overflow-hidden"
                                    >
                                        {/* Thumbnail Container */}
                                        <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-xl bg-black/60 border border-white/10 group-hover:border-[#9273F5]/40 flex items-center justify-center shrink-0 overflow-hidden shadow-inner relative">
                                            <SafeGameThumb src={game.thumbnailUrl} alt={game.title} />

                                            {/* Play Overlay */}
                                            <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                                <div className="w-7 h-7 rounded-full bg-[#9273F5] text-white flex items-center justify-center text-xs shadow-lg shadow-violet-900/60 transform group-hover:scale-110 transition-transform">
                                                    ▶
                                                </div>
                                            </div>
                                        </div>

                                        {/* Details */}
                                        <div className="flex-1 min-w-0">
                                            <h4 className="text-sm font-bold text-white group-hover:text-[#B09AFF] transition-colors truncate">
                                                {game.title}
                                            </h4>
                                            <div className="flex items-center gap-2 mt-1 text-[11px] text-[#ADA6B9] font-medium">
                                                <span className="text-[10px] font-black uppercase tracking-wider px-1.5 py-0.2 rounded bg-[#9273F5]/15 text-[#B09AFF] border border-[#9273F5]/25">
                                                    {game.category || 'Arcade'}
                                                </span>
                                                <span className="flex items-center gap-1 text-amber-400 font-bold text-[10px]">
                                                    <svg className="w-2.5 h-2.5 fill-current" viewBox="0 0 24 24">
                                                        <path d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z" />
                                                    </svg>
                                                    <span>{rating}</span>
                                                </span>
                                            </div>
                                        </div>

                                        {/* Favorite Toggle Button */}
                                        <button
                                            onClick={(e) => toggleFavorite(e, game.id)}
                                            className={`p-1.5 rounded-lg text-xs transition-all shrink-0 ${
                                                isFav
                                                    ? 'text-rose-500 scale-110'
                                                    : 'text-gray-400 opacity-0 group-hover:opacity-100 hover:text-white hover:bg-white/10'
                                            }`}
                                            title={isFav ? 'Remove from favorites' : 'Add to favorites'}
                                        >
                                            <svg className={`w-4 h-4 ${isFav ? 'fill-rose-500' : 'fill-none stroke-current'}`} viewBox="0 0 24 24">
                                                <path strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/>
                                            </svg>
                                        </button>
                                    </div>
                                );
                            })}
                        </div>

                        {/* Load More Button */}
                        {activeTab === 'all' && !searchQuery.trim() && displayedGames.length < totalGames && (
                            <div className="pt-8 pb-4 text-center">
                                <button
                                    onClick={handleLoadMore}
                                    disabled={loadingMore}
                                    className="px-8 py-3.5 rounded-2xl bg-gradient-to-r from-[#9273F5] via-[#7B59F0] to-[#5C46B2] hover:from-[#A284F7] hover:to-[#6E53C7] text-white font-extrabold text-sm shadow-[0_8px_30px_rgba(146,115,245,0.35)] hover:shadow-[0_12px_40px_rgba(146,115,245,0.5)] hover:scale-105 active:scale-95 transition-all duration-300 border border-violet-400/30 flex items-center gap-2.5 mx-auto cursor-pointer disabled:opacity-50"
                                >
                                    {loadingMore ? (
                                        <>
                                            <div className="w-4 h-4 rounded-full border-2 border-white border-t-transparent animate-spin" />
                                            <span>Loading More Games...</span>
                                        </>
                                    ) : (
                                        <>
                                            <GameCategorySvgIcon category="all" className="w-4 h-4 text-white" />
                                            <span>Load More Games ({displayedGames.length} of {totalGames})</span>
                                            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}>
                                                <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                                            </svg>
                                        </>
                                    )}
                                </button>
                                <p className="text-[11px] text-[#ADA6B9] mt-2 font-medium">
                                    Showing {displayedGames.length} out of {totalGames} games available
                                </p>
                            </div>
                        )}
                        </>
                    ) : (
                        <div className="p-16 text-center rounded-3xl bg-[#14121E] border border-white/10 space-y-3">
                            <div className="w-16 h-16 mx-auto rounded-2xl bg-white/5 flex items-center justify-center text-3xl">
                                <GameCategorySvgIcon category="all" className="w-8 h-8 text-[#9273F5]" />
                            </div>
                            <h3 className="text-base font-bold text-white">No games found</h3>
                            <p className="text-xs text-[#ADA6B9] max-w-sm mx-auto">
                                {activeTab === 'favorites'
                                    ? 'You haven’t added any favorite games yet. Click the heart icon on any game to save it!'
                                    : 'Try searching for something else or explore another category.'}
                            </p>
                            {searchQuery && (
                                <button
                                    onClick={() => setSearchQuery('')}
                                    className="px-4 py-2 rounded-xl bg-gradient-to-r from-[#9273F5] to-[#5C46B2] text-white text-xs font-bold shadow-md shadow-violet-950/40"
                                >
                                    Clear Search
                                </button>
                            )}
                        </div>
                    )}
                </div>
            </div>

            {/* ──────────────────────────────────────────────────────────── */}
            {/* Nexiplay Ultra Cinema Game Theater Modal                     */}
            {/* ──────────────────────────────────────────────────────────── */}
            {activeGame && (
                <div
                    className="fixed inset-0 z-[120] bg-black/90 backdrop-blur-xl flex flex-col md:p-3 lg:p-6 items-center justify-center animate-fade-in overscroll-contain select-none"
                    role="dialog"
                    aria-modal="true"
                    aria-labelledby="active-game-title"
                >
                    {/* Ambient Glow Aura (Desktop) */}
                    <div className="absolute -inset-10 bg-gradient-to-tr from-[#9273F5]/25 via-[#57D6C0]/10 to-transparent blur-3xl pointer-events-none -z-10 hidden md:block" />

                    {/* Modal Screen Container (Full Viewport on Mobile, Cinema Box on Desktop) */}
                    <div
                        ref={playerContainerRef}
                        className={`relative w-full h-[100dvh] md:h-[88vh] md:max-w-6xl md:rounded-3xl bg-[#090710] border-0 md:border md:border-[#9273F5]/35 md:shadow-[0_25px_80px_rgba(0,0,0,0.9),0_0_50px_rgba(146,115,245,0.22)] overflow-hidden flex flex-col transition-all duration-300 ${
                            isTheaterFullscreen ? '!fixed !inset-0 !w-screen !h-[100dvh] !max-w-none !rounded-none !border-none !z-[999]' : ''
                        }`}
                    >
                        {/* Top HUD Controller Bar */}
                        <div className="px-2.5 py-2 sm:px-5 sm:py-3 bg-[#110D1D]/95 backdrop-blur-xl border-b border-white/[0.08] flex items-center justify-between gap-2 sm:gap-3 shrink-0 z-20">
                            {/* Left: Close/Back & Game Identity */}
                            <div className="flex items-center gap-2 sm:gap-3 min-w-0 flex-1">
                                {/* Close / Exit Button */}
                                <button
                                    onClick={() => setActiveGame(null)}
                                    className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-white/5 hover:bg-rose-500/20 text-gray-400 hover:text-rose-300 border border-white/10 hover:border-rose-500/30 flex items-center justify-center transition-all shrink-0 active:scale-95"
                                    title="Close Game (Esc)"
                                    aria-label="Close Game"
                                >
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M6 18L18 6M6 6l12 12" />
                                    </svg>
                                </button>

                                {/* Game Thumbnail - STRICTLY CONTROLLED SIZE */}
                                <div className="w-9 h-9 sm:w-10 sm:h-10 min-w-[36px] max-w-[36px] h-[36px] max-h-[36px] rounded-xl overflow-hidden bg-black/60 border border-[#9273F5]/40 shadow-[0_0_12px_rgba(146,115,245,0.3)] shrink-0 relative flex items-center justify-center p-0.5">
                                    <SafeGameThumb src={activeGame.thumbnailUrl} alt={activeGame.title} />
                                </div>

                                {/* Title & Badges */}
                                <div className="min-w-0 flex-1">
                                    <h3 id="active-game-title" className="font-black text-xs sm:text-base text-white truncate tracking-tight">
                                        {activeGame.title}
                                    </h3>
                                    <div className="flex items-center gap-1.5 sm:gap-2 mt-0.5">
                                        {/* Category Badge - shrink-0 prevents compressing */}
                                        <span className="shrink-0 px-2 py-0.5 rounded-md text-[9px] sm:text-[10px] font-black uppercase tracking-wider bg-gradient-to-r from-[#9273F5]/20 to-[#57D6C0]/20 text-[#C4B5FD] border border-[#9273F5]/30 flex items-center gap-1">
                                            <GameCategorySvgIcon category={activeGame.category} className="w-2.5 h-2.5 text-[#57D6C0] shrink-0" />
                                            <span>{activeGame.category || 'Arcade'}</span>
                                        </span>

                                        {/* Score Badge - shrink-0 prevents overlapping */}
                                        <span className="shrink-0 inline-flex items-center gap-1 text-[9px] sm:text-[10px] font-bold text-amber-400 bg-amber-400/10 px-1.5 py-0.5 rounded border border-amber-400/20">
                                            <svg className="w-2.5 h-2.5 fill-current shrink-0" viewBox="0 0 24 24">
                                                <path d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z" />
                                            </svg>
                                            <span>{((activeGame.rkScore || 0.88) * 5).toFixed(1)}</span>
                                        </span>

                                        {/* Live Gaming Indicator (Desktop & Tablet) */}
                                        <span className="hidden xs:inline-flex shrink-0 items-center gap-1 text-[9px] font-black uppercase tracking-wider text-emerald-400 pl-0.5">
                                            <span className="relative flex h-1.5 w-1.5">
                                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                                                <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-500" />
                                            </span>
                                            <span>Playing</span>
                                        </span>
                                    </div>
                                </div>
                            </div>

                            {/* Right: Gaming Action Controls HUD */}
                            <div className="flex items-center gap-1 sm:gap-2 shrink-0">
                                {/* Info / Controls Drawer Toggle */}
                                <button
                                    onClick={() => setShowInfoDrawer(prev => !prev)}
                                    className={`w-8 h-8 sm:w-9 sm:h-9 rounded-xl border flex items-center justify-center transition-all ${
                                        showInfoDrawer
                                            ? 'bg-[#9273F5]/25 border-[#9273F5] text-white shadow-[0_0_12px_rgba(146,115,245,0.4)]'
                                            : 'bg-white/5 hover:bg-white/10 border-white/10 text-gray-300 hover:text-white'
                                    }`}
                                    title="Game Controls & Info"
                                    aria-label="Game Info"
                                >
                                    <svg className="w-3.5 h-3.5 sm:w-4 sm:h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <circle cx="12" cy="12" r="10" strokeWidth="2" />
                                        <line x1="12" y1="16" x2="12" y2="12" strokeWidth="2" strokeLinecap="round" />
                                        <circle cx="12" cy="8" r="1" fill="currentColor" />
                                    </svg>
                                </button>

                                {/* Favorite Button */}
                                <button
                                    onClick={(e) => toggleFavorite(e, activeGame.id)}
                                    className={`w-8 h-8 sm:w-9 sm:h-9 rounded-xl border flex items-center justify-center transition-all ${
                                        favorites.includes(activeGame.id)
                                            ? 'bg-rose-500/20 border-rose-500/50 text-rose-500 shadow-[0_0_14px_rgba(244,63,94,0.4)] scale-105'
                                            : 'bg-white/5 hover:bg-white/10 border-white/10 text-gray-400 hover:text-rose-400'
                                    }`}
                                    title={favorites.includes(activeGame.id) ? 'Favorited' : 'Add to Favorites'}
                                    aria-label="Favorite"
                                >
                                    <svg className={`w-3.5 h-3.5 sm:w-4 sm:h-4 ${favorites.includes(activeGame.id) ? 'fill-rose-500' : 'fill-none stroke-current'}`} viewBox="0 0 24 24">
                                        <path strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/>
                                    </svg>
                                </button>

                                {/* Reload / Restart */}
                                <button
                                    onClick={handleReloadGame}
                                    className={`w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-gray-300 hover:text-white flex items-center justify-center transition-all ${
                                        isReloading ? 'rotate-180 duration-500 text-[#57D6C0]' : ''
                                    }`}
                                    title="Restart Game (R)"
                                    aria-label="Restart"
                                >
                                    <svg className="w-3.5 h-3.5 fill-none stroke-current" viewBox="0 0 24 24">
                                        <path strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                                    </svg>
                                </button>

                                {/* Share Button (hidden on small phones to keep spacing clean, accessible in Info drawer) */}
                                <div className="relative hidden sm:block">
                                    <button
                                        onClick={() => handleShare(activeGame)}
                                        className="h-9 px-3 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-gray-300 hover:text-white text-xs font-bold transition-all flex items-center gap-1.5 active:scale-95"
                                        title="Share Game"
                                        aria-label="Share"
                                    >
                                        <svg className="w-3.5 h-3.5 fill-current" viewBox="0 0 24 24">
                                            <path d="M18 16.08c-.76 0-1.44.3-1.96.77L8.91 12.7c.05-.23.09-.46.09-.7s-.04-.47-.09-.7l7.05-4.11c.54.5 1.25.81 2.04.81 1.66 0 3-1.34 3-3s-1.34-3-3-3-3 1.34-3 3c0 .24.04.47.09.7L8.04 9.81C7.5 9.31 6.79 9 6 9c-1.66 0-3 1.34-3 3s1.34 3 3 3c.79 0 1.5-.31 2.04-.81l7.12 4.16c-.05.21-.08.43-.08.65 0 1.61 1.31 2.92 2.92 2.92 1.61 0 2.92-1.31 2.92-2.92s-1.31-2.92-2.92-2.92z"/>
                                        </svg>
                                        <span className="text-[11px]">Share</span>
                                    </button>

                                    {copiedShare && (
                                        <div className="absolute top-full right-0 mt-2 px-2.5 py-1 rounded-lg bg-emerald-500 text-black font-black text-[10px] tracking-wider uppercase shadow-lg shadow-emerald-950/60 whitespace-nowrap animate-in fade-in zoom-in-95 duration-150 z-30">
                                            ✓ Copied!
                                        </div>
                                    )}
                                </div>

                                {/* Fullscreen / Theater Toggle */}
                                <button
                                    onClick={toggleFullscreen}
                                    className="w-8 h-8 sm:w-auto sm:h-9 px-0 sm:px-3.5 rounded-xl bg-gradient-to-r from-[#9273F5] to-[#57D6C0] text-black text-xs font-black transition-all shadow-[0_0_16px_rgba(146,115,245,0.4)] hover:shadow-[0_0_22px_rgba(87,214,192,0.5)] active:scale-95 flex items-center justify-center gap-1.5"
                                    title={isTheaterFullscreen ? 'Exit Fullscreen (F)' : 'Fullscreen / Theater (F)'}
                                    aria-label="Fullscreen"
                                >
                                    <svg className="w-3.5 h-3.5 fill-current" viewBox="0 0 24 24">
                                        {isTheaterFullscreen ? (
                                            <path d="M5 16h3v3h2v-5H5v2zm3-8H5v2h5V5H8v3zm6 11h2v-3h3v-2h-5v5zm2-11V5h-2v5h5V8h-3z" />
                                        ) : (
                                            <path d="M7 14H5v5h5v-2H7v-3zm-2-4h2V7h3V5H5v5zm12 7h-3v2h5v-5h-2v3zM14 5v2h3v3h2V5h-5z"/>
                                        )}
                                    </svg>
                                    <span className="hidden md:inline text-[11px] font-black uppercase tracking-wider">
                                        {isTheaterFullscreen ? 'Exit' : 'Full'}
                                    </span>
                                </button>
                            </div>
                        </div>

                        {/* Interactive Controls & Game Info Dropdown / Drawer */}
                        {showInfoDrawer && (
                            <div className="absolute top-[52px] sm:top-[60px] inset-x-0 z-30 bg-[#120F1F]/95 backdrop-blur-2xl border-b border-violet-500/25 p-4 sm:p-6 shadow-2xl animate-in slide-in-from-top-4 duration-200">
                                <div className="max-w-3xl mx-auto space-y-4">
                                    <div className="flex items-start justify-between gap-4">
                                        <div>
                                            <div className="flex items-center gap-2">
                                                <h4 className="text-white font-black text-base">{activeGame.title}</h4>
                                                <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded bg-violet-500/20 text-violet-300 border border-violet-500/30">
                                                    {activeGame.category}
                                                </span>
                                            </div>
                                            <p className="text-xs text-[#ADA6B9] mt-1 leading-relaxed">
                                                {activeGame.description || 'Enjoy this instant HTML5 browser game. Fast, secure, and no installation required.'}
                                            </p>
                                        </div>
                                        <button
                                            onClick={() => setShowInfoDrawer(false)}
                                            className="w-7 h-7 rounded-lg bg-white/10 hover:bg-white/20 text-gray-300 flex items-center justify-center text-xs shrink-0"
                                        >
                                            ✕
                                        </button>
                                    </div>

                                    {/* Control Scheme Grid */}
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-white/10">
                                        <div className="p-3 rounded-xl bg-black/40 border border-white/5 flex items-center gap-3">
                                            <div className="w-9 h-9 rounded-lg bg-[#9273F5]/15 text-[#9273F5] flex items-center justify-center shrink-0">
                                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <rect x="5" y="2" width="14" height="20" rx="3" strokeWidth="2" />
                                                    <line x1="12" y1="18" x2="12.01" y2="18" strokeWidth="3" />
                                                </svg>
                                            </div>
                                            <div>
                                                <div className="text-xs font-bold text-white">Mobile & Tablet Controls</div>
                                                <div className="text-[11px] text-[#ADA6B9]">Touch, tap, or swipe anywhere inside the game</div>
                                            </div>
                                        </div>

                                        <div className="p-3 rounded-xl bg-black/40 border border-white/5 flex items-center gap-3">
                                            <div className="w-9 h-9 rounded-lg bg-[#57D6C0]/15 text-[#57D6C0] flex items-center justify-center shrink-0">
                                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <rect x="2" y="4" width="20" height="16" rx="2" strokeWidth="2" />
                                                    <path d="M6 8h.01M10 8h.01M14 8h.01M18 8h.01M8 12h.01M12 12h.01M16 12h.01M7 16h10" strokeWidth="2" />
                                                </svg>
                                            </div>
                                            <div>
                                                <div className="text-xs font-bold text-white">Desktop & Keyboard Controls</div>
                                                <div className="text-[11px] text-[#ADA6B9]">Use Arrow Keys / WASD, Spacebar, or Mouse</div>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="flex items-center justify-between text-[11px] text-[#ADA6B9] pt-1">
                                        <span>Hotkeys: <kbd className="px-1.5 py-0.5 rounded bg-white/10 text-white font-mono">F</kbd> Fullscreen • <kbd className="px-1.5 py-0.5 rounded bg-white/10 text-white font-mono">R</kbd> Restart • <kbd className="px-1.5 py-0.5 rounded bg-white/10 text-white font-mono">ESC</kbd> Close</span>
                                        <span className="text-violet-400 font-bold">Nexiplay Web Arcade</span>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Game Canvas Container */}
                        <div className="relative flex-1 w-full bg-[#050409] flex items-center justify-center overflow-hidden">
                            {/* Loading Overlay */}
                            {iframeLoading && (
                                <div className="absolute inset-0 z-10 bg-[#090710] flex flex-col items-center justify-center p-6 text-center space-y-4">
                                    {/* Glowing Pulsing Gamepad Loader */}
                                    <div className="relative">
                                        <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl bg-gradient-to-tr from-[#9273F5]/25 via-transparent to-[#57D6C0]/25 animate-pulse flex items-center justify-center border border-[#9273F5]/30 shadow-[0_0_30px_rgba(146,115,245,0.3)]">
                                            <GameCategorySvgIcon category={activeGame.category} className="w-8 h-8 sm:w-10 sm:h-10 text-[#57D6C0] animate-bounce" />
                                        </div>
                                        <div className="absolute -inset-1 rounded-2xl border-2 border-violet-500/20 animate-ping pointer-events-none" />
                                    </div>

                                    <div className="space-y-1">
                                        <h4 className="text-xs sm:text-sm font-black uppercase tracking-[0.2em] bg-clip-text text-transparent bg-gradient-to-r from-[#9273F5] via-white to-[#57D6C0]">
                                            Loading Game Engine...
                                        </h4>
                                        <p className="text-xs text-[#ADA6B9] font-medium">
                                            {activeGame.title} • Instant HTML5 Play
                                        </p>
                                    </div>

                                    {/* Animated Progress Bar */}
                                    <div className="w-44 sm:w-52 h-1.5 rounded-full bg-white/10 overflow-hidden">
                                        <div className="w-full h-full bg-gradient-to-r from-[#9273F5] to-[#57D6C0] animate-pulse" />
                                    </div>
                                </div>
                            )}

                            {/* Responsive Iframe */}
                            <iframe
                                ref={iframeRef}
                                src={activeGame.url}
                                title={activeGame.title}
                                onLoad={() => setIframeLoading(false)}
                                className="w-full h-full border-0 absolute inset-0 bg-black"
                                allow="fullscreen; autoplay; gamepad; encrypted-media"
                                sandbox="allow-scripts allow-same-origin allow-forms allow-pointer-lock allow-popups"
                            />
                        </div>

                        {/* Bottom Gamer Dock: Up Next Strip */}
                        {!isTheaterFullscreen && (
                            <div className="bg-[#110D1D]/95 border-t border-white/[0.08] backdrop-blur-xl shrink-0 z-20">
                                {/* Toggle Bar / Header */}
                                <div 
                                    onClick={() => setIsDockExpanded(prev => !prev)}
                                    className="px-4 py-2 flex items-center justify-between cursor-pointer hover:bg-white/5 transition-colors select-none"
                                >
                                    <div className="flex items-center gap-2">
                                        <span className="text-[10px] sm:text-[11px] font-black uppercase tracking-wider text-[#9273F5] flex items-center gap-1.5">
                                            <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                                                <polygon points="5 3 19 12 5 21 5 3" fill="currentColor" />
                                            </svg>
                                            <span>Up Next ({moreGames.length})</span>
                                        </span>
                                        <span className="text-[10px] text-[#ADA6B9] hidden xs:inline">
                                            • Instant 1-tap game switch
                                        </span>
                                    </div>

                                    <div className="flex items-center gap-1 text-[10px] font-bold text-gray-400 hover:text-white">
                                        <span>{isDockExpanded ? 'Hide' : 'Browse More'}</span>
                                        <svg className={`w-3.5 h-3.5 transition-transform duration-200 ${isDockExpanded ? 'rotate-180' : ''}`} viewBox="0 0 24 24" fill="none" stroke="currentColor">
                                            <polyline points="18 15 12 9 6 15" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                                        </svg>
                                    </div>
                                </div>

                                {/* Expanded Carousel Cards */}
                                {isDockExpanded && (
                                    <div className="px-4 pb-3 pt-1 flex items-center gap-2.5 overflow-x-auto scrollbar-hide animate-in slide-in-from-bottom-2 duration-200">
                                        {moreGames.map((g) => {
                                            const isCurrent = activeGame.id === g.id;
                                            return (
                                                <button
                                                    key={g.id}
                                                    onClick={() => handlePlayGame(g)}
                                                    className={`p-1.5 rounded-xl transition-all duration-200 flex items-center gap-2.5 shrink-0 group text-left ${
                                                        isCurrent
                                                            ? 'bg-gradient-to-r from-[#9273F5]/30 to-[#5C46B2]/30 border border-[#9273F5] shadow-lg shadow-violet-950/40'
                                                            : 'bg-white/5 hover:bg-white/10 border border-white/5 hover:border-violet-500/30'
                                                    }`}
                                                >
                                                    <div className="w-10 h-10 rounded-lg overflow-hidden bg-black/60 shrink-0 border border-white/10 group-hover:border-[#9273F5]/40 relative">
                                                        <SafeGameThumb src={g.thumbnailUrl} alt={g.title} />
                                                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                                                            <div className="text-[9px] text-white font-black">▶</div>
                                                        </div>
                                                    </div>
                                                    <div className="min-w-0 pr-2">
                                                        <div className={`text-xs font-bold truncate max-w-[120px] ${isCurrent ? 'text-[#C4B5FD]' : 'text-white group-hover:text-[#B09AFF]'}`}>
                                                            {g.title}
                                                        </div>
                                                        <div className="text-[10px] text-[#ADA6B9] uppercase font-semibold">
                                                            {g.category}
                                                        </div>
                                                    </div>
                                                </button>
                                            );
                                        })}
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}
