import type { Metadata } from 'next';
import { supabase } from '@/lib/supabase';
import MoodPicker from '@/components/MoodPicker';
import { fetchTmdbByMoodGenres, getExistingDatabaseCatalog, normalizeTitle } from '@/lib/tmdb';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = {
    title: 'Vibe Check | Nexiplay',
    description: 'Pick a vibe and get a personal movie, series and anime mix from Nexiplay.',
};

export type MoodProfile = { id: string; label: string; description: string; genres: string[]; types: string[] };
const DEFAULT_PROFILES: MoodProfile[] = [
    { id: 'feel-good', label: 'Feel-good', description: 'Light, funny stories for a brighter mood.', genres: ['comedy', 'family', 'romance'], types: ['movie', 'series', 'anime'] },
    { id: 'adventure', label: 'Adventure', description: 'Fast, exciting stories with a sense of discovery.', genres: ['action', 'adventure', 'fantasy'], types: ['movie', 'series', 'anime'] },
    { id: 'thoughtful', label: 'Thoughtful', description: 'Character-led drama, mystery and science fiction.', genres: ['drama', 'mystery', 'science-fiction'], types: ['movie', 'series', 'anime'] },
    { id: 'cozy', label: 'Cozy', description: 'Warm animation and easygoing stories.', genres: ['animation', 'family', 'comedy'], types: ['movie', 'series', 'anime'] },
];

export default async function MoodPage() {
    const { data: settings } = await supabase.from('app_settings').select('mood_profiles').eq('id', 1).maybeSingle();
    const profiles = Array.isArray(settings?.mood_profiles) ? settings.mood_profiles as MoodProfile[] : DEFAULT_PROFILES;
    const slugs = Array.from(new Set(profiles.flatMap(profile => profile.genres)));

    // 1. Fetch local database movies & catalog index for deduplication in parallel
    const [categoriesRes, dbCatalog] = await Promise.all([
        supabase.from('categories').select('id, slug').in('slug', slugs),
        getExistingDatabaseCatalog(),
    ]);

    const categories = categoriesRes.data ?? [];
    const categoryIds = categories.map((c: { id: string }) => c.id);
    const { data: links } = categoryIds.length
        ? await supabase.from('movie_categories').select('movie_id, category_id').in('category_id', categoryIds)
        : { data: [] };
    const movieIds = Array.from(new Set((links ?? []).map((link: { movie_id: string }) => link.movie_id)));
    const { data: localMoviesRaw } = movieIds.length
        ? await supabase.from('movies').select('id,title,slug,type,poster_url,release_year,description,language,is_adult,trending_badge,admin_note,created_at').in('id', movieIds).eq('is_adult', false).order('created_at', { ascending: false }).limit(120)
        : { data: [] };

    const genresByMovie: Record<string, string[]> = {};
    const slugById = new Map(categories.map((c: { id: string; slug: string }) => [c.id, c.slug]));
    for (const link of links ?? []) {
        const slug = slugById.get((link as { category_id: string }).category_id);
        if (slug) (genresByMovie[(link as { movie_id: string }).movie_id] ??= []).push(slug);
    }

    const localMovies = (localMoviesRaw ?? []).map(movie => ({
        ...movie,
        genres: genresByMovie[movie.id] ?? [],
    }));

    // 2. Fetch TMDB on-demand vibe catalog titles for each mood profile (edge-cached)
    const tmdbResults = await Promise.all(
        profiles.map(p => fetchTmdbByMoodGenres(p.genres, 'all', 1))
    );

    // 3. Deduplicate TMDB titles against local DB
    const seenTmdbIds = new Set<string>();
    const seenTitles = new Set<string>();
    for (const m of localMovies) {
        if (m.title) seenTitles.add(normalizeTitle(m.title));
    }

    const freshTmdbMovies: Array<any> = [];
    for (const tmdbBatch of tmdbResults) {
        for (const item of tmdbBatch) {
            const rawTmdbId = item.tmdb_id || item.id.replace(/^tmdb-/, '');
            const normTitle = normalizeTitle(item.title);

            if (seenTmdbIds.has(item.id)) continue;
            if (rawTmdbId && dbCatalog.existingTmdbIds.has(rawTmdbId)) continue;
            if (seenTitles.has(normTitle) || dbCatalog.existingTitles.has(normTitle)) continue;

            seenTmdbIds.add(item.id);
            seenTitles.add(normTitle);
            freshTmdbMovies.push(item);
        }
    }

    // Local DB titles come first, followed by TMDB on-demand vibe catalog
    const allMovies = [...localMovies, ...freshTmdbMovies];

    return <MoodPicker profiles={profiles} movies={allMovies} />;
}
