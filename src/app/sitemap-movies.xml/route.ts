import { supabase } from '@/lib/supabase';

export async function GET() {
    const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://nexiplay.vercel.app';

    // Fetch movies only
    const { data: movies } = await supabase
        .from('movies') // Assuming movies table name
        .select('slug, updated_at')
        .eq('type', 'movie')
        .order('updated_at', { ascending: false });

    // Generate XML
    const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
    <urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
        ${(movies || [])
            .map((movie) => {
                return `
        <url>
            <loc>${baseUrl}/movie/${movie.slug}</loc>
            <lastmod>${movie.updated_at ? new Date(movie.updated_at).toISOString() : new Date().toISOString()}</lastmod>
            <changefreq>weekly</changefreq>
            <priority>0.8</priority>
        </url>`;
            })
            .join('')}
    </urlset>`;

    return new Response(sitemap, {
        headers: {
            'Content-Type': 'application/xml',
        },
    });
}
