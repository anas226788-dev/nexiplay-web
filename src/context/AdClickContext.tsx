'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';
import { handleAdClick } from '@/lib/adClickManager';

interface AdClickContextType {
    onAdClick: (e: React.MouseEvent, targetPath: string) => void;
    isEnabled: boolean;
}

const AdClickContext = createContext<AdClickContextType | undefined>(undefined);

export function AdClickProvider({ children }: { children: React.ReactNode }) {
    const [settings, setSettings] = useState<{ url: string; freq: number; enabled: boolean } | null>(null);
    const router = useRouter();

    useEffect(() => {
        async function fetchSettings() {
            const { data } = await supabase
                .from('app_settings')
                .select('direct_link_url, ad_frequency_session, is_ads_enabled')
                .eq('id', 1)
                .single();

            if (data) {
                setSettings({
                    url: data.direct_link_url,
                    freq: data.ad_frequency_session || 1,
                    enabled: data.is_ads_enabled
                });
            }
        }
        fetchSettings();
    }, []);

    const onAdClick = (e: React.MouseEvent, targetPath: string) => {
        if (!settings || !settings.enabled) {
            // Normal navigation if ads disabled
            router.push(targetPath);
            return;
        }

        handleAdClick(e, targetPath, router, settings.url, settings.freq);
    };

    return (
        <AdClickContext.Provider value={{ onAdClick, isEnabled: settings?.enabled || false }}>
            {children}
        </AdClickContext.Provider>
    );
}

export const useAdClick = () => {
    const context = useContext(AdClickContext);
    if (!context) {
        throw new Error('useAdClick must be used within an AdClickProvider');
    }
    return context;
};
