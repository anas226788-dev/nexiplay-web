import { Suspense } from 'react';
import { Metadata } from 'next';
import { buildPageMetadata } from '@/lib/metadata';
import GamesClient from './GamesClient';

export const metadata: Metadata = buildPageMetadata({
    title: 'Play 1,000+ Free Online Games - Action, Arcade, Sports & Puzzles | Nexiplay Arcade',
    description: 'Play 1,000+ free online HTML5 games instantly on Nexiplay. Action, Sports, Arcade, Racing, and Puzzles with zero downloads on Mobile & PC.',
    path: '/games',
});

export const dynamic = 'force-dynamic';

export default function GamesPage() {
    return (
        <Suspense fallback={
            <div className="min-h-screen bg-[#090710] flex items-center justify-center text-white">
                <div className="w-8 h-8 rounded-full border-2 border-violet-500 border-t-transparent animate-spin" />
            </div>
        }>
            <GamesClient />
        </Suspense>
    );
}
