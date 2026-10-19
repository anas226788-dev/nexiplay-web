import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// Known AI agents, scrapers, automated headless browsers and exploit bots
const BLOCKED_USER_AGENTS = [
    'gptbot',
    'chatgpt-user',
    'claudebot',
    'claude-web',
    'anthropic',
    'perplexitybot',
    'bytespider',
    'ccbot',
    'diffbot',
    'facebookbot',
    'applebot-extended',
    'cohere-ai',
    'omgilibot',
    'webcopier',
    'scrapy',
    'python-requests',
    'aiohttp',
    'httpx',
    'headlesschrome',
    'phantomjs',
    'selenium',
    'puppeteer',
    'playwright',
    'postmanruntime',
    'curl/',
    'wget/',
    'go-http-client',
    'urllib',
    'libwww-perl',
    'masscan',
    'nikto',
    'zgrab',
    'nmap',
    'sqlmap',
];

// Sensitive exploit probes & security scanning paths
const BLOCKED_PATHS = [
    '/.env',
    '/.git',
    '/wp-admin',
    '/wp-login',
    '/phpmyadmin',
    '/xmlrpc.php',
    '/.aws',
    '/actuator',
    '/swagger',
    '/.well-known/security.txt',
    '/debug/default/view',
    '/telescope',
    '/server-status',
];

export function middleware(request: NextRequest) {
    const { pathname } = request.nextUrl;
    const userAgent = (request.headers.get('user-agent') || '').toLowerCase();

    // 1. Block common vulnerability scanners and exploit path probes
    for (const probe of BLOCKED_PATHS) {
        if (pathname.toLowerCase().startsWith(probe)) {
            return new NextResponse('Access Denied: Security violation detected.', {
                status: 403,
                headers: {
                    'Content-Type': 'text/plain',
                    'X-Security-Shield': 'Nexiplay-Fortress-v4',
                },
            });
        }
    }

    // 2. Block AI Scrapers and automated scraper user agents on sensitive routes (/watch, /embed, /api)
    // and general scraping
    const isSensitivePath = pathname.startsWith('/watch') || pathname.startsWith('/embed') || pathname.startsWith('/api');
    
    for (const botAgent of BLOCKED_USER_AGENTS) {
        if (userAgent.includes(botAgent)) {
            // For sensitive streaming paths, block with 403 Forbidden
            if (isSensitivePath) {
                return new NextResponse(
                    JSON.stringify({
                        error: 'Access Denied: Automated agent or scraper prohibited by Nexiplay Security Shield.',
                        status: 403,
                        timestamp: new Date().toISOString(),
                    }),
                    {
                        status: 403,
                        headers: {
                            'Content-Type': 'application/json',
                            'X-Security-Shield': 'Nexiplay-Fortress-v4',
                            'X-Robots-Tag': 'noindex, nofollow, noai, noimageai',
                        },
                    }
                );
            }
        }
    }

    // 3. Continue with Enhanced Security Headers
    const response = NextResponse.next();

    // Prevent AI ingestion & training
    response.headers.set('X-Robots-Tag', 'noai, noimageai');
    response.headers.set('X-Security-Shield', 'Nexiplay-Fortress-v4');
    response.headers.set('X-Content-Type-Options', 'nosniff');
    response.headers.set('X-XSS-Protection', '1; mode=block');

    return response;
}

export const config = {
    matcher: [
        /*
         * Match all request paths except for:
         * - _next/static (static files)
         * - _next/image (image optimization files)
         * - favicon.ico, images, icons
         */
        '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|avif)$).*)',
    ],
};
