import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

const ALLOWED_VOE_HOSTS = ['voe.sx', 'voe-network.net', 'ashleyhardat.com'];

function isAllowedVoeHost(hostname: string) {
    const host = hostname.toLowerCase().replace(/^www\./, '');
    return ALLOWED_VOE_HOSTS.some(domain => host === domain || host.endsWith(`.${domain}`));
}

async function fetchVoePage(url: string, referer: string) {
    let currentUrl = new URL(url);
    for (let hop = 0; hop < 4; hop++) {
        if (currentUrl.protocol !== 'https:' || !isAllowedVoeHost(currentUrl.hostname)) {
            throw new Error('Unsupported Voe delivery host');
        }
        const response = await fetch(currentUrl, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                Referer: referer,
                Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8'
            },
            redirect: 'manual',
            signal: AbortSignal.timeout(8000)
        });
        if (![301, 302, 303, 307, 308].includes(response.status)) return response;
        const location = response.headers.get('location');
        if (!location) return response;
        currentUrl = new URL(location, currentUrl);
    }
    throw new Error('Too many Voe delivery redirects');
}

export async function GET(request: NextRequest) {
    const { searchParams } = new URL(request.url);
    const targetUrl = searchParams.get('url');

    if (!targetUrl) {
        return new NextResponse('Missing url parameter', { status: 400 });
    }

    try {
        let playerUrl = targetUrl;
        const parsed = new URL(targetUrl);
        if (parsed.protocol !== 'https:' || !isAllowedVoeHost(parsed.hostname)) {
            return new NextResponse('Unsupported Voe player host', { status: 400 });
        }
        const host = parsed.hostname.toLowerCase();

        // Normalize /e/ path
        const parts = parsed.pathname.split('/').filter(Boolean);
        const id = parts[parts.length - 1];
        if (id && parts[0] !== 'e') {
            playerUrl = `https://${parsed.host}/e/${id}`;
        }

        let res = await fetchVoePage(playerUrl, 'https://voe.sx/');

        if (!res.ok) {
            return new NextResponse(`Voe returned status ${res.status}`, { status: res.status });
        }

        let html = await res.text();

        // Follow JS redirect from voe.sx to actual delivery mirror (e.g. ashleyhardat.com)
        if (html.length < 2500 && html.includes('window.location.href')) {
            const redirectMatch = html.match(/window\.location\.href\s*=\s*['"]([^'"]+)['"]/);
            if (redirectMatch && redirectMatch[1]) {
                const redirectUrl = new URL(redirectMatch[1], res.url);
                res = await fetchVoePage(redirectUrl.toString(), 'https://voe.sx/');
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

        // Total Industrial Ad Purge:
        // JWPlayer is fully initialized by the JSON data block and /js/loader.js.
        // All scripts located after loader.js (117KB+) are ad networks, popunders, and Erika dating modals.
        const loaderIdx = html.indexOf('/js/loader.');
        if (loaderIdx !== -1) {
            const scriptAfterLoader = html.indexOf('</script>', loaderIdx) + 9;
            const bodyCloseIdx = html.indexOf('</body>');
            if (scriptAfterLoader > 8 && bodyCloseIdx > scriptAfterLoader) {
                html = html.slice(0, scriptAfterLoader) + '\n<!-- AD NETWORKS COMPLETELY ELIMINATED -->\n' + html.slice(bodyCloseIdx);
            }
        }

        // Remove any lingering third-party ad tags and tracking
        html = html.replace(/<script[^>]+src=["'][^"']*(?:ads-twitter|ima3\.js|darnobedience|spanish-speaking|monetag|adsterra|popcash)[^"']*["'][^>]*><\/script>/gi, '');
        html = html.replace(/openLoginTab\s*\([^)]*\)/g, 'null');

        // Inject high-priority styles and scripts to completely suppress adult popups, modals, and window.open
        const antiAdBlock = `
        <style>
            .modal, .modal-backdrop, [class*="popup"], [id*="ad"], #overlay, [class*="overlay"], [class*="dialog"], .fade.show, .guestMode, a[target="_blank"] {
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
                Object.defineProperty(window, 'open', {
                    configurable: false,
                    writable: false,
                    value: function() { return null; }
                });
                window._pop = null;
                window._pao = null;
                window.openLoginTab = function() { return false; };
                document.addEventListener("DOMContentLoaded", function() {
                    var modals = document.querySelectorAll('.modal, .modal-backdrop, [class*="popup"], [id*="overlay"], .guestMode');
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
                'Cache-Control': 'private, no-store',
                'X-Frame-Options': 'SAMEORIGIN'
            }
        });
    } catch (e: any) {
        console.error('[Voe Clean Proxy Error]:', e.message);
        return new NextResponse(`Voe proxy error: ${e.message}`, { status: 500 });
    }
}
