/** @type {import('next').NextConfig} */
const nextConfig = {
    // Keep dev's hot-reload output isolated from production builds. Running
    // `next build` while `next dev` is open must not replace the dev manifest.
    distDir: process.env.NODE_ENV === 'development' ? '.next-dev' : '.next',
    compress: true, // Enable Gzip compression
    reactStrictMode: true,
    poweredByHeader: false, // Hide x-powered-by: Next.js header
    productionBrowserSourceMaps: false, // Prevent exposing source code maps in production
    experimental: {
        optimizePackageImports: ['lucide-react', 'date-fns', 'lodash'], // Optimize imports
    },
    images: {
        unoptimized: true, // Bypass Vercel 5,000 transformation/month limit; images load directly from fast origin CDNs (TMDB, R2, ImgBB)
        formats: ['image/avif', 'image/webp'],
        minimumCacheTTL: 31536000,
        remotePatterns: [
            {
                protocol: 'https',
                hostname: '**',
            },
        ],
    },
    async redirects() {
        return [
            {
                source: '/anime/naruto-shippuden-season-1-16-2026',
                destination: '/anime/naruto-shippuden-season-1-22-2026',
                permanent: true,
            },
        ];
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
                    {
                        key: 'X-XSS-Protection',
                        value: '1; mode=block',
                    },
                    {
                        key: 'X-Robots-Tag',
                        value: 'noai, noimageai',
                    },
                    {
                        key: 'Cross-Origin-Opener-Policy',
                        value: 'same-origin-allow-popups',
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


