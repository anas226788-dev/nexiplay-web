import { supabase } from '@/lib/supabase';
import { Movie, Season } from '@/lib/types';

const TMDB_BASE_URL = 'https://api.themoviedb.org/3';

function getApiKey(): string | null {
    return process.env.TMDB_API_KEY?.trim() || null;
}

export type TmdbRawItem = {
    id: number;
    title?: string;
    name?: string;
    original_title?: string;
    original_name?: string;
    overview?: string;
    poster_path?: string | null;
    backdrop_path?: string | null;
    release_date?: string;
    first_air_date?: string;
    original_language?: string;
    vote_average?: number;
    adult?: boolean;
    media_type?: string;
    genre_ids?: number[];
};

export type TmdbDetailItem = TmdbRawItem & {
    runtime?: number;
    number_of_seasons?: number;
    number_of_episodes?: number;
    genres?: Array<{ id: number; name: string }>;
    imdb_id?: string;
    external_ids?: {
        imdb_id?: string;
        tvdb_id?: number;
    };
    images?: {
        backdrops?: Array<{ file_path: string }>;
        posters?: Array<{ file_path: string }>;
    };
    credits?: {
        cast?: Array<{ name?: string; character?: string; profile_path?: string | null }>;
    };
    seasons?: Array<{
        id: number;
        name: string;
        season_number: number;
        episode_count: number;
        poster_path?: string | null;
    }>;
};

/**
 * Cleans user/scraper titles to extract clean query string for TMDB search.
 * e.g. "Spider-Man: Brand New Day Movie " -> "Spider-Man Brand New Day"
 * e.g. "The Rip (2026) Dual Audio [Hindi-English] Movie" -> "The Rip"
 * e.g. "Game of Thrones ( Season 1-8)" -> "Game of Thrones"
 */
export function cleanTitleForTmdb(title: string): string {
    return title
        .replace(/\[[^\]]*\]/g, ' ')
        .replace(/\([^\)]*\)/g, ' ')
        .replace(/\b(movie|film|season\s*\d*(?:\s*to\s*\d+)?|s\d+|hindi|dubbed|bangla|dual\s*audio|download|bluray|web-dl|hdrip|720p|1080p|480p)\b/gi, ' ')
        .replace(/[\-–—_]/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();
}

/**
 * Normalizes title for loose deduplication check
 * Strips common release suffixes: Movie, Film, Season, Dubbed, Dual Audio, Year tags, etc.
 */
export function normalizeTitle(title: string): string {
    return title
        .toLowerCase()
        .replace(/\b(movie|film|season\s*\d+|s\d+|hindi|dubbed|bangla|dual\s*audio|\d{4})\b/gi, '')
        .replace(/[^a-z0-9]/g, '')
        .trim();
}

/**
 * Fetches all TMDB IDs and normalized titles currently present in Supabase.
 */
export async function getExistingDatabaseCatalog(): Promise<{
    existingTmdbIds: Set<string>;
    existingTitles: Set<string>;
    slugByTmdbId: Map<string, string>;
}> {
    try {
        const { data, error } = await supabase
            .from('movies')
            .select('id, tmdb_id, title, slug, type');

        if (error || !data) {
            return {
                existingTmdbIds: new Set(),
                existingTitles: new Set(),
                slugByTmdbId: new Map(),
            };
        }

        const existingTmdbIds = new Set<string>();
        const existingTitles = new Set<string>();
        const slugByTmdbId = new Map<string, string>();

        for (const row of data) {
            if (row.tmdb_id) {
                const idStr = String(row.tmdb_id).trim();
                existingTmdbIds.add(idStr);
                slugByTmdbId.set(idStr, row.slug);
            }
            if (row.title) {
                const norm = normalizeTitle(row.title);
                if (norm) existingTitles.add(norm);
            }
            if (row.slug) {
                const normSlug = normalizeTitle(row.slug.replace(/-/g, ' '));
                if (normSlug) existingTitles.add(normSlug);
            }
        }

        return { existingTmdbIds, existingTitles, slugByTmdbId };
    } catch (e) {
        console.warn('[TMDB Engine] Failed to fetch existing database catalog:', e);
        return {
            existingTmdbIds: new Set(),
            existingTitles: new Set(),
            slugByTmdbId: new Map(),
        };
    }
}

/**
 * Transforms a TMDB API result item into a Nexiplay standard Movie object
 */
export function tmdbToMovie(
    item: TmdbRawItem,
    type: 'movie' | 'series' | 'anime' = 'movie'
): Movie {
    const title = item.title || item.name || 'Untitled';
    const date = item.release_date || item.first_air_date || '';
    const releaseYear = date ? parseInt(date.slice(0, 4), 10) : null;
    const vote = typeof item.vote_average === 'number' ? item.vote_average : 0;

    return {
        id: `tmdb-${item.id}`,
        title,
        slug: `tmdb-${item.id}`,
        poster_url: item.poster_path ? `https://image.tmdb.org/t/p/w500${item.poster_path}` : null,
        description: item.overview || null,
        type,
        release_year: Number.isFinite(releaseYear) ? releaseYear : null,
        language: item.original_language || 'en',
        banner_url_desktop: item.backdrop_path ? `https://image.tmdb.org/t/p/w1280${item.backdrop_path}` : undefined,
        banner_url_mobile: item.backdrop_path ? `https://image.tmdb.org/t/p/w780${item.backdrop_path}` : undefined,
        is_adult: Boolean(item.adult),
        is_trending: vote >= 7.0,
        trending_badge: vote >= 7.5,
        created_at: date ? new Date(date).toISOString() : new Date().toISOString(),
        tmdb_id: String(item.id),
    };
}

/**
 * Safe fetch wrapper with timeout, Edge cache, and API key injection
 */
async function tmdbFetch<T>(endpoint: string, params: Record<string, string> = {}): Promise<T | null> {
    const apiKey = getApiKey();
    if (!apiKey) return null;

    try {
        const url = new URL(`${TMDB_BASE_URL}${endpoint}`);
        url.searchParams.set('api_key', apiKey);
        url.searchParams.set('language', 'en-US');

        for (const [key, value] of Object.entries(params)) {
            url.searchParams.set(key, value);
        }

        const res = await fetch(url.toString(), {
            headers: { accept: 'application/json' },
            next: { revalidate: 3600 }, // 1 hour edge/Cloudflare cache
            signal: AbortSignal.timeout(9000),
        });

        if (!res.ok) {
            console.warn(`[TMDB Engine] ${endpoint} returned HTTP ${res.status}`);
            return null;
        }

        return await res.json() as T;
    } catch (err) {
        console.warn(`[TMDB Engine] Network error on ${endpoint}:`, err);
        return null;
    }
}

/**
 * Fetches popular/trending movies from TMDB on-demand
 */
export async function fetchTmdbMovies(page = 1): Promise<{ results: Movie[]; totalPages: number }> {
    const data = await tmdbFetch<{ results: TmdbRawItem[]; total_pages: number }>(
        '/discover/movie',
        {
            page: String(page),
            sort_by: 'popularity.desc',
            include_adult: 'false',
        }
    );

    if (!data || !Array.isArray(data.results)) {
        return { results: [], totalPages: 0 };
    }

    return {
        results: data.results.map(item => tmdbToMovie(item, 'movie')),
        totalPages: Math.min(data.total_pages || 1, 500),
    };
}

/**
 * Fetches popular/trending TV series from TMDB on-demand
 */
export async function fetchTmdbSeries(page = 1): Promise<{ results: Movie[]; totalPages: number }> {
    const data = await tmdbFetch<{ results: TmdbRawItem[]; total_pages: number }>(
        '/discover/tv',
        {
            page: String(page),
            sort_by: 'popularity.desc',
            include_adult: 'false',
            without_genres: '16', // Exclude anime/animation from generic series tab
        }
    );

    if (!data || !Array.isArray(data.results)) {
        return { results: [], totalPages: 0 };
    }

    return {
        results: data.results.map(item => tmdbToMovie(item, 'series')),
        totalPages: Math.min(data.total_pages || 1, 500),
    };
}

/**
 * Fetches popular/trending Anime from TMDB on-demand
 */
export async function fetchTmdbAnime(page = 1): Promise<{ results: Movie[]; totalPages: number }> {
    const data = await tmdbFetch<{ results: TmdbRawItem[]; total_pages: number }>(
        '/discover/tv',
        {
            page: String(page),
            sort_by: 'popularity.desc',
            with_genres: '16', // Animation
            with_original_language: 'ja', // Japanese Anime
            include_adult: 'false',
        }
    );

    if (!data || !Array.isArray(data.results)) {
        return { results: [], totalPages: 0 };
    }

    return {
        results: data.results.map(item => tmdbToMovie(item, 'anime')),
        totalPages: Math.min(data.total_pages || 1, 500),
    };
}

/**
 * Fetches dynamic live trending & latest releases across Movies, Series, and Anime.
 * Used for dynamic hybrid Latest Additions on the Homepage.
 */
export async function fetchTmdbLatestTrending(page = 1): Promise<{ results: Movie[]; totalPages: number }> {
    const data = await tmdbFetch<{ results: TmdbRawItem[]; total_pages: number }>(
        '/trending/all/day',
        {
            page: String(page),
            language: 'en-US',
        }
    );

    if (!data || !Array.isArray(data.results)) {
        return { results: [], totalPages: 0 };
    }

    const results: Movie[] = [];
    for (const item of data.results) {
        if (item.adult) continue;
        const mediaType = item.media_type || 'movie';
        if (mediaType === 'person') continue;

        const isAnime = (item.genre_ids?.includes(16) && item.original_language === 'ja') || false;
        const type: 'movie' | 'series' | 'anime' = isAnime ? 'anime' : mediaType === 'tv' ? 'series' : 'movie';

        results.push(tmdbToMovie(item, type));
    }

    return {
        results,
        totalPages: Math.min(data.total_pages || 1, 500),
    };
}

/**
 * Search TMDB across Movies, TV Series, and Anime
 */
export async function searchTmdb(query: string, media: 'movie' | 'tv' | 'multi' = 'multi', page = 1): Promise<Movie[]> {
    if (!query || query.trim().length < 2) return [];

    const endpoint = media === 'multi' ? '/search/multi' : `/search/${media}`;
    const data = await tmdbFetch<{ results: TmdbRawItem[] }>(endpoint, {
        query: query.trim(),
        page: String(page),
        include_adult: 'false',
    });

    if (!data || !Array.isArray(data.results)) return [];

    const movies: Movie[] = [];
    for (const item of data.results) {
        const mediaType = item.media_type || (media === 'tv' ? 'tv' : 'movie');
        if (mediaType === 'person') continue;

        const isAnime = (item.genre_ids?.includes(16) && item.original_language === 'ja') || false;
        const type: 'movie' | 'series' | 'anime' = isAnime ? 'anime' : mediaType === 'tv' ? 'series' : 'movie';

        movies.push(tmdbToMovie(item, type));
    }

    return movies;
}

/**
 * Fetches detailed metadata for a single TMDB title by TMDB ID
 */
export async function fetchTmdbDetails(tmdbId: string | number, media: 'movie' | 'tv'): Promise<TmdbDetailItem | null> {
    const id = Number(tmdbId);
    if (!Number.isSafeInteger(id) || id <= 0) return null;

    return await tmdbFetch<TmdbDetailItem>(`/${media}/${id}`, {
        append_to_response: 'credits,videos,external_ids,images',
    });
}

/**
 * Resolves an IMDb ID (e.g., "tt1375666") to TMDB ID and media type
 */
export async function fetchTmdbByImdbId(imdbId: string): Promise<{ tmdbId: number; media: 'movie' | 'tv' } | null> {
    const cleanId = imdbId.trim();
    if (!/^tt\d+$/i.test(cleanId)) return null;

    const data = await tmdbFetch<{
        movie_results?: TmdbRawItem[];
        tv_results?: TmdbRawItem[];
    }>(`/find/${cleanId}`, { external_source: 'imdb_id' });

    if (data?.movie_results && data.movie_results.length > 0) {
        return { tmdbId: data.movie_results[0].id, media: 'movie' };
    }
    if (data?.tv_results && data.tv_results.length > 0) {
        return { tmdbId: data.tv_results[0].id, media: 'tv' };
    }
    return null;
}

/**
 * Converts TMDB Detail Item into a virtual Movie object for detail & watch pages
 */
export function tmdbDetailToMovie(detail: TmdbDetailItem, media: 'movie' | 'tv'): {
    movie: Movie;
    seasons: Season[];
    cast: string;
} {
    const isAnime = (detail.genres?.some(g => g.id === 16) && detail.original_language === 'ja') || false;
    const type: 'movie' | 'series' | 'anime' = isAnime ? 'anime' : media === 'tv' ? 'series' : 'movie';

    const base = tmdbToMovie(detail, type);
    const castMembers = (detail.credits?.cast || []).slice(0, 8).map(c => c.name).filter(Boolean).join(', ');

    const movieCategories = (detail.genres || []).map(g => ({
        categories: { id: String(g.id), name: g.name, slug: String(g.id) }
    }));

    const screenshots = (detail.images?.backdrops || []).slice(0, 4).map(b => ({
        id: `shot-${b.file_path}`,
        movie_id: base.id,
        image_url: `https://image.tmdb.org/t/p/w780${b.file_path}`,
    }));

    const resolvedImdbId = detail.imdb_id || detail.external_ids?.imdb_id || undefined;

    const movie: Movie & { movie_categories?: any; screenshots?: any; downloads?: any[]; download_links?: any[] } = {
        ...base,
        imdb_id: resolvedImdbId,
        cast_members: castMembers || undefined,
        format: detail.runtime ? `${detail.runtime} mins` : undefined,
        movie_categories: movieCategories,
        screenshots: screenshots,
        downloads: [],
        download_links: [],
    };

    // Construct virtual Season objects for TV shows
    const seasons: Season[] = [];
    if (media === 'tv' && Array.isArray(detail.seasons)) {
        for (const s of detail.seasons) {
            if (s.season_number <= 0) continue; // Skip Specials (Season 0)
            const seasonNum = s.season_number;
            const epCount = s.episode_count || 12;

            seasons.push({
                id: `tmdb-s-${detail.id}-${seasonNum}`,
                movie_id: movie.id,
                season_number: seasonNum,
                title: s.name || `Season ${seasonNum}`,
                created_at: new Date().toISOString(),
                episodes: Array.from({ length: epCount }, (_, idx) => ({
                    id: `tmdb-ep-${detail.id}-${seasonNum}-${idx + 1}`,
                    season_id: `tmdb-s-${detail.id}-${seasonNum}`,
                    episode_number: idx + 1,
                    title: `Episode ${idx + 1}`,
                    streaming_url: '',
                    created_at: new Date().toISOString(),
                })),
            });
        }
    }

    return { movie, seasons, cast: castMembers };
}

export const TMDB_GENRES: Record<string, number> = {
    action: 28, adventure: 12, animation: 16, comedy: 35, crime: 80, documentary: 99,
    drama: 18, family: 10751, fantasy: 14, history: 36, horror: 27, music: 10402,
    mystery: 9648, romance: 10749, 'science-fiction': 878, scifi: 878, thriller: 53, war: 10752, western: 37,
};

export const TMDB_GENRE_ID_TO_SLUG: Record<number, string> = {
    28: 'action', 12: 'adventure', 16: 'animation', 35: 'comedy', 80: 'crime', 99: 'documentary',
    18: 'drama', 10751: 'family', 14: 'fantasy', 36: 'history', 27: 'horror', 10402: 'music',
    9648: 'mystery', 10749: 'romance', 878: 'science-fiction', 53: 'thriller', 10752: 'war', 37: 'western',
};

/**
 * Fetches TMDB movies & series matching specific mood genre slugs for Vibe Check
 */
export async function fetchTmdbByMoodGenres(
    genreSlugs: string[],
    format: 'all' | 'movie' | 'series' | 'anime' = 'all',
    page = 1
): Promise<Array<Movie & { genres: string[] }>> {
    const genreIds = genreSlugs.map(slug => TMDB_GENRES[slug]).filter(Boolean);
    if (!genreIds.length) return [];

    const isAnime = format === 'anime';
    const mediaTypes: ('movie' | 'tv')[] =
        format === 'movie' ? ['movie'] :
        format === 'series' || isAnime ? ['tv'] :
        ['movie', 'tv'];

    const fetches = mediaTypes.map(async (media) => {
        const endpoint = media === 'tv' ? '/discover/tv' : '/discover/movie';
        const params: Record<string, string> = {
            page: String(page),
            sort_by: 'popularity.desc',
            include_adult: 'false',
            with_genres: genreIds.join(','),
        };
        if (isAnime) {
            params.with_genres = '16';
            params.with_original_language = 'ja';
        }
        const data = await tmdbFetch<{ results: TmdbRawItem[] }>(endpoint, params);
        if (!data || !Array.isArray(data.results)) return [];

        return data.results.map(item => {
            const itemType: 'movie' | 'series' | 'anime' =
                isAnime ? 'anime' : (item.genre_ids?.includes(16) && item.original_language === 'ja') ? 'anime' : media === 'tv' ? 'series' : 'movie';
            const movie = tmdbToMovie(item, itemType);
            const mappedGenres = (item.genre_ids || [])
                .map(id => TMDB_GENRE_ID_TO_SLUG[id])
                .filter(Boolean);
            return {
                ...movie,
                genres: mappedGenres.length > 0 ? mappedGenres : genreSlugs,
            };
        });
    });

    const results = (await Promise.all(fetches)).flat();
    return results;
}
