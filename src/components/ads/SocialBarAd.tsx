'use client';

import React, { useEffect, useState } from 'react';
import Script from 'next/script';
import { supabase } from '@/lib/supabase';

/**
 * SocialBarAd — uses Next.js <Script> component (designed for ad scripts).
 * 
 * Static HTML test confirmed: direct <script src="..."> works perfectly.
 * React manual injection (createContextualFragment, iframe) doesn't replicate this.
 * Next.js <Script strategy="afterInteractive"> is the official way to load ad scripts.
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
            onLoad={() => console.log('[SocialBarAd] Script loaded via next/script')}
            onError={() => console.error('[SocialBarAd] Script failed to load')}
        />
    );
}

/**
 * Remove social bar (if needed)
 */
export function removeSocialBar(): void {
    // next/script handles cleanup
}
