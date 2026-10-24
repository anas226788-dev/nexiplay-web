/**
 * NexiPlay - Cloudflare Worker Stream Proxy (100% Free, Unlimited Bandwidth)
 * 
 * Free Tier Limits on Cloudflare:
 * - 100,000 requests / day FREE (3 Million / month)
 * - UNLIMITED bandwidth (Zero GB transfer charges)
 * - Zero CPU limits for streaming
 * 
 * Deployment Instructions (1 Minute Setup):
 * 1. Go to https://dash.cloudflare.com/ -> Workers & Pages -> Create Worker
 * 2. Name it e.g. "nexiplay-stream-proxy"
 * 3. Paste this entire code into the Worker editor and click "Deploy".
 * 4. Copy your Worker URL (e.g. https://nexiplay-stream-proxy.yourname.workers.dev).
 * 5. In Vercel -> NexiPlay Project -> Settings -> Environment Variables:
 *    Add: NEXT_PUBLIC_STREAM_PROXY_URL = https://nexiplay-stream-proxy.yourname.workers.dev
 * 6. Redeploy on Vercel. Video streaming will now 100% bypass Vercel!
 */

export default {
    async fetch(request, env, ctx) {
        // Handle CORS preflight
        if (request.method === 'OPTIONS') {
            return new Response(null, {
                status: 204,
                headers: {
                    'Access-Control-Allow-Origin': '*',
                    'Access-Control-Allow-Methods': 'GET, HEAD, OPTIONS',
                    'Access-Control-Allow-Headers': 'Range, Origin, Referer, Content-Type',
                    'Access-Control-Max-Age': '86400',
                }
            });
        }

        const url = new URL(request.url);
        const targetUrl = url.searchParams.get('url');

        if (!targetUrl) {
            return new Response('Missing ?url= parameter', { status: 400 });
        }

        const lowerTargetUrl = targetUrl.toLowerCase();
        const headers = new Headers({
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        });

        const range = request.headers.get('range');
        if (range) {
            headers.set('Range', range);
        }

        // Domain-specific Referer/Origin hotlink bypass
        if (targetUrl.includes('anidb.app')) {
            headers.set('Referer', 'https://animerulz.net/');
            headers.set('Origin', 'https://animerulz.net');
        } else if (targetUrl.includes('streamindia') || targetUrl.includes('animesalt') || targetUrl.includes('as-cdn21.top') || targetUrl.includes('toonplay.in')) {
            headers.set('Referer', 'https://toonplay.in/');
            headers.set('Origin', 'https://toonplay.in');
        } else if (targetUrl.includes('hakunaymatata.com')) {
            headers.set('Referer', 'https://netfilm.world/');
            headers.set('Origin', 'https://netfilm.world');
        }

        // Check if caching applies (.ts / .m4s video segments)
        const isSegment = /\.(ts|m4s|aac|mp4)(?:[?#]|$)/i.test(lowerTargetUrl);
        const cache = caches.default;
        const cacheKey = new Request(targetUrl, { method: 'GET' });

        if (isSegment && request.method === 'GET' && !range) {
            const cachedResponse = await cache.match(cacheKey);
            if (cachedResponse) {
                const responseHeaders = new Headers(cachedResponse.headers);
                responseHeaders.set('Access-Control-Allow-Origin', '*');
                responseHeaders.set('X-Proxy-Cache', 'HIT');
                return new Response(cachedResponse.body, {
                    status: cachedResponse.status,
                    statusText: cachedResponse.statusText,
                    headers: responseHeaders,
                });
            }
        }

        const originResponse = await fetch(targetUrl, { headers });

        if (!originResponse.ok) {
            return new Response(`Origin error: ${originResponse.status}`, { status: originResponse.status });
        }

        const contentType = originResponse.headers.get('content-type') || '';
        const isPlaylist = !isSegment && (
            contentType.includes('mpegurl') ||
            /\.m3u8(?:[?#]|$)/i.test(lowerTargetUrl) ||
            /\/(?:hls|playlist|master)(?:\/|[?#]|$)/i.test(lowerTargetUrl)
        );

        if (isPlaylist) {
            const playlistText = await originResponse.text();
            const workerOrigin = `${url.protocol}//${url.host}`;
            const rewritten = rewritePlaylist(playlistText, targetUrl, workerOrigin);

            return new Response(rewritten, {
                headers: {
                    'Content-Type': 'application/vnd.apple.mpegurl',
                    'Access-Control-Allow-Origin': '*',
                    'Access-Control-Allow-Methods': 'GET, HEAD, OPTIONS',
                    'Access-Control-Allow-Headers': 'Range, Origin, Referer, Content-Type',
                    'Access-Control-Expose-Headers': 'Content-Length, Content-Range, Accept-Ranges',
                    'Cache-Control': 'public, max-age=10, s-maxage=30',
                }
            });
        }

        // For video segments: prepare response with CORS & edge caching
        const responseHeaders = new Headers();
        responseHeaders.set('Access-Control-Allow-Origin', '*');
        responseHeaders.set('Access-Control-Allow-Methods', 'GET, HEAD, OPTIONS');
        responseHeaders.set('Access-Control-Allow-Headers', 'Range, Origin, Referer, Content-Type');
        responseHeaders.set('Access-Control-Expose-Headers', 'Content-Length, Content-Range, Accept-Ranges');

        for (const [key, value] of originResponse.headers.entries()) {
            if (['content-type', 'content-length', 'content-range', 'accept-ranges'].includes(key.toLowerCase())) {
                responseHeaders.set(key, value);
            }
        }

        if (isSegment) {
            responseHeaders.set('Cache-Control', 'public, max-age=604800, immutable');
        }

        const response = new Response(originResponse.body, {
            status: originResponse.status,
            statusText: originResponse.statusText,
            headers: responseHeaders,
        });

        if (isSegment && request.method === 'GET' && !range && originResponse.status === 200) {
            ctx.waitUntil(cache.put(cacheKey, response.clone()));
        }

        return response;
    }
};

function rewritePlaylist(playlist, playlistUrl, workerOrigin) {
    return playlist.split('\n').map(line => {
        const trimmed = line.trim();
        if (!trimmed) return line;

        if (trimmed.startsWith('#')) {
            if (trimmed.includes('URI=')) {
                return trimmed.replace(/URI="([^"]+)"/g, (match, uri) => {
                    const absUri = makeAbsoluteUrl(uri, playlistUrl);
                    return `URI="${workerOrigin}/?url=${encodeURIComponent(absUri)}"`;
                });
            }
            return line;
        }

        const absUrl = makeAbsoluteUrl(trimmed, playlistUrl);
        return `${workerOrigin}/?url=${encodeURIComponent(absUrl)}`;
    }).join('\n');
}

function makeAbsoluteUrl(relativeUrl, baseUrl) {
    try {
        return new URL(relativeUrl, baseUrl).href;
    } catch {
        return relativeUrl;
    }
}
