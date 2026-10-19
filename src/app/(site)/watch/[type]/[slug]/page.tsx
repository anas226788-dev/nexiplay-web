import { notFound } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { Season } from '@/lib/types';
import { Metadata } from 'next';
import { buildPageMetadata } from '@/lib/metadata';
import { fetchTmdbDetails, tmdbDetailToMovie, fetchTmdbByImdbId, searchTmdb, cleanTitleForTmdb } from '@/lib/tmdb';
import WatchPageClient from './WatchPageClient';

export const revalidate = 60;

interface PageProps {
    params: Promise<{
        type: string;
        slug: string;
    }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
    const { type, slug: rawSlug } = await params;

    const slugParts = rawSlug.match(/^(.+)-(\d{4})$/);
    const actualSlug = slugParts ? slugParts[1] : rawSlug;
    const releaseYear = slugParts ? parseInt(slugParts[2]) : null;

    let dbType = 'movie';
    if (type === 'anime') dbType = 'anime';
    else if (type === 'series') dbType = 'series';
    else if (type === 'movie' || type === 'movies') dbType = 'movie';

    let { data: movie } = await supabase
        .from('movies')
        .select('title, release_year, type, poster_url')
        .eq('slug', rawSlug)
        .eq('type', dbType)
        .maybeSingle();

    if (!movie && releaseYear) {
        const { data: fallbackMovie } = await supabase
            .from('movies')
            .select('title, release_year, type, poster_url')
            .eq('slug', actualSlug)
            .eq('release_year', releaseYear)
            .eq('type', dbType)
            .maybeSingle();
        if (fallbackMovie) movie = fallbackMovie;
    }

    if (!movie) {
        const media = (dbType === 'series' || dbType === 'anime') ? 'tv' : 'movie';
        let tmdbId: number | null = null;
        let resolvedMedia: 'movie' | 'tv' = media;

        if (rawSlug.startsWith('tmdb-') || /^\d+$/.test(rawSlug)) {
            tmdbId = parseInt(rawSlug.replace(/^tmdb-/, ''), 10);
        } else if (/^tt\d+$/i.test(rawSlug)) {
            const findRes = await fetchTmdbByImdbId(rawSlug);
            if (findRes) {
                tmdbId = findRes.tmdbId;
                resolvedMedia = findRes.media;
            }
        } else {
            const searchResults = await searchTmdb(actualSlug.replace(/-/g, ' '), media);
            if (searchResults.length > 0) {
                const match = releaseYear
                    ? searchResults.find(r => r.release_year === releaseYear) || searchResults[0]
                    : searchResults[0];
                if (match?.tmdb_id) {
                    tmdbId = parseInt(match.tmdb_id, 10);
                }
            }
        }

        if (tmdbId) {
            const detail = await fetchTmdbDetails(tmdbId, resolvedMedia);
            if (detail) {
                const { movie: virtualMovie } = tmdbDetailToMovie(detail, resolvedMedia);
                movie = virtualMovie as any;
            }
        }
    }

    if (!movie) {
        return buildPageMetadata({
            title: 'Watch - Not Found',
            description: 'The requested title could not be found.',
            path: `/watch/${type}/${rawSlug}`,
        });
    }

    return buildPageMetadata({
        title: `Watch ${movie.title} (${movie.release_year}) Online Free - Nexiplay`,
        description: `Watch ${movie.title} online for free in HD quality on Nexiplay. Stream now with multiple servers and language options.`,
        path: `/watch/${type}/${rawSlug}`,
        image: movie.poster_url || undefined,
    });
}

export default async function WatchPage({ params }: PageProps) {
    const { type, slug: rawSlug } = await params;

    const slugParts = rawSlug.match(/^(.+)-(\d{4})$/);
    const actualSlug = slugParts ? slugParts[1] : rawSlug;
    const releaseYear = slugParts ? parseInt(slugParts[2]) : null;

    let dbType = 'movie';
    if (type === 'anime') dbType = 'anime';
    else if (type === 'series') dbType = 'series';
    else if (type === 'movie' || type === 'movies') dbType = 'movie';

    let { data: movie } = await supabase
        .from('movies')
        .select(`
            *,
            download_links (*),
            movie_categories (
                categories (*)
            )
        `)
        .eq('slug', rawSlug)
        .eq('type', dbType)
        .maybeSingle();

    if (!movie && releaseYear) {
        const { data: fallbackMovie } = await supabase
            .from('movies')
            .select(`
                *,
                download_links (*),
                movie_categories (
                    categories (*)
                )
            `)
            .eq('slug', actualSlug)
            .eq('release_year', releaseYear)
            .eq('type', dbType)
            .maybeSingle();
        if (fallbackMovie) movie = fallbackMovie;
    }

    let tmdbSeasons: Season[] = [];
    if (!movie) {
        const media = (dbType === 'series' || dbType === 'anime') ? 'tv' : 'movie';
        let tmdbId: number | null = null;
        let resolvedMedia: 'movie' | 'tv' = media;

        if (rawSlug.startsWith('tmdb-') || /^\d+$/.test(rawSlug)) {
            tmdbId = parseInt(rawSlug.replace(/^tmdb-/, ''), 10);
        } else if (/^tt\d+$/i.test(rawSlug)) {
            const findRes = await fetchTmdbByImdbId(rawSlug);
            if (findRes) {
                tmdbId = findRes.tmdbId;
                resolvedMedia = findRes.media;
            }
        } else {
            const searchResults = await searchTmdb(actualSlug.replace(/-/g, ' '), media);
            if (searchResults.length > 0) {
                const match = releaseYear
                    ? searchResults.find(r => r.release_year === releaseYear) || searchResults[0]
                    : searchResults[0];
                if (match?.tmdb_id) {
                    tmdbId = parseInt(match.tmdb_id, 10);
                }
            }
        }

        if (tmdbId) {
            const detail = await fetchTmdbDetails(tmdbId, resolvedMedia);
            if (detail) {
                const { movie: virtualMovie, seasons: virtualSeasons } = tmdbDetailToMovie(detail, resolvedMedia);
                movie = virtualMovie as any;
                tmdbSeasons = virtualSeasons;
            }
        }
    }

    if (!movie) notFound();

    const movieData = movie as any;

    if (!movieData.id?.startsWith('tmdb-')) {
        try {
            const { data: streamingRow, error: streamingError } = await supabase
                .from('streaming')
                .select('*')
                .eq('movie_id', movieData.id)
                .maybeSingle();

            if (streamingRow && !streamingError) {
                const row = streamingRow as any;
                movieData.tmdb_id = row.tmdb_id ?? movieData.tmdb_id;
                movieData.imdb_id = row.imdb_id ?? movieData.imdb_id;
                movieData.mal_id = row.mal_id ?? movieData.mal_id;
                movieData.streaming_url_animerulz = row.streaming_url_animerulz ?? movieData.streaming_url_animerulz;
                movieData.streaming_url_toonplay = row.streaming_url_toonplay ?? movieData.streaming_url_toonplay;
                movieData.animerulz_url = row.animerulz_url ?? movieData.animerulz_url;
                movieData.toonplay_url = row.toonplay_url ?? movieData.toonplay_url;

                if (row.is_disabled) {
                    movieData.streaming_url = 'disabled';
                } else if (row.streaming_url) {
                    movieData.streaming_url = row.streaming_url;
                }

                if (row.multi_scraper_config) {
                    movieData.scraper_source = 'multi';
                    movieData.scraper_url = row.multi_scraper_config;
                }
            }
        } catch (err) {
            console.warn('[WatchPage] Failed to merge streaming row:', err);
        }
    }

    // Auto-resolve TMDB ID if missing in DB
    if (!movieData.tmdb_id && !movieData.imdb_id) {
        const cleanTitle = cleanTitleForTmdb(movieData.title);
        const media = (movieData.type === 'series' || movieData.type === 'anime') ? 'tv' : 'movie';
        try {
            const searchResults = await searchTmdb(cleanTitle, media);
            if (searchResults.length > 0) {
                const match = movieData.release_year
                    ? searchResults.find(r => r.release_year === movieData.release_year) || searchResults[0]
                    : searchResults[0];
                if (match?.tmdb_id) {
                    movieData.tmdb_id = match.tmdb_id;
                    // Persist to DB asynchronously
                    supabase.from('movies').update({ tmdb_id: match.tmdb_id }).eq('id', movieData.id).then();
                }
            }
        } catch (e) {
            console.warn('[WatchPage] Auto TMDB resolve error:', e);
        }
    }

    const isSeriesOrAnime = movieData.type === 'series' || movieData.type === 'anime';

    // Fetch seasons for series/anime
    let seasons: Season[] = tmdbSeasons;
    if (isSeriesOrAnime && !movieData.id?.startsWith('tmdb-')) {
        const { data: seasonData } = await supabase
            .from('seasons')
            .select(`
                *,
                episodes (
                    *,
                    download_links:episode_download_links (*)
                )
            `)
            .eq('movie_id', movieData.id)
            .order('season_number');

        seasons = (seasonData as Season[]) || [];

        // If DB has 0 seasons but has tmdb_id, dynamically generate virtual seasons from TMDB
        if (seasons.length === 0 && movieData.tmdb_id) {
            try {
                const detail = await fetchTmdbDetails(parseInt(movieData.tmdb_id, 10), 'tv');
                if (detail) {
                    const { seasons: virtualSeasons } = tmdbDetailToMovie(detail, 'tv');
                    seasons = virtualSeasons;
                }
            } catch (e) {
                console.warn('[WatchPage] Failed to fetch virtual seasons from TMDB:', e);
            }
        }
    }

    // Fallback: Ensure at least Season 1 Episode 1 exists so episode-dependent servers work
    if (isSeriesOrAnime && seasons.length === 0) {
        seasons = [{
            id: `virtual-s1-${movieData.id}`,
            movie_id: movieData.id,
            season_number: 1,
            title: 'Season 1',
            created_at: new Date().toISOString(),
            episodes: [{
                id: `virtual-e1-${movieData.id}`,
                season_id: `virtual-s1-${movieData.id}`,
                episode_number: 1,
                title: 'Episode 1',
                created_at: new Date().toISOString(),
                download_links: []
            }]
        }];
    }

    return (
        <WatchPageClient 
            movie={movieData}
            seasons={seasons}
            type={type}
            slug={rawSlug}
        />
    );
}
