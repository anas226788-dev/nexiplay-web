import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

async function fetchWithRedirects(
    url: string,
    headers: Record<string, string>,
    method: string = 'GET',
    maxRedirects = 5
) {
    let currentUrl = url;
    for (let i = 0; i < maxRedirects; i++) {
        const res = await fetch(currentUrl, {
            method,
            headers,
            redirect: 'manual',
        });

        if ([301, 302, 307, 308].includes(res.status)) {
            const location = res.headers.get('location');
            if (location) {
                currentUrl = new URL(location, currentUrl).href;
                continue;
            }
        }

        return { response: res, finalUrl: currentUrl };
    }
    throw new Error('Too many redirects');
}

function getUpstreamHeaders(targetUrl: string, clientRequest: NextRequest): Record<string, string> {
    const headers: Record<string, string> = {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    };

    // Forward Range header to support IDM, 1DM, multi-threaded downloading and resuming
    const range = clientRequest.headers.get('range');
    if (range) {
        headers['Range'] = range;
    }

    // Set Referer to bypass CDN/worker hotlink protection
    if (targetUrl.includes('vidvault.to') || targetUrl.includes('workers.dev')) {
        headers['Referer'] = 'https://vidvault.to/';
    } else if (targetUrl.includes('anidb.app')) {
        headers['Referer'] = 'https://animerulz.net/';
    } else if (targetUrl.includes('streamindia') || targetUrl.includes('animesalt') || targetUrl.includes('as-cdn21.top') || targetUrl.includes('toonplay.in')) {
        headers['Referer'] = 'https://toonplay.in/';
    } else if (targetUrl.includes('hakunaymatata.com')) {
        headers['Referer'] = 'https://netfilm.world/';
    }

    return headers;
}

export async function GET(request: NextRequest) {
    const { searchParams } = new URL(request.url);
    const targetUrl = searchParams.get('url');
    const filename = searchParams.get('filename') || searchParams.get('title');

    if (!targetUrl || !targetUrl.startsWith('http')) {
        return new NextResponse('Invalid or missing target URL parameter', { status: 400 });
    }

    try {
        const upstreamHeaders = getUpstreamHeaders(targetUrl, request);
        const { response: upstreamRes } = await fetchWithRedirects(targetUrl, upstreamHeaders, 'GET');

        if (!upstreamRes.ok && upstreamRes.status !== 206) {
            console.error(`[Download File Proxy] Origin error: status ${upstreamRes.status} for URL ${targetUrl}`);
            return new NextResponse(`Download file error: origin returned HTTP ${upstreamRes.status}`, {
                status: upstreamRes.status,
            });
        }

        const fallbackName = targetUrl.split('/').pop()?.split('?')[0] || 'media_download.mkv';
        let cleanName = (filename || fallbackName).replace(/["\r\n\\]/g, '');
        if (!cleanName.endsWith('.mkv') && !cleanName.endsWith('.mp4')) {
            cleanName += '.mkv';
        }

        const clientHeaders = new Headers();
        clientHeaders.set('Content-Disposition', `attachment; filename="${cleanName}"`);
        clientHeaders.set('Access-Control-Allow-Origin', '*');
        clientHeaders.set('Access-Control-Allow-Methods', 'GET, HEAD, OPTIONS');
        clientHeaders.set('Access-Control-Expose-Headers', 'Content-Length, Content-Range, Accept-Ranges, Content-Disposition');

        const contentType = upstreamRes.headers.get('content-type') || 'application/octet-stream';
        clientHeaders.set('Content-Type', contentType);

        const contentLength = upstreamRes.headers.get('content-length');
        if (contentLength) {
            clientHeaders.set('Content-Length', contentLength);
        }

        const contentRange = upstreamRes.headers.get('content-range');
        if (contentRange) {
            clientHeaders.set('Content-Range', contentRange);
        }

        const acceptRanges = upstreamRes.headers.get('accept-ranges') || 'bytes';
        clientHeaders.set('Accept-Ranges', acceptRanges);

        return new NextResponse(upstreamRes.body, {
            status: upstreamRes.status,
            headers: clientHeaders,
        });
    } catch (e: any) {
        console.error('[Download Proxy Exception]:', e.message);
        return new NextResponse(`Proxy error: ${e.message}`, { status: 500 });
    }
}

export async function HEAD(request: NextRequest) {
    const { searchParams } = new URL(request.url);
    const targetUrl = searchParams.get('url');
    const filename = searchParams.get('filename') || searchParams.get('title');

    if (!targetUrl || !targetUrl.startsWith('http')) {
        return new NextResponse(null, { status: 400 });
    }

    try {
        const upstreamHeaders = getUpstreamHeaders(targetUrl, request);
        const { response: upstreamRes } = await fetchWithRedirects(targetUrl, upstreamHeaders, 'HEAD');

        const fallbackName = targetUrl.split('/').pop()?.split('?')[0] || 'media_download.mkv';
        let cleanName = (filename || fallbackName).replace(/["\r\n\\]/g, '');
        if (!cleanName.endsWith('.mkv') && !cleanName.endsWith('.mp4')) {
            cleanName += '.mkv';
        }

        const clientHeaders = new Headers();
        clientHeaders.set('Content-Disposition', `attachment; filename="${cleanName}"`);
        clientHeaders.set('Access-Control-Allow-Origin', '*');
        clientHeaders.set('Access-Control-Allow-Methods', 'GET, HEAD, OPTIONS');
        clientHeaders.set('Access-Control-Expose-Headers', 'Content-Length, Content-Range, Accept-Ranges, Content-Disposition');

        const contentType = upstreamRes.headers.get('content-type') || 'application/octet-stream';
        clientHeaders.set('Content-Type', contentType);

        const contentLength = upstreamRes.headers.get('content-length');
        if (contentLength) clientHeaders.set('Content-Length', contentLength);

        const contentRange = upstreamRes.headers.get('content-range');
        if (contentRange) clientHeaders.set('Content-Range', contentRange);

        const acceptRanges = upstreamRes.headers.get('accept-ranges') || 'bytes';
        clientHeaders.set('Accept-Ranges', acceptRanges);

        return new NextResponse(null, {
            status: upstreamRes.status,
            headers: clientHeaders,
        });
    } catch {
        return new NextResponse(null, { status: 500 });
    }
}
