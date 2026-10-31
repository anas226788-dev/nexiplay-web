import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { searchTmdb, normalizeTitle, getExistingDatabaseCatalog } from '@/lib/tmdb';
import { Movie } from '@/lib/types';

export const dynamic = 'force-dynamic';
export const maxDuration = 15;

export async function GET(request: NextRequest) {
    const { searchParams } = new URL(request.url);
    const query = (searchParams.get('q') || '').trim();

    if (!query || query.length < 2) {
        return NextResponse.json({ results: [] });
    }

    try {
        // Run Local DB search and TMDB live 10M+ search concurrently
        const [localRes, dbCatalog, tmdbResults] = await Promise.all([
            supabase
                .from('movies')
                .select('id, title, slug, type, poster_url, release_year, is_adult')
                .ilike('title', `%${query}%`)
                .order('created_at', { ascending: false })
                .limit(6),
            getExistingDatabaseCatalog(),
            searchTmdb(query, 'multi', 1).catch(() => [] as Movie[]),
        ]);

        const localMatches = (localRes.data || []) as any[];
        const matchedLocalTmdbIds = new Set<string>();
        const matchedLocalTitles = new Set<string>();

        for (const m of localMatches) {
            if (m.tmdb_id) matchedLocalTmdbIds.add(String(m.tmdb_id));
            matchedLocalTitles.add(normalizeTitle(m.title));
            if (m.slug) matchedLocalTitles.add(normalizeTitle(m.slug.replace(/-/g, ' ')));
        }

        // Filter and deduplicate TMDB results
        const freshTmdbResults = (tmdbResults || []).filter(item => {
            const tmdbId = item.tmdb_id;
            const normTitle = normalizeTitle(item.title);

            if (tmdbId && matchedLocalTmdbIds.has(tmdbId)) return false;
            if (matchedLocalTitles.has(normTitle)) return false;

            if (tmdbId && dbCatalog.existingTmdbIds.has(tmdbId)) return false;
            if (dbCatalog.existingTitles.has(normTitle)) return false;

            return true;
        });

        // Combine: local DB movies first, followed by TMDB live universe results (top 8 total)
        const combined = [
            ...localMatches,
            ...freshTmdbResults.map(m => ({
                id: m.id,
                title: m.title,
                slug: m.slug,
                type: m.type,
                poster_url: m.poster_url,
                release_year: m.release_year,
                is_adult: m.is_adult || false
            }))
        ].slice(0, 8);

        return NextResponse.json({ results: combined }, {
            headers: {
                'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=120'
            }
        });

    } catch (err: any) {
        console.error('[Search API] Error:', err);
        return NextResponse.json({ results: [] }, { status: 500 });
    }
}

