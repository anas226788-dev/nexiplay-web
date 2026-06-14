'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { usePathname } from 'next/navigation';
import { Notice } from '@/lib/types';
import { useActiveMovie } from '@/context/ActiveMovieContext';

const NOTICE_CACHE_KEY = 'nexiplay_notices';
const NOTICE_TTL_MS = 5 * 60 * 1000; // 5 minutes

type NoticeFields = Pick<Notice, 'id' | 'type' | 'content' | 'image_url' | 'video_url' | 'pages' | 'bg_color' | 'text_color' | 'movie_id'>;

export default function NoticeSystem() {
    const [notices, setNotices] = useState<NoticeFields[]>([]);
    const pathname = usePathname();
    const [closedNotices, setClosedNotices] = useState<string[]>([]);
    const [selectedVideoUrl, setSelectedVideoUrl] = useState<string | null>(null);
    const { activeMovie } = useActiveMovie();

    useEffect(() => {
        async function fetchNotices() {
            // 1. Check sessionStorage cache first (bypassed on localhost for instant updates)
            if (typeof window !== 'undefined' && window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1') {
                try {
                    const raw = sessionStorage.getItem(NOTICE_CACHE_KEY);
                    if (raw) {
                        const parsed = JSON.parse(raw);
                        if (parsed?.data && parsed?.ts && (Date.now() - parsed.ts < NOTICE_TTL_MS)) {
                            setNotices(parsed.data);
                            return;
                        }
                    }
                } catch { /* ignore */ }
            }

            // 2. Fetch from Supabase with all necessary columns
            const { data } = await supabase
                .from('notices')
                .select('id, type, content, image_url, video_url, pages, bg_color, text_color, movie_id')
                .eq('is_active', true);

            if (data) {
                setNotices(data);
                // Cache in sessionStorage
                if (typeof window !== 'undefined') {
                    try {
                        sessionStorage.setItem(NOTICE_CACHE_KEY, JSON.stringify({ data, ts: Date.now() }));
                    } catch { /* quota exceeded, ignore */ }
                }
            }
        }

        fetchNotices();
    }, []);

    const pathSegments = pathname?.split('/').filter(Boolean) || [];
    const isMoviePage = pathSegments.length >= 2 && ['movie', 'movies', 'series', 'anime'].includes(pathSegments[0]);

    const isMatch = (notice: NoticeFields) => {
        if (closedNotices.includes(notice.id)) return false;

        // If it's a specific content notice
        if (notice.movie_id) {
            return isMoviePage && activeMovie?.id === notice.movie_id;
        }

        // If we are on a movie/show details page, suppress global notices unless explicitly allowed
        if (isMoviePage) {
            if (!activeMovie || !activeMovie.allowGlobal) {
                return false;
            }
        }

        switch (notice.pages) {
            case 'all': return true;
            case 'home': return pathname === '/';
            case 'movie': return isMoviePage;
            default: return false;
        }
    };

    const handleClose = (id: string) => {
        setClosedNotices(prev => [...prev, id]);
    };

    // Helper to extract video info
    const getVideoInfo = (url: string | undefined) => {
        if (!url) return null;
        const ytRegex = /(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/;
        const ytMatch = url.match(ytRegex);
        if (ytMatch && ytMatch[1]) {
            return {
                type: 'youtube',
                embedUrl: `https://www.youtube.com/embed/${ytMatch[1]}?autoplay=1&mute=1&loop=1&playlist=${ytMatch[1]}`
            };
        }
        if (url.endsWith('.mp4') || url.endsWith('.webm') || url.endsWith('.ogg')) {
            return { type: 'direct', url };
        }
        return { type: 'iframe', url };
    };

    // Helper to check if string is a tailwind class/classes
    const isTailwind = (str: string | undefined): boolean => !!(str && !str.startsWith('#') && !str.startsWith('rgb'));

    // Filtered notices
    const topBarNotices = notices.filter(n => n.type === 'top_bar' && isMatch(n));
    const popupNotices = notices.filter(n => n.type === 'popup' && isMatch(n));
    const inlineNotices = notices.filter(n => n.type === 'inline' && isMatch(n));
    const toastNotices = notices.filter(n => n.type === 'toast' && isMatch(n));
    const bottomBarNotices = notices.filter(n => n.type === 'bottom_bar' && isMatch(n));
    const fullscreenNotices = notices.filter(n => n.type === 'fullscreen' && isMatch(n));
    const marqueeNotices = notices.filter(n => n.type === 'marquee' && isMatch(n));
    const marqueeBottomNotices = notices.filter(n => n.type === 'marquee_bottom' && isMatch(n));

    // Video Player Component
    const RenderVideo = ({ url }: { url: string }) => {
        const videoInfo = getVideoInfo(url);
        if (!videoInfo) return null;

        return (
            <div className="relative aspect-video rounded-xl overflow-hidden border border-white/10 bg-black shadow-inner">
                {videoInfo.type === 'youtube' && (
                    <iframe
                        src={videoInfo.embedUrl}
                        title="Notice Video"
                        className="absolute inset-0 w-full h-full border-0"
                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                        allowFullScreen
                    />
                )}
                {videoInfo.type === 'direct' && (
                    <video
                        src={videoInfo.url}
                        className="absolute inset-0 w-full h-full object-cover"
                        autoPlay
                        muted
                        loop
                        controls
                        playsInline
                    />
                )}
                {videoInfo.type === 'iframe' && (
                    <iframe
                        src={videoInfo.url}
                        className="absolute inset-0 w-full h-full border-0"
                        allowFullScreen
                    />
                )}
            </div>
        );
    };

    const getAccentColor = (notice: NoticeFields) => {
        if (notice.bg_color?.includes('gold')) return 'from-amber-500 via-yellow-400 to-amber-500';
        if (notice.bg_color?.includes('cyberpunk')) return 'from-purple-600 via-violet-500 to-cyan-500';
        if (notice.bg_color?.includes('red_gradient')) return 'from-red-600 via-red-500 to-orange-500';
        return null;
    };

    return (
        <>
            {/* Top Bars - Fixed at Top (Overlays Header) */}
            <div className="flex flex-col w-full z-[100] fixed top-0 left-0">
                {topBarNotices.map(notice => (
                    <div
                        key={notice.id}
                        className={`px-6 py-3.5 text-center text-sm font-semibold flex items-center justify-center relative shadow-2xl border-b border-white/5 backdrop-blur-md animate-slide-down transition-all duration-300 ${isTailwind(notice.bg_color) ? notice.bg_color : 'bg-red-600/90'} ${isTailwind(notice.text_color) ? notice.text_color : 'text-white'}`}
                        style={{
                            backgroundColor: !isTailwind(notice.bg_color) ? notice.bg_color : undefined,
                            color: !isTailwind(notice.text_color) ? notice.text_color : undefined
                        }}
                    >
                        <div className="flex items-center justify-center gap-3 max-w-5xl mx-auto px-8 flex-wrap md:flex-nowrap">
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-widest bg-red-600/20 text-red-400 border border-red-500/30 shadow-[0_0_12px_rgba(239,68,68,0.25)] animate-pulse shrink-0">
                                📢 Notice
                            </span>
                            <span className="leading-relaxed text-left" dangerouslySetInnerHTML={{ __html: notice.content }} />
                            {notice.video_url && (
                                <button
                                    onClick={() => setSelectedVideoUrl(notice.video_url || null)}
                                    className="px-3 py-1 bg-white/10 hover:bg-white/25 border border-white/20 hover:border-white/40 text-[10px] rounded-full font-black flex items-center gap-1.5 transition-all shadow-md shrink-0 uppercase tracking-widest scale-95 hover:scale-100 animate-pulse border-dashed"
                                >
                                    <span>📺</span> Watch Video
                                </button>
                            )}
                        </div>
                        <button
                            onClick={() => handleClose(notice.id)}
                            className="absolute right-4 p-1.5 bg-black/10 hover:bg-white/10 rounded-full transition-all duration-300 hover:rotate-90 border border-transparent hover:border-white/15"
                        >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                        </button>
                    </div>
                ))}

                {/* Marquee Ticker - Scrolling Text Bar (Top) */}
                {marqueeNotices.map(notice => (
                    <div
                        key={notice.id}
                        className={`py-2.5 relative overflow-hidden border-b border-white/5 flex ${isTailwind(notice.bg_color) ? notice.bg_color : 'bg-dark-900/95 backdrop-blur-xl'} ${isTailwind(notice.text_color) ? notice.text_color : 'text-white'}`}
                        style={{
                            backgroundColor: !isTailwind(notice.bg_color) ? notice.bg_color : undefined,
                            color: !isTailwind(notice.text_color) ? notice.text_color : undefined
                        }}
                    >
                        <div className="flex items-center animate-marquee whitespace-nowrap shrink-0 min-w-full justify-around">
                            {[...Array(4)].map((_, i) => (
                                <span key={i} className="inline-flex items-center gap-6 mx-8">
                                    <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-[9px] font-extrabold uppercase tracking-widest bg-red-500/20 text-red-400 border border-red-500/20">🔴 LIVE</span>
                                    <span className="text-sm font-semibold" dangerouslySetInnerHTML={{ __html: notice.content }} />
                                    <span className="text-white/20">●</span>
                                </span>
                            ))}
                        </div>
                        <div className="flex items-center animate-marquee whitespace-nowrap shrink-0 min-w-full justify-around" aria-hidden="true">
                            {[...Array(4)].map((_, i) => (
                                <span key={i} className="inline-flex items-center gap-6 mx-8">
                                    <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-[9px] font-extrabold uppercase tracking-widest bg-red-500/20 text-red-400 border border-red-500/20">🔴 LIVE</span>
                                    <span className="text-sm font-semibold" dangerouslySetInnerHTML={{ __html: notice.content }} />
                                    <span className="text-white/20">●</span>
                                </span>
                            ))}
                        </div>
                        <button
                            onClick={() => handleClose(notice.id)}
                            className="absolute right-2 top-1/2 -translate-y-1/2 p-1 bg-black/30 hover:bg-white/10 rounded-full transition-all z-10"
                        >
                            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" /></svg>
                        </button>
                    </div>
                ))}
            </div>

            {/* Inline Notices - Pushed below Header */}
            {inlineNotices.length > 0 && (
                <div className="relative z-40 container mx-auto px-4 mt-28 mb-8 space-y-5 max-w-5xl">
                    {inlineNotices.map(notice => {
                        const hasVideo = !!notice.video_url;
                        const accentGradient = getAccentColor(notice);
                        return (
                            <div
                                key={notice.id}
                                className={`p-6 md:p-8 rounded-3xl shadow-2xl border border-white/10 relative font-medium overflow-hidden animate-slide-up hover:border-white/15 transition-all duration-300 group/inline ${isTailwind(notice.bg_color) ? notice.bg_color : 'bg-dark-800/80 backdrop-blur-xl'} ${isTailwind(notice.text_color) ? notice.text_color : 'text-gray-100'}`}
                                style={{
                                    backgroundColor: !isTailwind(notice.bg_color) ? notice.bg_color : undefined,
                                    color: !isTailwind(notice.text_color) ? notice.text_color : undefined
                                }}
                            >
                                {/* Accent Line */}
                                {accentGradient ? (
                                    <div className={`absolute left-0 top-0 bottom-0 w-1.5 bg-gradient-to-b ${accentGradient}`} />
                                ) : !isTailwind(notice.bg_color) ? (
                                    <div className="absolute left-0 top-0 bottom-0 w-1.5" style={{ backgroundColor: notice.bg_color }} />
                                ) : (
                                    <div className="absolute left-0 top-0 bottom-0 w-1.5 bg-gradient-to-b from-red-600 via-red-500 to-orange-500" />
                                )}

                                {/* Ambient Glow */}
                                <div className="absolute -right-20 -top-20 w-48 h-48 bg-white/5 rounded-full blur-3xl pointer-events-none group-hover/inline:bg-white/10 transition-all duration-500" />

                                <div className={`flex flex-col gap-6 relative ${hasVideo ? 'lg:grid lg:grid-cols-[1.3fr_1fr] items-center' : 'w-full'}`}>
                                    {hasVideo && (
                                        <div className="w-full shrink-0 group/video overflow-hidden rounded-2xl border border-white/5 shadow-2xl">
                                            <RenderVideo url={notice.video_url!} />
                                        </div>
                                    )}

                                    <div className="flex flex-col sm:flex-row items-start gap-6 flex-1 pr-6">
                                        {!hasVideo && notice.image_url && (
                                            <img
                                                src={notice.image_url}
                                                alt=""
                                                className="w-full sm:w-36 h-auto rounded-2xl object-cover flex-shrink-0 border border-white/10 shadow-lg transform group-hover/inline:scale-105 transition-transform duration-500"
                                            />
                                        )}
                                        <div className="flex-1 text-sm md:text-base leading-relaxed font-semibold">
                                            <div dangerouslySetInnerHTML={{ __html: notice.content }} />
                                        </div>
                                    </div>

                                    <button
                                        onClick={() => handleClose(notice.id)}
                                        className="absolute -top-2 lg:top-0 -right-2 p-2 bg-white/5 hover:bg-red-500/20 text-white/70 hover:text-white rounded-full border border-white/10 hover:border-red-500/30 transition-all duration-300 hover:rotate-90 flex-shrink-0"
                                    >
                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
                                        </svg>
                                    </button>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}

            {/* Popups */}
            {popupNotices.length > 0 && (
                <div className="fixed inset-0 z-[110] flex items-center justify-center bg-black/90 backdrop-blur-md p-4 animate-fade-in">
                    <div
                        className={`max-w-xl w-full rounded-3xl p-8 shadow-2xl border border-white/15 relative overflow-hidden animate-scale-in font-medium bg-dark-900/90 backdrop-blur-2xl text-white ${isTailwind(popupNotices[0].bg_color) ? popupNotices[0].bg_color : ''}`}
                        style={{
                            backgroundColor: !isTailwind(popupNotices[0].bg_color) ? popupNotices[0].bg_color : undefined
                        }}
                    >
                        {/* Decorative Glow Orbs */}
                        <div className="absolute -right-24 -bottom-24 w-72 h-72 bg-red-600/10 rounded-full blur-[90px] pointer-events-none animate-pulse-slow" />
                        <div className="absolute -left-24 -top-24 w-72 h-72 bg-blue-600/10 rounded-full blur-[90px] pointer-events-none animate-pulse-slow [animation-delay:3s]" />

                        <button
                            onClick={() => handleClose(popupNotices[0].id)}
                            className="absolute top-4 right-4 p-2 bg-white/5 hover:bg-red-500/20 text-white/70 hover:text-white rounded-full border border-white/10 hover:border-red-500/30 transition-all duration-300 hover:rotate-90 z-20"
                        >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                        </button>

                        <div className="relative z-10 flex flex-col gap-6 mt-2">
                            <div className="flex justify-center">
                                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-extrabold uppercase tracking-widest bg-red-500/20 text-red-400 border border-red-500/30 shadow-[0_0_15px_rgba(239,68,68,0.3)] animate-pulse">
                                    📢 Announcement
                                </span>
                            </div>

                            {popupNotices[0].video_url ? (
                                <div className="w-full overflow-hidden rounded-2xl border border-white/5 shadow-2xl">
                                    <RenderVideo url={popupNotices[0].video_url} />
                                </div>
                            ) : popupNotices[0].image_url ? (
                                <img
                                    src={popupNotices[0].image_url}
                                    alt=""
                                    className="w-full h-auto rounded-2xl object-cover max-h-64 border border-white/10 shadow-2xl transform hover:scale-[1.02] transition-transform duration-500"
                                />
                            ) : null}

                            <div
                                className={`text-base md:text-lg font-bold text-center leading-relaxed ${isTailwind(popupNotices[0].text_color) ? popupNotices[0].text_color : 'text-gray-100'}`}
                                style={{ color: !isTailwind(popupNotices[0].text_color) ? popupNotices[0].text_color : undefined }}
                                dangerouslySetInnerHTML={{ __html: popupNotices[0].content }}
                            />
                        </div>
                    </div>
                </div>
            )}

            {/* Toast Notifications - Bottom Right Corner (like YouTube/Discord) */}
            <div className="fixed bottom-6 right-6 z-[100] flex flex-col-reverse gap-3 max-w-sm w-full pointer-events-none">
                {toastNotices.map((notice, i) => (
                    <ToastNotice
                        key={notice.id}
                        notice={notice}
                        index={i}
                        onClose={handleClose}
                        isTailwind={isTailwind}
                        setSelectedVideoUrl={setSelectedVideoUrl}
                    />
                ))}
            </div>

            {/* Bottom Bar - Fixed at Bottom (like Cookie Consent / Spotify) */}
            {bottomBarNotices.length > 0 && (
                <div className="fixed bottom-0 left-0 right-0 z-[100] flex flex-col">
                    {bottomBarNotices.map(notice => (
                        <div
                            key={notice.id}
                            className={`px-6 py-3.5 text-center text-sm font-semibold flex items-center justify-center relative shadow-[0_-8px_30px_rgba(0,0,0,0.3)] border-t border-white/5 backdrop-blur-xl animate-slide-up ${isTailwind(notice.bg_color) ? notice.bg_color : 'bg-dark-900/95'} ${isTailwind(notice.text_color) ? notice.text_color : 'text-white'}`}
                            style={{
                                backgroundColor: !isTailwind(notice.bg_color) ? notice.bg_color : undefined,
                                color: !isTailwind(notice.text_color) ? notice.text_color : undefined
                            }}
                        >
                            <div className="flex items-center justify-center gap-3 max-w-5xl mx-auto px-8 flex-wrap md:flex-nowrap">
                                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-widest bg-white/10 border border-white/10 shrink-0">
                                    📣 Update
                                </span>
                                <span className="leading-relaxed" dangerouslySetInnerHTML={{ __html: notice.content }} />
                                {notice.video_url && (
                                    <button
                                        onClick={() => setSelectedVideoUrl(notice.video_url || null)}
                                        className="px-3 py-1 bg-white/10 hover:bg-white/20 border border-white/15 text-[10px] rounded-full font-black flex items-center gap-1.5 transition-all shadow-md shrink-0 uppercase tracking-widest hover:scale-105"
                                    >
                                        <span>📺</span> Watch
                                    </button>
                                )}
                            </div>
                            <button
                                onClick={() => handleClose(notice.id)}
                                className="absolute right-4 p-1.5 bg-white/5 hover:bg-white/15 rounded-full transition-all duration-300 hover:rotate-90 border border-transparent hover:border-white/15"
                            >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" /></svg>
                            </button>
                        </div>
                    ))}
                </div>
            )}

            {/* Fullscreen Takeover - Like Netflix/Disney+ major announcements */}
            {fullscreenNotices.length > 0 && (
                <div className="fixed inset-0 z-[115] flex items-center justify-center bg-black/95 backdrop-blur-2xl p-4 animate-fade-in">
                    <div className="absolute inset-0 overflow-hidden pointer-events-none">
                        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-red-600/10 rounded-full blur-[120px] animate-pulse-slow" />
                        <div className="absolute top-1/4 right-1/4 w-[300px] h-[300px] bg-purple-600/8 rounded-full blur-[100px] animate-pulse-slow [animation-delay:2s]" />
                    </div>

                    <div className="relative max-w-3xl w-full text-center space-y-8 animate-scale-in">
                        <button
                            onClick={() => handleClose(fullscreenNotices[0].id)}
                            className="absolute -top-2 right-0 md:right-4 p-3 bg-white/5 hover:bg-red-500/20 text-white/70 hover:text-white rounded-full border border-white/10 hover:border-red-500/30 transition-all duration-300 hover:rotate-90 z-20"
                        >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" /></svg>
                        </button>

                        <div className="flex justify-center">
                            <span className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-[11px] font-extrabold uppercase tracking-[0.2em] bg-red-500/15 text-red-400 border border-red-500/25 shadow-[0_0_20px_rgba(239,68,68,0.2)] animate-pulse">
                                ⚡ Major Announcement
                            </span>
                        </div>

                        {fullscreenNotices[0].video_url ? (
                            <div className="w-full max-w-2xl mx-auto overflow-hidden rounded-2xl border border-white/10 shadow-2xl shadow-black/50">
                                <RenderVideo url={fullscreenNotices[0].video_url} />
                            </div>
                        ) : fullscreenNotices[0].image_url ? (
                            <img
                                src={fullscreenNotices[0].image_url}
                                alt=""
                                className="w-full max-w-2xl mx-auto h-auto rounded-2xl object-cover max-h-80 border border-white/10 shadow-2xl shadow-black/50"
                            />
                        ) : null}

                        <div
                            className={`text-2xl md:text-4xl font-black leading-tight max-w-2xl mx-auto ${isTailwind(fullscreenNotices[0].text_color) ? fullscreenNotices[0].text_color : 'text-white'}`}
                            style={{ color: !isTailwind(fullscreenNotices[0].text_color) ? fullscreenNotices[0].text_color : undefined }}
                            dangerouslySetInnerHTML={{ __html: fullscreenNotices[0].content }}
                        />

                        <button
                            onClick={() => handleClose(fullscreenNotices[0].id)}
                            className="inline-flex items-center gap-2 px-8 py-3.5 bg-white/10 hover:bg-white/15 border border-white/15 hover:border-white/25 text-white font-bold rounded-full transition-all duration-300 hover:scale-105 text-sm tracking-wide"
                        >
                            Got it, continue
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" /></svg>
                        </button>
                    </div>
                </div>
            )}

            {/* Marquee Ticker - Scrolling Text Bar (Bottom) */}
            {marqueeBottomNotices.length > 0 && (
                <div className="fixed bottom-0 left-0 right-0 z-[99] overflow-hidden border-t border-white/5 flex">
                    {marqueeBottomNotices.map(notice => (
                        <div
                            key={notice.id}
                            className={`py-2.5 relative flex-1 flex overflow-hidden ${isTailwind(notice.bg_color) ? notice.bg_color : 'bg-dark-900/95 backdrop-blur-xl'} ${isTailwind(notice.text_color) ? notice.text_color : 'text-white'}`}
                            style={{
                                backgroundColor: !isTailwind(notice.bg_color) ? notice.bg_color : undefined,
                                color: !isTailwind(notice.text_color) ? notice.text_color : undefined
                            }}
                        >
                            <div className="flex items-center animate-marquee whitespace-nowrap shrink-0 min-w-full justify-around">
                                {[...Array(4)].map((_, i) => (
                                    <span key={i} className="inline-flex items-center gap-6 mx-8">
                                        <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-[9px] font-extrabold uppercase tracking-widest bg-red-500/20 text-red-400 border border-red-500/20">🔴 LIVE</span>
                                        <span className="text-sm font-semibold" dangerouslySetInnerHTML={{ __html: notice.content }} />
                                        <span className="text-white/20">●</span>
                                    </span>
                                ))}
                            </div>
                            <div className="flex items-center animate-marquee whitespace-nowrap shrink-0 min-w-full justify-around" aria-hidden="true">
                                {[...Array(4)].map((_, i) => (
                                    <span key={i} className="inline-flex items-center gap-6 mx-8">
                                        <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-[9px] font-extrabold uppercase tracking-widest bg-red-500/20 text-red-400 border border-red-500/20">🔴 LIVE</span>
                                        <span className="text-sm font-semibold" dangerouslySetInnerHTML={{ __html: notice.content }} />
                                        <span className="text-white/20">●</span>
                                    </span>
                                ))}
                            </div>
                            <button
                                onClick={() => handleClose(notice.id)}
                                className="absolute right-2 top-1/2 -translate-y-1/2 p-1 bg-black/30 hover:bg-white/10 rounded-full transition-all z-10"
                            >
                                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" /></svg>
                            </button>
                        </div>
                    ))}
                </div>
            )}

            {/* Video Lightbox Modal (For top bars "Watch Video" clicks) */}
            {selectedVideoUrl && (
                <div
                    className="fixed inset-0 z-[120] flex items-center justify-center bg-black/90 backdrop-blur-lg p-4 animate-fade-in"
                    onClick={() => setSelectedVideoUrl(null)}
                >
                    <div
                        className="max-w-3xl w-full bg-dark-900/90 border border-white/10 rounded-3xl p-5 relative shadow-2xl animate-scale-in"
                        onClick={e => e.stopPropagation()}
                    >
                        <button
                            onClick={() => setSelectedVideoUrl(null)}
                            className="absolute -top-12 right-0 p-2 text-white hover:text-red-500 font-bold flex items-center gap-1.5 transition-colors text-sm tracking-wider uppercase"
                        >
                            Close ✕
                        </button>
                        <RenderVideo url={selectedVideoUrl} />
                    </div>
                </div>
            )}
        </>
    );
}

interface ToastNoticeProps {
    notice: NoticeFields;
    index: number;
    onClose: (id: string) => void;
    isTailwind: (str: string | undefined) => boolean;
    setSelectedVideoUrl: (url: string | null) => void;
}

function ToastNotice({ notice, index, onClose, isTailwind, setSelectedVideoUrl }: ToastNoticeProps) {
    useEffect(() => {
        const timer = setTimeout(() => {
            onClose(notice.id);
        }, 8000);
        return () => clearTimeout(timer);
    }, [notice.id, onClose]);

    return (
        <div
            className={`pointer-events-auto rounded-2xl p-4 shadow-2xl border border-white/10 backdrop-blur-xl animate-slide-in-right relative overflow-hidden group ${isTailwind(notice.bg_color) ? notice.bg_color : 'bg-dark-900/95'} ${isTailwind(notice.text_color) ? notice.text_color : 'text-white'}`}
            style={{
                backgroundColor: !isTailwind(notice.bg_color) ? notice.bg_color : undefined,
                color: !isTailwind(notice.text_color) ? notice.text_color : undefined,
                animationDelay: `${index * 150}ms`
            }}
        >
            {/* Glow accent */}
            <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-red-500 to-transparent opacity-60" />

            <div className="flex items-start gap-3">
                <div className="flex-shrink-0 w-8 h-8 rounded-xl bg-red-500/15 flex items-center justify-center text-red-400 mt-0.5">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" /></svg>
                </div>
                <div className="flex-1 min-w-0">
                    {notice.video_url && (
                        <button
                            onClick={() => setSelectedVideoUrl(notice.video_url || null)}
                            className="text-[10px] text-red-400 hover:text-red-300 font-bold uppercase tracking-wider mb-1.5 flex items-center gap-1 transition-colors"
                        >
                            <span>📺</span> Watch Video
                        </button>
                    )}
                    <div className="text-sm leading-relaxed font-medium" dangerouslySetInnerHTML={{ __html: notice.content }} />
                </div>
                <button
                    onClick={() => onClose(notice.id)}
                    className="flex-shrink-0 p-1 text-white/40 hover:text-white hover:bg-white/10 rounded-lg transition-all"
                >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                </button>
            </div>

            {/* Auto-dismiss progress bar */}
            <div className="absolute bottom-0 left-0 h-[2px] bg-gradient-to-r from-red-500 to-orange-500 animate-shrink-width" />
        </div>
    );
}
