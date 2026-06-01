import { supabase } from '@/lib/supabase';

export async function GET() {
    const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://nexiplay.vercel.app';

    // Fetch categories
    const { data: categories } = await supabase
        .from('categories')
        .select('slug');

    // Generate XML
    const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
    <urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
        ${(categories || [])
            .map((cat) => {
                return `
        <url>
            <loc>${baseUrl}/genre/${cat.slug}</loc>
            <lastmod>${new Date().toISOString()}</lastmod>
            <changefreq>weekly</changefreq>
            <priority>0.7</priority>
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
