import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
    const { searchParams } = new URL(request.url);
    const targetUrl = searchParams.get('url');
    const lowerTargetUrl = targetUrl?.toLowerCase() || '';

    if (!targetUrl) {
        return new NextResponse('Missing url parameter', { status: 400 });
    }

    try {
        // Construct request to origin
        const headers: Record<string, string> = {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        };

        // Forward Range header from client to support seeking/partial content
        const range = request.headers.get('range');
        if (range) {
            headers['Range'] = range;
        }

        // Pass referer based on domain to bypass hotlink protection
        if (targetUrl.includes('anidb.app')) {
            headers['Referer'] = 'https://animerulz.net/';
            headers['Origin'] = 'https://animerulz.net';
        } else if (targetUrl.includes('streamindia') || targetUrl.includes('animesalt') || targetUrl.includes('as-cdn21.top') || targetUrl.includes('toonplay.in')) {
            headers['Referer'] = 'https://toonplay.in/';
            headers['Origin'] = 'https://toonplay.in';
        } else if (targetUrl.includes('hakunaymatata.com')) {
            headers['Referer'] = 'https://netfilm.world/';
            headers['Origin'] = 'https://netfilm.world';
        }

        const res = await fetch(targetUrl, { headers });

        if (!res.ok) {
            return new NextResponse(`Origin returned status ${res.status}`, { status: res.status });
        }

        const contentType = res.headers.get('content-type') || '';
        
        // Check if it's an HLS playlist (m3u8)
        const isSegmentTarget = /\.(ts|m4s|aac|mp4)(?:[?#]|$)/i.test(lowerTargetUrl);
        const isPlaylistTarget = !isSegmentTarget && (
            contentType.includes('mpegurl') ||
            /\.m3u8(?:[?#]|$)/i.test(lowerTargetUrl) ||
            /\/(?:hls|playlist|master)(?:\/|[?#]|$)/i.test(lowerTargetUrl)
        );
        if (isPlaylistTarget) {
            const playlistText = await res.text();
            const rewrittenPlaylist = rewritePlaylist(playlistText, targetUrl, request.nextUrl.origin);
            
            return new NextResponse(rewrittenPlaylist, {
                headers: {
                    'Content-Type': 'application/vnd.apple.mpegurl',
                    'Access-Control-Allow-Origin': '*',
                    'Access-Control-Allow-Methods': 'GET, HEAD, OPTIONS',
            'Access-Control-Allow-Headers': 'Range, Origin, Referer, Content-Type',
            'Access-Control-Expose-Headers': 'Content-Length, Content-Range, Accept-Ranges',
                }
            });
        }

        // For binary files (.ts, .xls segments, .mp4, etc.), pipe the stream directly
        const headersToPass: Record<string, string> = {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'GET, HEAD, OPTIONS',
            'Access-Control-Allow-Headers': 'Range, Origin, Referer, Content-Type',
            'Access-Control-Expose-Headers': 'Content-Length, Content-Range, Accept-Ranges',
        };
        
        const originContentType = res.headers.get('content-type');
        if (originContentType) {
            headersToPass['Content-Type'] = originContentType;
        }
        const originContentLength = res.headers.get('content-length');
        if (originContentLength) {
            headersToPass['Content-Length'] = originContentLength;
        }
        const originContentRange = res.headers.get('content-range');
        if (originContentRange) {
            headersToPass['Content-Range'] = originContentRange;
        }
        const originAcceptRanges = res.headers.get('accept-ranges');
        if (originAcceptRanges) {
            headersToPass['Accept-Ranges'] = originAcceptRanges;
        }

        // Return the body stream
        return new NextResponse(res.body, {
            status: res.status,
            headers: headersToPass,
        });

    } catch (e: any) {
        console.error('[Stream Proxy Error]:', e.message);
        return new NextResponse(`Proxy error: ${e.message}`, { status: 500 });
    }
}

/**
 * Rewrites relative and absolute URLs in an M3U8 playlist to route through our proxy.
 */
function rewritePlaylist(playlist: string, playlistUrl: string, proxyOrigin: string): string {
    const lines = playlist.split('\n');
    const rewrittenLines = lines.map(line => {
        const trimmed = line.trim();
        
        // Skip empty lines or comments, except tags that contain URIs (like #EXT-X-I-FRAME-STREAM-INF, #EXT-X-KEY, #EXT-X-MAP)
        if (trimmed.startsWith('#')) {
            // Check if it has an URI attribute that needs proxying
            if (trimmed.includes('URI=')) {
                return trimmed.replace(/URI="([^"]+)"/g, (match, uri) => {
                    const absoluteUri = makeAbsoluteUrl(uri, playlistUrl);
                    const proxyUrl = `${proxyOrigin}/api/proxy-stream?url=${encodeURIComponent(absoluteUri)}`;
                    return `URI="${proxyUrl}"`;
                });
            }
            return line;
        }

        if (!trimmed) return line;

        // Rewrite the media/playlist URL
        const absoluteUrl = makeAbsoluteUrl(trimmed, playlistUrl);
        return `${proxyOrigin}/api/proxy-stream?url=${encodeURIComponent(absoluteUrl)}`;
    });

    return rewrittenLines.join('\n');
}

/**
 * Helper to resolve relative URLs based on the playlist's base URL.
 */
function makeAbsoluteUrl(relativeUrl: string, baseUrl: string): string {
    try {
        return new URL(relativeUrl, baseUrl).href;
    } catch (e) {
        return relativeUrl;
    }
}
