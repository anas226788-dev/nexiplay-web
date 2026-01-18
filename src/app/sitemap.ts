import { MetadataRoute } from 'next';
import { supabase } from '@/lib/supabase';

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
    // Use environment variable for domain, fallback to localhost or user's example
    const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://nexiplay.vercel.app';

    // Fetch all movies/series/anime
    // Fetch only needed fields to be lightweight
    const { data: movies } = await supabase
        .from('movies')
        .select('slug, type, updated_at')
        .order('updated_at', { ascending: false });

    const contentUrls = (movies || []).map((movie) => {
        // Determine path based on type
        // Ensure type matches the folder [type] expectations (movie, series, anime)
        return {
            url: `${baseUrl}/${movie.type}/${movie.slug}`,
            lastModified: movie.updated_at ? new Date(movie.updated_at) : new Date(),
            changeFrequency: 'weekly' as const,
            priority: 0.8,
        };
    });

    return [
        {
            url: baseUrl,
            lastModified: new Date(),
            changeFrequency: 'daily',
            priority: 1,
        },
        ...contentUrls,
    ];
}
