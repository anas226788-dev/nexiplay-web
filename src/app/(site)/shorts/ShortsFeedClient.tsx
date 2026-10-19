'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { ShortItem } from '@/lib/shortsFeed';

interface ShortsFeedClientProps {
    initialItems: ShortItem[];
    initialNextPage: number | null;
}

interface FloatingHeart {
    id: number;
    x: number;
    y: number;
    rotation: number;
}

type ShortsCategory = 
    | 'all' 
    | 'anime' 
    | 'comedy' 
    | 'drama' 
    | 'gaming' 
    | 'movie' 
    | 'tech' 
    | 'satisfying' 
    | 'food' 
    | 'motivation';

export default function ShortsFeedClient({ initialItems, initialNextPage }: ShortsFeedClientProps) {
    const router = useRouter();
    const [items, setItems] = useState<ShortItem[]>(initialItems);
    const [nextPage, setNextPage] = useState<number | null>(initialNextPage);
    const [loadingMore, setLoadingMore] = useState(false);
    const [currentIndex, setCurrentIndex] = useState(0);
    const [isMuted, setIsMuted] = useState(true);
    const [hasInteractedSound, setHasInteractedSound] = useState(false);
    const [likedIds, setLikedIds] = useState<Set<string>>(new Set());
    const [category, setCategory] = useState<ShortsCategory>('all');
    const [copiedId, setCopiedId] = useState<string | null>(null);
    const [pausedIds, setPausedIds] = useState<Set<string>>(new Set());
    const [playIndicator, setPlayIndicator] = useState<{ id: string; type: 'play' | 'pause' } | null>(null);
    const [floatingHearts, setFloatingHearts] = useState<FloatingHeart[]>([]);

    // 10-Second Preload Waiting Screen & Background Engine Buffer
    const [isPreloading, setIsPreloading] = useState(true);
    const [preloadCountdown, setPreloadCountdown] = useState(10);
    const [preloadProgress, setPreloadProgress] = useState(0);
    const [playingVideoIds, setPlayingVideoIds] = useState<Set<string>>(new Set());

    const containerRef = useRef<HTMLDivElement>(null);
    const iframeRefs = useRef<Record<string, HTMLIFrameElement | null>>({});
    const lastTapRef = useRef<{ time: number; x: number; y: number }>({ time: 0, x: 0, y: 0 });
    const tapTimeoutRef = useRef<NodeJS.Timeout | null>(null);
    const videoStartTimeRef = useRef<number>(Date.now());

    // 10-Second Preloading Countdown & Buffer Warmup
    useEffect(() => {
        try {
            const alreadyPreloaded = sessionStorage.getItem('nexiplay_shorts_buffered_session');
            if (alreadyPreloaded) {
                setIsPreloading(false);
                return;
            }
        } catch { /* ignore */ }

        const timer = setInterval(() => {
            setPreloadCountdown(prev => {
                if (prev <= 1) {
                    clearInterval(timer);
                    setIsPreloading(false);
                    try {
                        sessionStorage.setItem('nexiplay_shorts_buffered_session', 'true');
                    } catch { /* ignore */ }
                    return 0;
                }
                return prev - 1;
            });
        }, 1000);

        const progressTimer = setInterval(() => {
            setPreloadProgress(prev => {
                if (prev >= 100) {
                    clearInterval(progressTimer);
                    return 100;
                }
                return prev + 1;
            });
        }, 100);

        return () => {
            clearInterval(timer);
            clearInterval(progressTimer);
        };
    }, []);

    const skipPreload = () => {
        setIsPreloading(false);
        try {
            sessionStorage.setItem('nexiplay_shorts_buffered_session', 'true');
        } catch { /* ignore */ }
        const currentItem = items[currentIndex];
        if (currentItem) {
            iframeRefs.current[currentItem.id]?.contentWindow?.postMessage(
                JSON.stringify({ event: 'command', func: 'playVideo' }),
                '*'
            );
        }
    };

    // Preload 25-30 shorts in the background immediately on mount
    useEffect(() => {
        const prefetchBuffer = async () => {
            try {
                let currentItems = [...initialItems];
                let p = initialNextPage || 2;
                let attempts = 0;
                while (currentItems.length < 30 && p && attempts < 4) {
                    attempts++;
                    const dynamicSeed = Math.floor(Math.random() * 100000);
                    const res = await fetch(`/api/shorts?page=${p}&category=all&seed=${dynamicSeed}`);
                    if (!res.ok) break;
                    const data = await res.json();
                    if (!data.items || data.items.length === 0) break;
                    const existingIds = new Set(currentItems.map(i => i.id));
                    const fresh = data.items.filter((i: ShortItem) => !existingIds.has(i.id));
                    if (fresh.length === 0) break;
                    currentItems = [...currentItems, ...fresh];
                    p = data.nextPage;
                }
                setItems(currentItems);
                setNextPage(p);
            } catch (e) {
                console.error('Error preloading shorts buffer:', e);
            }
        };
        prefetchBuffer();
    }, [initialItems, initialNextPage]);

    // Detect when YouTube video actually starts playing, ends (auto-loop), or errors
    useEffect(() => {
        const handleMessage = (e: MessageEvent) => {
            try {
                const data = typeof e.data === 'string' ? JSON.parse(e.data) : e.data;
                const activeItem = items[currentIndex];
                if (!activeItem) return;

                // 1 = PLAYING -> Mark active video as playing so poster shield fades out smoothly
                if ((data?.event === 'onStateChange' && data?.info === 1) || data?.info?.playerState === 1) {
                    setPlayingVideoIds(prev => new Set(prev).add(activeItem.id));
                    // If sound is unmuted, unmute the playing video now that playback has begun
                    if (!isMuted) {
                        const iframe = iframeRefs.current[activeItem.id];
                        iframe?.contentWindow?.postMessage(JSON.stringify({ event: 'command', func: 'unMute' }), '*');
                    }
                }

                // 0 = ENDED -> Seamlessly loop from 0:00 without black screen or stopping
                if ((data?.event === 'onStateChange' && data?.info === 0) || data?.info?.playerState === 0) {
                    const iframe = iframeRefs.current[activeItem.id];
                    iframe?.contentWindow?.postMessage(JSON.stringify({ event: 'command', func: 'seekTo', args: [0, true] }), '*');
                    iframe?.contentWindow?.postMessage(JSON.stringify({ event: 'command', func: 'playVideo' }), '*');
                }

                // YouTube Embedding Error (100, 101, 150 = owner disabled embed) -> Auto skip to next
                if (data?.event === 'onError' || [100, 101, 150].includes(data?.info)) {
                    console.warn(`[Shorts] Video ${activeItem.id} cannot be embedded. Skipping to next.`);
                    scrollToNext();
                }
            } catch { /* ignore */ }
        };
        window.addEventListener('message', handleMessage);
        return () => window.removeEventListener('message', handleMessage);
    }, [currentIndex, items, isMuted]);

    // Safety timeout: once video is active, uncover after 750ms so video is revealed smoothly
    useEffect(() => {
        const activeItem = items[currentIndex];
        if (!activeItem || isPreloading) return;

        const timer = setTimeout(() => {
            setPlayingVideoIds(prev => new Set(prev).add(activeItem.id));
        }, 750);

        return () => clearTimeout(timer);
    }, [currentIndex, isPreloading]);

    // When preloading ends, play the active video immediately
    useEffect(() => {
        if (!isPreloading && items[currentIndex]) {
            const currentItem = items[currentIndex];
            const iframe = iframeRefs.current[currentItem.id];
            iframe?.contentWindow?.postMessage(JSON.stringify({ event: 'command', func: 'playVideo' }), '*');
            if (!isMuted) {
                iframe?.contentWindow?.postMessage(JSON.stringify({ event: 'command', func: 'unMute' }), '*');
            }
        }
    }, [isPreloading, currentIndex, isMuted]);

    // Record user taste affinity vector for algorithm personalization
    const recordTasteSignal = useCallback((niche: string | undefined, delta: number) => {
        if (!niche) return;
        try {
            const raw = localStorage.getItem('nexiplay_user_taste');
            const vector: Record<string, number> = raw ? JSON.parse(raw) : {};
            vector[niche] = Math.max(-10, Math.min(100, (vector[niche] || 0) + delta));
            localStorage.setItem('nexiplay_user_taste', JSON.stringify(vector));
        } catch { /* ignore */ }
    }, []);

    // Load liked shorts from local storage
    useEffect(() => {
        try {
            const saved = localStorage.getItem('nexiplay_liked_shorts');
            if (saved) {
                setLikedIds(new Set(JSON.parse(saved)));
            }
        } catch { /* ignore */ }
    }, []);

    // Save likes and feed signal to recommendation algorithm
    const toggleLike = (id: string, niche?: string) => {
        setLikedIds(prev => {
            const next = new Set(prev);
            const willLike = !next.has(id);
            if (!willLike) {
                next.delete(id);
                recordTasteSignal(niche, -5);
            } else {
                next.add(id);
                recordTasteSignal(niche, 10); // Strong positive signal
            }
            try {
                localStorage.setItem('nexiplay_liked_shorts', JSON.stringify([...next]));
            } catch { /* ignore */ }
            return next;
        });
    };

    // Spawn floating heart for double tap
    const spawnHeart = (x: number, y: number) => {
        const id = Date.now() + Math.random();
        const rotation = (Math.random() - 0.5) * 40; // -20deg to +20deg
        setFloatingHearts(prev => [...prev, { id, x, y, rotation }]);
        setTimeout(() => {
            setFloatingHearts(prev => prev.filter(h => h.id !== id));
        }, 900);
    };

    // Toggle Play/Pause via YouTube postMessage API
    const togglePlayPause = (itemId: string) => {
        const iframe = iframeRefs.current[itemId];
        if (!iframe?.contentWindow) return;

        setPausedIds(prev => {
            const next = new Set(prev);
            const isCurrentlyPaused = next.has(itemId);
            if (isCurrentlyPaused) {
                next.delete(itemId);
                iframe.contentWindow?.postMessage(JSON.stringify({ event: 'command', func: 'playVideo' }), '*');
                setPlayIndicator({ id: itemId, type: 'play' });
            } else {
                next.add(itemId);
                iframe.contentWindow?.postMessage(JSON.stringify({ event: 'command', func: 'pauseVideo' }), '*');
                setPlayIndicator({ id: itemId, type: 'pause' });
            }
            setTimeout(() => setPlayIndicator(null), 700);
            return next;
        });
    };

    // Handle Click & Double Click / Double Tap on Video viewport
    const handleViewportClick = (e: React.MouseEvent<HTMLDivElement>, item: ShortItem) => {
        const now = Date.now();
        const rect = e.currentTarget.getBoundingClientRect();
        const clientX = e.clientX - rect.left;
        const clientY = e.clientY - rect.top;

        // Check if double tap occurred (within 280ms)
        if (now - lastTapRef.current.time < 280) {
            // Cancel pending single tap Play/Pause
            if (tapTimeoutRef.current) {
                clearTimeout(tapTimeoutRef.current);
                tapTimeoutRef.current = null;
            }

            // DOUBLE TAP ONLY triggers LIKE with niche preference tracking!
            if (!likedIds.has(item.id)) {
                toggleLike(item.id, item.niche);
            }

            // Spawn vibrant animated heart at exact tap position
            const heartX = clientX > 0 ? clientX : rect.width / 2;
            const heartY = clientY > 0 ? clientY : rect.height / 2;
            spawnHeart(heartX, heartY);

            // Trigger mobile haptic vibration
            if (typeof navigator !== 'undefined' && navigator.vibrate) {
                navigator.vibrate([40, 60, 40]);
            }

            // Reset tap tracker
            lastTapRef.current = { time: 0, x: 0, y: 0 };
        } else {
            // First tap: register timestamp and schedule single tap action
            lastTapRef.current = { time: now, x: clientX, y: clientY };
            if (tapTimeoutRef.current) clearTimeout(tapTimeoutRef.current);

            tapTimeoutRef.current = setTimeout(() => {
                // Single tap action: ONLY toggle Play / Pause! NEVER LIKE!
                togglePlayPause(item.id);
                lastTapRef.current = { time: 0, x: 0, y: 0 };
            }, 280);
        }
    };

    // Toggle Sound via postMessage
    const toggleSound = () => {
        setIsMuted(prev => {
            const next = !prev;
            setHasInteractedSound(true);
            const currentItem = items[currentIndex];
            if (currentItem) {
                const iframe = iframeRefs.current[currentItem.id];
                iframe?.contentWindow?.postMessage(
                    JSON.stringify({ event: 'command', func: next ? 'mute' : 'unMute' }),
                    '*'
                );
            }
            return next;
        });
    };

    // Share short
    const handleShare = async (item: ShortItem) => {
        const shareUrl = typeof window !== 'undefined' ? `${window.location.origin}/shorts#${item.id}` : '';
        if (navigator.share) {
            try {
                await navigator.share({
                    title: item.title,
                    text: `Watch "${item.title}" on Nexiplay Shorts!`,
                    url: shareUrl,
                });
                return;
            } catch { /* fallback to copy */ }
        }
        navigator.clipboard?.writeText(shareUrl);
        setCopiedId(item.id);
        setTimeout(() => setCopiedId(null), 2500);
    };

    // Next / Previous navigation
    const scrollToNext = () => {
        containerRef.current?.scrollBy({ top: containerRef.current.clientHeight, behavior: 'smooth' });
    };

    const scrollToPrev = () => {
        containerRef.current?.scrollBy({ top: -containerRef.current.clientHeight, behavior: 'smooth' });
    };

    // Load more shorts with personal taste vector passed to recommendation engine
    const loadMore = useCallback(async () => {
        if (!nextPage || loadingMore) return;
        setLoadingMore(true);
        try {
            let nichesParam = '';
            try {
                const raw = localStorage.getItem('nexiplay_user_taste');
                if (raw) {
                    const vector: Record<string, number> = JSON.parse(raw);
                    const topNiches = Object.entries(vector)
                        .filter(([_, score]) => score > 0)
                        .sort((a, b) => b[1] - a[1])
                        .slice(0, 3)
                        .map(([n]) => n);
                    if (topNiches.length > 0) {
                        nichesParam = `&niches=${topNiches.join(',')}`;
                    }
                }
            } catch { /* ignore */ }

            const dynamicSeed = Math.floor(Math.random() * 100000);
            const res = await fetch(`/api/shorts?page=${nextPage}&category=${category}${nichesParam}&seed=${dynamicSeed}`);
            if (res.ok) {
                const data = await res.json();
                setItems(prev => {
                    const existingIds = new Set(prev.map(i => i.id));
                    const fresh = data.items.filter((i: ShortItem) => !existingIds.has(i.id));
                    if (fresh.length > 0) {
                        return [...prev, ...fresh];
                    } else if (data.items.length > 0) {
                        return [...prev, ...data.items];
                    }
                    return prev;
                });
                setNextPage(data.nextPage || (nextPage + 1));
            }
        } catch (e) {
            console.error('Failed to load more shorts:', e);
        } finally {
            setLoadingMore(false);
        }
    }, [nextPage, loadingMore, category]);

    // Handle scroll intersection to detect current visible video and track watch time
    useEffect(() => {
        const container = containerRef.current;
        if (!container) return;

        const handleScroll = () => {
            const scrollPos = container.scrollTop;
            const itemHeight = container.clientHeight;
            const index = Math.round(scrollPos / itemHeight);
            if (index !== currentIndex && index >= 0 && index < items.length) {
                // Record watch duration signal for recommendation algorithm
                const prevItem = items[currentIndex];
                if (prevItem) {
                    const elapsed = Date.now() - videoStartTimeRef.current;
                    if (elapsed >= 5000) {
                        recordTasteSignal(prevItem.niche, 3); // High watch time affinity (+3)
                    } else if (elapsed <= 1800) {
                        recordTasteSignal(prevItem.niche, -1); // Quick skip penalty (-1)
                    }

                    const prevIframe = iframeRefs.current[prevItem.id];
                    prevIframe?.contentWindow?.postMessage(JSON.stringify({ event: 'command', func: 'pauseVideo' }), '*');
                }

                videoStartTimeRef.current = Date.now();
                setCurrentIndex(index);

                // Play new video
                const nextItem = items[index];
                if (nextItem) {
                    const nextIframe = iframeRefs.current[nextItem.id];
                    nextIframe?.contentWindow?.postMessage(JSON.stringify({ event: 'command', func: 'playVideo' }), '*');
                    if (!isMuted) {
                        nextIframe?.contentWindow?.postMessage(JSON.stringify({ event: 'command', func: 'unMute' }), '*');
                    }
                }
            }
            // Trigger load more near bottom
            if (index >= items.length - 3) {
                loadMore();
            }
        };

        container.addEventListener('scroll', handleScroll, { passive: true });
        return () => container.removeEventListener('scroll', handleScroll);
    }, [currentIndex, items, loadMore, isMuted, recordTasteSignal]);

    // Keyboard navigation
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (['input', 'textarea'].includes((e.target as HTMLElement)?.tagName?.toLowerCase())) return;

            if (e.key === 'ArrowDown' || e.key === 'j') {
                e.preventDefault();
                scrollToNext();
            } else if (e.key === 'ArrowUp' || e.key === 'k') {
                e.preventDefault();
                scrollToPrev();
            } else if (e.key.toLowerCase() === 'm') {
                e.preventDefault();
                toggleSound();
            } else if (e.key.toLowerCase() === 'l') {
                e.preventDefault();
                const currentItem = items[currentIndex];
                if (currentItem) {
                    toggleLike(currentItem.id);
                    if (containerRef.current) {
                        spawnHeart(containerRef.current.clientWidth / 2, containerRef.current.clientHeight / 2);
                    }
                }
            } else if (e.key === ' ' || e.code === 'Space') {
                e.preventDefault();
                const currentItem = items[currentIndex];
                if (currentItem) togglePlayPause(currentItem.id);
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [currentIndex, items]);

    // Change category
    const handleCategoryChange = async (newCat: ShortsCategory) => {
        if (newCat === category) return;
        setCategory(newCat);
        try {
            const res = await fetch(`/api/shorts?page=1&category=${newCat}`);
            if (res.ok) {
                const data = await res.json();
                setItems(data.items || []);
                setNextPage(data.nextPage || null);
                setCurrentIndex(0);
                containerRef.current?.scrollTo({ top: 0, behavior: 'smooth' });
            }
        } catch { /* ignore */ }
    };

    const handleBack = () => {
        if (typeof window !== 'undefined' && window.history.length > 1) {
            router.back();
        } else {
            router.push('/');
        }
    };

    return (
        <div className="fixed inset-0 z-40 bg-black flex flex-col justify-center items-center overflow-hidden select-none">
            {/* 10-Second High-Speed Preloader & Background Buffer Screen */}
            {isPreloading && (
                <div className="absolute inset-0 z-[60] bg-black/95 backdrop-blur-2xl flex flex-col items-center justify-center px-6 text-center select-none animate-in fade-in duration-300">
                    <div className="relative max-w-xs w-full mx-auto flex flex-col items-center">
                        {/* Glow halo */}
                        <div className="absolute -top-10 w-40 h-40 bg-violet-600/25 rounded-full blur-3xl pointer-events-none" />

                        {/* Animated Brand Icon */}
                        <div className="relative mb-6">
                            <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-violet-600 to-indigo-500 p-0.5 shadow-[0_0_30px_rgba(139,92,246,0.5)]">
                                <div className="w-full h-full bg-dark-950/90 rounded-[14px] flex items-center justify-center">
                                    <svg className="w-8 h-8 text-violet-400 animate-pulse" viewBox="0 0 24 24" fill="currentColor">
                                        <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" />
                                    </svg>
                                </div>
                            </div>
                            {/* Radial Spinning Ring */}
                            <div className="absolute -inset-1.5 rounded-2xl border-2 border-violet-500/30 border-t-violet-400 animate-spin" />
                        </div>

                        {/* Title */}
                        <h2 className="text-lg md:text-xl font-bold text-white tracking-wide mb-5">
                            Loading Shorts...
                        </h2>

                        {/* Progress Bar Container */}
                        <div className="w-full bg-white/10 h-2 rounded-full overflow-hidden p-0.5 border border-white/10 mb-3 shadow-inner">
                            <div
                                className="h-full bg-gradient-to-r from-violet-500 via-indigo-500 to-fuchsia-500 rounded-full transition-all duration-150 ease-out shadow-[0_0_10px_rgba(139,92,246,0.8)]"
                                style={{ width: `${preloadProgress}%` }}
                            />
                        </div>

                        {/* Percentage & Remaining Seconds */}
                        <div className="w-full flex items-center justify-between text-xs font-semibold text-gray-400 mb-6">
                            <span>{preloadProgress}%</span>
                            <span className="text-violet-300 font-mono font-bold bg-violet-950/60 px-2 py-0.5 rounded border border-violet-800/40">
                                {preloadCountdown}s
                            </span>
                        </div>

                        {/* Instant Skip Button */}
                        <button
                            onClick={skipPreload}
                            className="group flex items-center gap-2 px-5 py-2 rounded-full bg-white/10 hover:bg-white/15 text-white text-xs font-bold tracking-wide transition-all duration-200 active:scale-95 border border-white/15 cursor-pointer shadow-lg"
                        >
                            <span>Skip</span>
                            <svg className="w-3.5 h-3.5 transition-transform group-hover:translate-x-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                            </svg>
                        </button>
                    </div>
                </div>
            )}

            {/* Top Navigation Bar Overlay */}
            <div className="absolute top-0 inset-x-0 z-50 flex items-center justify-between px-3 py-3 md:px-8 bg-gradient-to-b from-black/95 via-black/50 to-transparent pointer-events-none">
                {/* Back and Home Navigation Controls */}
                <div className="pointer-events-auto flex items-center gap-1.5">
                    <button
                        onClick={handleBack}
                        className="flex items-center gap-1.5 text-white bg-black/60 hover:bg-black/80 active:bg-violet-600/60 backdrop-blur-md px-3.5 py-1.5 rounded-full border border-white/20 text-xs font-bold transition active:scale-95 shadow-lg"
                        aria-label="Back"
                        title="Go Back"
                    >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15 19l-7-7 7-7" />
                        </svg>
                        <span>Back</span>
                    </button>
                    <Link
                        href="/"
                        className="hidden sm:flex items-center gap-1 text-white/80 hover:text-white bg-black/40 hover:bg-black/60 backdrop-blur-md px-3 py-1.5 rounded-full border border-white/10 text-xs font-semibold transition active:scale-95 shadow-md"
                        title="Go to Home"
                    >
                        <svg className="w-3.5 h-3.5 text-violet-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                        </svg>
                        <span>Home</span>
                    </Link>
                </div>

                {/* Multi-Niche Filter Pills (Scrollable) */}
                <div className="pointer-events-auto flex items-center gap-1 bg-black/60 backdrop-blur-md p-1 rounded-full border border-white/10 shadow-lg overflow-x-auto max-w-[65vw] sm:max-w-none no-scrollbar">
                    {([
                        { key: 'all', label: '⚡ For You' },
                        { key: 'anime', label: '🍿 Anime' },
                        { key: 'comedy', label: '😂 Comedy' },
                        { key: 'drama', label: '🎭 Dramas' },
                        { key: 'gaming', label: '🎮 Gaming' },
                        { key: 'movie', label: '🎬 Cinema' },
                        { key: 'tech', label: '💡 Tech' },
                        { key: 'satisfying', label: '✨ Satisfying' },
                        { key: 'food', label: '🍲 Food' },
                        { key: 'motivation', label: '🏋️ Fitness' },
                    ] as const).map(cat => (
                        <button
                            key={cat.key}
                            onClick={() => handleCategoryChange(cat.key)}
                            className={`px-3 py-1 rounded-full text-xs font-bold whitespace-nowrap transition-all duration-200 ${
                                category === cat.key
                                    ? 'bg-gradient-to-r from-violet-600 to-indigo-600 text-white shadow-md'
                                    : 'text-gray-400 hover:text-white'
                            }`}
                        >
                            {cat.label}
                        </button>
                    ))}
                </div>

                {/* Sound Button */}
                <button
                    onClick={toggleSound}
                    className={`pointer-events-auto flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold backdrop-blur-md border transition-all active:scale-95 shadow-md ${
                        isMuted
                            ? 'bg-rose-500/20 text-rose-300 border-rose-500/30 hover:bg-rose-500/30'
                            : 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30 hover:bg-emerald-500/30'
                    }`}
                    title={isMuted ? 'Unmute (M)' : 'Mute (M)'}
                >
                    {isMuted ? (
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2" />
                        </svg>
                    ) : (
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
                        </svg>
                    )}
                    <span className="hidden sm:inline">{isMuted ? 'Muted' : 'Sound'}</span>
                </button>
            </div>

            {/* Tap to Unmute Hint for first-time viewers */}
            {isMuted && !hasInteractedSound && (
                <div
                    onClick={toggleSound}
                    className="absolute top-16 z-50 animate-bounce cursor-pointer bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white text-xs font-bold px-4 py-2 rounded-full shadow-[0_0_20px_rgba(139,92,246,0.6)] backdrop-blur-md border border-white/20 flex items-center gap-2 transition active:scale-95"
                >
                    <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24">
                        <path d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
                    </svg>
                    <span>Tap to Unmute Video</span>
                </div>
            )}

            {/* Fullscreen Vertical Scroll Feed Container */}
            <div
                ref={containerRef}
                className="w-full h-full overflow-y-scroll snap-y snap-mandatory scroll-smooth no-scrollbar"
                style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
            >
                {items.map((item, index) => {
                    const isActive = index === currentIndex;
                    // Keep 1 video behind and 2 videos ahead mounted in DOM to prevent GPU decoder crash and network starvation
                    const shouldRenderVideo = index >= Math.max(0, currentIndex - 1) && index <= currentIndex + 2;
                    const isLiked = likedIds.has(item.id);
                    const isPaused = pausedIds.has(item.id);

                    // Origin for YouTube embed security
                    const originParam = typeof window !== 'undefined' ? `&origin=${encodeURIComponent(window.location.origin)}` : '';

                    return (
                        <div
                            key={`${item.id}-${index}`}
                            className="w-full h-screen snap-start snap-always relative flex items-center justify-center bg-black overflow-hidden"
                        >
                            {/* Video Viewport (Centered 9:16 aspect on desktop, full on mobile) */}
                            <div className="relative w-full h-full max-w-[460px] max-h-[100vh] bg-black flex items-center justify-center overflow-hidden shadow-2xl">
                                
                                {/* YouTube Video Embed - Scaled & Cropped with zero watermarks */}
                                {shouldRenderVideo ? (
                                    <iframe
                                        ref={el => { iframeRefs.current[item.id] = el; }}
                                        src={`https://www.youtube-nocookie.com/embed/${item.id}?autoplay=${isActive ? 1 : 0}&mute=1&controls=0&playsinline=1&rel=0&modestbranding=1&enablejsapi=1&iv_load_policy=3&disablekb=1&fs=0${originParam}`}
                                        title={item.title}
                                        referrerPolicy="strict-origin-when-cross-origin"
                                        className="w-full h-full pointer-events-none border-0 object-cover scale-[1.26] md:scale-[1.24] origin-center select-none"
                                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                                        allowFullScreen
                                    />
                                ) : (
                                    <div className="w-full h-full relative bg-dark-900 flex items-center justify-center">
                                        {item.thumbnail && (
                                            <Image
                                                src={item.thumbnail}
                                                alt={item.title}
                                                fill
                                                className="object-cover opacity-60 blur-sm"
                                            />
                                        )}
                                        <div className="relative z-10 w-12 h-12 rounded-full bg-white/10 flex items-center justify-center animate-pulse">
                                            <span className="text-xl">⚡</span>
                                        </div>
                                    </div>
                                )}

                                {/* ZERO-RED-BUTTON POSTER SHIELD:
                                    Completely masks YouTube iframe while pre-buffering in background or when scrolling fast.
                                    Ensures the red YouTube play button / splash is NEVER exposed!
                                    Smoothly fades out (opacity-0) ONLY when the active reel is confirmed playing. */}
                                <div 
                                    className={`absolute inset-0 z-12 transition-opacity duration-300 pointer-events-none overflow-hidden ${
                                        isActive && playingVideoIds.has(item.id) && !isPreloading
                                            ? 'opacity-0' 
                                            : 'opacity-100'
                                    }`}
                                >
                                    {item.thumbnail ? (
                                        <Image
                                            src={item.thumbnail}
                                            alt={item.title}
                                            fill
                                            priority={index <= 4}
                                            className="object-cover"
                                        />
                                    ) : (
                                        <div className="w-full h-full bg-dark-950 flex items-center justify-center">
                                            <div className="w-12 h-12 rounded-full bg-violet-600/20 border border-violet-500/40 animate-pulse flex items-center justify-center text-lg">
                                                🎬
                                            </div>
                                        </div>
                                    )}

                                    {/* Sleek buffering shimmer when user is on the active reel before playback starts */}
                                    {isActive && (!playingVideoIds.has(item.id) || isPreloading) && (
                                        <div className="absolute inset-0 bg-black/40 backdrop-blur-[2px] flex flex-col items-center justify-center gap-3">
                                            <div className="relative">
                                                <div className="w-12 h-12 rounded-full border-2 border-violet-500/30 border-t-violet-400 animate-spin" />
                                                <div className="absolute inset-0 flex items-center justify-center">
                                                    <span className="text-xs font-black text-violet-300">⚡</span>
                                                </div>
                                            </div>
                                            <span className="text-[11px] font-bold text-white/90 px-3 py-1 rounded-full bg-black/60 border border-white/10 backdrop-blur-md">
                                                Instant Buffering...
                                            </span>
                                        </div>
                                    )}
                                </div>

                                {/* Top Gradient Mask: Completely crops & hides any YouTube header/title/share buttons */}
                                <div className="absolute inset-x-0 top-0 h-28 bg-gradient-to-b from-black via-black/80 to-transparent pointer-events-none z-15" />

                                {/* Bottom Dark Gradient Mask: Completely crops & hides YouTube logo and progress bar */}
                                <div className="absolute inset-x-0 bottom-0 h-60 bg-gradient-to-t from-black via-black/85 to-transparent pointer-events-none z-15" />

                                {/* Bottom-Right Corner Gradient Mask: Shields any corner branding */}
                                <div className="absolute bottom-0 right-0 w-36 h-28 bg-gradient-to-tl from-black/95 via-black/60 to-transparent pointer-events-none z-15" />

                                {/* Gesture Interceptor Overlay: Double-Tap to Like, Single-Tap to Play/Pause */}
                                <div
                                    onClick={(e) => handleViewportClick(e, item)}
                                    className="absolute inset-0 z-20 cursor-pointer"
                                    aria-label="Single tap to play/pause, double-tap to like"
                                />

                                {/* Double Tap Floating Heart Burst Effect (TikTok style) */}
                                {floatingHearts.map(heart => (
                                    <div
                                        key={heart.id}
                                        style={{
                                            left: `${heart.x}px`,
                                            top: `${heart.y}px`,
                                            transform: `translate(-50%, -50%) rotate(${heart.rotation}deg)`,
                                        }}
                                        className="absolute z-40 pointer-events-none animate-heart-pop"
                                    >
                                        <div className="text-rose-500 drop-shadow-[0_0_20px_rgba(244,63,94,0.9)] text-6xl md:text-7xl">
                                            ❤️
                                        </div>
                                    </div>
                                ))}

                                {/* Paused State: Sleek Frosted Glass Play/Resume Badge */}
                                {isPaused && (
                                    <div className="absolute z-30 pointer-events-none flex flex-col items-center justify-center animate-in fade-in zoom-in-95 duration-200">
                                        <div className="relative group">
                                            <div className="absolute -inset-2 rounded-full bg-gradient-to-r from-violet-600 to-indigo-600 opacity-60 blur-lg animate-pulse" />
                                            <div className="relative w-20 h-20 md:w-24 md:h-24 rounded-full bg-black/65 backdrop-blur-xl border border-white/25 flex items-center justify-center shadow-[0_0_50px_rgba(146,115,245,0.6)]">
                                                <svg className="w-10 h-10 md:w-12 md:h-12 translate-x-1 fill-white drop-shadow-[0_2px_12px_rgba(0,0,0,0.8)]" viewBox="0 0 24 24">
                                                    <path d="M8 5.14v14.72a1.2 1.2 0 0 0 1.83 1.02l11.57-7.36a1.2 1.2 0 0 0 0-2.04L9.83 4.12A1.2 1.2 0 0 0 8 5.14z" />
                                                </svg>
                                            </div>
                                        </div>
                                        <span className="mt-3 px-3 py-1 rounded-full bg-black/75 backdrop-blur-md border border-white/15 text-[11px] font-bold text-violet-200 tracking-wider uppercase shadow-xl">
                                            Tap to Resume
                                        </span>
                                    </div>
                                )}

                                {/* Animated Flash Indicator on Pause */}
                                {playIndicator?.id === item.id && playIndicator.type === 'pause' && !isPaused && (
                                    <div className="absolute z-30 pointer-events-none flex items-center justify-center animate-indicator-pop">
                                        <div className="w-20 h-20 md:w-24 md:h-24 rounded-full bg-black/70 backdrop-blur-xl border border-white/30 flex items-center justify-center shadow-[0_0_40px_rgba(244,63,94,0.6)]">
                                            <svg className="w-9 h-9 md:w-10 md:h-10 fill-white drop-shadow-[0_2px_10px_rgba(0,0,0,0.8)]" viewBox="0 0 24 24">
                                                <rect x="6" y="4" width="4" height="16" rx="2" />
                                                <rect x="14" y="4" width="4" height="16" rx="2" />
                                            </svg>
                                        </div>
                                    </div>
                                )}

                                {/* Animated Blooming Flash Indicator on Resume */}
                                {playIndicator?.id === item.id && playIndicator.type === 'play' && (
                                    <div className="absolute z-30 pointer-events-none flex items-center justify-center animate-indicator-fadeout">
                                        <div className="w-20 h-20 md:w-24 md:h-24 rounded-full bg-violet-600/40 backdrop-blur-xl border border-violet-400/50 flex items-center justify-center shadow-[0_0_50px_rgba(146,115,245,0.8)]">
                                            <svg className="w-10 h-10 md:w-12 md:h-12 translate-x-1 fill-white drop-shadow-[0_2px_10px_rgba(0,0,0,0.8)]" viewBox="0 0 24 24">
                                                <path d="M8 5.14v14.72a1.2 1.2 0 0 0 1.83 1.02l11.57-7.36a1.2 1.2 0 0 0 0-2.04L9.83 4.12A1.2 1.2 0 0 0 8 5.14z" />
                                            </svg>
                                        </div>
                                    </div>
                                )}

                                {/* Bottom Info Bar Overlay */}
                                <div className="absolute bottom-20 md:bottom-6 inset-x-4 pr-16 z-20 pointer-events-none space-y-2">
                                    {/* Channel Badge */}
                                    <div className="flex items-center gap-2">
                                        <span className="inline-flex items-center gap-1 bg-violet-600/90 backdrop-blur-md px-2.5 py-1 rounded-full text-[11px] font-bold text-white border border-white/20 shadow-sm">
                                            <span>✨</span>
                                            <span>{item.channelName}</span>
                                        </span>
                                        {item.kind === 'trailer' && (
                                            <span className="bg-emerald-500/90 backdrop-blur-md px-2 py-0.5 rounded-full text-[10px] font-extrabold text-white uppercase tracking-wider shadow-sm">
                                                Trailer
                                            </span>
                                        )}
                                    </div>

                                    {/* Video Title */}
                                    <h3 className="text-sm font-semibold text-white drop-shadow-md line-clamp-2 leading-relaxed">
                                        {item.title}
                                    </h3>

                                    {/* Link to Full Movie CTA (if available) */}
                                    {item.movieSlug && (
                                        <div className="pt-1 pointer-events-auto">
                                            <Link
                                                href={`/movie/${item.movieSlug}`}
                                                className="inline-flex items-center gap-2 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-black font-extrabold text-xs px-3.5 py-1.5 rounded-full shadow-lg transition active:scale-95"
                                            >
                                                <span>🎬 Watch Full Movie</span>
                                                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5l7 7-7 7" />
                                                </svg>
                                            </Link>
                                        </div>
                                    )}

                                    {/* Music ticker */}
                                    <div className="flex items-center gap-2 text-[11px] text-gray-400 pt-0.5">
                                        <span className="animate-spin text-xs">🎵</span>
                                        <span className="truncate">Original Sound - Nexiplay Shorts Feed</span>
                                    </div>
                                </div>

                                {/* Floating Right Actions Bar (TikTok style) */}
                                <div className="absolute right-3 bottom-20 md:bottom-8 z-30 flex flex-col items-center gap-3.5">
                                    {/* Like Button */}
                                    <button
                                        onClick={() => {
                                            toggleLike(item.id, item.niche);
                                            spawnHeart(230, 300);
                                        }}
                                        className="flex flex-col items-center group transition active:scale-125"
                                        aria-label="Like short"
                                    >
                                        <div className={`w-11 h-11 rounded-full flex items-center justify-center backdrop-blur-md border transition-all duration-200 ${
                                            isLiked
                                                ? 'bg-rose-500 text-white border-rose-400 shadow-[0_0_16px_rgba(244,63,94,0.6)] scale-110'
                                                : 'bg-black/50 text-white border-white/20 hover:bg-black/70'
                                        }`}>
                                            <svg className="w-6 h-6 fill-current transition-transform duration-200 group-hover:scale-110" viewBox="0 0 24 24">
                                                <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
                                            </svg>
                                        </div>
                                        <span className="text-[11px] text-white font-bold mt-1 drop-shadow">
                                            {isLiked ? 'Liked' : 'Like'}
                                        </span>
                                    </button>

                                    {/* Play / Pause Quick Action Button */}
                                    <button
                                        onClick={() => togglePlayPause(item.id)}
                                        className="flex flex-col items-center group transition active:scale-125"
                                        aria-label={isPaused ? "Play video" : "Pause video"}
                                        title={isPaused ? "Play (Space)" : "Pause (Space)"}
                                    >
                                        <div className={`w-11 h-11 rounded-full flex items-center justify-center backdrop-blur-md border transition-all duration-200 ${
                                            isPaused
                                                ? 'bg-violet-600 text-white border-violet-400 shadow-[0_0_16px_rgba(146,115,245,0.7)] scale-105'
                                                : 'bg-black/50 hover:bg-black/70 text-white/90 hover:text-white border-white/20'
                                        }`}>
                                            {isPaused ? (
                                                <svg className="w-5 h-5 translate-x-0.5 fill-current" viewBox="0 0 24 24">
                                                    <path d="M8 5.14v14.72a1.2 1.2 0 0 0 1.83 1.02l11.57-7.36a1.2 1.2 0 0 0 0-2.04L9.83 4.12A1.2 1.2 0 0 0 8 5.14z" />
                                                </svg>
                                            ) : (
                                                <svg className="w-5 h-5 fill-current" viewBox="0 0 24 24">
                                                    <rect x="6" y="5" width="3.5" height="14" rx="1.5" />
                                                    <rect x="14.5" y="5" width="3.5" height="14" rx="1.5" />
                                                </svg>
                                            )}
                                        </div>
                                        <span className="text-[10px] text-gray-300 font-semibold mt-1">
                                            {isPaused ? 'Resume' : 'Pause'}
                                        </span>
                                    </button>

                                    {/* Share Button */}
                                    <button
                                        onClick={() => handleShare(item)}
                                        className="flex flex-col items-center group transition active:scale-125"
                                        aria-label="Share short"
                                    >
                                        <div className="w-11 h-11 rounded-full bg-black/50 hover:bg-black/70 text-white flex items-center justify-center backdrop-blur-md border border-white/20 transition-all">
                                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
                                            </svg>
                                        </div>
                                        <span className="text-[11px] text-white font-bold mt-1 drop-shadow">
                                            {copiedId === item.id ? 'Copied!' : 'Share'}
                                        </span>
                                    </button>

                                    {/* Sound Quick Toggle */}
                                    <button
                                        onClick={toggleSound}
                                        className="flex flex-col items-center group transition active:scale-125"
                                        aria-label="Toggle mute"
                                    >
                                        <div className={`w-11 h-11 rounded-full flex items-center justify-center backdrop-blur-md border transition-all ${
                                            isMuted ? 'bg-black/50 text-gray-300 border-white/20' : 'bg-emerald-600 text-white border-emerald-400 shadow-[0_0_14px_rgba(16,185,129,0.5)]'
                                        }`}>
                                            {isMuted ? (
                                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2" />
                                                </svg>
                                            ) : (
                                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
                                                </svg>
                                            )}
                                        </div>
                                        <span className="text-[10px] text-gray-300 font-semibold mt-1">
                                            {isMuted ? 'Muted' : 'Sound'}
                                        </span>
                                    </button>

                                    {/* Next Video Quick Button */}
                                    <button
                                        onClick={scrollToNext}
                                        className="flex flex-col items-center group transition active:scale-125"
                                        aria-label="Next short"
                                        title="Next (Down Arrow)"
                                    >
                                        <div className="w-10 h-10 rounded-full bg-black/40 hover:bg-black/60 text-white/80 hover:text-white flex items-center justify-center backdrop-blur-md border border-white/10 transition-all">
                                            <svg className="w-5 h-5 animate-pulse" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 9l-7 7-7-7" />
                                            </svg>
                                        </div>
                                        <span className="text-[10px] text-gray-400 font-semibold mt-1">
                                            Next
                                        </span>
                                    </button>
                                </div>
                            </div>
                        </div>
                    );
                })}

                {/* Loading indicator at end */}
                {loadingMore && (
                    <div className="w-full h-24 flex items-center justify-center text-white/60 text-xs font-semibold gap-2">
                        <div className="w-4 h-4 border-2 border-violet-400 border-t-transparent rounded-full animate-spin" />
                        <span>Loading more viral reels…</span>
                    </div>
                )}
            </div>

            {/* Custom CSS for TikTok Heart Pop & Indicator Animations */}
            <style jsx global>{`
                @keyframes heartPop {
                    0% {
                        transform: translate(-50%, -50%) scale(0) rotate(-15deg);
                        opacity: 0;
                    }
                    15% {
                        transform: translate(-50%, -50%) scale(1.4) rotate(0deg);
                        opacity: 1;
                    }
                    35% {
                        transform: translate(-50%, -50%) scale(1.15) rotate(10deg);
                        opacity: 1;
                    }
                    100% {
                        transform: translate(-50%, -100px) scale(1.6) rotate(20deg);
                        opacity: 0;
                    }
                }
                .animate-heart-pop {
                    animation: heartPop 0.85s cubic-bezier(0.175, 0.885, 0.32, 1.275) forwards;
                }
                @keyframes indicatorPop {
                    0% {
                        transform: scale(0.65);
                        opacity: 0;
                    }
                    50% {
                        transform: scale(1.15);
                        opacity: 1;
                    }
                    100% {
                        transform: scale(1.0);
                        opacity: 1;
                    }
                }
                .animate-indicator-pop {
                    animation: indicatorPop 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275) forwards;
                }
                @keyframes indicatorFadeout {
                    0% {
                        transform: scale(0.85);
                        opacity: 1;
                    }
                    50% {
                        transform: scale(1.25);
                        opacity: 0.9;
                    }
                    100% {
                        transform: scale(1.5);
                        opacity: 0;
                    }
                }
                .animate-indicator-fadeout {
                    animation: indicatorFadeout 0.45s ease-out forwards;
                }
            `}</style>
        </div>
    );
}
