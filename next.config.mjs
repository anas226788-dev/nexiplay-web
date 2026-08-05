/** @type {import('next').NextConfig} */
const nextConfig = {
    compress: true, // Enable Gzip compression
    reactStrictMode: true,
    productionBrowserSourceMaps: false, // Prevent exposing source code maps in production
    experimental: {
        optimizePackageImports: ['lucide-react', 'date-fns', 'lodash'], // Optimize imports
    },
    images: {
        formats: ['image/avif', 'image/webp'], // Force AVIF (better) -> WebP
        minimumCacheTTL: 31536000,
        deviceSizes: [640, 750, 828, 1080, 1200, 1920, 2048], // Optimize for mobile
        imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
        remotePatterns: [
            {
                protocol: 'https',
                hostname: '**',
            },
        ],
    },
    async headers() {
        return [
            {
                // Global security headers
                source: '/:path*',
                headers: [
                    {
                        key: 'X-Frame-Options',
                        value: 'DENY',
                    },
                    {
                        key: 'X-Content-Type-Options',
                        value: 'nosniff',
                    },
                    {
                        key: 'Referrer-Policy',
                        value: 'strict-origin-when-cross-origin',
                    },
                    {
                        key: 'Permissions-Policy',
                        value: 'camera=(), microphone=(), geolocation=()',
                    },
                ],
            },
            {
                // Cache OG-relevant static assets (preview images, favicons)
                source: '/(preview\\.jpg|favicon\\.ico|apple-touch-icon\\.png|android-chrome-.*\\.png|favicon-.*\\.png)',
                headers: [
                    {
                        key: 'Cache-Control',
                        value: 'public, max-age=31536000, immutable',
                    },
                ],
            },
            {
                // Ensure all pages are indexable by search engine crawlers
                source: '/:path*',
                headers: [
                    {
                        key: 'X-Robots-Tag',
                        value: 'index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1',
                    },
                ],
            },
        ];
    },
};

export default nextConfig;

