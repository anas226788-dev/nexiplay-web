'use client';

import React, { useEffect, useState } from 'react';
import Script from 'next/script';
import { supabase } from '@/lib/supabase';

/**
 * SocialBarAd — loads social bar ad scripts directly via next/script.
 * Fully active on all pages as configured in the ads table.
 */
export function SocialBarAd() {
    const [scriptUrl, setScriptUrl] = useState<string | null>(null);
    const [inlineCode, setInlineCode] = useState<string | null>(null);

    useEffect(() => {
        let isMounted = true;

        async function fetchSocialBarAd() {
            try {
                const { data, error } = await supabase
                    .from('ads')
                    .select('script_code, device_target')
                    .eq('placement', 'social_bar')
                    .eq('is_active', true)
                    .limit(1)
                    .maybeSingle();

                if (!isMounted || error || !data?.script_code) return;

                // Check device targeting
                if (data.device_target && data.device_target !== 'both') {
                    const isMobile = typeof window !== 'undefined' && window.innerWidth <= 768;
                    if (data.device_target === 'mobile' && !isMobile) return;
                    if (data.device_target === 'desktop' && isMobile) return;
                }

                const raw = data.script_code.trim();

                // 1. Try matching src attribute: <script ... src="https://...">
                const srcMatch = raw.match(/src\s*=\s*["']([^"']+)["']/i);
                if (srcMatch && srcMatch[1]) {
                    let url = srcMatch[1].trim();
                    if (url.startsWith('//')) url = 'https:' + url;
                    setScriptUrl(url);
                    return;
                }

                // 2. Direct script URL pasted without tags
                if (raw.startsWith('http://') || raw.startsWith('https://') || raw.startsWith('//')) {
                    let url = raw;
                    if (url.startsWith('//')) url = 'https:' + url;
                    setScriptUrl(url);
                    return;
                }

                // 3. Inline script code
                const contentMatch = raw.match(/<script[^>]*>([\s\S]*?)<\/script>/i);
                const code = (contentMatch ? contentMatch[1] : raw).trim();
                if (code) {
                    setInlineCode(code);
                }
            } catch (err) {
                console.warn('[SocialBarAd] Supabase fetch error:', err);
            }
        }

        fetchSocialBarAd();

        return () => {
            isMounted = false;
        };
    }, []);

    if (scriptUrl) {
        return (
            <Script
                src={scriptUrl}
                strategy="afterInteractive"
                onLoad={() => console.log('[SocialBarAd] Script loaded via next/script')}
                onError={() => {
                    console.warn('[SocialBarAd] Script blocked by client adblocker or network error');
                }}
            />
        );
    }

    if (inlineCode) {
        return (
            <Script
                id="social-bar-inline"
                strategy="afterInteractive"
                dangerouslySetInnerHTML={{ __html: inlineCode }}
            />
        );
    }

    return null;
}

/**
 * Remove social bar (if needed)
 */
export function removeSocialBar(): void {
    // next/script handles cleanup
}
