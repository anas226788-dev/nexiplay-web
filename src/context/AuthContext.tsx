'use client';

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import type { Session, User } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase';

type TrackEventPayload = {
    id?: string;
    event_type: 'page_view' | 'watch' | 'download';
    movie_id?: string | null;
    episode_id?: string | null;
    content_type?: string | null;
    content_title?: string | null;
    season_number?: number | null;
    episode_number?: number | null;
    provider?: string | null;
    resolution?: string | null;
    duration_seconds?: number;
    metadata?: Record<string, unknown>;
};

type AuthContextValue = {
    user: User | null;
    session: Session | null;
    loading: boolean;
    hideNsfw: boolean;
    setHideNsfw: (val: boolean) => void;
    signIn: (email: string, password: string) => Promise<void>;
    signUp: (email: string, password: string, displayName?: string, whatsappNumber?: string) => Promise<void>;
    resendVerification: (email: string) => Promise<void>;
    signOut: () => Promise<void>;
    trackEvent: (payload: TrackEventPayload) => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

function getDeviceType() {
    if (typeof navigator === 'undefined') return 'unknown';
    const ua = navigator.userAgent.toLowerCase();
    if (/mobile|android|iphone|ipod/.test(ua)) return 'mobile';
    if (/ipad|tablet/.test(ua)) return 'tablet';
    return 'desktop';
}

function getSessionId() {
    if (typeof window === 'undefined') return '';
    const existing = sessionStorage.getItem('nexiplay_user_session_id');
    if (existing) return existing;
    const next = crypto.randomUUID();
    sessionStorage.setItem('nexiplay_user_session_id', next);
    sessionStorage.setItem('nexiplay_user_session_started_at', Date.now().toString());
    return next;
}

function getSessionStartedAt() {
    if (typeof window === 'undefined') return Date.now();
    const raw = sessionStorage.getItem('nexiplay_user_session_started_at');
    const parsed = raw ? Number(raw) : NaN;
    if (!Number.isFinite(parsed)) {
        const now = Date.now();
        sessionStorage.setItem('nexiplay_user_session_started_at', now.toString());
        return now;
    }
    return parsed;
}

async function syncProfile(user: User) {
    const now = new Date().toISOString();
    const displayName = typeof user.user_metadata?.display_name === 'string'
        ? user.user_metadata.display_name
        : user.email?.split('@')[0] || 'User';
    const whatsappNumber = typeof user.user_metadata?.whatsapp_number === 'string'
        ? user.user_metadata.whatsapp_number
        : null;
    const avatarUrl = typeof user.user_metadata?.avatar_url === 'string'
        ? user.user_metadata.avatar_url
        : null;

    await supabase.from('profiles').upsert({
        id: user.id,
        email: user.email,
        display_name: displayName,
        whatsapp_number: whatsappNumber,
        avatar_url: avatarUrl,
        updated_at: now,
        last_seen_at: now,
        last_active_at: now
    }, { onConflict: 'id' });
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
    const [session, setSession] = useState<Session | null>(null);
    const [user, setUser] = useState<User | null>(null);
    const [loading, setLoading] = useState(true);
    const [hideNsfw, setHideNsfw] = useState(false);
    const heartbeatRef = useRef<ReturnType<typeof setInterval> | null>(null);

    const heartbeat = useCallback(async (currentUser: User) => {
        if (typeof window === 'undefined') return;
        const now = new Date().toISOString();
        const startedAt = getSessionStartedAt();
        const durationSeconds = Math.max(0, Math.floor((Date.now() - startedAt) / 1000));
        const sessionId = getSessionId();

        await Promise.allSettled([
            supabase.from('profiles').update({
                last_seen_at: now,
                last_active_at: now,
                updated_at: now
            }).eq('id', currentUser.id),
            supabase.from('user_sessions').upsert({
                session_id: sessionId,
                user_id: currentUser.id,
                started_at: new Date(startedAt).toISOString(),
                last_seen_at: now,
                duration_seconds: durationSeconds,
                page_url: window.location.pathname + window.location.search,
                user_agent: navigator.userAgent,
                device_type: getDeviceType()
            }, { onConflict: 'session_id' })
        ]);
    }, []);

    const fetchProfileSettings = useCallback(async (userId: string) => {
        const { data, error } = await supabase
            .from('profiles')
            .select('hide_nsfw')
            .eq('id', userId)
            .maybeSingle();
        if (!error && data) {
            setHideNsfw(!!data.hide_nsfw);
        } else {
            setHideNsfw(false);
        }
    }, []);

    useEffect(() => {
        let mounted = true;

        supabase.auth.getSession().then(({ data }) => {
            if (!mounted) return;
            setSession(data.session);
            setUser(data.session?.user ?? null);
            if (data.session?.user) {
                // Run background tasks without blocking loading state
                syncProfile(data.session.user).catch(console.error);
                fetchProfileSettings(data.session.user.id).catch(console.error);
                heartbeat(data.session.user).catch(console.error);
            } else {
                setHideNsfw(false);
            }
            setLoading(false);
        });

        const { data: subscription } = supabase.auth.onAuthStateChange((_event, nextSession) => {
            setSession(nextSession);
            setUser(nextSession?.user ?? null);
            if (nextSession?.user) {
                // Run background tasks without blocking loading state
                syncProfile(nextSession.user).catch(console.error);
                fetchProfileSettings(nextSession.user.id).catch(console.error);
                heartbeat(nextSession.user).catch(console.error);
            } else {
                setHideNsfw(false);
            }
            setLoading(false);
        });

        return () => {
            mounted = false;
            subscription.subscription.unsubscribe();
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [heartbeat]);

    useEffect(() => {
        if (heartbeatRef.current) {
            clearInterval(heartbeatRef.current);
            heartbeatRef.current = null;
        }

        if (!user) return;
        heartbeatRef.current = setInterval(() => heartbeat(user), 30000);
        return () => {
            if (heartbeatRef.current) clearInterval(heartbeatRef.current);
        };
    }, [heartbeat, user]);

    const signIn = useCallback(async (email: string, password: string) => {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
    }, []);

    const signUp = useCallback(async (email: string, password: string, displayName?: string, whatsappNumber?: string) => {
        const { error } = await supabase.auth.signUp({
            email,
            password,
            options: {
                data: {
                    display_name: displayName || email.split('@')[0],
                    whatsapp_number: whatsappNumber || ''
                }
            }
        });
        if (error) throw error;
    }, []);

    const resendVerification = useCallback(async (email: string) => {
        const { error } = await supabase.auth.resend({
            type: 'signup',
            email,
        });
        if (error) throw error;
    }, []);

    const signOut = useCallback(async () => {
        const { error } = await supabase.auth.signOut();
        if (error) throw error;
    }, []);

    const trackEvent = useCallback(async (payload: TrackEventPayload) => {
        if (!user) return;
        const { error } = await supabase.from('user_events').insert({
            id: payload.id || crypto.randomUUID(),
            user_id: user.id,
            ...payload,
            duration_seconds: payload.duration_seconds ?? 0,
            metadata: payload.metadata ?? {}
        });
        if (error) {
            console.error('Analytics tracking error:', error.message);
        } else {
            console.log('Analytics tracking success:', payload.event_type, payload);
        }
    }, [user]);

    const value = useMemo<AuthContextValue>(() => ({
        user,
        session,
        loading,
        hideNsfw,
        setHideNsfw,
        signIn,
        signUp,
        resendVerification,
        signOut,
        trackEvent
    }), [loading, session, signIn, signUp, resendVerification, signOut, trackEvent, user, hideNsfw]);

    return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
    const value = useContext(AuthContext);
    if (!value) throw new Error('useAuth must be used inside AuthProvider');
    return value;
}
