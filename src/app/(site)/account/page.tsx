'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/lib/supabase';
import Link from 'next/link';
import Image from 'next/image';

interface WatchlistItem {
    id: string;
    movie_id: string;
    created_at: string;
    movies: {
        id: string;
        title: string;
        slug: string;
        type: 'movie' | 'series' | 'anime';
        poster_url: string | null;
        release_year: number | null;
        is_adult?: boolean;
    };
}

interface WatchHistoryItem {
    id: string;
    content_title: string;
    content_type: 'movie' | 'series' | 'anime';
    season_number: number | null;
    episode_number: number | null;
    metadata: {
        server?: string;
        slug?: string;
    };
    duration_seconds: number;
    created_at: string;
}

interface NotificationItem {
    id: string;
    message: string;
    is_read: boolean;
    created_at: string;
}

interface CommentItem {
    id: string;
    movie_id: string;
    name: string;
    message: string;
    created_at: string;
    movies?: {
        title: string;
        slug: string;
        type: string;
    };
}

interface ReplyItem extends CommentItem {
    parent_id: string;
}

export default function AccountPage() {
    const { user, loading: authLoading } = useAuth();
    const router = useRouter();

    const [activeTab, setActiveTab] = useState<'watchlist' | 'history' | 'messages' | 'settings'>('watchlist');
    const [watchlistLoading, setWatchlistLoading] = useState(true);
    const [historyLoading, setHistoryLoading] = useState(true);
    const [messagesLoading, setMessagesLoading] = useState(true);
    const [settingsLoading, setSettingsLoading] = useState(true);

    // Tab data states
    const [watchlist, setWatchlist] = useState<any[]>([]);
    const [history, setHistory] = useState<any[]>([]);
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

    // Fetch watchlist
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

    // Fetch history
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

    // Fetch notifications & comments
    const fetchMessages = useCallback(async (userId: string, userEmail: string) => {
        setMessagesLoading(true);
        // Fetch Admin DMs (notifications)
        const { data: notifs } = await supabase
            .from('user_notifications')
            .select('*')
            .eq('user_id', userId)
            .order('created_at', { ascending: false });
        if (notifs) setNotifications(notifs);

        // Fetch User's Comments
        const { data: comments, error: commErr } = await supabase
            .from('comments')
            .select('*, movies(title, slug, type)')
            .eq('email', userEmail)
            .order('created_at', { ascending: false });
        
        if (!commErr && comments) {
            const typedComments = comments as any[];
            setMyComments(typedComments);

            // Fetch replies to those comments
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

    // Fetch user profile settings
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

    // Load all data
    useEffect(() => {
        if (authLoading) return;
        if (!user) {
            router.push('/login');
            return;
        }

        const userMetaName = user.user_metadata?.display_name || user.email?.split('@')[0] || '';
        
        // Fetch independently so they don't block each other
        fetchWatchlist(user.id);
        fetchHistory(user.id);
        fetchMessages(user.id, user.email || '');
        fetchSettings(user.id, userMetaName);
        
        // Set initial email and avatar directly from auth session metadata to ensure it's up to date
        setEmail(user.email || '');
        if (user.user_metadata?.avatar_url) {
            setAvatarUrl(user.user_metadata.avatar_url);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [user?.id, authLoading]);

    // Handle remove from watchlist
    const handleRemoveWatchlist = async (watchlistId: string) => {
        const { error } = await supabase
            .from('user_watchlist')
            .delete()
            .eq('id', watchlistId);
        if (!error) {
            setWatchlist(prev => prev.filter(item => item.id !== watchlistId));
        }
    };

    // Handle delete history item
    const handleDeleteHistory = async (historyId: string) => {
        const { error } = await supabase
            .from('user_events')
            .update({ deleted_by_user: true })
            .eq('id', historyId);
        if (!error) {
            setHistory(prev => prev.filter(item => item.id !== historyId));
        }
    };

    // Handle mark notification as read
    const handleMarkNotificationRead = async (notifId: string) => {
        const { error } = await supabase
            .from('user_notifications')
            .update({ is_read: true })
            .eq('id', notifId);
        if (!error) {
            setNotifications(prev => prev.map(n => n.id === notifId ? { ...n, is_read: true } : n));
        }
    };

    // Handle profile avatar upload to ImgBB
    const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file || !user) return;

        setUploadingAvatar(true);
        try {
            const apiKey = process.env.NEXT_PUBLIC_IMGBB_API_KEY || 'c0386a7ef3811c25731e5504e51960a4';
            const formData = new FormData();
            formData.append('image', file);

            const res = await fetch(`https://api.imgbb.com/1/upload?key=${apiKey}`, {
                method: 'POST',
                body: formData
            });
            const data = await res.json();
            if (!res.ok || !data.data?.url) {
                throw new Error(data.error?.message || 'Failed to upload photo to ImgBB.');
            }

            const uploadedUrl = data.data.url;

            // 1. Update auth metadata
            await supabase.auth.updateUser({
                data: { avatar_url: uploadedUrl }
            });

            // 2. Update profiles table
            const { error: profileErr } = await supabase
                .from('profiles')
                .update({
                    avatar_url: uploadedUrl,
                    updated_at: new Date().toISOString()
                })
                .eq('id', user.id);

            if (profileErr) throw profileErr;

            setAvatarUrl(uploadedUrl);
            alert('Profile photo updated successfully!');
        } catch (err: any) {
            alert(err.message || 'Failed to upload avatar photo.');
        } finally {
            setUploadingAvatar(false);
        }
    };

    // Handle save settings
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
            // 1. Update Display Name and WhatsApp Number in metadata & profile table
            await supabase.auth.updateUser({
                data: { display_name: displayName, whatsapp_number: whatsapp }
            });

            const { error: profileErr } = await supabase
                .from('profiles')
                .update({
                    display_name: displayName,
                    whatsapp_number: whatsapp,
                    hide_nsfw: hideNsfw,
                    updated_at: new Date().toISOString()
                })
                .eq('id', user.id);

            if (profileErr) throw profileErr;

            // 2. Update Email if changed
            let emailMessage = '';
            if (email.trim().toLowerCase() !== user.email?.toLowerCase()) {
                const { error: emailErr } = await supabase.auth.updateUser({
                    email: email.trim()
                });
                if (emailErr) throw emailErr;
                emailMessage = ' Email confirmation link sent to both old and new addresses.';
            }

            // 3. Update Password if entered
            let passwordMessage = '';
            if (password) {
                const { error: passErr } = await supabase.auth.updateUser({
                    password: password
                });
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

    const formatDuration = (seconds: number) => {
        if (!seconds) return '0m';
        const mins = Math.floor(seconds / 60);
        if (mins < 1) return `${seconds}s`;
        const hrs = Math.floor(mins / 60);
        if (hrs < 1) return `${mins}m`;
        return `${hrs}h ${mins % 60}m`;
    };

    const formatDate = (dateStr: string) => {
        return new Date(dateStr).toLocaleDateString(undefined, {
            month: 'short',
            day: 'numeric',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    if (authLoading) {
        return (
            <div className="min-h-screen bg-[#07070a] flex items-center justify-center">
                <div className="flex flex-col items-center gap-3">
                    <div className="w-12 h-12 rounded-full border-t-2 border-r-2 border-red-600 animate-spin" />
                    <p className="text-gray-400 text-sm font-bold">Loading account...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-[#07070a] text-white pt-24 pb-20">
            <div className="container mx-auto px-4 max-w-6xl">
                {/* Profile Header */}
                <div className="glass rounded-3xl border border-white/5 p-6 md:p-8 flex flex-col md:flex-row items-center justify-between gap-6 mb-8">
                    <div className="flex flex-col md:flex-row items-center gap-6">
                        <div className="relative group w-24 h-24">
                            {avatarUrl ? (
                                <img
                                    src={avatarUrl}
                                    alt={displayName}
                                    className="w-24 h-24 rounded-2xl object-cover shadow-xl border border-white/10"
                                />
                            ) : (
                                <div className="w-24 h-24 rounded-2xl bg-gradient-to-br from-red-600 to-orange-600 flex items-center justify-center text-white font-black text-4xl shadow-xl shadow-red-950/20">
                                    {displayName.charAt(0).toUpperCase() || 'U'}
                                </div>
                            )}
                            {/* Upload overlay */}
                            <label
                                htmlFor="avatar-file-input"
                                className="absolute inset-0 bg-black/60 rounded-2xl flex flex-col items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer border border-white/20"
                            >
                                <span className="text-xl">📷</span>
                                <span className="text-[10px] font-bold text-gray-300 mt-1 uppercase tracking-wider">Change</span>
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
                                <div className="absolute inset-0 bg-black/85 rounded-2xl flex items-center justify-center">
                                    <div className="w-6 h-6 rounded-full border-2 border-t-transparent border-red-500 animate-spin" />
                                </div>
                            )}
                        </div>
                        <div className="text-center md:text-left">
                            <h1 className="text-2xl md:text-3xl font-black">{displayName}</h1>
                            <p className="text-gray-400 text-sm mt-1">{user?.email}</p>
                            <span className="inline-flex mt-3 px-3 py-1 rounded-full text-xs font-bold bg-white/5 border border-white/5 text-gray-300">
                                Premium Account
                            </span>
                        </div>
                    </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
                    {/* Navigation Sidebar */}
                    <div className="lg:col-span-1">
                        <div className="glass rounded-2xl border border-white/5 p-2 flex flex-row lg:flex-col gap-1 overflow-x-auto lg:overflow-visible">
                            {[
                                { id: 'watchlist', label: 'My List', icon: '🔖' },
                                { id: 'history', label: 'Watch History', icon: '⏱️' },
                                { id: 'messages', label: 'Messages', icon: '✉️' },
                                { id: 'settings', label: 'Settings', icon: '⚙️' }
                            ].map(tab => (
                                <button
                                    key={tab.id}
                                    onClick={() => setActiveTab(tab.id as any)}
                                    className={`flex items-center gap-3 px-4 py-3.5 rounded-xl text-sm font-bold transition-all whitespace-nowrap lg:w-full ${
                                        activeTab === tab.id
                                            ? 'bg-gradient-to-r from-red-600 to-orange-600 text-white shadow-lg shadow-red-900/30'
                                            : 'text-gray-400 hover:text-white hover:bg-white/5'
                                    }`}
                                >
                                    <span>{tab.icon}</span>
                                    <span>{tab.label}</span>
                                    {tab.id === 'messages' && notifications.filter(n => !n.is_read).length > 0 && (
                                        <span className="ml-auto bg-red-500 text-white px-2 py-0.5 rounded-full text-[10px]">
                                            {notifications.filter(n => !n.is_read).length}
                                        </span>
                                    )}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Tab Panels */}
                    <div className="lg:col-span-3">
                        <div className="glass rounded-3xl border border-white/5 p-6 md:p-8 min-h-[400px]">
                            
                            {/* WATCHLIST TAB */}
                            {activeTab === 'watchlist' && (
                                <div className="space-y-6">
                                    <h2 className="text-xl font-black border-b border-white/5 pb-4 flex items-center gap-2">
                                        <span>🔖</span> My List
                                    </h2>
                                    {watchlistLoading ? (
                                        <div className="flex flex-col items-center justify-center py-24 gap-3 animate-pulse">
                                            <div className="w-8 h-8 rounded-full border-2 border-t-transparent border-red-500 animate-spin" />
                                            <p className="text-gray-500 text-xs font-bold uppercase tracking-widest">Loading Watchlist...</p>
                                        </div>
                                    ) : watchlist.length > 0 ? (
                                        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                                            {watchlist.map(item => {
                                                if (!item.movies) return null;
                                                return (
                                                    <div key={item.id} className="relative group rounded-xl overflow-hidden glass border border-white/5 hover:border-white/10 transition-all">
                                                        <Link href={`/${item.movies.type}/${item.movies.slug}`} className="block">
                                                            <div className="relative aspect-[2/3] w-full">
                                                                <Image
                                                                    src={item.movies.poster_url || '/placeholder-poster.jpg'}
                                                                    alt={item.movies.title}
                                                                    fill
                                                                    sizes="(max-width: 768px) 50vw, (max-width: 1200px) 33vw, 25vw"
                                                                    className="object-cover group-hover:scale-105 transition-transform duration-300"
                                                                />
                                                            </div>
                                                            <div className="p-3">
                                                                <h3 className="font-bold text-sm truncate text-white group-hover:text-red-500 transition-colors">{item.movies.title}</h3>
                                                                <span className="text-[10px] uppercase text-gray-500 font-bold">{item.movies.type}</span>
                                                            </div>
                                                        </Link>
                                                        <button
                                                            onClick={() => handleRemoveWatchlist(item.id)}
                                                            className="absolute top-2 right-2 p-1.5 rounded-lg bg-black/80 text-gray-400 hover:text-red-400 border border-white/10 transition-all opacity-0 group-hover:opacity-100"
                                                            title="Remove from list"
                                                        >
                                                            🗑️
                                                        </button>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    ) : (
                                        <div className="text-center py-16 text-gray-500 border border-dashed border-white/5 rounded-2xl">
                                            <p className="text-base">Your list is empty.</p>
                                            <Link href="/" className="mt-4 inline-block text-xs font-bold text-red-500 hover:text-red-400">Browse content</Link>
                                        </div>
                                    )}
                                </div>
                            )}

                            {/* WATCH HISTORY TAB */}
                            {activeTab === 'history' && (
                                <div className="space-y-6">
                                    <h2 className="text-xl font-black border-b border-white/5 pb-4 flex items-center gap-2">
                                        <span>⏱️</span> Watch History
                                    </h2>
                                    {historyLoading ? (
                                        <div className="flex flex-col items-center justify-center py-24 gap-3 animate-pulse">
                                            <div className="w-8 h-8 rounded-full border-2 border-t-transparent border-red-500 animate-spin" />
                                            <p className="text-gray-500 text-xs font-bold uppercase tracking-widest">Loading History...</p>
                                        </div>
                                    ) : history.length > 0 ? (
                                        <div className="space-y-4">
                                            {history.map(item => {
                                                const watchUrl = item.season_number 
                                                    ? `/watch/${item.content_type}/${item.metadata?.slug || ''}?season=${item.season_number}&episode=${item.episode_number}`
                                                    : `/watch/${item.content_type}/${item.metadata?.slug || ''}`;
                                                
                                                return (
                                                    <div key={item.id} className="flex items-center justify-between gap-4 p-4 rounded-xl bg-white/[0.02] border border-white/5 hover:bg-white/[0.04] transition-all">
                                                        <Link href={watchUrl} className="flex-1 min-w-0">
                                                            <h3 className="font-bold text-sm text-white hover:text-red-500 transition-colors truncate">{item.content_title}</h3>
                                                            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-gray-500 mt-1">
                                                                <span className="capitalize">{item.content_type}</span>
                                                                {item.season_number && <span>• Season {item.season_number} Ep {item.episode_number}</span>}
                                                                {item.metadata?.server && <span>• Server: {item.metadata.server}</span>}
                                                                <span>• {formatDate(item.created_at)}</span>
                                                            </div>
                                                        </Link>
                                                        <div className="flex items-center gap-3">
                                                            <span className="text-xs font-bold text-red-500 bg-red-500/10 px-2 py-1 rounded">
                                                                {formatDuration(item.duration_seconds)}
                                                            </span>
                                                            <button
                                                                onClick={() => handleDeleteHistory(item.id)}
                                                                className="p-2 rounded-lg bg-white/5 text-gray-500 hover:text-red-400 transition-colors"
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
                                            <p className="text-base">No watch history found.</p>
                                        </div>
                                    )}
                                </div>
                            )}

                            {/* MESSAGES TAB */}
                            {activeTab === 'messages' && (
                                <div className="space-y-8">
                                    {messagesLoading ? (
                                        <div className="flex flex-col items-center justify-center py-24 gap-3 animate-pulse">
                                            <div className="w-8 h-8 rounded-full border-2 border-t-transparent border-red-500 animate-spin" />
                                            <p className="text-gray-500 text-xs font-bold uppercase tracking-widest">Loading Messages...</p>
                                        </div>
                                    ) : (
                                        <>
                                            {/* Direct Admin Messages */}
                                    <div className="space-y-4">
                                        <h2 className="text-xl font-black border-b border-white/5 pb-4 flex items-center gap-2">
                                            <span>👑</span> Admin Messages
                                        </h2>
                                        {notifications.length > 0 ? (
                                            <div className="space-y-3">
                                                {notifications.map(item => (
                                                    <div
                                                        key={item.id}
                                                        className={`p-5 rounded-2xl border transition-all relative overflow-hidden ${
                                                            !item.is_read
                                                                ? 'bg-gradient-to-r from-red-950/20 to-orange-950/15 border-red-500/30 shadow-md shadow-red-950/15'
                                                                : 'bg-white/[0.02] border-white/5'
                                                        }`}
                                                    >
                                                        {/* Golden/Red Glowing indicator for unread direct notifications */}
                                                        {!item.is_read && (
                                                            <div className="absolute top-0 left-0 w-1 h-full bg-gradient-to-b from-red-500 to-orange-500" />
                                                        )}
                                                        <div className="flex items-start justify-between gap-4">
                                                            <div className="space-y-1.5">
                                                                <span className="inline-flex px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-red-500/20 text-red-400 border border-red-500/20">
                                                                    Official Notice
                                                                </span>
                                                                <p className="text-gray-200 text-sm leading-relaxed">{item.message}</p>
                                                                <span className="block text-[10px] text-gray-500">{formatDate(item.created_at)}</span>
                                                            </div>
                                                            {!item.is_read && (
                                                                <button
                                                                    onClick={() => handleMarkNotificationRead(item.id)}
                                                                    className="text-xs font-bold text-red-500 hover:text-red-400 shrink-0"
                                                                >
                                                                    Mark read
                                                                </button>
                                                            )}
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        ) : (
                                            <div className="text-center py-8 text-gray-500 border border-dashed border-white/5 rounded-xl">
                                                <p className="text-sm">No direct messages from Admin.</p>
                                            </div>
                                        )}
                                    </div>

                                    {/* Replies & Threading */}
                                    <div className="space-y-4">
                                        <h2 className="text-xl font-black border-b border-white/5 pb-4 flex items-center gap-2">
                                            <span>💬</span> Comment Replies
                                        </h2>
                                        {replies.length > 0 ? (
                                            <div className="space-y-4">
                                                {replies.map(item => (
                                                    <div key={item.id} className="p-4 rounded-xl bg-white/[0.02] border border-white/5 space-y-2">
                                                        <div className="flex items-center justify-between text-xs">
                                                            <span className="font-bold text-red-400">{item.name} replied</span>
                                                            <span className="text-gray-500">{formatDate(item.created_at)}</span>
                                                        </div>
                                                        <p className="text-gray-200 text-sm italic">"{item.message}"</p>
                                                        {item.movies && (
                                                            <div className="text-xs text-gray-500">
                                                                On: <Link href={`/${item.movies.type}/${item.movies.slug}`} className="text-red-500 hover:underline font-semibold">{item.movies.title}</Link>
                                                            </div>
                                                        )}
                                                    </div>
                                                ))}
                                            </div>
                                        ) : (
                                            <div className="text-center py-8 text-gray-500 border border-dashed border-white/5 rounded-xl">
                                                <p className="text-sm">No replies to your comments yet.</p>
                                            </div>
                                        )}
                                    </div>
                                    </>
                                )}
                                </div>
                            )}

                            {/* SETTINGS TAB */}
                            {activeTab === 'settings' && (
                                <div className="space-y-6">
                                    <h2 className="text-xl font-black border-b border-white/5 pb-4 flex items-center gap-2">
                                        <span>⚙️</span> Account Settings
                                    </h2>
                                    {settingsLoading ? (
                                        <div className="flex flex-col items-center justify-center py-24 gap-3 animate-pulse">
                                            <div className="w-8 h-8 rounded-full border-2 border-t-transparent border-red-500 animate-spin" />
                                            <p className="text-gray-500 text-xs font-bold uppercase tracking-widest">Loading Settings...</p>
                                        </div>
                                    ) : (
                                        <form onSubmit={handleSaveSettings} className="space-y-6 max-w-lg">
                                            {settingsSuccess && (
                                                <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-sm font-bold animate-in fade-in">
                                                    {settingsSuccess}
                                                </div>
                                            )}
                                            
                                            <div className="space-y-2">
                                                <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider">Email Address</label>
                                                <input
                                                    type="email"
                                                    value={email}
                                                    onChange={e => setEmail(e.target.value)}
                                                    required
                                                    className="w-full bg-white/5 border border-white/10 rounded-xl p-3 text-sm text-white focus:outline-none focus:border-red-500 transition-colors"
                                                />
                                                <p className="text-[10px] text-gray-500">Requires verification link click to finalize change.</p>
                                            </div>

                                            <div className="space-y-2">
                                                <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider">Display Name</label>
                                                <input
                                                    type="text"
                                                    value={displayName}
                                                    onChange={e => setDisplayName(e.target.value)}
                                                    required
                                                    className="w-full bg-white/5 border border-white/10 rounded-xl p-3 text-sm text-white focus:outline-none focus:border-red-500 transition-colors"
                                                />
                                            </div>

                                            <div className="space-y-2">
                                                <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider">WhatsApp Number</label>
                                                <input
                                                    type="tel"
                                                    value={whatsapp}
                                                    onChange={e => setWhatsapp(e.target.value)}
                                                    required
                                                    className="w-full bg-white/5 border border-white/10 rounded-xl p-3 text-sm text-white focus:outline-none focus:border-red-500 transition-colors"
                                                    placeholder="+88017XXXXXXXX"
                                                />
                                            </div>

                                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                                <div className="space-y-2">
                                                    <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider">New Password</label>
                                                    <input
                                                        type="password"
                                                        value={password}
                                                        onChange={e => setPassword(e.target.value)}
                                                        minLength={6}
                                                        className="w-full bg-white/5 border border-white/10 rounded-xl p-3 text-sm text-white focus:outline-none focus:border-red-500 transition-colors"
                                                        placeholder="Leave blank to keep"
                                                    />
                                                </div>
                                                <div className="space-y-2">
                                                    <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider">Confirm Password</label>
                                                    <input
                                                        type="password"
                                                        value={confirmPassword}
                                                        onChange={e => setConfirmPassword(e.target.value)}
                                                        minLength={6}
                                                        className="w-full bg-white/5 border border-white/10 rounded-xl p-3 text-sm text-white focus:outline-none focus:border-red-500 transition-colors"
                                                        placeholder="Confirm new password"
                                                    />
                                                </div>
                                            </div>

                                            <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/5 flex items-center justify-between gap-4">
                                                <div className="space-y-1">
                                                    <h3 className="font-bold text-sm text-white flex items-center gap-1.5">
                                                        <span>🔞</span> 18+ Hide Mode
                                                    </h3>
                                                    <p className="text-xs text-gray-500 leading-normal">
                                                        When enabled, all adult/18+ rated content is completely hidden from your homepage, feeds, and searches.
                                                    </p>
                                                </div>
                                                <button
                                                    type="button"
                                                    onClick={() => setHideNsfw(!hideNsfw)}
                                                    className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                                                        hideNsfw ? 'bg-red-600' : 'bg-white/10'
                                                    }`}
                                                >
                                                    <span className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                                                        hideNsfw ? 'translate-x-5' : 'translate-x-0'
                                                    }`} />
                                                </button>
                                            </div>

                                            <button
                                                type="submit"
                                                disabled={updatingSettings}
                                                className="px-6 py-3 rounded-xl bg-gradient-to-r from-red-600 to-orange-600 text-white text-sm font-bold hover:shadow-lg hover:shadow-red-950/20 disabled:opacity-50 transition-all"
                                            >
                                                {updatingSettings ? 'Updating...' : 'Save Settings'}
                                            </button>
                                        </form>
                                    )}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
