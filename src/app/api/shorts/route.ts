import { NextResponse } from 'next/server';
import { getShortsFeed, CURATED_SHORTS } from '@/lib/shortsFeed';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

// GET API Route Handler with Personalized Niches Support & Dynamic Reload Rotation
export async function GET(req: Request) {
    const { searchParams } = new URL(req.url);
    const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10) || 1);
    const category = searchParams.get('category') || 'all';
    const query = searchParams.get('q')?.trim() || '';
    const niches = searchParams.get('niches')?.split(',').map(s => s.trim().toLowerCase()).filter(Boolean) || [];
    const seedParam = searchParams.get('seed');
    const seed = seedParam !== null ? parseInt(seedParam, 10) : Math.floor(Math.random() * 100000);

    try {
        const data = await getShortsFeed({ page, category, query, niches, seed });
        return NextResponse.json(data, {
            headers: {
                'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
                'Pragma': 'no-cache',
                'Expires': '0',
            }
        });
    } catch (error) {
        console.error('[Shorts API] Failed to load shorts feed:', error);
        return NextResponse.json({
            items: CURATED_SHORTS,
            page,
            nextPage: page + 1,
            totalItems: CURATED_SHORTS.length,
        }, {
            headers: {
                'Cache-Control': 'no-store, no-cache, must-revalidate',
            }
        });
    }
}
