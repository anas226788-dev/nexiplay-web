'use client';

import { useState, useEffect, createContext, useContext, useCallback } from 'react';
import { supabase } from '@/lib/supabase';

interface Tutorial {
    source_key: string;
    source_name: string;
    tutorial_url: string;
    is_active: boolean;
}

interface TutorialContextType {
    tutorials: Record<string, Tutorial>;
    openTutorial: (sourceKey: string) => void;
    hasTutorial: (sourceKey: string) => boolean;
    activeTutorial: Tutorial | null;
    closeTutorial: () => void;
}

const TutorialContext = createContext<TutorialContextType | undefined>(undefined);

// Map provider_config keys to tutorial source keys
const PROVIDER_TO_SOURCE: Record<string, string> = {
    gdrive_link: 'gdrive',
    mega_link: 'mega',
    terabox_link: 'terabox',
    mediafire_link: 'mediafire',
    pcloud_link: 'pcloud',
    youtube_link: 'youtube',
};

export function TutorialProvider({ children }: { children: React.ReactNode }) {
    const [tutorials, setTutorials] = useState<Record<string, Tutorial>>({});
    const [activeTutorial, setActiveTutorial] = useState<Tutorial | null>(null);

    useEffect(() => {
        async function fetch() {
            const { data } = await supabase
                .from('download_tutorials')
                .select('source_key, source_name, tutorial_url, is_active')
                .eq('is_active', true);

            if (data) {
                const map: Record<string, Tutorial> = {};
                data.forEach((t: Tutorial) => {
                    if (t.tutorial_url) map[t.source_key] = t;
                });
                setTutorials(map);
            }
        }
        fetch();
    }, []);

    const hasTutorial = useCallback((providerKey: string) => {
        const sourceKey = PROVIDER_TO_SOURCE[providerKey] || providerKey;
        return !!(tutorials[sourceKey]?.tutorial_url);
    }, [tutorials]);

    const openTutorial = useCallback((providerKey: string) => {
        const sourceKey = PROVIDER_TO_SOURCE[providerKey] || providerKey;
        const tutorial = tutorials[sourceKey];
        if (tutorial) setActiveTutorial(tutorial);
    }, [tutorials]);

    const closeTutorial = useCallback(() => {
        setActiveTutorial(null);
    }, []);

    return (
        <TutorialContext.Provider value={{ tutorials, openTutorial, hasTutorial, activeTutorial, closeTutorial }}>
            {children}
            {activeTutorial && <TutorialModal tutorial={activeTutorial} onClose={closeTutorial} />}
        </TutorialContext.Provider>
    );
}

export const useTutorial = () => {
    const ctx = useContext(TutorialContext);
    if (!ctx) throw new Error('useTutorial must be used within TutorialProvider');
    return ctx;
};

// ─── Helpers ──────────────────────────────────────────────────

/** Convert YouTube URLs to embeddable format */
function getEmbedUrl(url: string): string {
    // Already an embed URL
    if (url.includes('/embed/')) return url;

    // Standard watch URL: https://youtube.com/watch?v=VIDEO_ID
    const watchMatch = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([a-zA-Z0-9_-]+)/);
    if (watchMatch) return `https://www.youtube.com/embed/${watchMatch[1]}`;

    // Fallback: return as-is
    return url;
}

// ─── Modal Component ──────────────────────────────────────────

function TutorialModal({ tutorial, onClose }: { tutorial: Tutorial; onClose: () => void }) {
    // Close on Escape
    useEffect(() => {
        const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
        window.addEventListener('keydown', handler);
        return () => window.removeEventListener('keydown', handler);
    }, [onClose]);

    // Prevent background scroll
    useEffect(() => {
        document.body.style.overflow = 'hidden';
        return () => { document.body.style.overflow = ''; };
    }, []);

    return (
        <div
            className="fixed inset-0 z-[9999] flex items-center justify-center p-4"
            onClick={onClose}
        >
            {/* Backdrop */}
            <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" />

            {/* Modal */}
            <div
                className="relative w-full max-w-3xl bg-dark-900 rounded-2xl border border-white/10 shadow-2xl overflow-hidden animate-fade-in-up"
                onClick={(e) => e.stopPropagation()}
            >
                {/* Header */}
                <div className="flex items-center justify-between p-4 border-b border-white/10">
                    <h3 className="text-lg font-bold text-white flex items-center gap-2">
                        <span className="text-red-500">📖</span>
                        How To Download from {tutorial.source_name}
                    </h3>
                    <button
                        onClick={onClose}
                        className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white transition-colors"
                    >
                        ✕
                    </button>
                </div>

                {/* YouTube Embed */}
                <div className="relative w-full" style={{ paddingBottom: '56.25%' }}>
                    <iframe
                        src={getEmbedUrl(tutorial.tutorial_url)}
                        className="absolute inset-0 w-full h-full"
                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                        allowFullScreen
                        title={`How to download from ${tutorial.source_name}`}
                        loading="lazy"
                    />
                </div>
            </div>
        </div>
    );
}
