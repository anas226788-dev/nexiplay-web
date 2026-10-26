import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
    const { searchParams } = new URL(request.url);
    const targetUrl = searchParams.get('url');

    if (!targetUrl) {
        return new NextResponse('Missing url parameter', { status: 400 });
    }

    try {
        let playerUrl = targetUrl;
        const parsed = new URL(targetUrl);
        const host = parsed.hostname.toLowerCase();

        // Normalize /e/ path
        const parts = parsed.pathname.split('/').filter(Boolean);
        const id = parts[parts.length - 1];
        if (id && parts[0] !== 'e') {
            playerUrl = `https://${parsed.host}/e/${id}`;
        }

        let res = await fetch(playerUrl, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                'Referer': 'https://voe.sx/',
                'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8'
            },
            signal: AbortSignal.timeout(8000)
        });

        if (!res.ok) {
            return new NextResponse(`Voe returned status ${res.status}`, { status: res.status });
        }

        let html = await res.text();

        // Follow JS redirect from voe.sx to actual delivery mirror (e.g. ashleyhardat.com)
        if (html.length < 2500 && html.includes('window.location.href')) {
            const redirectMatch = html.match(/window\.location\.href\s*=\s*['"]([^'"]+)['"]/);
            if (redirectMatch && redirectMatch[1]) {
                const redirectUrl = redirectMatch[1];
                res = await fetch(redirectUrl, {
                    headers: {
                        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                        'Referer': 'https://voe.sx/',
                        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8'
                    },
                    signal: AbortSignal.timeout(8000)
                });
                if (res.ok) {
                    html = await res.text();
                }
            }
        }

        let originDomain = 'https://ashleyhardat.com';
        try {
            const redirectParsed = new URL(res.url);
            originDomain = redirectParsed.origin;
        } catch {}

        // Ensure base assets resolve to the origin CDN
        if (!html.includes('<base')) {
            html = html.replace(/<head[^>]*>/i, `<head><base href="${originDomain}/">`);
        }

        // Cut out all ad network scripts (Scripts between /js/loader. and bootstrap.bundle)
        // This strips 117KB+ of adult dating ad networks, popunders, and Erika modals
        const loaderEnd = html.indexOf('/js/loader.');
        if (loaderEnd !== -1) {
            const scriptAfterLoader = html.indexOf('</script>', loaderEnd) + 9;
            const bootstrapStart = html.indexOf('bootstrap.bundle');
            const scriptBeforeBootstrap = bootstrapStart !== -1 ? html.lastIndexOf('<script', bootstrapStart) : -1;

            if (scriptAfterLoader > 0 && scriptBeforeBootstrap > scriptAfterLoader) {
                html = html.slice(0, scriptAfterLoader) + '\n<!-- AD NETWORKS STRIPPED -->\n' + html.slice(scriptBeforeBootstrap);
            }
        }

        // Remove third-party ad tags (Google IMA, Twitter Ads, Spanish-speaking, Darnobedience)
        html = html.replace(/<script[^>]+src=["'][^"']*(?:ads-twitter|ima3\.js|darnobedience|spanish-speaking)[^"']*["'][^>]*><\/script>/gi, '');

        // Inject high-priority styles and scripts to completely suppress adult popups, modals, and window.open
        const antiAdBlock = `
        <style>
            .modal, .modal-backdrop, [class*="popup"], [id*="ad"], #overlay, [class*="overlay"], [class*="dialog"], .fade.show {
                display: none !important;
                opacity: 0 !important;
                pointer-events: none !important;
                visibility: hidden !important;
                width: 0 !important;
                height: 0 !important;
            }
        </style>
        <script>
            try {
                window.open = function() { return null; };
                window._pop = null;
                window._pao = null;
                document.addEventListener("DOMContentLoaded", function() {
                    var modals = document.querySelectorAll('.modal, .modal-backdrop, [class*="popup"], [id*="overlay"]');
                    modals.forEach(function(m) { m.remove(); });
                });
            } catch(e) {}
        </script>
        `;
        html = html.replace('</head>', antiAdBlock + '</head>');

        return new NextResponse(html, {
            status: 200,
            headers: {
                'Content-Type': 'text/html; charset=utf-8',
                'Cache-Control': 'public, max-age=3600, s-maxage=7200',
                'X-Frame-Options': 'SAMEORIGIN'
            }
        });
    } catch (e: any) {
        console.error('[Voe Clean Proxy Error]:', e.message);
        return new NextResponse(`Voe proxy error: ${e.message}`, { status: 500 });
    }
}
