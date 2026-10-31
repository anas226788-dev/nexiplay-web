'use client';

import { useEffect, useState, useCallback, useRef, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/lib/supabase';
import Link from 'next/link';
import Image from 'next/image';

// ========================================================
// Helpers & Types
// ========================================================
function isValidHttpUrl(string: string | undefined | null): boolean {
    if (!string || typeof string !== 'string' || string.trim().length < 8) return false;
    try {
        const url = new URL(string.trim());
        return url.protocol === 'http:' || url.protocol === 'https:';
    } catch (_) {
        return false;
    }
}

function SafeMediaIcon({
    src,
    alt,
    fallbackEmoji,
    className = 'w-full h-full object-contain p-1',
}: {
    src?: string;
    alt: string;
    fallbackEmoji: string;
    className?: string;
}) {
    const [hasError, setHasError] = useState(false);
    const valid = !hasError && isValidHttpUrl(src);

    if (!valid) {
        return <span className="select-none text-xl">{fallbackEmoji}</span>;
    }

    return (
        // eslint-disable-next-line @next/next/no-img-element
        <img
            src={src!.trim()}
            alt={alt}
            loading="lazy"
            onError={() => setHasError(true)}
            className={className}
        />
    );
}

interface Channel {
    id: string;
    name: string;
    logo: string;
    group: string;
    country: string;
    streamUrl: string;
    youtubeLiveUrl?: string;
    isTop?: boolean;
}

interface RadioStation {
    stationuuid: string;
    name: string;
    url: string;
    url_resolved: string;
    favicon: string;
    tags: string;
    country: string;
    countrycode: string;
    bitrate: number;
    codec: string;
}

const TV_COUNTRIES = [
    { code: 'bd', label: 'Bangladesh', flag: '🇧🇩' },
    { code: 'sports', label: 'Sports', flag: '⚽', isCategory: true },
    { code: 'in', label: 'India', flag: '🇮🇳' },
    { code: 'news', label: 'News', flag: '📰', isCategory: true },
    { code: 'kids', label: 'Kids', flag: '🧒', isCategory: true },
    { code: 'us', label: 'USA', flag: '🇺🇸' },
    { code: 'uk', label: 'UK', flag: '🇬🇧' },
];

const RADIO_COUNTRIES = [
    { code: 'BD', label: 'Bangladesh', flag: '🇧🇩' },
    { code: 'IN', label: 'India', flag: '🇮🇳' },
    { code: 'US', label: 'USA', flag: '🇺🇸' },
    { code: 'GB', label: 'UK', flag: '🇬🇧' },
];

export default function AccountPage() {
    const { user, loading: authLoading, signOut } = useAuth();
    const router = useRouter();

    // Active Navigation Tab
    const [activeTab, setActiveTab] = useState<'watchlist' | 'history' | 'livetv' | 'messages' | 'settings'>('watchlist');

    // Loading states
    const [watchlistLoading, setWatchlistLoading] = useState(true);
    const [historyLoading, setHistoryLoading] = useState(true);
    const [messagesLoading, setMessagesLoading] = useState(true);
    const [settingsLoading, setSettingsLoading] = useState(true);

    // Tab data states
    const [watchlist, setWatchlist] = useState<any[]>([]);
    const [history, setHistory] = useState<any[]>([]);
    const [historyFilter, setHistoryFilter] = useState<'all' | 'movie' | 'series' | 'anime'>('all');
    const [notifications, setNotifications] = useState<any[]>([]);
    const [myComments, setMyComments] = useState<any[]>([]);
    const [replies, setReplies] = useState<any[]>([]);

    // Settings states
    const [displayName, setDisplayName] = useState('');
    const [email, setEmail] = useState('');
    const [whatsapp, setWhatsapp] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [avatarUrl, setAvatarUrl] = useState('');
    const [uploadingAvatar, setUploadingAvatar] = useState(false);
    const [hideNsfw, setHideNsfw] = useState(false);
    const [updatingSettings, setUpdatingSettings] = useState(false);
    const [settingsSuccess, setSettingsSuccess] = useState('');
    const [showSignOutConfirm, setShowSignOutConfirm] = useState(false);

    // ========================================================
    // Live TV & Radio Section States
    // ========================================================
    const [liveMode, setLiveMode] = useState<'tv' | 'radio'>('tv');
    const [tvCountry, setTvCountry] = useState(TV_COUNTRIES[0]);
    const [liveChannels, setLiveChannels] = useState<Channel[]>([]);
    const [isTvChannelsLoading, setIsTvChannelsLoading] = useState(true);
    const [tvSearch, setTvSearch] = useState('');
    
    // Quick featured channels for overview
    const [quickFeaturedChannels, setQuickFeaturedChannels] = useState<Channel[]>([]);

    // Live Streaming Modal
    const [selectedStreamChannel, setSelectedStreamChannel] = useState<Channel | null>(null);
    const [streamFailed, setStreamFailed] = useState(false);
    const modalVideoRef = useRef<HTMLVideoElement>(null);

    // Radio States
    const [radioCountry, setRadioCountry] = useState('BD');
    const [radioStations, setRadioStations] = useState<RadioStation[]>([]);
    const [isRadioLoading, setIsRadioLoading] = useState(false);
    const [radioSearch, setRadioSearch] = useState('');
    const [activeRadioStation, setActiveRadioStation] = useState<RadioStation | null>(null);
    const [isRadioPlaying, setIsRadioPlaying] = useState(false);
    const [isRadioMuted, setIsRadioMuted] = useState(false);
    const audioRef = useRef<HTMLAudioElement>(null);

    // ----------------------------------------------------
    // Fetch Watchlist
    // ----------------------------------------------------
    const fetchWatchlist = useCallback(async (userId: string) => {
        setWatchlistLoading(true);
        const { data, error } = await supabase
            .from('user_watchlist')
            .select('*, movies(id, title, slug, type, poster_url, release_year, is_adult)')
            .eq('user_id', userId)
            .order('created_at', { ascending: false });
        if (!error && data) {
            setWatchlist(data as any[]);
        }
        setWatchlistLoading(false);
    }, []);

    // ----------------------------------------------------
    // Fetch History
    // ----------------------------------------------------
    const fetchHistory = useCallback(async (userId: string) => {
        setHistoryLoading(true);
        const { data, error } = await supabase
            .from('user_events')
            .select('*')
            .eq('user_id', userId)
            .eq('event_type', 'watch')
            .eq('deleted_by_user', false)
            .order('created_at', { ascending: false });
        if (!error && data) {
            setHistory(data as any[]);
        }
        setHistoryLoading(false);
    }, []);

    // ----------------------------------------------------
    // Fetch Notifications & Comments
    // ----------------------------------------------------
    const fetchMessages = useCallback(async (userId: string, userEmail: string) => {
        setMessagesLoading(true);
        // Admin direct messages
        const { data: notifs } = await supabase
            .from('user_notifications')
            .select('*')
            .eq('user_id', userId)
            .order('created_at', { ascending: false });
        if (notifs) setNotifications(notifs);

        // User comments
        const { data: comments, error: commErr } = await supabase
            .from('comments')
            .select('*, movies(title, slug, type)')
            .eq('email', userEmail)
            .order('created_at', { ascending: false });

        if (!commErr && comments) {
            const typedComments = comments as any[];
            setMyComments(typedComments);

            // Fetch replies
            if (typedComments.length > 0) {
                const commentIds = typedComments.map(c => c.id);
                const { data: reps } = await supabase
                    .from('comments')
                    .select('*, movies(title, slug, type)')
                    .in('parent_id', commentIds)
                    .order('created_at', { ascending: false });
                if (reps) setReplies(reps as any[]);
            }
        }
        setMessagesLoading(false);
    }, []);

    // ----------------------------------------------------
    // Fetch Profile Settings
    // ----------------------------------------------------
    const fetchSettings = useCallback(async (userId: string, userMetaName: string) => {
        setSettingsLoading(true);
        const { data, error } = await supabase
            .from('profiles')
            .select('display_name, hide_nsfw, whatsapp_number, avatar_url')
            .eq('id', userId)
            .single();
        if (!error && data) {
            setDisplayName(data.display_name || userMetaName || '');
            setHideNsfw(!!data.hide_nsfw);
            setWhatsapp(data.whatsapp_number || '');
            setAvatarUrl(data.avatar_url || '');
        } else {
            setDisplayName(userMetaName || '');
        }
        setSettingsLoading(false);
    }, []);

    // ----------------------------------------------------
    // Fetch Live TV Channels
    // ----------------------------------------------------
    const loadLiveChannels = useCallback(async (target: typeof TV_COUNTRIES[0]) => {
        setIsTvChannelsLoading(true);
        try {
            const query = target.isCategory
                ? `category=${target.code}`
                : `country=${target.code}`;
            const res = await fetch(`/api/live-tv/channels?${query}`);
            const data = await res.json();
            if (data.success && Array.isArray(data.channels)) {
                setLiveChannels(data.channels);
                if (target.code === 'bd' && quickFeaturedChannels.length === 0) {
                    setQuickFeaturedChannels(data.channels.slice(0, 10));
                }
            } else {
                setLiveChannels([]);
            }
        } catch (e) {
            console.error('Error fetching channels in profile:', e);
            setLiveChannels([]);
        } finally {
            setIsTvChannelsLoading(false);
        }
    }, [quickFeaturedChannels.length]);

    // ----------------------------------------------------
    // Fetch Radio Stations
    // ----------------------------------------------------
    const loadRadioStations = useCallback(async (countryCode: string, query?: string) => {
        setIsRadioLoading(true);
        try {
            const url = query
                ? `/api/live-tv/radio?q=${encodeURIComponent(query)}`
                : `/api/live-tv/radio?country=${countryCode}`;
            const res = await fetch(url);
            const data = await res.json();
            if (data.success && Array.isArray(data.stations)) {
                setRadioStations(data.stations);
            } else {
                setRadioStations([]);
            }
        } catch (e) {
            console.error('Error fetching radio stations in profile:', e);
            setRadioStations([]);
        } finally {
            setIsRadioLoading(false);
        }
    }, []);

    // ----------------------------------------------------
    // Initial Load & Auth Check
    // ----------------------------------------------------
    useEffect(() => {
        if (authLoading) return;
        if (!user) {
            router.push('/login');
            return;
        }

        const userMetaName = user.user_metadata?.display_name || user.user_metadata?.full_name || user.user_metadata?.name || user.email?.split('@')[0] || '';

        fetchWatchlist(user.id);
        fetchHistory(user.id);
        fetchMessages(user.id, user.email || '');
        fetchSettings(user.id, userMetaName);
        loadLiveChannels(tvCountry);

        setEmail(user.email || '');
        if (user.user_metadata?.avatar_url || user.user_metadata?.picture) {
            setAvatarUrl(user.user_metadata.avatar_url || user.user_metadata.picture);
        }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [user?.id, authLoading]);

    // Live TV channels on tab change or country switch
    useEffect(() => {
        if (activeTab === 'livetv') {
            if (liveMode === 'tv') {
                loadLiveChannels(tvCountry);
            } else {
                loadRadioStations(radioCountry, radioSearch);
            }
        }
    }, [activeTab, liveMode, tvCountry, radioCountry, radioSearch, loadLiveChannels, loadRadioStations]);

    // ----------------------------------------------------
    // Live TV Video Stream Attachment (HLS & Native)
    // ----------------------------------------------------
    useEffect(() => {
        if (!selectedStreamChannel || !modalVideoRef.current) return;
        const video = modalVideoRef.current;
        let hlsInstance: any = null;
        let isCancelled = false;

        setStreamFailed(false);

        const playStream = () => {
            if (video.canPlayType('application/vnd.apple.mpegurl')) {
                video.src = selectedStreamChannel.streamUrl;
                video.play().catch(() => {
                    if (!isCancelled) setStreamFailed(true);
                });
            } else {
                const win = window as any;
                const attachHls = () => {
                    if (isCancelled || !modalVideoRef.current) return;
                    if (win.Hls && win.Hls.isSupported()) {
                        hlsInstance = new win.Hls({
                            enableWorker: true,
                            backBufferLength: 30,
                            manifestLoadingTimeOut: 10000,
                        });
                        hlsInstance.loadSource(selectedStreamChannel.streamUrl);
                        hlsInstance.attachMedia(video);
                        hlsInstance.on(win.Hls.Events.MANIFEST_PARSED, () => {
                            if (!isCancelled) video.play().catch(() => {});
                        });
                        hlsInstance.on(win.Hls.Events.ERROR, (_event: any, data: any) => {
                            if (data.fatal) {
                                if (!isCancelled) setStreamFailed(true);
                                hlsInstance.destroy();
                            }
                        });
                    } else {
                        video.src = selectedStreamChannel.streamUrl;
                    }
                };

                if (win.Hls) {
                    attachHls();
                } else {
                    const script = document.createElement('script');
                    script.src = 'https://cdn.jsdelivr.net/npm/hls.js@1.5.8/dist/hls.min.js';
                    script.onload = attachHls;
                    script.onerror = () => {
                        if (!isCancelled) setStreamFailed(true);
                    };
                    document.head.appendChild(script);
                }
            }
        };

        playStream();

        return () => {
            isCancelled = true;
            if (hlsInstance) hlsInstance.destroy();
            video.src = '';
        };
    }, [selectedStreamChannel]);

    // ----------------------------------------------------
    // Live Radio Audio Control
    // ----------------------------------------------------
    useEffect(() => {
        if (!audioRef.current || !activeRadioStation) return;
        const audio = audioRef.current;
        const streamUrl = activeRadioStation.url_resolved || activeRadioStation.url;

        audio.src = streamUrl;
        audio.play()
            .then(() => setIsRadioPlaying(true))
            .catch((e) => {
                console.warn('Radio playback error:', e);
                setIsRadioPlaying(false);
            });
    }, [activeRadioStation]);

    useEffect(() => {
        if (audioRef.current) {
            audioRef.current.muted = isRadioMuted;
        }
    }, [isRadioMuted]);

    const stopRadio = () => {
        if (audioRef.current) {
            audioRef.current.pause();
            audioRef.current.src = '';
        }
        setActiveRadioStation(null);
        setIsRadioPlaying(false);
    };

    // ----------------------------------------------------
    // Computed Stats
    // ----------------------------------------------------
    const stats = useMemo(() => {
        const totalDurationSec = history.reduce((acc, h) => acc + (Number(h.duration_seconds) || 0), 0);
        const hours = Math.floor(totalDurationSec / 3600);
        const mins = Math.floor((totalDurationSec % 3600) / 60);
        const timeFormatted = hours > 0 ? `${hours}h ${mins}m` : `${mins}m`;

        return {
            savedCount: watchlist.length,
            watchedCount: history.length,
            timeWatched: timeFormatted,
            liveCount: '500+ Live',
        };
    }, [watchlist, history]);

    // Filtered History
    const filteredHistory = useMemo(() => {
        if (historyFilter === 'all') return history;
        return history.filter(item => item.content_type === historyFilter);
    }, [history, historyFilter]);

    // Filtered Channels
    const filteredChannels = useMemo(() => {
        if (!tvSearch.trim()) return liveChannels;
        const q = tvSearch.toLowerCase().trim();
        return liveChannels.filter(
            ch => ch.name.toLowerCase().includes(q) || ch.group.toLowerCase().includes(q)
        );
    }, [liveChannels, tvSearch]);

    // ----------------------------------------------------
    // Handlers
    // ----------------------------------------------------
    const handleRemoveWatchlist = async (watchlistId: string) => {
        const { error } = await supabase.from('user_watchlist').delete().eq('id', watchlistId);
        if (!error) {
            setWatchlist(prev => prev.filter(item => item.id !== watchlistId));
        }
    };

    const handleDeleteHistory = async (historyId: string) => {
        const { error } = await supabase.from('user_events').update({ deleted_by_user: true }).eq('id', historyId);
        if (!error) {
            setHistory(prev => prev.filter(item => item.id !== historyId));
        }
    };

    const handleClearAllHistory = async () => {
        if (!confirm('Are you sure you want to clear your entire watch history?')) return;
        const { error } = await supabase
            .from('user_events')
            .update({ deleted_by_user: true })
            .eq('user_id', user?.id)
            .eq('event_type', 'watch');
        if (!error) {
            setHistory([]);
        }
    };

    const handleMarkNotificationRead = async (notifId: string) => {
        const { error } = await supabase.from('user_notifications').update({ is_read: true }).eq('id', notifId);
        if (!error) {
            setNotifications(prev => prev.map(n => (n.id === notifId ? { ...n, is_read: true } : n)));
        }
    };

    const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file || !user) return;

        setUploadingAvatar(true);
        try {
            // Upload to completely free third-party image host (Catbox / Freeimage)
            // Preserves 100% of Supabase free tier storage quota (0 KB used in Supabase Storage)
            const formData = new FormData();
            formData.append('file', file);

            const uploadRes = await fetch('/api/upload-avatar', {
                method: 'POST',
                body: formData
            });

            const uploadJson = await uploadRes.json();
            if (!uploadRes.ok || !uploadJson.url) {
                throw new Error(uploadJson.error || 'Failed to upload photo to image hosting.');
            }

            const uploadedUrl = uploadJson.url;
            await supabase.auth.updateUser({ data: { avatar_url: uploadedUrl } });
            await supabase
                .from('profiles')
                .update({ avatar_url: uploadedUrl, updated_at: new Date().toISOString() })
                .eq('id', user.id);

            setAvatarUrl(uploadedUrl);
            alert('Profile photo updated successfully!');
        } catch (err: any) {
            alert(err.message || 'Failed to upload avatar photo.');
        } finally {
            setUploadingAvatar(false);
        }
    };

    const handleSaveSettings = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!user) return;

        if (password && password !== confirmPassword) {
            alert('Passwords do not match.');
            return;
        }

        setUpdatingSettings(true);
        setSettingsSuccess('');

        try {
            await supabase.auth.updateUser({
                data: { display_name: displayName, whatsapp_number: whatsapp },
            });

            const { error: profileErr } = await supabase
                .from('profiles')
                .update({
                    display_name: displayName,
                    whatsapp_number: whatsapp,
                    hide_nsfw: hideNsfw,
                    updated_at: new Date().toISOString(),
                })
                .eq('id', user.id);

            if (profileErr) throw profileErr;

            let emailMessage = '';
            if (email.trim().toLowerCase() !== user.email?.toLowerCase()) {
                const { error: emailErr } = await supabase.auth.updateUser({ email: email.trim() });
                if (emailErr) throw emailErr;
                emailMessage = ' Email confirmation link sent to both old and new addresses.';
            }

            let passwordMessage = '';
            if (password) {
                const { error: passErr } = await supabase.auth.updateUser({ password });
                if (passErr) throw passErr;
                setPassword('');
                setConfirmPassword('');
                passwordMessage = ' Password updated successfully.';
            }

            setSettingsSuccess(`Profile settings updated successfully!${emailMessage}${passwordMessage}`);
            setTimeout(() => setSettingsSuccess(''), 5000);
        } catch (err: any) {
            alert(err.message || 'Failed to update settings');
        } finally {
            setUpdatingSettings(false);
        }
    };

    const handleLogout = async () => {
        try {
            await signOut();
            router.push('/login');
        } catch (e) {
            console.error('Logout error:', e);
        }
    };

    const formatDate = (dateStr: string) => {
        return new Date(dateStr).toLocaleDateString(undefined, {
            month: 'short',
            day: 'numeric',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
        });
    };

    const formatDuration = (seconds: number) => {
        if (!seconds) return '0m';
        const mins = Math.floor(seconds / 60);
        if (mins < 1) return `${seconds}s`;
        const hrs = Math.floor(mins / 60);
        if (hrs < 1) return `${mins}m`;
        return `${hrs}h ${mins % 60}m`;
    };

    if (authLoading) {
        return (
            <div className="min-h-screen bg-[#090710] flex items-center justify-center">
                <div className="flex flex-col items-center gap-3">
                    <div className="w-12 h-12 rounded-full border-t-2 border-r-2 border-violet-500 animate-spin" />
                    <p className="text-gray-400 text-sm font-bold tracking-wider">Loading your profile...</p>
                </div>
            </div>
        );
    }

    const unreadNotifsCount = notifications.filter(n => !n.is_read).length;

    return (
        <div className="min-h-screen bg-[#090710] text-white pt-24 pb-28 md:pb-20 relative overflow-x-hidden selection:bg-violet-600 selection:text-white">
            {/* Background Ambient Violet Glow */}
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[350px] bg-gradient-to-b from-violet-600/15 via-purple-600/5 to-transparent blur-3xl pointer-events-none -z-10" />

            <div className="container mx-auto px-4 max-w-6xl">
                {/* ======================================================== */}
                {/* 1. UPGRADED HERO PROFILE HEADER */}
                {/* ======================================================== */}
                <div className="relative rounded-3xl bg-gradient-to-b from-[#161224]/90 to-[#100D1B]/90 border border-violet-500/20 shadow-2xl shadow-violet-950/40 p-5 sm:p-8 mb-6 backdrop-blur-xl overflow-hidden">
                    {/* Top Decorative Sparkle Line */}
                    <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-violet-500 to-transparent" />

                    <div className="flex flex-col md:flex-row items-center md:items-start justify-between gap-6">
                        {/* Avatar & User Details */}
                        <div className="flex flex-col sm:flex-row items-center gap-5 text-center sm:text-left">
                            {/* Profile Avatar with Glowing Border & Upload */}
                            <div className="relative group w-24 h-24 sm:w-28 sm:h-28 shrink-0">
                                <div className="w-full h-full rounded-2xl sm:rounded-3xl p-1 bg-gradient-to-tr from-violet-600 via-indigo-500 to-fuchsia-500 shadow-xl shadow-violet-900/40 relative">
                                    {avatarUrl ? (
                                        // eslint-disable-next-line @next/next/no-img-element
                                        <img
                                            src={avatarUrl}
                                            alt={displayName}
                                            className="w-full h-full rounded-[14px] sm:rounded-[20px] object-cover bg-[#13111C]"
                                        />
                                    ) : (
                                        <div className="w-full h-full rounded-[14px] sm:rounded-[20px] bg-gradient-to-br from-violet-700 to-purple-900 flex items-center justify-center text-white font-black text-3xl sm:text-4xl shadow-inner">
                                            {displayName.charAt(0).toUpperCase() || 'U'}
                                        </div>
                                    )}

                                    {/* Online Active Pulse */}
                                    <span className="absolute bottom-1 right-1 w-4 h-4 rounded-full bg-emerald-500 border-2 border-[#100D1B] shadow-sm animate-pulse" />
                                </div>

                                {/* Upload Avatar Overlay */}
                                <label
                                    htmlFor="avatar-file-input"
                                    className="absolute inset-0 bg-black/75 rounded-2xl sm:rounded-3xl flex flex-col items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-200 cursor-pointer border border-white/20 backdrop-blur-sm"
                                    title="Change profile avatar"
                                >
                                    <span className="text-xl">📷</span>
                                    <span className="text-[10px] font-bold text-violet-200 uppercase tracking-wider mt-0.5">Edit</span>
                                </label>
                                <input
                                    type="file"
                                    id="avatar-file-input"
                                    accept="image/*"
                                    onChange={handleAvatarChange}
                                    className="hidden"
                                    disabled={uploadingAvatar}
                                />
                                {uploadingAvatar && (
                                    <div className="absolute inset-0 bg-black/80 rounded-2xl sm:rounded-3xl flex items-center justify-center">
                                        <div className="w-6 h-6 rounded-full border-2 border-t-transparent border-violet-400 animate-spin" />
                                    </div>
                                )}
                            </div>

                            {/* Name, Email, VIP Badges */}
                            <div className="space-y-2">
                                <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2">
                                    <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-white flex items-center gap-2">
                                        <span>{displayName || 'Nexiplay Streamer'}</span>
                                    </h1>
                                    <span className="px-2.5 py-0.5 rounded-full text-[11px] font-extrabold bg-gradient-to-r from-amber-500/20 to-orange-500/20 border border-amber-500/40 text-amber-300 shadow-sm flex items-center gap-1">
                                        <span>👑</span> VIP Pass
                                    </span>
                                </div>

                                <p className="text-gray-400 text-xs sm:text-sm font-medium flex items-center justify-center sm:justify-start gap-1.5">
                                    <span>{user?.email}</span>
                                    <span className="text-emerald-400 text-xs" title="Verified Account">✓</span>
                                </p>

                                <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2 pt-1">
                                    <span className="px-3 py-1 rounded-xl text-[11px] font-bold bg-violet-600/15 border border-violet-500/30 text-violet-300 flex items-center gap-1.5">
                                        <span>⚡</span> 4K Ultra Streamer
                                    </span>
                                    <span className="px-3 py-1 rounded-xl text-[11px] font-bold bg-white/5 border border-white/10 text-gray-300 flex items-center gap-1.5">
                                        <span>🇧🇩</span> Bangladesh
                                    </span>
                                    <span className="px-3 py-1 rounded-xl text-[11px] font-bold bg-rose-500/15 border border-rose-500/30 text-rose-300 flex items-center gap-1.5 animate-pulse">
                                        <span>●</span> Live TV Ready
                                    </span>
                                </div>
                            </div>
                        </div>

                        {/* Profile Action Buttons */}
                        <div className="flex items-center gap-2.5 shrink-0 w-full sm:w-auto justify-center">
                            <button
                                onClick={() => setActiveTab('settings')}
                                className="flex-1 sm:flex-initial px-4 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-bold text-gray-200 hover:text-white transition-all flex items-center justify-center gap-2"
                            >
                                <span>⚙️</span>
                                <span>Edit Profile</span>
                            </button>
                            <button
                                onClick={() => setShowSignOutConfirm(true)}
                                className="px-4 py-2.5 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/30 text-xs font-bold text-rose-300 hover:text-rose-200 transition-all flex items-center justify-center gap-1.5"
                                title="Sign out from this device"
                            >
                                <span>🚪</span>
                                <span>Logout</span>
                            </button>
                        </div>
                    </div>

                    {/* ======================================================== */}
                    {/* STATS OVERVIEW CARDS (Activity Hub) */}
                    {/* ======================================================== */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-6 pt-6 border-t border-white/5">
                        <button
                            onClick={() => setActiveTab('watchlist')}
                            className="p-3.5 rounded-2xl bg-white/[0.03] hover:bg-white/[0.06] border border-white/5 transition-all text-left group"
                        >
                            <div className="flex items-center justify-between text-gray-400 mb-1">
                                <span className="text-[11px] font-bold uppercase tracking-wider">My List</span>
                                <span className="text-sm group-hover:scale-110 transition-transform">🔖</span>
                            </div>
                            <div className="text-xl sm:text-2xl font-black text-white group-hover:text-violet-300 transition-colors">
                                {stats.savedCount}
                            </div>
                            <span className="text-[10px] text-gray-400">Saved titles</span>
                        </button>

                        <button
                            onClick={() => setActiveTab('history')}
                            className="p-3.5 rounded-2xl bg-white/[0.03] hover:bg-white/[0.06] border border-white/5 transition-all text-left group"
                        >
                            <div className="flex items-center justify-between text-gray-400 mb-1">
                                <span className="text-[11px] font-bold uppercase tracking-wider">Streamed</span>
                                <span className="text-sm group-hover:scale-110 transition-transform">⏱️</span>
                            </div>
                            <div className="text-xl sm:text-2xl font-black text-white group-hover:text-violet-300 transition-colors">
                                {stats.watchedCount}
                            </div>
                            <span className="text-[10px] text-gray-400">Watched movies/series</span>
                        </button>

                        <div className="p-3.5 rounded-2xl bg-white/[0.03] border border-white/5 text-left">
                            <div className="flex items-center justify-between text-gray-400 mb-1">
                                <span className="text-[11px] font-bold uppercase tracking-wider">Watch Time</span>
                                <span className="text-sm">⌛</span>
                            </div>
                            <div className="text-xl sm:text-2xl font-black text-white">
                                {stats.timeWatched}
                            </div>
                            <span className="text-[10px] text-gray-400">Total playback</span>
                        </div>

                        <button
                            onClick={() => {
                                setActiveTab('livetv');
                                setLiveMode('tv');
                            }}
                            className="p-3.5 rounded-2xl bg-violet-600/15 hover:bg-violet-600/25 border border-violet-500/30 transition-all text-left group relative overflow-hidden"
                        >
                            <div className="flex items-center justify-between text-violet-300 mb-1">
                                <span className="text-[11px] font-bold uppercase tracking-wider flex items-center gap-1">
                                    <span className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-pulse" />
                                    Live Broadcast
                                </span>
                                <span className="text-sm group-hover:scale-110 transition-transform">📺</span>
                            </div>
                            <div className="text-xl sm:text-2xl font-black text-violet-200">
                                500+
                            </div>
                            <span className="text-[10px] text-violet-400/80">TV & Radio Channels</span>
                        </button>
                    </div>
                </div>

                {/* ======================================================== */}
                {/* 2. LIVE TV & RADIO QUICK LAUNCH BANNER (Always on Profile) */}
                {/* ======================================================== */}
                <div className="rounded-3xl bg-gradient-to-r from-violet-950/40 via-[#161225] to-[#120F1D] border border-violet-500/30 p-5 mb-8 shadow-xl">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
                        <div className="flex items-center gap-2.5">
                            <div className="w-8 h-8 rounded-xl bg-violet-600/30 border border-violet-400/40 flex items-center justify-center text-base">
                                📺
                            </div>
                            <div>
                                <h2 className="text-base font-black text-white flex items-center gap-2">
                                    <span>Live TV & Radio Hub</span>
                                    <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-rose-500 text-white uppercase tracking-wider animate-pulse">
                                        Live
                                    </span>
                                </h2>
                                <p className="text-xs text-gray-400">Popular channels & stations instantly ready for streaming</p>
                            </div>
                        </div>

                        <div className="flex items-center gap-2">
                            <button
                                onClick={() => {
                                    setActiveTab('livetv');
                                    setLiveMode('tv');
                                }}
                                className="px-3.5 py-1.5 rounded-xl bg-violet-600 hover:bg-violet-500 text-white text-xs font-bold transition-all shadow-md flex items-center gap-1.5"
                            >
                                <span>Browse 500+ Channels</span>
                                <span>➔</span>
                            </button>
                            <Link
                                href="/live-tv"
                                className="px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-bold text-gray-300 hover:text-white transition-all"
                            >
                                Fullscreen Player
                            </Link>
                        </div>
                    </div>

                    {/* Quick Channel Pills Scroll */}
                    <div className="flex items-center gap-2.5 overflow-x-auto pb-1 scrollbar-hide">
                        {quickFeaturedChannels.length > 0 ? (
                            quickFeaturedChannels.map((ch) => (
                                <button
                                    key={ch.id}
                                    onClick={() => setSelectedStreamChannel(ch)}
                                    className="px-3 py-2 rounded-xl bg-white/[0.04] hover:bg-violet-600/20 border border-white/5 hover:border-violet-500/40 transition-all flex items-center gap-2.5 shrink-0 group text-left"
                                >
                                    <div className="w-7 h-7 rounded-lg bg-black/40 border border-white/10 flex items-center justify-center relative overflow-hidden shrink-0">
                                        <SafeMediaIcon src={ch.logo} alt={ch.name} fallbackEmoji="📺" className="w-full h-full object-contain p-0.5" />
                                    </div>
                                    <div className="min-w-0 pr-1">
                                        <p className="text-xs font-bold text-white group-hover:text-violet-300 truncate max-w-[120px]">
                                            {ch.name}
                                        </p>
                                        <span className="text-[10px] text-gray-400">{ch.group || 'Live'}</span>
                                    </div>
                                    <span className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-pulse shrink-0" />
                                </button>
                            ))
                        ) : (
                            <div className="text-xs text-gray-400 py-2">
                                Loading top channels from Bangladesh...
                            </div>
                        )}
                    </div>
                </div>

                {/* ======================================================== */}
                {/* 3. MODERN HORIZONTAL PROFILE TABS BAR */}
                {/* ======================================================== */}
                <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
                    {/* Navigation Bar / Sidebar */}
                    <div className="lg:col-span-1">
                        <div className="rounded-2xl bg-[#131020]/90 border border-white/10 p-2 flex flex-row lg:flex-col gap-1.5 overflow-x-auto lg:overflow-visible scrollbar-hide sticky top-24 z-20 backdrop-blur-md">
                            {[
                                { id: 'watchlist', label: 'My List', icon: '🔖', badge: watchlist.length },
                                { id: 'history', label: 'Watch History', icon: '⏱️', badge: history.length },
                                { id: 'livetv', label: 'Live TV & Radio', icon: '📺', isLive: true },
                                { id: 'messages', label: 'Messages', icon: '✉️', unread: unreadNotifsCount },
                                { id: 'settings', label: 'Settings', icon: '⚙️' },
                            ].map((tab) => {
                                const isActive = activeTab === tab.id;
                                return (
                                    <button
                                        key={tab.id}
                                        onClick={() => setActiveTab(tab.id as any)}
                                        className={`flex items-center gap-2.5 px-4 py-3 rounded-xl text-xs sm:text-sm font-bold transition-all whitespace-nowrap shrink-0 lg:w-full ${
                                            isActive
                                                ? 'bg-gradient-to-r from-violet-600 to-indigo-600 text-white shadow-lg shadow-violet-900/40 border border-violet-400/30'
                                                : 'text-gray-400 hover:text-white hover:bg-white/5 border border-transparent'
                                        }`}
                                    >
                                        <span className="text-base">{tab.icon}</span>
                                        <span>{tab.label}</span>

                                        {/* Live Indicator Badge */}
                                        {tab.isLive && (
                                            <span className="ml-auto px-1.5 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider bg-rose-500 text-white animate-pulse">
                                                Live
                                            </span>
                                        )}

                                        {/* Counter Badge */}
                                        {tab.badge !== undefined && tab.badge > 0 && (
                                            <span className={`ml-auto px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                                isActive ? 'bg-white/20 text-white' : 'bg-white/5 text-gray-400'
                                            }`}>
                                                {tab.badge}
                                            </span>
                                        )}

                                        {/* Unread Notifications Badge */}
                                        {tab.unread !== undefined && tab.unread > 0 && (
                                            <span className="ml-auto px-2 py-0.5 rounded-full text-[10px] font-black bg-rose-600 text-white animate-bounce">
                                                {tab.unread}
                                            </span>
                                        )}
                                    </button>
                                );
                            })}
                        </div>
                    </div>

                    {/* ======================================================== */}
                    {/* 4. TAB PANELS CONTENT */}
                    {/* ======================================================== */}
                    <div className="lg:col-span-3">
                        <div className="rounded-3xl bg-[#120F1D]/80 border border-white/5 p-5 sm:p-8 min-h-[460px] backdrop-blur-xl shadow-xl">
                            
                            {/* ==================================================== */}
                            {/* TAB: WATCHLIST */}
                            {/* ==================================================== */}
                            {activeTab === 'watchlist' && (
                                <div className="space-y-6">
                                    <div className="flex items-center justify-between border-b border-white/5 pb-4">
                                        <h2 className="text-lg sm:text-xl font-black flex items-center gap-2">
                                            <span>🔖</span>
                                            <span>My Saved List</span>
                                            <span className="text-xs text-gray-400 font-normal">({watchlist.length})</span>
                                        </h2>
                                        <Link
                                            href="/movies"
                                            className="text-xs text-violet-300 hover:text-white font-bold transition-colors"
                                        >
                                            + Explore more
                                        </Link>
                                    </div>

                                    {watchlistLoading ? (
                                        <div className="flex flex-col items-center justify-center py-24 gap-3 animate-pulse">
                                            <div className="w-8 h-8 rounded-full border-2 border-t-transparent border-violet-500 animate-spin" />
                                            <p className="text-gray-500 text-xs font-bold uppercase tracking-widest">Loading Watchlist...</p>
                                        </div>
                                    ) : watchlist.length > 0 ? (
                                        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                                            {watchlist.map((item) => {
                                                if (!item.movies) return null;
                                                return (
                                                    <div
                                                        key={item.id}
                                                        className="relative group rounded-2xl overflow-hidden bg-[#171424] border border-white/5 hover:border-violet-500/40 transition-all shadow-lg"
                                                    >
                                                        <Link href={`/${item.movies.type}/${item.movies.slug}`} className="block">
                                                            <div className="relative aspect-[2/3] w-full bg-black/40">
                                                                <Image
                                                                    src={item.movies.poster_url || '/placeholder-poster.jpg'}
                                                                    alt={item.movies.title}
                                                                    fill
                                                                    sizes="(max-width: 768px) 50vw, (max-width: 1200px) 33vw, 25vw"
                                                                    className="object-cover group-hover:scale-105 transition-transform duration-300"
                                                                />
                                                                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-end p-3">
                                                                    <span className="text-xs font-black text-white flex items-center gap-1">
                                                                        <span>▶</span> Watch Now
                                                                    </span>
                                                                </div>
                                                            </div>
                                                            <div className="p-3">
                                                                <h3 className="font-bold text-xs truncate text-white group-hover:text-violet-300 transition-colors">
                                                                    {item.movies.title}
                                                                </h3>
                                                                <div className="flex items-center justify-between text-[10px] text-gray-400 mt-1">
                                                                    <span className="uppercase font-bold tracking-wider">{item.movies.type}</span>
                                                                    {item.movies.release_year && <span>{item.movies.release_year}</span>}
                                                                </div>
                                                            </div>
                                                        </Link>
                                                        <button
                                                            onClick={() => handleRemoveWatchlist(item.id)}
                                                            className="absolute top-2 right-2 p-1.5 rounded-xl bg-black/80 hover:bg-rose-600 text-gray-300 hover:text-white border border-white/10 transition-all opacity-0 group-hover:opacity-100"
                                                            title="Remove from list"
                                                        >
                                                            🗑️
                                                        </button>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    ) : (
                                        <div className="text-center py-16 px-4 rounded-3xl border border-dashed border-white/10 bg-white/[0.01]">
                                            <div className="w-16 h-16 mx-auto rounded-2xl bg-white/5 flex items-center justify-center text-3xl mb-3">
                                                🔖
                                            </div>
                                            <p className="text-sm font-bold text-gray-300">Your watch list is currently empty</p>
                                            <p className="text-xs text-gray-500 max-w-sm mx-auto mt-1">
                                                Save your favorite movies, anime, and series to watch them later whenever you want.
                                            </p>
                                            <div className="flex flex-wrap items-center justify-center gap-2 mt-4">
                                                <Link href="/movies" className="px-4 py-2 rounded-xl bg-violet-600 hover:bg-violet-500 text-white text-xs font-bold transition-all">
                                                    Browse Movies
                                                </Link>
                                                <Link href="/anime" className="px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-white text-xs font-bold transition-all">
                                                    Anime Series
                                                </Link>
                                                <button
                                                    onClick={() => {
                                                        setActiveTab('livetv');
                                                        setLiveMode('tv');
                                                    }}
                                                    className="px-4 py-2 rounded-xl bg-rose-600/20 hover:bg-rose-600/30 border border-rose-500/30 text-rose-300 text-xs font-bold transition-all"
                                                >
                                                    📺 Watch Live TV
                                                </button>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            )}

                            {/* ==================================================== */}
                            {/* TAB: WATCH HISTORY */}
                            {/* ==================================================== */}
                            {activeTab === 'history' && (
                                <div className="space-y-6">
                                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-white/5 pb-4">
                                        <h2 className="text-lg sm:text-xl font-black flex items-center gap-2">
                                            <span>⏱️</span>
                                            <span>Watch History</span>
                                            <span className="text-xs text-gray-400 font-normal">({filteredHistory.length})</span>
                                        </h2>

                                        {history.length > 0 && (
                                            <div className="flex items-center gap-2">
                                                {/* Filter pills */}
                                                <div className="flex items-center gap-1 bg-white/5 p-1 rounded-xl">
                                                    {(['all', 'movie', 'series', 'anime'] as const).map((f) => (
                                                        <button
                                                            key={f}
                                                            onClick={() => setHistoryFilter(f)}
                                                            className={`px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase transition-all ${
                                                                historyFilter === f
                                                                    ? 'bg-violet-600 text-white'
                                                                    : 'text-gray-400 hover:text-white'
                                                            }`}
                                                        >
                                                            {f}
                                                        </button>
                                                    ))}
                                                </div>

                                                <button
                                                    onClick={handleClearAllHistory}
                                                    className="px-3 py-1.5 rounded-xl bg-rose-500/15 hover:bg-rose-500/25 border border-rose-500/30 text-rose-300 text-xs font-bold transition-all"
                                                >
                                                    Clear All
                                                </button>
                                            </div>
                                        )}
                                    </div>

                                    {historyLoading ? (
                                        <div className="flex flex-col items-center justify-center py-24 gap-3 animate-pulse">
                                            <div className="w-8 h-8 rounded-full border-2 border-t-transparent border-violet-500 animate-spin" />
                                            <p className="text-gray-500 text-xs font-bold uppercase tracking-widest">Loading History...</p>
                                        </div>
                                    ) : filteredHistory.length > 0 ? (
                                        <div className="space-y-3">
                                            {filteredHistory.map((item) => {
                                                const watchUrl = item.season_number
                                                    ? `/watch/${item.content_type}/${item.metadata?.slug || ''}?season=${item.season_number}&episode=${item.episode_number}`
                                                    : `/watch/${item.content_type}/${item.metadata?.slug || ''}`;

                                                return (
                                                    <div
                                                        key={item.id}
                                                        className="flex items-center justify-between gap-4 p-4 rounded-2xl bg-white/[0.02] border border-white/5 hover:border-white/10 hover:bg-white/[0.04] transition-all group"
                                                    >
                                                        <Link href={watchUrl} className="flex-1 min-w-0">
                                                            <h3 className="font-bold text-sm text-white group-hover:text-violet-300 transition-colors truncate">
                                                                {item.content_title}
                                                            </h3>
                                                            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-gray-400 mt-1">
                                                                <span className="capitalize font-semibold text-gray-300">{item.content_type}</span>
                                                                {item.season_number && (
                                                                    <span>• S{item.season_number} Ep{item.episode_number}</span>
                                                                )}
                                                                {item.metadata?.server && <span>• Server: {item.metadata.server}</span>}
                                                                <span>• {formatDate(item.created_at)}</span>
                                                            </div>
                                                        </Link>

                                                        <div className="flex items-center gap-3 shrink-0">
                                                            <span className="text-xs font-bold text-violet-300 bg-violet-600/15 border border-violet-500/20 px-2.5 py-1 rounded-lg">
                                                                {formatDuration(item.duration_seconds)}
                                                            </span>
                                                            <button
                                                                onClick={() => handleDeleteHistory(item.id)}
                                                                className="p-2 rounded-xl bg-white/5 hover:bg-rose-600/20 text-gray-400 hover:text-rose-300 transition-colors"
                                                                title="Delete from history"
                                                            >
                                                                🗑️
                                                            </button>
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    ) : (
                                        <div className="text-center py-16 text-gray-500 border border-dashed border-white/5 rounded-2xl">
                                            <p className="text-sm font-medium">No watch history found for this category.</p>
                                        </div>
                                    )}
                                </div>
                            )}

                            {/* ==================================================== */}
                            {/* TAB: LIVE TV & RADIO (NEW FULL-FEATURED SECTION) */}
                            {/* ==================================================== */}
                            {activeTab === 'livetv' && (
                                <div className="space-y-6">
                                    {/* Sub-mode Switcher: TV vs Radio */}
                                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/5 pb-5">
                                        <div className="flex items-center gap-2 p-1 bg-[#161224] rounded-2xl border border-white/10 w-fit">
                                            <button
                                                onClick={() => setLiveMode('tv')}
                                                className={`px-4 py-2 rounded-xl text-xs font-black transition-all flex items-center gap-2 ${
                                                    liveMode === 'tv'
                                                        ? 'bg-violet-600 text-white shadow-lg'
                                                        : 'text-gray-400 hover:text-white'
                                                }`}
                                            >
                                                <span>📺</span>
                                                <span>Live TV Channels</span>
                                            </button>
                                            <button
                                                onClick={() => setLiveMode('radio')}
                                                className={`px-4 py-2 rounded-xl text-xs font-black transition-all flex items-center gap-2 ${
                                                    liveMode === 'radio'
                                                        ? 'bg-violet-600 text-white shadow-lg'
                                                        : 'text-gray-400 hover:text-white'
                                                }`}
                                            >
                                                <span>📻</span>
                                                <span>Live Radio</span>
                                            </button>
                                        </div>

                                        <Link
                                            href="/live-tv"
                                            className="px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-bold text-gray-300 hover:text-white transition-all flex items-center justify-center gap-1.5 w-fit"
                                        >
                                            <span>Full Screen Mode</span>
                                            <span>↗</span>
                                        </Link>
                                    </div>

                                    {/* ================= LIVE TV MODE ================= */}
                                    {liveMode === 'tv' && (
                                        <div className="space-y-5">
                                            {/* Filter & Search Bar */}
                                            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
                                                <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-hide">
                                                    {TV_COUNTRIES.map((c) => (
                                                        <button
                                                            key={c.code}
                                                            onClick={() => setTvCountry(c)}
                                                            className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all flex items-center gap-1.5 shrink-0 ${
                                                                tvCountry.code === c.code
                                                                    ? 'bg-violet-600 text-white shadow-md'
                                                                    : 'bg-white/5 text-gray-400 hover:text-white border border-white/5'
                                                            }`}
                                                        >
                                                            <span>{c.flag}</span>
                                                            <span>{c.label}</span>
                                                        </button>
                                                    ))}
                                                </div>

                                                <div className="relative flex-1 max-w-xs">
                                                    <input
                                                        type="text"
                                                        placeholder="Search TV channels..."
                                                        value={tvSearch}
                                                        onChange={(e) => setTvSearch(e.target.value)}
                                                        className="w-full px-3.5 py-2 rounded-xl bg-[#141120] border border-white/10 text-white placeholder-gray-500 text-xs focus:outline-none focus:border-violet-500"
                                                    />
                                                </div>
                                            </div>

                                            {/* Channels Grid */}
                                            {isTvChannelsLoading ? (
                                                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                                                    {[...Array(8)].map((_, i) => (
                                                        <div key={i} className="h-28 rounded-2xl bg-white/5 animate-pulse" />
                                                    ))}
                                                </div>
                                            ) : filteredChannels.length > 0 ? (
                                                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                                                    {filteredChannels.map((ch) => (
                                                        <div
                                                            key={ch.id}
                                                            className="p-3.5 rounded-2xl bg-[#151222] border border-white/5 hover:border-violet-500/40 transition-all flex flex-col items-center justify-between group text-center shadow-md relative"
                                                        >
                                                            <div className="flex items-center justify-between w-full mb-2">
                                                                <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-white/5 text-gray-400 truncate max-w-[80px]">
                                                                    {ch.group || 'Live'}
                                                                </span>
                                                                <span className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-pulse" />
                                                            </div>

                                                            <div className="w-12 h-12 rounded-xl bg-black/40 border border-white/10 flex items-center justify-center relative overflow-hidden mb-2">
                                                                <SafeMediaIcon src={ch.logo} alt={ch.name} fallbackEmoji="📺" />
                                                            </div>

                                                            <h4 className="font-bold text-xs text-white group-hover:text-violet-300 transition-colors truncate w-full mb-3">
                                                                {ch.name}
                                                            </h4>

                                                            <button
                                                                onClick={() => setSelectedStreamChannel(ch)}
                                                                className="w-full py-1.5 rounded-xl bg-violet-600/30 hover:bg-violet-600 border border-violet-500/40 text-violet-200 hover:text-white text-xs font-bold transition-all flex items-center justify-center gap-1.5"
                                                            >
                                                                <span>▶</span>
                                                                <span>Watch Live</span>
                                                            </button>
                                                        </div>
                                                    ))}
                                                </div>
                                            ) : (
                                                <div className="p-10 text-center rounded-2xl bg-white/[0.02] border border-white/5 text-gray-400 text-xs">
                                                    📡 No TV channels found for &quot;{tvSearch}&quot;.
                                                </div>
                                            )}
                                        </div>
                                    )}

                                    {/* ================= LIVE RADIO MODE ================= */}
                                    {liveMode === 'radio' && (
                                        <div className="space-y-5">
                                            {/* Radio Country Switcher & Search */}
                                            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
                                                <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-hide">
                                                    {RADIO_COUNTRIES.map((c) => (
                                                        <button
                                                            key={c.code}
                                                            onClick={() => setRadioCountry(c.code)}
                                                            className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all flex items-center gap-1.5 shrink-0 ${
                                                                radioCountry === c.code
                                                                    ? 'bg-violet-600 text-white shadow-md'
                                                                    : 'bg-white/5 text-gray-400 hover:text-white border border-white/5'
                                                            }`}
                                                        >
                                                            <span>{c.flag}</span>
                                                            <span>{c.label}</span>
                                                        </button>
                                                    ))}
                                                </div>

                                                <div className="relative flex-1 max-w-xs">
                                                    <input
                                                        type="text"
                                                        placeholder="Search stations, pop, quran..."
                                                        value={radioSearch}
                                                        onChange={(e) => setRadioSearch(e.target.value)}
                                                        className="w-full px-3.5 py-2 rounded-xl bg-[#141120] border border-white/10 text-white placeholder-gray-500 text-xs focus:outline-none focus:border-violet-500"
                                                    />
                                                </div>
                                            </div>

                                            {/* Stations Grid */}
                                            {isRadioLoading ? (
                                                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                                                    {[...Array(6)].map((_, i) => (
                                                        <div key={i} className="h-16 rounded-2xl bg-white/5 animate-pulse" />
                                                    ))}
                                                </div>
                                            ) : radioStations.length > 0 ? (
                                                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                                                    {radioStations.map((st) => {
                                                        const isCurrent = activeRadioStation?.stationuuid === st.stationuuid;
                                                        return (
                                                            <button
                                                                key={st.stationuuid}
                                                                onClick={() => setActiveRadioStation(st)}
                                                                className={`p-3 rounded-2xl border text-left flex items-center justify-between gap-3 transition-all ${
                                                                    isCurrent
                                                                        ? 'bg-violet-600/25 border-violet-500 text-white shadow-lg'
                                                                        : 'bg-[#151222] hover:bg-[#1A162B] border-white/5 text-gray-300'
                                                                }`}
                                                            >
                                                                <div className="flex items-center gap-3 min-w-0">
                                                                    <div className="w-9 h-9 rounded-xl bg-black/40 border border-white/10 flex items-center justify-center shrink-0 overflow-hidden text-base">
                                                                        <SafeMediaIcon src={st.favicon} alt={st.name} fallbackEmoji="📻" />
                                                                    </div>
                                                                    <div className="min-w-0">
                                                                        <p className="font-bold text-xs truncate text-white">{st.name}</p>
                                                                        <p className="text-[10px] text-gray-400 truncate">{st.tags || st.codec || 'Live Audio'}</p>
                                                                    </div>
                                                                </div>

                                                                <div className="shrink-0">
                                                                    {isCurrent && isRadioPlaying ? (
                                                                        <span className="w-2.5 h-2.5 rounded-full bg-violet-400 animate-ping inline-block" />
                                                                    ) : (
                                                                        <span className="text-[10px] text-gray-400 font-mono">
                                                                            {st.bitrate ? `${st.bitrate}k` : 'HQ'}
                                                                        </span>
                                                                    )}
                                                                </div>
                                                            </button>
                                                        );
                                                    })}
                                                </div>
                                            ) : (
                                                <div className="p-10 text-center rounded-2xl bg-white/[0.02] border border-white/5 text-gray-400 text-xs">
                                                    📻 No radio stations found.
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </div>
                            )}

                            {/* ==================================================== */}
                            {/* TAB: MESSAGES */}
                            {/* ==================================================== */}
                            {activeTab === 'messages' && (
                                <div className="space-y-8">
                                    {messagesLoading ? (
                                        <div className="flex flex-col items-center justify-center py-24 gap-3 animate-pulse">
                                            <div className="w-8 h-8 rounded-full border-2 border-t-transparent border-violet-500 animate-spin" />
                                            <p className="text-gray-500 text-xs font-bold uppercase tracking-widest">Loading Messages...</p>
                                        </div>
                                    ) : (
                                        <>
                                            {/* Direct Admin Messages */}
                                            <div className="space-y-4">
                                                <h2 className="text-lg sm:text-xl font-black border-b border-white/5 pb-4 flex items-center gap-2">
                                                    <span>👑</span> Admin Messages
                                                </h2>
                                                {notifications.length > 0 ? (
                                                    <div className="space-y-3">
                                                        {notifications.map((item) => (
                                                            <div
                                                                key={item.id}
                                                                className={`p-5 rounded-2xl border transition-all relative overflow-hidden ${
                                                                    !item.is_read
                                                                        ? 'bg-gradient-to-r from-violet-950/40 to-indigo-950/30 border-violet-500/40 shadow-lg'
                                                                        : 'bg-white/[0.02] border-white/5'
                                                                }`}
                                                            >
                                                                {!item.is_read && (
                                                                    <div className="absolute top-0 left-0 w-1.5 h-full bg-violet-500 animate-pulse" />
                                                                )}
                                                                <div className="flex items-start justify-between gap-4">
                                                                    <div className="space-y-1.5">
                                                                        <span className="inline-flex px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-violet-600/20 text-violet-300 border border-violet-500/30">
                                                                            Official Notice
                                                                        </span>
                                                                        <p className="text-gray-200 text-sm leading-relaxed">{item.message}</p>
                                                                        <span className="block text-[10px] text-gray-500">{formatDate(item.created_at)}</span>
                                                                    </div>
                                                                    {!item.is_read && (
                                                                        <button
                                                                            onClick={() => handleMarkNotificationRead(item.id)}
                                                                            className="text-xs font-bold text-violet-300 hover:text-white shrink-0"
                                                                        >
                                                                            Mark read
                                                                        </button>
                                                                    )}
                                                                </div>
                                                            </div>
                                                        ))}
                                                    </div>
                                                ) : (
                                                    <div className="text-center py-8 text-gray-500 border border-dashed border-white/5 rounded-2xl">
                                                        <p className="text-xs">No direct messages from Admin.</p>
                                                    </div>
                                                )}
                                            </div>

                                            {/* Replies */}
                                            <div className="space-y-4">
                                                <h2 className="text-lg sm:text-xl font-black border-b border-white/5 pb-4 flex items-center gap-2">
                                                    <span>💬</span> Comment Replies
                                                </h2>
                                                {replies.length > 0 ? (
                                                    <div className="space-y-3">
                                                        {replies.map((item) => (
                                                            <div key={item.id} className="p-4 rounded-2xl bg-white/[0.02] border border-white/5 space-y-2">
                                                                <div className="flex items-center justify-between text-xs">
                                                                    <span className="font-bold text-violet-300">{item.name} replied</span>
                                                                    <span className="text-gray-500">{formatDate(item.created_at)}</span>
                                                                </div>
                                                                <p className="text-gray-200 text-sm italic">&quot;{item.message}&quot;</p>
                                                                {item.movies && (
                                                                    <div className="text-xs text-gray-500">
                                                                        On: <Link href={`/${item.movies.type}/${item.movies.slug}`} className="text-violet-300 hover:underline font-semibold">{item.movies.title}</Link>
                                                                    </div>
                                                                )}
                                                            </div>
                                                        ))}
                                                    </div>
                                                ) : (
                                                    <div className="text-center py-8 text-gray-500 border border-dashed border-white/5 rounded-2xl">
                                                        <p className="text-xs">No replies to your comments yet.</p>
                                                    </div>
                                                )}
                                            </div>
                                        </>
                                    )}
                                </div>
                            )}

                            {/* ==================================================== */}
                            {/* TAB: SETTINGS */}
                            {/* ==================================================== */}
                            {activeTab === 'settings' && (
                                <div className="space-y-6">
                                    <h2 className="text-lg sm:text-xl font-black border-b border-white/5 pb-4 flex items-center gap-2">
                                        <span>⚙️</span> Account Settings
                                    </h2>
                                    {settingsLoading ? (
                                        <div className="flex flex-col items-center justify-center py-24 gap-3 animate-pulse">
                                            <div className="w-8 h-8 rounded-full border-2 border-t-transparent border-violet-500 animate-spin" />
                                            <p className="text-gray-500 text-xs font-bold uppercase tracking-widest">Loading Settings...</p>
                                        </div>
                                    ) : (
                                        <form onSubmit={handleSaveSettings} className="space-y-5 max-w-lg">
                                            {settingsSuccess && (
                                                <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-bold animate-in fade-in">
                                                    {settingsSuccess}
                                                </div>
                                            )}

                                            <div className="space-y-1.5">
                                                <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider">Email Address</label>
                                                <input
                                                    type="email"
                                                    value={email}
                                                    onChange={(e) => setEmail(e.target.value)}
                                                    required
                                                    className="w-full bg-white/5 border border-white/10 rounded-xl p-3 text-xs sm:text-sm text-white focus:outline-none focus:border-violet-400 transition-colors"
                                                />
                                                <p className="text-[10px] text-gray-500">Requires verification link click to finalize change.</p>
                                            </div>

                                            <div className="space-y-1.5">
                                                <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider">Display Name</label>
                                                <input
                                                    type="text"
                                                    value={displayName}
                                                    onChange={(e) => setDisplayName(e.target.value)}
                                                    required
                                                    className="w-full bg-white/5 border border-white/10 rounded-xl p-3 text-xs sm:text-sm text-white focus:outline-none focus:border-violet-400 transition-colors"
                                                />
                                            </div>

                                            <div className="space-y-1.5">
                                                <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider">WhatsApp Number</label>
                                                <input
                                                    type="tel"
                                                    value={whatsapp}
                                                    onChange={(e) => setWhatsapp(e.target.value)}
                                                    required
                                                    className="w-full bg-white/5 border border-white/10 rounded-xl p-3 text-xs sm:text-sm text-white focus:outline-none focus:border-violet-400 transition-colors"
                                                    placeholder="+88017XXXXXXXX"
                                                />
                                            </div>

                                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                                <div className="space-y-1.5">
                                                    <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider">New Password</label>
                                                    <input
                                                        type="password"
                                                        value={password}
                                                        onChange={(e) => setPassword(e.target.value)}
                                                        minLength={6}
                                                        className="w-full bg-white/5 border border-white/10 rounded-xl p-3 text-xs sm:text-sm text-white focus:outline-none focus:border-violet-400 transition-colors"
                                                        placeholder="Leave blank to keep"
                                                    />
                                                </div>
                                                <div className="space-y-1.5">
                                                    <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider">Confirm Password</label>
                                                    <input
                                                        type="password"
                                                        value={confirmPassword}
                                                        onChange={(e) => setConfirmPassword(e.target.value)}
                                                        minLength={6}
                                                        className="w-full bg-white/5 border border-white/10 rounded-xl p-3 text-xs sm:text-sm text-white focus:outline-none focus:border-violet-400 transition-colors"
                                                        placeholder="Confirm new password"
                                                    />
                                                </div>
                                            </div>

                                            {/* 18+ Adult Hide Mode Switch */}
                                            <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/5 flex items-center justify-between gap-4">
                                                <div className="space-y-1">
                                                    <h3 className="font-bold text-xs sm:text-sm text-white flex items-center gap-1.5">
                                                        <span>🔞</span> 18+ Hide Mode
                                                    </h3>
                                                    <p className="text-[11px] text-gray-500 leading-normal">
                                                        Hides all adult content from feeds, search results, and suggestions.
                                                    </p>
                                                </div>
                                                <button
                                                    type="button"
                                                    onClick={() => setHideNsfw(!hideNsfw)}
                                                    className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                                                        hideNsfw ? 'bg-violet-600' : 'bg-white/10'
                                                    }`}
                                                >
                                                    <span
                                                        className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                                                            hideNsfw ? 'translate-x-5' : 'translate-x-0'
                                                        }`}
                                                    />
                                                </button>
                                            </div>

                                            <button
                                                type="submit"
                                                disabled={updatingSettings}
                                                className="px-6 py-3 rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 text-white text-xs sm:text-sm font-bold hover:shadow-lg hover:shadow-violet-950/30 disabled:opacity-50 transition-all"
                                            >
                                                {updatingSettings ? 'Updating...' : 'Save Profile Settings'}
                                            </button>
                                        </form>
                                    )}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {/* Hidden Native Audio Element for Radio */}
            <audio ref={audioRef} onEnded={() => setIsRadioPlaying(false)} />

            {/* ======================================================== */}
            {/* 5. PERSISTENT RADIO MINI-PLAYER (When Radio is Active) */}
            {/* ======================================================== */}
            {activeRadioStation && (
                <div className="fixed bottom-16 md:bottom-6 left-4 right-4 max-w-xl mx-auto z-50 animate-slide-up">
                    <div className="p-3.5 rounded-2xl bg-[#141120]/95 backdrop-blur-xl border border-violet-500/40 shadow-2xl shadow-violet-950/80 flex items-center justify-between gap-3">
                        <div className="flex items-center gap-3 min-w-0">
                            <div className="w-10 h-10 rounded-xl bg-violet-600/30 border border-violet-400/40 flex items-center justify-center text-xl shrink-0 relative overflow-hidden">
                                <SafeMediaIcon src={activeRadioStation.favicon} alt={activeRadioStation.name} fallbackEmoji="📻" />
                            </div>
                            <div className="min-w-0">
                                <p className="font-bold text-xs truncate text-white">{activeRadioStation.name}</p>
                                <div className="flex items-center gap-1.5 text-[10px] text-gray-400">
                                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                                    <span>Playing Live Radio</span>
                                </div>
                            </div>
                        </div>

                        <div className="flex items-center gap-2 shrink-0">
                            <button
                                onClick={() => {
                                    if (audioRef.current) {
                                        if (isRadioPlaying) {
                                            audioRef.current.pause();
                                            setIsRadioPlaying(false);
                                        } else {
                                            audioRef.current.play();
                                            setIsRadioPlaying(true);
                                        }
                                    }
                                }}
                                className="w-8 h-8 rounded-full bg-violet-600 hover:bg-violet-500 text-white flex items-center justify-center transition-all"
                            >
                                {isRadioPlaying ? '⏸' : '▶'}
                            </button>

                            <button
                                onClick={() => setIsRadioMuted(!isRadioMuted)}
                                className="text-gray-400 hover:text-white p-1"
                            >
                                {isRadioMuted ? '🔇' : '🔊'}
                            </button>

                            <button
                                onClick={stopRadio}
                                className="px-3 py-1.5 rounded-xl bg-rose-600/20 hover:bg-rose-600/30 text-rose-300 text-xs font-bold border border-rose-500/30 transition-all"
                            >
                                Stop
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* ======================================================== */}
            {/* 6. EMBEDDED LIVE TV STREAM MODAL PLAYER */}
            {/* ======================================================== */}
            {selectedStreamChannel && (
                <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4">
                    <div className="relative w-full max-w-3xl rounded-3xl bg-[#110E1D] border border-violet-500/40 shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
                        {/* Modal Header */}
                        <div className="p-4 bg-[#161224] border-b border-white/10 flex items-center justify-between gap-3">
                            <div className="flex items-center gap-3 min-w-0">
                                <div className="w-8 h-8 rounded-xl bg-black/40 border border-white/10 flex items-center justify-center overflow-hidden shrink-0">
                                    <SafeMediaIcon src={selectedStreamChannel.logo} alt={selectedStreamChannel.name} fallbackEmoji="📺" />
                                </div>
                                <div className="min-w-0">
                                    <h3 className="font-bold text-sm text-white truncate flex items-center gap-2">
                                        <span>{selectedStreamChannel.name}</span>
                                        <span className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-pulse" />
                                    </h3>
                                    <p className="text-[10px] text-gray-400">{selectedStreamChannel.group || 'Live Stream'}</p>
                                </div>
                            </div>

                            <div className="flex items-center gap-2">
                                <Link
                                    href={`/live-tv?ch=${encodeURIComponent(selectedStreamChannel.name)}`}
                                    className="px-3 py-1.5 rounded-xl bg-violet-600 hover:bg-violet-500 text-white text-xs font-bold transition-all flex items-center gap-1"
                                >
                                    <span>Full Hub</span>
                                    <span>↗</span>
                                </Link>
                                <button
                                    onClick={() => setSelectedStreamChannel(null)}
                                    className="w-8 h-8 rounded-xl bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white flex items-center justify-center transition-all"
                                >
                                    ✕
                                </button>
                            </div>
                        </div>

                        {/* Video Player Canvas */}
                        <div className="relative aspect-video w-full bg-black flex items-center justify-center overflow-hidden">
                            <video
                                ref={modalVideoRef}
                                controls
                                autoPlay
                                playsInline
                                className="w-full h-full object-contain"
                            />

                            {streamFailed && (
                                <div className="absolute inset-0 bg-black/85 flex flex-col items-center justify-center p-6 text-center">
                                    <span className="text-3xl mb-2">📡</span>
                                    <p className="text-sm font-bold text-white mb-1">
                                        Channel stream is temporarily unavailable.
                                    </p>
                                    <p className="text-xs text-gray-400 max-w-sm mb-4">
                                        This channel may be broadcasting part-time or experiencing network restrictions.
                                    </p>
                                    <Link
                                        href={`/live-tv?ch=${encodeURIComponent(selectedStreamChannel.name)}`}
                                        className="px-4 py-2 rounded-xl bg-violet-600 text-white text-xs font-bold"
                                    >
                                        Try on Full Live TV Hub
                                    </Link>
                                </div>
                            )}
                        </div>

                        {/* Modal Footer Quick Channel Switcher */}
                        <div className="p-3 bg-[#131020] border-t border-white/5 flex items-center gap-2 overflow-x-auto scrollbar-hide">
                            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider shrink-0 pl-1">
                                Next:
                            </span>
                            {quickFeaturedChannels.map((c) => (
                                <button
                                    key={c.id}
                                    onClick={() => setSelectedStreamChannel(c)}
                                    className={`px-3 py-1 rounded-xl text-xs font-bold whitespace-nowrap transition-all flex items-center gap-1.5 shrink-0 ${
                                        selectedStreamChannel.id === c.id
                                            ? 'bg-violet-600 text-white'
                                            : 'bg-white/5 text-gray-300 hover:text-white'
                                    }`}
                                >
                                    <span>{c.name}</span>
                                </button>
                            ))}
                        </div>
                    </div>
                </div>
            )}

            {/* ======================================================== */}
            {/* 7. SIGN OUT CONFIRMATION MODAL */}
            {/* ======================================================== */}
            {showSignOutConfirm && (
                <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
                    <div className="w-full max-w-sm rounded-3xl bg-[#141122] border border-white/10 p-6 shadow-2xl text-center space-y-4 animate-in fade-in zoom-in-95">
                        <div className="w-12 h-12 mx-auto rounded-2xl bg-rose-500/15 border border-rose-500/30 flex items-center justify-center text-2xl">
                            🚪
                        </div>
                        <div className="space-y-1">
                            <h3 className="font-black text-lg text-white">Sign Out?</h3>
                            <p className="text-xs text-gray-400">
                                Are you sure you want to log out from this account on this device?
                            </p>
                        </div>
                        <div className="flex items-center gap-2 pt-2">
                            <button
                                onClick={() => setShowSignOutConfirm(false)}
                                className="flex-1 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-gray-300 text-xs font-bold transition-all"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleLogout}
                                className="flex-1 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold transition-all shadow-lg shadow-rose-900/30"
                            >
                                Confirm Logout
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
