import { supabase } from '@/lib/supabase';

const EXCLUDED_SLUGS = ['admin', 'dashboard', 'api', 'auth'];

export async function GET() {
    // 1. Static Pages
    const staticPages = [
        { url: '/', priority: 1.0, changefreq: 'daily' },
        { url: '/dmca', priority: 0.5, changefreq: 'monthly' },
        { url: '/contact', priority: 0.5, changefreq: 'monthly' },
    ];

    const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://nexiplay.vercel.app';

    // Generate XML
    const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
    <urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
        ${staticPages
            .map((page) => {
                return `
        <url>
            <loc>${baseUrl}${page.url}</loc>
            <lastmod>${new Date().toISOString()}</lastmod>
            <changefreq>${page.changefreq}</changefreq>
            <priority>${page.priority}</priority>
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
