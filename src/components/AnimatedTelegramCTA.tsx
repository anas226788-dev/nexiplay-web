'use client';

import { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';
import { getTelegramSettings, CachedTelegramSettings } from '@/lib/settingsCache';
import Link from 'next/link';

export default function AnimatedTelegramCTA() {
    const pathname = usePathname();
    const [settings, setSettings] = useState<CachedTelegramSettings | null>(null);
    const [isDismissed, setIsDismissed] = useState(false);

    useEffect(() => {
        getTelegramSettings().then(data => {
            if (data) setSettings(data);
        });
    }, []);

    // Do not show on fullscreen Shorts feed
    if (pathname?.startsWith('/shorts')) return null;

    if (isDismissed || !settings?.is_active || !settings.telegram_url) return null;

    return (
        <div className="fixed bottom-[86px] left-3.5 md:bottom-6 md:left-6 z-40">
            <div className="relative">
                <Link
                    href={settings.telegram_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label="Join Telegram"
                    className="flex items-center gap-2 px-3.5 py-2.5 rounded-full bg-[#17141F]/95 hover:bg-[#229ED9] backdrop-blur-xl border border-[#229ED9]/35 text-[#8BCDF1] hover:text-white shadow-[0_8px_24px_rgba(0,0,0,0.4),0_0_14px_rgba(34,158,217,0.18)] active:scale-95 transition-all duration-200 group"
                >
                    <div className="relative flex items-center justify-center">
                        <svg className="w-4 h-4 md:w-5 md:h-5 fill-current transition-transform group-hover:scale-110" viewBox="0 0 24 24">
                            <path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z" />
                        </svg>
                    </div>
                    <span className="text-xs md:text-sm font-bold tracking-tight">Telegram</span>
                </Link>
                <button
                    type="button"
                    aria-label="Hide Telegram button until reload"
                    title="Hide until reload"
                    onClick={() => setIsDismissed(true)}
                    className="absolute -top-2 -right-2 w-5 h-5 rounded-full bg-[#2A2536] border border-white/25 text-[#ADA6B9] hover:text-white hover:bg-[#42347E] flex items-center justify-center text-xs shadow-md"
                >×</button>
            </div>
        </div>
    );
}
