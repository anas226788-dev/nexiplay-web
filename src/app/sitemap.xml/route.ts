export async function GET() {
    const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://nexiplay.vercel.app';

    const sitemapIndex = `<?xml version="1.0" encoding="UTF-8"?>
<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
    <sitemap>
        <loc>${baseUrl}/sitemap-pages.xml</loc>
    </sitemap>
    <sitemap>
        <loc>${baseUrl}/sitemap-movies.xml</loc>
    </sitemap>
    <sitemap>
        <loc>${baseUrl}/sitemap-series.xml</loc>
    </sitemap>
    <sitemap>
        <loc>${baseUrl}/sitemap-anime.xml</loc>
    </sitemap>
    <sitemap>
        <loc>${baseUrl}/sitemap-categories.xml</loc>
    </sitemap>
</sitemapindex>`;

    return new Response(sitemapIndex, {
        headers: {
            'Content-Type': 'application/xml',
        },
    });
}
