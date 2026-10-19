import { Suspense } from 'react';
import { Metadata } from 'next';
import { buildPageMetadata } from '@/lib/metadata';
import LiveTvClient from './LiveTvClient';

export const metadata: Metadata = buildPageMetadata({
    title: 'Live TV & Radio Channels - Free 24/7 Broadcast',
    description: 'Watch live TV and stream radio stations from Bangladesh, India, Sports, News, and worldwide on Nexiplay. Zero lag, 100% free.',
    path: '/live-tv',
});

export const dynamic = 'force-dynamic';

export default function LiveTvPage() {
    return (
        <Suspense fallback={
            <div className="min-h-screen bg-[#0A0812] flex items-center justify-center text-white">
                <div className="w-8 h-8 rounded-full border-2 border-violet-500 border-t-transparent animate-spin" />
            </div>
        }>
            <LiveTvClient />
        </Suspense>
    );
}

