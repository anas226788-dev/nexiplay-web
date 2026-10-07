import { NextRequest, NextResponse } from 'next/server';
import { decryptStream } from '@/lib/streamCrypto';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
    const { searchParams } = new URL(request.url);
    const token = searchParams.get('token');

    if (!token) {
        return new NextResponse('Access denied: Missing security token.', { status: 400 });
    }

    const payload = decryptStream(token);
    if (!payload || !payload.url) {
        return new NextResponse('Access denied: Invalid or expired token.', { status: 403 });
    }

    let targetUrl = payload.url;
    const lowerUrl = targetUrl.toLowerCase();
    const origin = request.nextUrl.origin;

    // 1. If it's a direct m3u8 or video file, route through our stream proxy
    const isM3U8 = lowerUrl.includes('.m3u8') || lowerUrl.includes('/hls');
    const isVideoFile = lowerUrl.includes('.mp4') || lowerUrl.includes('.ts');

    if (isM3U8 || isVideoFile) {
        const proxyUrl = `${origin}/api/proxy-stream?url=${encodeURIComponent(targetUrl)}`;
        return NextResponse.redirect(proxyUrl);
    }

    // 2. If it's an embed webpage (codedew, razorshell, etc.), proxy & unframe the HTML
    // This bypasses X-Frame-Options: SAMEORIGIN and Content-Security-Policy: frame-ancestors
    try {
        let referer = 'https://rareanimes.net/';
        let playerEmbedUrl = targetUrl;

        // Resolve codedew zipper to inner razorshell embed if applicable
        if (targetUrl.includes('codedew.com/zipper')) {
            try {
                const zipperRes = await fetch(targetUrl, {
                    headers: {
                        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                        'Referer': 'https://rareanimes.net/'
                    }
                });
                if (zipperRes.ok) {
                    const zipperHtml = await zipperRes.text();
                    const iframeMatch = zipperHtml.match(/<iframe[^>]+src=["']([^"']+)["']/i);
                    if (iframeMatch && iframeMatch[1]) {
                        playerEmbedUrl = iframeMatch[1];
                        referer = 'https://codedew.com/';
                    }
                }
            } catch (err: any) {
                console.warn('[Playback Route] Zipper unwrap failed, using direct URL:', err.message);
            }
        }

        // Fetch the player embed HTML
        const embedRes = await fetch(playerEmbedUrl, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                'Referer': referer
            }
        });

        if (embedRes.ok) {
            let html = await embedRes.text();
            const embedOrigin = new URL(playerEmbedUrl).origin;

            // Inject base tag so all relative assets, players, scripts, and API pings work
            if (html.includes('<head>')) {
                html = html.replace('<head>', `<head><base href="${embedOrigin}/">`);
            } else if (html.includes('<HEAD>')) {
                html = html.replace('<HEAD>', `<HEAD><base href="${embedOrigin}/">`);
            } else {
                html = `<base href="${embedOrigin}/">` + html;
            }

            // Return the unblocked HTML directly
            return new NextResponse(html, {
                headers: {
                    'Content-Type': 'text/html; charset=utf-8',
                    'Access-Control-Allow-Origin': '*',
                    'Access-Control-Allow-Methods': 'GET, HEAD, OPTIONS',
                    'Cache-Control': 'private, no-cache, no-store, must-revalidate'
                }
            });
        }
    } catch (e: any) {
        console.error('[Playback Proxy HTML Error]:', e.message);
    }

    // Fallback: direct redirect
    return NextResponse.redirect(targetUrl);
}

export async function OPTIONS() {
    return new NextResponse(null, {
        headers: {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'GET, OPTIONS',
            'Access-Control-Allow-Headers': 'Range, Content-Type, Authorization'
        }
    });
}
