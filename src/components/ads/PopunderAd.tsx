'use client';

import React, { useEffect, useState, useRef, useCallback } from 'react';
import Script from 'next/script';
import { supabase } from '@/lib/supabase';
import { getAppSettings } from '@/lib/settingsCache';
import { AdErrorBoundary } from './AdErrorBoundary';
import {
    getPopunderEligibility,
    incrementUserClickCount,
    recordPopunderTriggered,
} from '@/lib/cookies';

export function isMobileClient(): boolean {
    if (typeof window === 'undefined') return false;
    const ua = navigator.userAgent || '';
    const hasTouch = typeof navigator !== 'undefined' && Boolean(navigator.maxTouchPoints && navigator.maxTouchPoints > 0);
    return (
        /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(ua) ||
        (typeof window.matchMedia === 'function' && window.matchMedia('(max-width: 768px)').matches) ||
        (hasTouch && window.innerWidth <= 1024)
    );
}

/**
 * Safely open an ad in a new background tab or popup without replacing the current page.
 * Keeps the user 100% on the main Nexiplay website.
 */
export function openAdTab(targetUrl: string): boolean {
    if (!targetUrl || typeof window === 'undefined') return false;

    // 1. Direct window.open into a separate new tab (current tab remains untouched on Nexiplay)
    try {
        const win = window.open(targetUrl, '_blank');
        if (win) {
            try {
                win.blur();
                window.focus();
            } catch (e) {}
            setTimeout(() => {
                try { window.focus(); } catch (e) {}
            }, 50);
            setTimeout(() => {
                try { window.focus(); } catch (e) {}
            }, 150);
            return true;
        }
    } catch (e) {}

    // 2. Fallback: Programmatic anchor dispatch (bypasses Mobile Chrome / Safari strict popup blocker)
    try {
        const a = document.createElement('a');
        a.href = targetUrl;
        a.target = '_blank';
        a.rel = 'noopener noreferrer';
        a.style.display = 'none';
        document.body.appendChild(a);

        const evt = new MouseEvent('click', {
            view: window,
            bubbles: true,
            cancelable: true,
        });
        a.dispatchEvent(evt);
        setTimeout(() => {
            try {
                if (a.parentNode) document.body.removeChild(a);
            } catch (e) {}
        }, 150);
        return true;
    } catch (e) {
        return false;
    }
}



/**
 * Kept for backward compatibility with existing imports.
 * Never navigates the current tab away — user always stays on Nexiplay.
 */
export function scheduleBackgroundReplace(adUrl: string, delayMs: number): void {
    // Deprecated: replacing window.location kicked users off the site and caused mobile errors.
    // Ads are now opened cleanly in background tabs.
}

/**
 * PopunderAd Component:
 * - When an ad network popunder script (e.g. Adsterra / ASG) is active in Supabase (placement: 'popup_global')
 *   and NO direct adUrl is set, it falls back to the ad network's script.
 * - When adUrl is configured, it performs universal True Tab-Under:
 *   clicking any content link opens the destination in the active foreground tab,
 *   while the background tab navigates to the adUrl.
 * - Interactive UI controls (buttons, forms, filters, inputs) NEVER trigger popunder ads.
 * - Blank space clicks never spawn active foreground tabs.
 */
function PopunderAdInner() {
    const [scriptUrl, setScriptUrl] = useState<string | null>(null);
    const [rawScriptCode, setRawScriptCode] = useState<string | null>(null);
    const [scriptFailed, setScriptFailed] = useState<boolean>(false);
    const [adUrl, setAdUrl] = useState<string | null>(null);
    const [cooldownMinutes, setCooldownMinutes] = useState<number>(10);
    const isTriggeringRef = useRef(false);

    // 1. Fetch Ad URLs and Script configs from Database
    useEffect(() => {
        let isMounted = true;

        async function initAdSettings() {
            try {
                // Fetch settings for direct link / popunder URL & frequency
                const appSettings = await getAppSettings();
                if (isMounted && appSettings) {
                    const directUrl =
                        appSettings.popunder_url?.trim() ||
                        appSettings.direct_link_url?.trim() ||
                        appSettings.verification_ad_url_1?.trim() ||
                        null;

                    if (directUrl && directUrl.length > 0) {
                        setAdUrl(directUrl);
                    }

                    const freq = appSettings.ad_frequency_session || 10;
                    setCooldownMinutes(Math.max(1, freq));
                }

                // Fetch popup_global script if available
                const { data } = await supabase
                    .from('ads')
                    .select('script_code')
                    .eq('placement', 'popup_global')
                    .eq('is_active', true)
                    .limit(1)
                    .maybeSingle();

                if (isMounted && data?.script_code) {
                    const srcMatch = data.script_code.match(/src=["']([^"']+)["']/);
                    if (srcMatch) {
                        setScriptUrl(srcMatch[1]);
                    } else {
                        // Extract inline script if no src attribute exists
                        const contentMatch = data.script_code.match(/<script[^>]*>([\s\S]*?)<\/script>/i);
                        if (contentMatch && contentMatch[1].trim()) {
                            setRawScriptCode(contentMatch[1].trim());
                        }
                    }
                }
            } catch (err) {
                console.warn('[PopunderAd] Failed to initialize settings:', err);
            }
        }

        initAdSettings();

        return () => {
            isMounted = false;
        };
    }, []);

    // 2. True Tab-Under Popunder Trigger (Mobile & Desktop)
    useEffect(() => {
        // Runs unconditionally across the entire site whenever adUrl is available.
        // Guarantees that clicking on any movie/link opens the content in the active front tab
        // and sends the advertisement to the background tab.
        if (typeof window === 'undefined' || !adUrl) return;

        let lastInteractionTime = 0;

        const handleInteraction = (e: MouseEvent | TouchEvent) => {
            const now = Date.now();
            if (now - lastInteractionTime < 600) return;
            lastInteractionTime = now;

            // Increment user click count
            incrementUserClickCount();

            // Check if ad is eligible under cooldown
            const eligibility = getPopunderEligibility(cooldownMinutes);
            if (!eligibility.isEligible || isTriggeringRef.current) return;

            // Don't trigger on input fields, buttons, forms, media players, or modals
            const target = (e.target as HTMLElement | null) || (e.composedPath ? (e.composedPath()[0] as HTMLElement) : null);
            if (!target) return;

            const tag = target.tagName ? target.tagName.toUpperCase() : '';
            if (
                tag === 'INPUT' ||
                tag === 'TEXTAREA' ||
                tag === 'SELECT' ||
                tag === 'BUTTON' ||
                target.closest('button') ||
                target.closest('form') ||
                target.closest('[role="button"]') ||
                target.isContentEditable ||
                target.closest('video') ||
                target.closest('audio') ||
                target.closest('iframe') ||
                target.closest('.nexiplay-player-shell') ||
                target.closest('#ad-verification-modal') ||
                target.closest('[data-verification-modal]') ||
                target.closest('.ad-verification-popup') ||
                target.closest('.ad-verification-container') ||
                target.closest('#np-cloud-gateway') ||
                target.closest('[data-notice-modal]') ||
                target.closest('.notice-system-modal')
            ) {
                return;
            }

            // Find if the user tapped on an internal content link (MovieCard, Anime, Series, Episode, Category, Watch Online)
            const link = target.closest('a') as HTMLAnchorElement | null;
            if (!link || !link.href) return;

            // Exclude in-page jump anchors (e.g. #downloads, #overview) and javascript pseudo-links
            const hrefAttr = link.getAttribute('href') || '';
            if (hrefAttr.startsWith('#') || hrefAttr.startsWith('javascript:')) return;

            const isInternal = link.hostname === window.location.hostname;
            if (!isInternal) return; // External links (Telegram, YouTube trailer, external mirrors) open normally

            // Intercept internal content link click before Next.js client router takes over
            e.preventDefault();
            e.stopPropagation();

            isTriggeringRef.current = true;
            recordPopunderTriggered(cooldownMinutes);

            // Mark splash as seen so destination opens instantly with 0 delay
            try {
                sessionStorage.setItem('nexiplay_splash_seen', 'true');
                localStorage.setItem('nexiplay_splash_seen', Date.now().toString());
            } catch (err) {}

            const destinationUrl = link.href;

            // 1. Open the DESTINATION (Nexiplay movie/page) in the NEW active foreground tab:
            const newTab = window.open(destinationUrl, '_blank');

            if (newTab) {
                // 2. The CURRENT tab (which is now pushed into the background / back tab) replaces its URL with Ad URL!
                let replaced = false;
                const replaceBackgroundWithAd = () => {
                    if (replaced) return;
                    replaced = true;
                    document.removeEventListener('visibilitychange', onVis);
                    window.removeEventListener('pagehide', replaceBackgroundWithAd);
                    try {
                        window.location.replace(adUrl);
                    } catch {
                        window.location.href = adUrl;
                    }
                };

                const onVis = () => {
                    if (document.visibilityState === 'hidden') replaceBackgroundWithAd();
                };

                document.addEventListener('visibilitychange', onVis);
                window.addEventListener('pagehide', replaceBackgroundWithAd);
                setTimeout(replaceBackgroundWithAd, isMobileClient() ? 250 : 100);
            } else {
                // Fallback if browser blocked the new tab: navigate normally on this tab (no ad redirect)
                window.location.href = destinationUrl;
            }

            setTimeout(() => {
                isTriggeringRef.current = false;
            }, 1500);
            return;
        };

        // Attach listener in capture phase (true) to intercept before Next.js router
        document.addEventListener('click', handleInteraction, true);

        return () => {
            document.removeEventListener('click', handleInteraction, true);
        };
    }, [adUrl, cooldownMinutes]);

    return (
        <>
            {/* Third-party network script is only rendered when no direct adUrl is available */}
            {!adUrl && scriptUrl && !scriptFailed && (
                <Script
                    id="global-popunder-script"
                    src={scriptUrl}
                    strategy="afterInteractive"
                    data-cfasync="false"
                    onLoad={() => console.log('[PopunderAd] Network popunder script loaded successfully')}
                    onError={() => {
                        // Warning only — ad blockers trigger onError event on <Script> tags.
                        // Using console.warn prevents Next.js dev overlay from showing an unhandled error.
                        console.warn('[PopunderAd] Network script was blocked by client adblocker or unavailable');
                        setScriptFailed(true);
                    }}
                />
            )}
            {!adUrl && rawScriptCode && !scriptFailed && (
                <Script
                    id="global-popunder-inline"
                    strategy="afterInteractive"
                    data-cfasync="false"
                    dangerouslySetInnerHTML={{ __html: rawScriptCode }}
                    onError={() => {
                        console.warn('[PopunderAd] Inline popunder script error');
                        setScriptFailed(true);
                    }}
                />
            )}
        </>
    );
}

/**
 * Exported PopunderAd with error boundary
 */
export function PopunderAd() {
    return (
        <AdErrorBoundary>
            <PopunderAdInner />
        </AdErrorBoundary>
    );
}

/**
 * Hook for manual popunder trigger (e.g. on stream button or download button)
 * Opens cleanly in background tab without navigating away from the current page.
 */
export function usePopunderTrigger() {
    const canTrigger = (cooldownMinutes: number = 10): boolean => {
        if (typeof window === 'undefined') return false;
        try {
            const eligibility = getPopunderEligibility(cooldownMinutes);
            return eligibility.isEligible;
        } catch {
            return false;
        }
    };

    const triggerPopunder = (url: string, cooldownMinutes: number = 10): boolean => {
        if (!canTrigger(cooldownMinutes) || !url) return false;
        try {
            recordPopunderTriggered(cooldownMinutes);
            return openAdTab(url);
        } catch (e) {
            console.error('[usePopunderTrigger] Failed:', e);
            return false;
        }
    };

    return { triggerPopunder, canTrigger };
}
