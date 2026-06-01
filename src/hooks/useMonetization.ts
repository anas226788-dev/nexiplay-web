'use client';

/**
 * useMonetization — Simplified 24-hour ShrinkEarn + Adsterra Smartlink loop.
 *
 * FLOW:
 * 1. First download click (no timestamp or expired) → ShrinkEarn in SAME TAB
 *    - Sets shrinkearn_timestamp immediately
 *    - Does NOT open the file
 * 2. Subsequent clicks within 24h → Adsterra Smartlink in NEW TAB + file in SAME TAB
 * 3. After 24h → back to step 1
 *
 * STORAGE (localStorage):
 * - shrinkearn_timestamp : timestamp (ms) when ShrinkEarn was last triggered
 *
 * No callbacks, no tokens, no verification pages.
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import { getAppSettings } from '@/lib/settingsCache';

// ── localStorage key ───────────────────────────────────────────────
const TIMESTAMP_KEY = 'shrinkearn_timestamp';

// ── 24 hours in milliseconds ──────────────────────────────────────
const TWENTY_FOUR_HOURS = 24 * 60 * 60 * 1000;

// ── Fallback URLs (used if DB settings are empty) ─────────────────
const FALLBACK_SHRINKEARN_URL = '';    // Must be set in admin panel
const FALLBACK_SMARTLINK_URL = '';     // Must be set in admin panel

interface MonetizationSettings {
    shrinkearn_url: string;
    smartlink_url: string;
}

// ── Cache settings in memory to avoid repeated DB calls ───────────
let cachedSettings: MonetizationSettings | null = null;
let settingsFetchPromise: Promise<MonetizationSettings> | null = null;

async function getSettings(): Promise<MonetizationSettings> {
    if (cachedSettings) return cachedSettings;

    if (!settingsFetchPromise) {
        settingsFetchPromise = (async () => {
            try {
                const data = await getAppSettings();

                // DB columns: gplink_url = ShrinkEarn URL, smartlink_url = Adsterra Smartlink
                const settings: MonetizationSettings = {
                    shrinkearn_url: data?.gplink_url || FALLBACK_SHRINKEARN_URL,
                    smartlink_url: data?.smartlink_url || FALLBACK_SMARTLINK_URL,
                };
                cachedSettings = settings;
                return settings;
            } catch {
                const fallback: MonetizationSettings = {
                    shrinkearn_url: FALLBACK_SHRINKEARN_URL,
                    smartlink_url: FALLBACK_SMARTLINK_URL,
                };
                cachedSettings = fallback;
                return fallback;
            }
        })();
    }

    return settingsFetchPromise;
}

// ── Helper: check if within 24h window ────────────────────────────
function isWithin24Hours(): boolean {
    if (typeof window === 'undefined') return false;
    try {
        const timestamp = localStorage.getItem(TIMESTAMP_KEY);
        if (!timestamp) return false;
        const ts = parseInt(timestamp, 10);
        if (isNaN(ts)) return false;
        const elapsed = Date.now() - ts;
        if (elapsed < 0 || elapsed >= TWENTY_FOUR_HOURS) {
            // Expired — clean up
            localStorage.removeItem(TIMESTAMP_KEY);
            console.debug('[Monetization] Timer expired — 24h passed, resetting');
            return false;
        }
        return true;
    } catch {
        return false;
    }
}

// ── Helper: get remaining time as human-readable ──────────────────
function getRemainingTime(): string | null {
    if (typeof window === 'undefined') return null;
    try {
        const timestamp = localStorage.getItem(TIMESTAMP_KEY);
        if (!timestamp) return null;
        const ts = parseInt(timestamp, 10);
        const remaining = TWENTY_FOUR_HOURS - (Date.now() - ts);
        if (remaining <= 0) return null;
        const hours = Math.floor(remaining / (60 * 60 * 1000));
        const minutes = Math.floor((remaining % (60 * 60 * 1000)) / (60 * 1000));
        return `${hours}h ${minutes}m`;
    } catch {
        return null;
    }
}

// ── Main hook ─────────────────────────────────────────────────────
export function useMonetization() {
    const [active, setActive] = useState(false);
    const processingRef = useRef(false); // Double-click guard

    // Check on mount + periodically
    useEffect(() => {
        setActive(isWithin24Hours());

        // Re-check every minute (for near-expiry edge case)
        const interval = setInterval(() => {
            setActive(isWithin24Hours());
        }, 60_000);

        return () => clearInterval(interval);
    }, []);

    /**
     * handleDownloadClick — intercepts download button clicks.
     *
     * @param fileUrl  - The actual file URL (Mega, Drive, etc.)
     * @param event    - The click event (to preventDefault)
     */
    const handleDownloadClick = useCallback(
        async (fileUrl: string, event: React.MouseEvent) => {
            // Prevent default <a> navigation
            event.preventDefault();
            event.stopPropagation();

            // Skip empty/expired links
            if (!fileUrl || fileUrl === '#') return;

            // ── Double-click guard ──────────────────────────────
            if (processingRef.current) {
                console.debug('[Monetization] Double-click blocked');
                return;
            }
            processingRef.current = true;

            // Release guard after 1 second
            setTimeout(() => {
                processingRef.current = false;
            }, 1000);

            // ── Check 24h window ────────────────────────────────
            if (isWithin24Hours()) {
                // ── WITHIN 24H → Smartlink + File ───────────────
                const settings = await getSettings();

                if (settings.smartlink_url) {
                    console.debug('[Monetization] Smartlink triggered:', settings.smartlink_url);
                    window.open(settings.smartlink_url, '_blank', 'noopener,noreferrer');
                }

                console.debug('[Monetization] Direct file opened:', fileUrl);
                window.location.href = fileUrl;
                return;
            }

            // ── NOT WITHIN 24H → ShrinkEarn ─────────────────────
            const settings = await getSettings();

            if (!settings.shrinkearn_url) {
                // No ShrinkEarn configured → just open the file normally
                console.debug('[Monetization] No ShrinkEarn URL configured, opening file directly');
                window.location.href = fileUrl;
                return;
            }

            // Set timestamp BEFORE redirect
            try {
                localStorage.setItem(TIMESTAMP_KEY, Date.now().toString());
                setActive(true);
                console.debug('[Monetization] ShrinkEarn triggered — timestamp set, redirecting to:', settings.shrinkearn_url);
            } catch {
                // localStorage full/blocked → open file normally
                console.debug('[Monetization] localStorage error, opening file directly');
                window.location.href = fileUrl;
                return;
            }

            // Redirect to ShrinkEarn in SAME tab (do NOT open file)
            window.location.href = settings.shrinkearn_url;
        },
        []
    );

    return {
        /** Whether the user is currently in an active 24h window */
        isVerified: active,
        /** Remaining time in the 24h window */
        remainingTime: getRemainingTime(),
        /** Click handler to wrap download buttons */
        handleDownloadClick,
    };
}
