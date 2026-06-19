'use client';

import { supabase } from '@/lib/supabase';

// ── Types ──────────────────────────────────────────────────
export interface CachedAppSettings {
    is_ads_enabled: boolean;
    popunder_url: string | null;
    direct_link_url: string | null;
    ad_frequency_session: number;
    ad_enabled_pages: string[];
    ad_enabled_devices: 'all' | 'desktop' | 'mobile';
    native_ad_code: string | null;
    social_bar_code: string | null;
    social_pinterest?: string | null;
    social_twitter?: string | null;
    social_facebook?: string | null;
    social_youtube?: string | null;
    social_reddit?: string | null;
    social_tumblr?: string | null;
    social_aboutme?: string | null;
    social_instagram?: string | null;
    social_threads?: string | null;
    is_verification_enabled?: boolean;
    verification_ad_url_1?: string | null;
    verification_ad_url_2?: string | null;
    is_download_verification_enabled?: boolean;
    download_ad_url_1?: string | null;
    download_ad_url_2?: string | null;
}

export interface CachedTelegramSettings {
    is_active: boolean;
    telegram_url: string | null;
    telegram_type: 'group' | 'channel';
}

// ── Constants ──────────────────────────────────────────────
const TTL_MS = 5 * 60 * 1000; // 5 minutes
const APP_SETTINGS_KEY = 'nexiplay_app_settings_v5';
const TELEGRAM_SETTINGS_KEY = 'nexiplay_telegram_settings';

// ── Module-level memory cache ──────────────────────────────
let appSettingsCache: { data: CachedAppSettings; ts: number } | null = null;
let telegramSettingsCache: { data: CachedTelegramSettings; ts: number } | null = null;

// Prevent concurrent fetches
let appSettingsPromise: Promise<CachedAppSettings | null> | null = null;
let telegramSettingsPromise: Promise<CachedTelegramSettings | null> | null = null;

// ── Helpers ────────────────────────────────────────────────
function isValid(ts: number): boolean {
    return Date.now() - ts < TTL_MS;
}

function readSessionStorage<T>(key: string): { data: T; ts: number } | null {
    if (typeof window === 'undefined') return null;
    try {
        const raw = sessionStorage.getItem(key);
        if (!raw) return null;
        const parsed = JSON.parse(raw);
        if (parsed?.data && parsed?.ts && isValid(parsed.ts)) {
            return parsed;
        }
        sessionStorage.removeItem(key);
    } catch { /* ignore */ }
    return null;
}

function writeSessionStorage<T>(key: string, data: T): void {
    if (typeof window === 'undefined') return;
    try {
        sessionStorage.setItem(key, JSON.stringify({ data, ts: Date.now() }));
    } catch { /* quota exceeded, ignore */ }
}

// ── App Settings ───────────────────────────────────────────
export async function getAppSettings(): Promise<CachedAppSettings | null> {
    // 1. Memory cache
    if (appSettingsCache && isValid(appSettingsCache.ts)) {
        return appSettingsCache.data;
    }

    // 2. SessionStorage cache
    const stored = readSessionStorage<CachedAppSettings>(APP_SETTINGS_KEY);
    if (stored) {
        appSettingsCache = stored;
        return stored.data;
    }

    // 3. Deduplicate concurrent fetches
    if (appSettingsPromise) {
        return appSettingsPromise;
    }

    // 4. Fetch from Supabase
    appSettingsPromise = (async () => {
        try {
            const { data, error } = await supabase
                .from('app_settings')
                .select('is_ads_enabled, popunder_url, direct_link_url, ad_frequency_session, ad_enabled_pages, ad_enabled_devices, native_ad_code, social_bar_code, social_pinterest, social_twitter, social_facebook, social_youtube, social_reddit, social_tumblr, social_aboutme, social_instagram, social_threads, is_verification_enabled, verification_ad_url_1, verification_ad_url_2, is_download_verification_enabled, download_ad_url_1, download_ad_url_2')
                .eq('id', 1)
                .single();

            if (error || !data) return null;

            const settings: CachedAppSettings = {
                is_ads_enabled: data.is_ads_enabled ?? true,
                popunder_url: data.popunder_url ?? null,
                direct_link_url: data.direct_link_url ?? null,
                ad_frequency_session: data.ad_frequency_session ?? 1,
                ad_enabled_pages: data.ad_enabled_pages ?? ['all'],
                ad_enabled_devices: data.ad_enabled_devices ?? 'all',
                native_ad_code: data.native_ad_code ?? null,
                social_bar_code: data.social_bar_code ?? null,
                social_pinterest: data.social_pinterest ?? null,
                social_twitter: data.social_twitter ?? null,
                social_facebook: data.social_facebook ?? null,
                social_youtube: data.social_youtube ?? null,
                social_reddit: data.social_reddit ?? null,
                social_tumblr: data.social_tumblr ?? null,
                social_aboutme: data.social_aboutme ?? null,
                social_instagram: data.social_instagram ?? null,
                social_threads: data.social_threads ?? null,
                is_verification_enabled: data.is_verification_enabled ?? false,
                verification_ad_url_1: data.verification_ad_url_1 ?? null,
                verification_ad_url_2: data.verification_ad_url_2 ?? null,
                is_download_verification_enabled: data.is_download_verification_enabled ?? false,
                download_ad_url_1: data.download_ad_url_1 ?? null,
                download_ad_url_2: data.download_ad_url_2 ?? null,
            };

            appSettingsCache = { data: settings, ts: Date.now() };
            writeSessionStorage(APP_SETTINGS_KEY, settings);
            return settings;
        } catch {
            return null;
        } finally {
            appSettingsPromise = null;
        }
    })();

    return appSettingsPromise;
}

// ── Telegram Settings ──────────────────────────────────────
export async function getTelegramSettings(): Promise<CachedTelegramSettings | null> {
    // 1. Memory cache
    if (telegramSettingsCache && isValid(telegramSettingsCache.ts)) {
        return telegramSettingsCache.data;
    }

    // 2. SessionStorage cache
    const stored = readSessionStorage<CachedTelegramSettings>(TELEGRAM_SETTINGS_KEY);
    if (stored) {
        telegramSettingsCache = stored;
        return stored.data;
    }

    // 3. Deduplicate concurrent fetches
    if (telegramSettingsPromise) {
        return telegramSettingsPromise;
    }

    // 4. Fetch from Supabase
    telegramSettingsPromise = (async () => {
        try {
            const { data, error } = await supabase
                .from('telegram_settings')
                .select('is_active, telegram_url, telegram_type')
                .eq('id', 1)
                .single();

            if (error || !data) return null;

            const settings: CachedTelegramSettings = {
                is_active: data.is_active ?? false,
                telegram_url: data.telegram_url ?? null,
                telegram_type: data.telegram_type ?? 'channel',
            };

            telegramSettingsCache = { data: settings, ts: Date.now() };
            writeSessionStorage(TELEGRAM_SETTINGS_KEY, settings);
            return settings;
        } catch {
            return null;
        } finally {
            telegramSettingsPromise = null;
        }
    })();

    return telegramSettingsPromise;
}

// ── Force refresh (for admin panel use) ────────────────────
export function invalidateSettingsCache(): void {
    appSettingsCache = null;
    telegramSettingsCache = null;
    if (typeof window !== 'undefined') {
        sessionStorage.removeItem(APP_SETTINGS_KEY);
        sessionStorage.removeItem(TELEGRAM_SETTINGS_KEY);
    }
}
