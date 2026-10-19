import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export const dynamic = 'force-dynamic';
const TMDB_GENRES: Record<string, number> = {
    action: 28, adventure: 12, animation: 16, comedy: 35, crime: 80, documentary: 99,
    drama: 18, family: 10751, fantasy: 14, history: 36, horror: 27, music: 10402,
    mystery: 9648, romance: 10749, 'science-fiction': 878, thriller: 53, war: 10752, western: 37,
};
type Profile = { id: string; genres: string[] };
type TmdbResult = { id: number; title?: string; name?: string; overview?: string; poster_path?: string | null; release_date?: string; first_air_date?: string; vote_average?: number; original_language?: string };

export async function GET(req: Request) {
    const url = new URL(req.url);
    const profileId = url.searchParams.get('profile') ?? '';
    const format = url.searchParams.get('format') ?? 'all';
    if (!/^[a-z0-9-]{2,40}$/.test(profileId) || !['all', 'movie', 'series', 'anime'].includes(format)) {
        return NextResponse.json({ error: 'Choose a valid vibe and format.' }, { status: 400 });
    }
    const apiKey = process.env.TMDB_API_KEY?.trim();
    if (!apiKey) return NextResponse.json({ error: 'TMDB discovery is not configured.' }, { status: 503 });

    try {
        const { data, error } = await supabase.from('app_settings').select('mood_profiles').eq('id', 1).maybeSingle();
        if (error) throw error;
        const profiles = Array.isArray(data?.mood_profiles) ? data.mood_profiles as Profile[] : [];
        const profile = profiles.find(item => item.id === profileId);
        if (!profile) return NextResponse.json({ error: 'That vibe is not available.' }, { status: 404 });
        const genreIds = [...new Set(profile.genres.map(slug => TMDB_GENRES[slug]).filter(Boolean))];
        if (!genreIds.length) return NextResponse.json({ results: [] });
        const mediaTypes = format === 'movie' ? ['movie'] : format === 'series' ? ['tv'] : format === 'anime' ? ['tv'] : ['movie', 'tv'];
        const batches = await Promise.all(mediaTypes.map(async media => {
            const endpoint = new URL(`https://api.themoviedb.org/3/discover/${media}`);
            endpoint.searchParams.set('api_key', apiKey);
            endpoint.searchParams.set('language', 'en-US');
            endpoint.searchParams.set('include_adult', 'false');
            endpoint.searchParams.set('sort_by', 'popularity.desc');
            endpoint.searchParams.set('with_genres', genreIds.join(','));
            if (format === 'anime') endpoint.searchParams.set('with_original_language', 'ja');
            const response = await fetch(endpoint, { signal: AbortSignal.timeout(9000), next: { revalidate: 3600 }, headers: { accept: 'application/json' } });
            if (!response.ok) throw new Error('TMDB discovery failed');
            const payload = await response.json() as { results?: TmdbResult[] };
            return (payload.results ?? []).map(item => ({
                id: item.id,
                media,
                title: item.title || item.name || 'Untitled',
                overview: item.overview || '',
                posterUrl: item.poster_path ? `https://image.tmdb.org/t/p/w500${item.poster_path}` : null,
                year: (item.release_date || item.first_air_date || '').slice(0, 4),
                rating: Number.isFinite(item.vote_average) ? item.vote_average : null,
                language: item.original_language || null,
            }));
        }));
        const results = batches.flat().sort((a, b) => (b.rating ?? 0) - (a.rating ?? 0)).slice(0, 24);
        const tmdbIds = results.map(item => String(item.id));
        const { data: localRows, error: localError } = await supabase.from('movies').select('tmdb_id,slug,type').in('tmdb_id', tmdbIds);
        if (localError) throw localError;
        const localById = new Map((localRows ?? []).map((row: { tmdb_id: string; slug: string; type: string }) => [row.tmdb_id, row]));
        return NextResponse.json({ results: results.map(item => {
            const local = localById.get(String(item.id));
            return { ...item, inCatalog: Boolean(local), localHref: local ? `/${local.type}/${local.slug}` : null };
        }) }, { headers: { 'Cache-Control': 'private, max-age=300' } });
    } catch (error) {
        console.error('[Vibe Check] TMDB discovery failed:', error);
        return NextResponse.json({ error: 'Could not load extra discovery titles right now.' }, { status: 502 });
    }
}
