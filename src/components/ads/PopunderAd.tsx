'use client';

import React, { useEffect, useState } from 'react';
import Script from 'next/script';
import { supabase } from '@/lib/supabase';
import { AdErrorBoundary } from './AdErrorBoundary';

/**
 * PopunderAd — uses Next.js <Script> component (designed for ad scripts).
 * 
 * Static HTML test confirmed: direct <script src="..."> works perfectly.
 * React manual injection methods failed because they don't replicate
 * the browser's native script loading behavior.
 * Next.js <Script strategy="afterInteractive"> is the official way.
 */
function PopunderAdInner() {
    const [scriptUrl, setScriptUrl] = useState<string | null>(null);

    useEffect(() => {
        supabase
            .from('ads')
            .select('script_code')
            .eq('placement', 'popup_global')
            .eq('is_active', true)
            .limit(1)
            .maybeSingle()
            .then(({ data }) => {
                if (data?.script_code) {
                    // Extract src URL from script tag
                    const srcMatch = data.script_code.match(/src=["']([^"']+)["']/);
                    if (srcMatch) {
                        setScriptUrl(srcMatch[1]);
                    }
                }
            });
    }, []);

    if (!scriptUrl) return null;

    return (
        <Script
            src={scriptUrl}
            strategy="afterInteractive"
            onLoad={() => console.log('[PopunderAd] Script loaded via next/script')}
            onError={() => console.error('[PopunderAd] Script failed to load')}
        />
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
 * Hook for manual popunder trigger
 */
export function usePopunderTrigger() {
    const canTrigger = (): boolean => {
        if (typeof window === 'undefined') return false;
        try {
            const count = parseInt(sessionStorage.getItem('nexi_popunder_count') || '0', 10);
            return count < 1;
        } catch {
            return false;
        }
    };

    const triggerPopunder = (url: string): boolean => {
        if (!canTrigger()) return false;
        try {
            window.open(url, '_blank', 'noopener,noreferrer');
            const count = parseInt(sessionStorage.getItem('nexi_popunder_count') || '0', 10);
            sessionStorage.setItem('nexi_popunder_count', (count + 1).toString());
            return true;
        } catch (e) {
            console.error('[usePopunderTrigger] Failed:', e);
            return false;
        }
    };

    return { triggerPopunder, canTrigger };
}
