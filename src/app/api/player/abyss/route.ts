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

        // Convert short.ink or abyss.to watch links to player.abyssplayer.com embed
        if (host.includes('short.ink') || host.includes('abyss.to') || host.includes('abysscdn') || host.includes('abyssplayer')) {
            const parts = parsed.pathname.split('/').filter(p => Boolean(p) && p !== 'abyss' && p !== 'player' && p !== 'api');
            const id = parts[parts.length - 1];
            if (id) {
                playerUrl = `https://player.abyssplayer.com/${id}`;
            }
        }

        const res = await fetch(playerUrl, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                'Referer': 'https://abyss.to/',
                'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8'
            },
            signal: AbortSignal.timeout(8000)
        });

        if (!res.ok) {
            return new NextResponse(`Abyss returned status ${res.status}`, { status: res.status });
        }

        let html = await res.text();

        // Ensure assets resolve correctly to player.abyssplayer.com
        if (!html.includes('<base')) {
            html = html.replace(/<head[^>]*>/i, '<head><base href="https://player.abyssplayer.com/">');
        }

        // Neutralize anti-iframe / frame-busting redirect checks
        html = html.replace(/top\.location\s*==\s*self\.location/g, 'false');
        html = html.replace(/top\.location/g, 'self.location');
        html = html.replace(/window\.top/g, 'window.self');

        // Neutralize transparent ad click overlay
        html = html.replace(/id=["']overlay["']/g, 'id="overlay_clean" style="display:none!important;pointer-events:none!important;visibility:hidden!important;"');

        // Empty popup URLs array so no popups can spawn
        html = html.replace(/var urls\s*=\s*\[[\s\S]*?\];/g, 'var urls = [];');

        // Neutralize third-party ad network domains
        html = html.replace(/decafeligiblyhad\.com/g, '127.0.0.1');
        html = html.replace(/bonuscaf\.com/g, '127.0.0.1');
        html = html.replace(/adsterra/gi, 'blocked_ad');
        html = html.replace(/monetag/gi, 'blocked_ad');

        // Inject styles & script to permanently kill window.open popups and kill overlay on load
        const antiAdScript = `
        <style>
            #overlay, [id*="overlay"], [class*="overlay"], a[target="_blank"] {
                display: none !important;
                pointer-events: none !important;
                visibility: hidden !important;
                opacity: 0 !important;
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
                document.addEventListener("DOMContentLoaded", function() {
                    var el = document.getElementById("overlay");
                    if (el) el.remove();
                    var elClean = document.getElementById("overlay_clean");
                    if (elClean) elClean.remove();
                    var overlays = document.querySelectorAll('#overlay, [id*="overlay"], [class*="overlay"]');
                    overlays.forEach(function(o) { o.remove(); });
                });
            } catch(e) {}
        </script>
        `;
        html = html.replace('</head>', antiAdScript + '</head>');

        return new NextResponse(html, {
            status: 200,
            headers: {
                'Content-Type': 'text/html; charset=utf-8',
                'Cache-Control': 'public, max-age=3600, s-maxage=7200',
                'X-Frame-Options': 'SAMEORIGIN'
            }
        });
    } catch (e: any) {
        console.error('[Abyss Clean Proxy Error]:', e.message);
        return new NextResponse(`Abyss proxy error: ${e.message}`, { status: 500 });
    }
}
