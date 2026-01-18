'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import Link from 'next/link';
import { TelegramSettings } from '@/lib/types';

export default function AnimatedTelegramCTA() {
    const [settings, setSettings] = useState<TelegramSettings | null>(null);

    useEffect(() => {
        supabase
            .from('telegram_settings')
            .select('*')
            .eq('id', 1)
            .single()
            .then(({ data }) => setSettings(data));
    }, []);

    if (!settings?.is_active || !settings.telegram_url) return null;

    return (
        <>
            <style jsx global>{`
                @keyframes fadeGlow {
                    0%, 100% { opacity: 0.8; }
                    50% { opacity: 1; text-shadow: 0 0 10px rgba(59, 130, 246, 0.5); }
                }
                .animate-telegram-glow {
                    animation: fadeGlow 2.8s ease-in-out infinite;
                }
            `}</style>

            {/* Desktop: Horizontal Bar below Header */}
            <div className="hidden md:flex fixed top-20 left-0 right-0 z-40 h-10 bg-black/60 backdrop-blur-md border-b border-blue-500/20 items-center justify-center">
                <Link
                    href={settings.telegram_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 text-sm font-medium text-blue-400 hover:text-blue-300 transition-colors animate-telegram-glow group"
                >
                    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z" />
                    </svg>
                    <span>✨ Join Telegram for latest updates</span>
                </Link>
            </div>

            {/* Mobile: Floating Pill */}
            <div className="md:hidden fixed bottom-6 left-1/2 -translate-x-1/2 z-50">
                <Link
                    href={settings.telegram_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 px-6 py-2.5 bg-[#0088cc]/90 backdrop-blur-xl text-white rounded-full shadow-lg shadow-blue-500/20 active:scale-95 transition-all text-sm font-bold border border-white/10"
                >
                    <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z" />
                    </svg>
                    <span>Join</span>
                </Link>
            </div>
        </>
    );
}
