'use client';

import React, { useEffect, useRef, useState } from 'react';
import { supabase } from '@/lib/supabase';

interface AdBannerProps {
    placement: string;
    size?: string;
    className?: string;
    lazy?: boolean;
}

/**
 * Simple AdBanner — fetches ad from DB, renders in iframe.
 * No complexity, no lazy loading hooks, no state machines.
 * Modeled after the static HTML test page that worked perfectly.
 */
export function AdBanner({ placement, size = '300x250', className = '' }: AdBannerProps) {
    const [scriptCode, setScriptCode] = useState<string | null>(null);
    const [loaded, setLoaded] = useState(false);
    const containerRef = useRef<HTMLDivElement>(null);
    const injectedRef = useRef(false);

    // Step 1: Fetch ad from database
    useEffect(() => {
        let cancelled = false;

        supabase
            .from('ads')
            .select('script_code, ad_type, image_url')
            .eq('placement', placement)
            .eq('is_active', true)
            .limit(1)
            .maybeSingle()
            .then(({ data }) => {
                if (!cancelled && data?.script_code) {
                    setScriptCode(data.script_code);
                }
            });

        return () => { cancelled = true; };
    }, [placement]);

    // Step 2: Inject ad via iframe (same approach as ad-test.html that worked)
    useEffect(() => {
        if (!scriptCode || !containerRef.current || injectedRef.current) return;
        injectedRef.current = true;

        const [w, h] = size.split('x').map(Number);

        const iframe = document.createElement('iframe');
        iframe.style.cssText = `border:none;width:${w}px;height:${h}px;max-width:100%;display:block;margin:0 auto;`;
        iframe.setAttribute('scrolling', 'no');
        iframe.setAttribute('frameBorder', '0');
        iframe.srcdoc = `<!DOCTYPE html><html><head><style>body{margin:0;padding:0;overflow:hidden;background:transparent;display:flex;align-items:center;justify-content:center;min-height:${h}px}</style></head><body>${scriptCode}</body></html>`;

        containerRef.current.appendChild(iframe);
        setLoaded(true);
    }, [scriptCode, size]);

    // Don't render anything if no ad found
    if (scriptCode === null && !loaded) {
        return null; // Still loading or no ad
    }

    return (
        <div className={`ad-banner my-4 ${className}`} data-placement={placement}>
            {loaded && (
                <div className="text-center mb-1">
                    <span className="text-[10px] text-gray-500 uppercase tracking-wider">
                        Advertisement
                    </span>
                </div>
            )}
            <div ref={containerRef} className="flex justify-center" />
        </div>
    );
}
