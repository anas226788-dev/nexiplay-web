import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

const RESOLVER_HEADERS = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8'
};

function decodeHtmlEntities(str: string): string {
    return str
        .replace(/&#(\d+);/g, (_, dec) => String.fromCharCode(dec))
        .replace(/&#x([0-9a-f]+);/gi, (_, hex) => String.fromCharCode(parseInt(hex, 16)))
        .replace(/&quot;/g, '"')
        .replace(/&#039;/g, "'")
        .replace(/&amp;/g, '&')
        .replace(/&#038;/g, '&');
}

function absolutizeUrl(src: string, baseUrl: URL): string {
    const decoded = decodeHtmlEntities(src).trim();
    if (decoded.startsWith('//')) return `https:${decoded}`;
    if (decoded.startsWith('/')) return `${baseUrl.origin}${decoded}`;
    return decoded;
}

function getIframeUrls(html: string, baseUrl: URL): string[] {
    return Array.from(html.matchAll(/<iframe\b[^>]*(?:data-src|src)=["']([^"']+)["'][^>]*>/gi))
        .map(match => absolutizeUrl(match[1] || '', baseUrl))
        .filter(Boolean)
        .filter(src => {
            const lower = src.toLowerCase();
            return !lower.includes('/cdn-cgi/challenge-platform/') && !lower.includes('about:blank');
        });
}

async function resolveMovieBox(targetUrl: string): Promise<string> {
    try {
        const parsed = new URL(targetUrl);
        const parts = parsed.pathname.split('/').filter(Boolean);
        const detailPath = parts.pop();
        if (!detailPath) throw new Error('Could not extract detailPath from URL');

        let subjectId = parsed.searchParams.get('id') || parsed.searchParams.get('subjectId');
        let se = parsed.searchParams.get('se') || parsed.searchParams.get('detailSe') || '0';
        let ep = parsed.searchParams.get('ep') || parsed.searchParams.get('detailEp') || '0';

        if (!se) se = '0';
        if (!ep) ep = '0';

        if (!subjectId) {
            const detailUrl = `https://h5-api.aoneroom.com/wefeed-h5api-bff/detail?detailPath=${detailPath}`;
            const res = await fetch(detailUrl, {
                headers: {
                    'Accept': 'application/json',
                    'X-Client-Info': JSON.stringify({ timezone: 'Asia/Dhaka' }),
                    'Referer': targetUrl
                }
            });
            if (!res.ok) throw new Error(`Detail API returned status ${res.status}`);
            const json = await res.json();
            if (json.code !== 0 || !json.data || !json.data.subject) {
                throw new Error(`Invalid detail response: ${json.message}`);
            }
            subjectId = json.data.subject.subjectId;
        }

        const playUrl = `https://h5-api.aoneroom.com/wefeed-h5api-bff/subject/play?subjectId=${subjectId}&se=${se}&ep=${ep}&detailPath=${detailPath}`;
        const playRes = await fetch(playUrl, {
            headers: {
                'Accept': 'application/json',
                'X-Client-Info': JSON.stringify({ timezone: 'Asia/Dhaka' }),
                'Referer': targetUrl
            }
        });
        if (!playRes.ok) throw new Error(`Play API returned status ${playRes.status}`);
        const playJson = await playRes.json();
        if (playJson.code !== 0 || !playJson.data) {
            throw new Error(`Invalid play response: ${playJson.message}`);
        }

        const data = playJson.data;
        const streams = data.hls?.length ? data.hls : data.streams;
        if (!streams?.length) return targetUrl;

        const sortedStreams = [...streams].sort((a, b) => {
            const resA = parseInt(a.resolutions) || 0;
            const resB = parseInt(b.resolutions) || 0;
            return resB - resA;
        });

        return sortedStreams[0]?.url || targetUrl;
    } catch (e: any) {
        console.error('[MovieBox Resolver Error]:', e.message);
        return targetUrl;
    }
}

async function resolveEmbedUrl(url: string, depth: number = 0): Promise<string> {
    if (depth > 4) {
        console.log(`[Embed Resolver] Depth limit reached for: ${url}`);
        return url;
    }

    try {
        const parsed = new URL(url);
        const isToonstream = parsed.hostname.includes('toonstream');
        const isAnimeworld = parsed.hostname.includes('watchanimeworld') || parsed.hostname.includes('animeworld');

        if (!isToonstream && !isAnimeworld) return url;

        console.log(`[Embed Resolver] Resolving [Depth ${depth}]: ${url}`);
        const res = await fetch(url, {
            headers: {
                ...RESOLVER_HEADERS,
                'Referer': url
            }
        });

        if (!res.ok) {
            console.warn(`[Embed Resolver] Fetch failed with status ${res.status} for: ${url}`);
            return url;
        }

        const html = await res.text();
        const iframeUrls = getIframeUrls(html, parsed);
        const preferredUrl = isToonstream
            ? (
                iframeUrls.find(src => {
                    try {
                        return !new URL(src).hostname.includes('toonstream');
                    } catch {
                        return false;
                    }
                }) || iframeUrls.find(src => src.includes('trembed=')) || iframeUrls[0]
            )
            : iframeUrls[0];

        if (!preferredUrl) {
            console.warn(`[Embed Resolver] No iframe found on page: ${url}`);
            return url;
        }

        console.log(`[Embed Resolver] Found iframe pointing to: ${preferredUrl}`);
        const nextParsed = new URL(preferredUrl);
        const nextIsToonstream = nextParsed.hostname.includes('toonstream');
        const nextIsAnimeworld = nextParsed.hostname.includes('watchanimeworld') || nextParsed.hostname.includes('animeworld');

        if (nextIsToonstream || nextIsAnimeworld) {
            return await resolveEmbedUrl(preferredUrl, depth + 1);
        }

        return preferredUrl;
    } catch (e: any) {
        console.error(`[Embed Resolver] Error resolving at depth ${depth}:`, e.message);
        return url;
    }
}

export async function GET(request: NextRequest) {
    const { searchParams } = new URL(request.url);
    const targetUrl = searchParams.get('url');

    if (!targetUrl) {
        return NextResponse.json({ error: 'Missing url parameter' }, { status: 400 });
    }

    try {
        const parsed = new URL(targetUrl);
        const isMovieBox = parsed.hostname.includes('netfilm') ||
            parsed.hostname.includes('moviebox') ||
            parsed.hostname.includes('sflix');

        if (isMovieBox) {
            const resolvedUrl = await resolveMovieBox(targetUrl);
            return NextResponse.json({ url: resolvedUrl });
        }

        const resolvedUrl = await resolveEmbedUrl(targetUrl);
        return NextResponse.json({ url: resolvedUrl });
    } catch (e: any) {
        console.error('[Embed Resolver GET Error]:', e.message);
        return NextResponse.json({ error: e.message, url: targetUrl });
    }
}