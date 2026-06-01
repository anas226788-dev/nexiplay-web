import { supabase } from '@/lib/supabase';

export async function GET() {
    const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://nexiplay.vercel.app';

    // Fetch anime only
    const { data: anime } = await supabase
        .from('movies') // Assuming everything is in 'movies' table
        .select('slug, updated_at')
        .eq('type', 'anime')
        .order('updated_at', { ascending: false });

    // Generate XML
    const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
    <urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
        ${(anime || [])
            .map((item) => {
                return `
        <url>
            <loc>${baseUrl}/anime/${item.slug}</loc>
            <lastmod>${item.updated_at ? new Date(item.updated_at).toISOString() : new Date().toISOString()}</lastmod>
            <changefreq>weekly</changefreq>
            <priority>0.9</priority>
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
