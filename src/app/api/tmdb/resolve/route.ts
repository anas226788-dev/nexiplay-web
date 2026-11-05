import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { cleanTitleForTmdb, searchTmdb } from '@/lib/tmdb';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    const title = searchParams.get('title');
    const type = searchParams.get('type') || 'movie';
    const yearStr = searchParams.get('year');
    const movieId = searchParams.get('id');

    if (!title) {
        return NextResponse.json({ success: false, error: 'Missing title' }, { status: 400 });
    }

    const cleanTitle = cleanTitleForTmdb(title);
    const media = (type === 'series' || type === 'anime') ? 'tv' : 'movie';
    const year = yearStr ? parseInt(yearStr, 10) : undefined;

    try {
        const results = await searchTmdb(cleanTitle, media);
        if (results.length > 0) {
            const match = year
                ? results.find(r => r.release_year === year) || results[0]
                : results[0];

            if (match?.tmdb_id) {
                // If movieId provided, update Supabase in background
                if (movieId && !movieId.startsWith('tmdb-')) {
                    supabase
                        .from('movies')
                        .update({ tmdb_id: match.tmdb_id })
                        .eq('id', movieId)
                        .then();
                }

                return NextResponse.json({
                    success: true,
                    tmdb_id: match.tmdb_id,
                    title: match.title,
                    release_year: match.release_year
                }, {
                    headers: {
                        'Cache-Control': 'public, s-maxage=86400, stale-while-revalidate=172800'
                    }
                });
            }
        }

        return NextResponse.json({ success: false, error: 'No TMDB match found' });
    } catch (err: any) {
        return NextResponse.json({ success: false, error: err.message }, { status: 500 });
    }
}
