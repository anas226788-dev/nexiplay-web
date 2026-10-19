import { MetadataRoute } from 'next';
import { SITE_URL, getAbsoluteUrl } from '@/lib/metadata';

export default function robots(): MetadataRoute.Robots {
    const aiBots = [
        'GPTBot',
        'ChatGPT-User',
        'ClaudeBot',
        'Claude-Web',
        'Anthropic-ai',
        'PerplexityBot',
        'Google-Extended',
        'ByteSpider',
        'CCBot',
        'Diffbot',
        'FacebookBot',
        'facebookexternalhit',
        'Applebot-Extended',
        'Twitterbot',
        'Slackbot',
        'Omgilibot',
        'Omgili',
        'WebCopier',
        'Scrapy',
        'cohere-ai',
        'Amazonbot',
        'img2dataset',
        'Barkrowler',
        'Timpibot',
    ];

    return {
        rules: [
            {
                userAgent: '*',
                allow: '/',
                disallow: ['/api/', '/embed/', '/watch/'],
            },
            ...aiBots.map((bot) => ({
                userAgent: bot,
                disallow: '/',
            })),
        ],
        host: SITE_URL,
        sitemap: getAbsoluteUrl('/sitemap.xml'),
    };
}


