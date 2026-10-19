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

    useEffect(() => {
        supabase
            .from('ads')
            .select('script_code')
            .eq('placement', 'social_bar')
            .eq('is_active', true)
            .limit(1)
            .maybeSingle()
            .then(({ data }) => {
                if (data?.script_code) {
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
            onLoad={() => console.log('[SocialBarAd] Script loaded via next/script')}
            onError={() => {
                // Warning only - prevents Next.js dev overlay from crashing when adblockers block the script
                console.warn('[SocialBarAd] Script failed or was blocked by client adblocker');
            }}
        />
    );
}

/**
 * Remove social bar (if needed)
 */
export function removeSocialBar(): void {
    // next/script handles cleanup
}
