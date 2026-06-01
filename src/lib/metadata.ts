import type { Metadata } from 'next';

export const SITE_NAME = 'Nexiplay';
export const SITE_URL = 'https://nexiplay.vercel.app';
export const DEFAULT_SITE_TITLE = `${SITE_NAME} - Download Anime, Movies and Series in HD`;
export const DEFAULT_DESCRIPTION =
    'Nexiplay is a fast, clean, and mobile-friendly platform to download Anime, Movies, and Series in 360p, 720p, and 1080p.';
export const DEFAULT_OG_IMAGE_PATH = '/preview.jpg';
export const DEFAULT_OG_IMAGE_URL = new URL(DEFAULT_OG_IMAGE_PATH, SITE_URL).toString();
export const DEFAULT_OG_IMAGE_ALT = 'Nexiplay - Download Anime, Movies and Series in HD';

type OpenGraphType =
    | 'website'
    | 'article'
    | 'book'
    | 'profile'
    | 'music.song'
    | 'music.album'
    | 'music.playlist'
    | 'music.radio_station'
    | 'video.movie'
    | 'video.episode'
    | 'video.tv_show'
    | 'video.other';

type PageMetadataOptions = {
    title?: string;
    description?: string;
    path?: string;
    type?: OpenGraphType;
    keywords?: Metadata['keywords'];
    image?: string;
    imageAlt?: string;
};

export function getAbsoluteUrl(path = '/'): string {
    if (path.startsWith('http://') || path.startsWith('https://')) {
        return path;
    }

    const normalizedPath = path === '/' ? '/' : path.startsWith('/') ? path : `/${path}`;
    return new URL(normalizedPath, SITE_URL).toString();
}

export function buildPageMetadata({
    title,
    description = DEFAULT_DESCRIPTION,
    path = '/',
    type = 'website',
    keywords,
    image,
    imageAlt,
}: PageMetadataOptions = {}): Metadata {
    const fullTitle = title ? `${title} | ${SITE_NAME}` : DEFAULT_SITE_TITLE;

    // Use custom image if provided (must be absolute URL), otherwise fall back to default
    let ogImageUrl = image ? getAbsoluteUrl(image) : DEFAULT_OG_IMAGE_URL;
    
    // Proxy Supabase storage URLs to strip x-robots-tag which blocks social media scrapers
    if (ogImageUrl.includes('supabase.co/storage/v1/object/public/')) {
        ogImageUrl = getAbsoluteUrl(`/api/og-image?url=${encodeURIComponent(ogImageUrl)}`);
    }

    const ogImageAlt = imageAlt || (image ? fullTitle : DEFAULT_OG_IMAGE_ALT);
    // Detect image type from URL extension (check original image path)
    const typeCheckUrl = image || ogImageUrl;
    const ogImageType = typeCheckUrl.match(/\.webp/i)
        ? 'image/webp'
        : typeCheckUrl.match(/\.png/i)
          ? 'image/png'
          : 'image/jpeg';

    const metadata: Metadata = {
        description,
        alternates: {
            canonical: path,
        },
        openGraph: {
            title: fullTitle,
            description,
            url: getAbsoluteUrl(path),
            siteName: SITE_NAME,
            type,
            locale: 'en_US',
            images: [
                {
                    url: ogImageUrl,
                    width: 1200,
                    height: 630,
                    alt: ogImageAlt,
                    type: ogImageType,
                },
            ],
        },
        twitter: {
            card: 'summary_large_image',
            title: fullTitle,
            description,
            images: [ogImageUrl],
        },
    };

    if (title) {
        metadata.title = title;
    }

    if (keywords) {
        metadata.keywords = keywords;
    }

    return metadata;
}

export const rootMetadata: Metadata = {
    ...buildPageMetadata({
        path: '/',
    }),
    metadataBase: new URL(SITE_URL),
    title: {
        default: DEFAULT_SITE_TITLE,
        template: `%s | ${SITE_NAME}`,
    },
    applicationName: SITE_NAME,
    verification: {
        google: 'jvLQjTLiIH_oAJPYsTyeKWYb1HlqXpjAcO_kk-0Tm8g',
    },
    robots: {
        index: true,
        follow: true,
        googleBot: {
            index: true,
            follow: true,
            'max-image-preview': 'large',
            'max-snippet': -1,
            'max-video-preview': -1,
        },
    },
    icons: {
        icon: [
            { url: '/favicon.ico' },
            { url: '/favicon-16x16.png', sizes: '16x16', type: 'image/png' },
            { url: '/favicon-32x32.png', sizes: '32x32', type: 'image/png' },
            { url: '/android-chrome-192x192.png', sizes: '192x192', type: 'image/png' },
            { url: '/android-chrome-512x512.png', sizes: '512x512', type: 'image/png' },
        ],
        shortcut: '/favicon.ico',
        apple: '/apple-touch-icon.png',
        other: [
            {
                rel: 'apple-touch-icon-precomposed',
                url: '/apple-touch-icon.png',
            },
        ],
    },
    manifest: '/site.webmanifest',
};
