import { Metadata } from 'next';
import ShortsFeedClient from './ShortsFeedClient';
import { getShortsFeed } from '@/lib/shortsFeed';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export const metadata: Metadata = {
    title: 'Shorts & Reels | Nexiplay',
    description: 'Watch viral trending reels, mini-dramas, and cinema teaser shorts in HD on Nexiplay.',
    openGraph: {
        title: 'Shorts & Reels | Nexiplay',
        description: 'Watch viral trending reels, mini-dramas, and cinema teaser shorts in HD on Nexiplay.',
    },
};

export default async function ShortsPage() {
    // Generate fresh random seed on each visit/reload so content is dynamic
    const randomSeed = Math.floor(Math.random() * 100000);
    const { items, nextPage } = await getShortsFeed({ page: 1, category: 'all', seed: randomSeed });

    return (
        <main className="w-full h-screen bg-black overflow-hidden select-none">
            <ShortsFeedClient initialItems={items} initialNextPage={nextPage} />
        </main>
    );
}
