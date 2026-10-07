/** @type {import('next').NextConfig} */
const nextConfig = {
    compress: true, // Enable Gzip compression
    reactStrictMode: true,
    poweredByHeader: false, // Hide x-powered-by: Next.js header
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
                // Global security headers for main website (exclude /embed and /api so iframe player works)
                source: '/((?!embed|api).*)',
                headers: [
                    {
                        key: 'X-Frame-Options',
                        value: 'SAMEORIGIN',
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
                // Embed Player Iframe headers - allowing embedding on any external domain
                source: '/embed/:path*',
                headers: [
                    {
                        key: 'Content-Security-Policy',
                        value: 'frame-ancestors *',
                    },
                    {
                        key: 'Access-Control-Allow-Origin',
                        value: '*',
                    },
                    {
                        key: 'Access-Control-Allow-Methods',
                        value: 'GET, HEAD, OPTIONS',
                    },
                ],
            },
            {
                // Public Stream API endpoints
                source: '/api/:path*',
                headers: [
                    {
                        key: 'Access-Control-Allow-Origin',
                        value: '*',
                    },
                    {
                        key: 'Access-Control-Allow-Methods',
                        value: 'GET, POST, HEAD, OPTIONS',
                    },
                    {
                        key: 'Access-Control-Allow-Headers',
                        value: 'Range, Origin, Referer, Content-Type, Authorization',
                    },
                    {
                        key: 'Access-Control-Expose-Headers',
                        value: 'Content-Length, Content-Range, Accept-Ranges',
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


