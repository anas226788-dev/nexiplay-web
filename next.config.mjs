/** @type {import('next').NextConfig} */
const nextConfig = {
    compress: true, // Enable Gzip compression
    reactStrictMode: true,
    swcMinify: true, // Use SWC minifier
    experimental: {
        optimizePackageImports: ['lucide-react', 'date-fns', 'lodash'], // Optimize imports
    },
    images: {
        formats: ['image/webp'], // Force WebP
        deviceSizes: [640, 750, 828, 1080, 1200, 1920, 2048], // Optimize for mobile
        imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
        remotePatterns: [
            {
                protocol: 'https',
                hostname: '**',
            },
        ],
    },
};

export default nextConfig;
