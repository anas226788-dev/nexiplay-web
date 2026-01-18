import { MetadataRoute } from 'next';

export default function robots(): MetadataRoute.Robots {
    const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://nexiplay.com';

    return {
        rules: {
            userAgent: '*',
            allow: '/',
            disallow: ['/admin', '/api/cron'], // Disallow admin and cron paths
        },
        sitemap: `${baseUrl}/sitemap.xml`,
    };
}
