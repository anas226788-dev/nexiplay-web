'use client';

import { useEffect, useState } from 'react';
import { getAppSettings, CachedAppSettings } from '@/lib/settingsCache';

export interface AdSettings {
    isEnabled: boolean;
    popunderUrl: string | null;
    directLinkUrl: string | null;
    popunderFrequency: number;
    enabledPages: string[];
    enabledDevices: 'all' | 'desktop' | 'mobile';
    nativeAdCode: string | null;
    socialBarCode: string | null;
}

interface UseAdSettingsReturn {
    settings: AdSettings | null;
    isLoading: boolean;
    error: Error | null;
    /** Whether settings were loaded from DB or fell back to defaults */
    isFromDB: boolean;
    refetch: () => Promise<void>;
}

/**
 * Default settings — ads are ENABLED by default.
 * This ensures ads still work even if the DB is unreachable.
 * The admin panel must EXPLICITLY disable ads to turn them off.
 */
const DEFAULT_SETTINGS: AdSettings = {
    isEnabled: true,  // ✅ Changed from false → true (fail-open for ads)
    popunderUrl: null,
    directLinkUrl: null,
    popunderFrequency: 1,
    enabledPages: ['all'],
    enabledDevices: 'all',
    nativeAdCode: null,
    socialBarCode: null,
};

/**
 * Hook to fetch and manage ad settings.
 * Now uses centralized settingsCache instead of direct Supabase calls.
 */
let cachedAdSettings: AdSettings | null = null;
let cachedIsFromDB = false;

function mapToAdSettings(data: CachedAppSettings): AdSettings {
    return {
        isEnabled: data.is_ads_enabled ?? true,
        popunderUrl: data.popunder_url ?? null,
        directLinkUrl: data.direct_link_url ?? null,
        popunderFrequency: data.ad_frequency_session ?? 1,
        enabledPages: data.ad_enabled_pages ?? ['all'],
        enabledDevices: data.ad_enabled_devices ?? 'all',
        nativeAdCode: data.native_ad_code ?? null,
        socialBarCode: data.social_bar_code ?? null,
    };
}

export function useAdSettings(): UseAdSettingsReturn {
    const [settings, setSettings] = useState<AdSettings | null>(cachedAdSettings);
    const [isLoading, setIsLoading] = useState(!cachedAdSettings);
    const [error, setError] = useState<Error | null>(null);
    const [isFromDB, setIsFromDB] = useState(cachedIsFromDB);

    const fetchSettings = async (): Promise<void> => {
        setIsLoading(true);
        setError(null);

        try {
            const cached = await getAppSettings();
            if (cached) {
                const mapped = mapToAdSettings(cached);
                cachedAdSettings = mapped;
                cachedIsFromDB = true;
                setSettings(mapped);
                setIsFromDB(true);
            } else {
                // Fallback to defaults (fail-open)
                cachedAdSettings = DEFAULT_SETTINGS;
                cachedIsFromDB = false;
                setSettings(DEFAULT_SETTINGS);
                setIsFromDB(false);
            }
        } catch (err) {
            console.warn('[useAdSettings] Error:', err);
            setError(err as Error);
            setSettings(DEFAULT_SETTINGS);
            setIsFromDB(false);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        if (!cachedAdSettings) {
            fetchSettings();
        }
    }, []);

    return {
        settings,
        isLoading,
        error,
        isFromDB,
        refetch: fetchSettings,
    };
}

/**
 * Check if ads should show on the current page
 */
export function shouldShowAdsOnPage(
    settings: AdSettings | null,
    currentPage: string
): boolean {
    if (!settings) return true; // ✅ Fail-open: no settings = show ads
    if (!settings.isEnabled) return false;

    const enabledPages = settings.enabledPages;
    if (enabledPages.includes('all')) return true;

    return enabledPages.includes(currentPage);
}

/**
 * Check if ads should show on the current device
 */
export function shouldShowAdsOnDevice(
    settings: AdSettings | null,
    isMobile: boolean
): boolean {
    if (!settings) return true; // ✅ Fail-open: no settings = show ads
    if (!settings.isEnabled) return false;

    const enabledDevices = settings.enabledDevices;
    if (enabledDevices === 'all') return true;
    if (enabledDevices === 'mobile' && isMobile) return true;
    if (enabledDevices === 'desktop' && !isMobile) return true;

    return false;
}
