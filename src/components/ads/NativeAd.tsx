'use client';

import React, { useEffect, useRef, useState } from 'react';
import { supabase } from '@/lib/supabase';

interface NativeAdProps {
    placement: string;
    className?: string;
}

/**
 * NativeAd — fetches native ad from DB ads table, renders via iframe.
 * Same simple pattern as AdBanner.
 */
export function NativeAd({ placement, className = '' }: NativeAdProps) {
    const [scriptCode, setScriptCode] = useState<string | null>(null);
    const [loaded, setLoaded] = useState(false);
    const containerRef = useRef<HTMLDivElement>(null);
    const injectedRef = useRef(false);

    // Fetch native ad from database
    useEffect(() => {
        let cancelled = false;

        supabase
            .from('ads')
            .select('script_code')
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

    // Inject via iframe
    useEffect(() => {
        if (!scriptCode || !containerRef.current || injectedRef.current) return;
        injectedRef.current = true;

        const iframe = document.createElement('iframe');
        iframe.style.cssText = 'border:none;width:100%;min-height:250px;display:block;';
        iframe.setAttribute('scrolling', 'no');
        iframe.setAttribute('frameBorder', '0');
        iframe.srcdoc = `<!DOCTYPE html><html><head><style>body{margin:0;padding:0;background:transparent}</style></head><body>${scriptCode}</body></html>`;

        containerRef.current.appendChild(iframe);
        setLoaded(true);
    }, [scriptCode]);

    if (!scriptCode && !loaded) return null;

    return (
        <div className={`native-ad my-4 ${className}`} data-placement={placement}>
            {loaded && (
                <div className="text-center mb-1">
                    <span className="text-[10px] text-gray-500 uppercase tracking-wider">
                        Sponsored
                    </span>
                </div>
            )}
            <div ref={containerRef} />
        </div>
    );
}
