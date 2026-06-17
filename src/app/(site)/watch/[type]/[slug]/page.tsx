import { notFound } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { Season } from '@/lib/types';
import { Metadata } from 'next';
import { buildPageMetadata } from '@/lib/metadata';
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

    if (!movie) notFound();

    const movieData = movie as any;
    const isSeriesOrAnime = movieData.type === 'series' || movieData.type === 'anime';

    // Fetch seasons for series/anime
    let seasons: Season[] = [];
    if (isSeriesOrAnime) {
        const { data: seasonData } = await supabase
            .from('seasons')
            .select(`
                *,
                episodes (
                    *
                )
            `)
            .eq('movie_id', movieData.id)
            .order('season_number');

        seasons = (seasonData as Season[]) || [];
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
