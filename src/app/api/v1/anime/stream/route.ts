import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { encryptStream } from '@/lib/streamCrypto';
import { extractRRStream } from '@/lib/rrStreamExtractor';
import { validateApiKeyAccess, recordApiKeyUsage } from '@/lib/streamApiKeyService';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

function getLiveOrigin(request: NextRequest): string {
    const forwardedHost = request.headers.get('x-forwarded-host');
    const forwardedProto = request.headers.get('x-forwarded-proto') || 'https';
    if (forwardedHost) {
        return `${forwardedProto}://${forwardedHost}`;
    }
    const host = request.headers.get('host');
    if (host) {
        const proto = host.includes('localhost') || host.includes('127.0.0.1') ? 'http' : 'https';
        return `${proto}://${host}`;
    }
    return request.nextUrl.origin;
}

function parseJsonStreams(urlStr: string | null | undefined): Record<string, string> {
    if (!urlStr) return {};
    const trimmed = urlStr.trim();
    if (trimmed.startsWith('{')) {
        try {
            return JSON.parse(trimmed);
        } catch {
            return {};
        }
    }
    return {};
}

function parseMultiConfig(raw: string | null | undefined): Record<string, any> {
    if (!raw) return {};
    const trimmed = raw.trim();
    if (!trimmed.startsWith('{')) return {};
    try {
        const parsed = JSON.parse(trimmed);
        return parsed && typeof parsed === 'object' ? parsed : {};
    } catch {
        return {};
    }
}

export async function GET(request: NextRequest) {
    const { searchParams } = new URL(request.url);

    // Extract API Key from query params or headers
    const authHeader = request.headers.get('authorization') || '';
    const bearerKey = authHeader.toLowerCase().startsWith('bearer ') ? authHeader.substring(7).trim() : null;
    const apiKey = searchParams.get('apiKey')?.trim() ||
                   searchParams.get('key')?.trim() ||
                   searchParams.get('api_key')?.trim() ||
                   request.headers.get('x-api-key')?.trim() ||
                   request.headers.get('apikey')?.trim() ||
                   bearerKey;

    const originHeader = request.headers.get('origin');
    const refererHeader = request.headers.get('referer');
    const secFetchSite = request.headers.get('sec-fetch-site');
    const hostHeader = request.headers.get('host') || request.headers.get('x-forwarded-host');
    const forwardedFor = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim();
    const clientIp = forwardedFor || request.headers.get('x-real-ip') || undefined;

    // 1. Validate Access & Key Permission
    const accessCheck = await validateApiKeyAccess(apiKey, originHeader, refererHeader, {
        secFetchSite,
        hostHeader
    });
    if (!accessCheck.allowed) {
        return NextResponse.json(
            {
                success: false,
                error: accessCheck.reason || 'Access denied.',
                code: accessCheck.statusCode === 503 ? 'STREAM_API_DISABLED' : 'UNAUTHORIZED_KEY'
            },
            {
                status: accessCheck.statusCode || 403,
                headers: { 'Access-Control-Allow-Origin': '*' }
            }
        );
    }

    if (apiKey) {
        recordApiKeyUsage(apiKey, clientIp).catch(() => {});
    }

    const slug = searchParams.get('slug')?.trim();
    const id = searchParams.get('id')?.trim();
    const seasonNum = parseInt(searchParams.get('season') || '1', 10) || 1;
    const epNum = parseInt(searchParams.get('episode') || searchParams.get('ep') || '1', 10) || 1;

    if (!slug && !id) {
        return NextResponse.json(
            { success: false, error: 'Either "slug" or "id" parameter is required.' },
            { status: 400, headers: { 'Access-Control-Allow-Origin': '*' } }
        );
    }

    try {
        // 1. Fetch movie/anime metadata
        let movie: any = null;
        if (id) {
            const { data } = await supabase.from('movies').select('*').eq('id', id).maybeSingle();
            movie = data;
        }
        if (!movie && slug) {
            const { data } = await supabase.from('movies').select('*').eq('slug', slug).maybeSingle();
            movie = data;
            if (!movie) {
                const cleanSlug = slug.replace(/-\d{4}$/, '');
                const { data: fuzzy } = await supabase.from('movies').select('*').ilike('slug', `${cleanSlug}%`).maybeSingle();
                movie = fuzzy;
            }
        }

        if (!movie) {
            return NextResponse.json(
                { success: false, error: 'Anime not found.' },
                { status: 404, headers: { 'Access-Control-Allow-Origin': '*' } }
            );
        }

        const isSeriesOrAnime = movie.type === 'anime' || movie.type === 'series';
        let rrStreamUrl = '';
        let targetSeasonId: string | null = null;

        // Fetch streaming row if available
        const { data: streamingRow } = await supabase
            .from('streaming')
            .select('*')
            .eq('movie_id', movie.id)
            .maybeSingle();

        // 2. If Series/Anime, fetch corresponding episode
        let episode: any = null;
        if (isSeriesOrAnime) {
            // Try fetching with season
            const { data: season } = await supabase
                .from('seasons')
                .select('id')
                .eq('movie_id', movie.id)
                .eq('season_number', seasonNum)
                .maybeSingle();
            targetSeasonId = season?.id || null;

            if (targetSeasonId) {
                const { data: ep } = await supabase
                    .from('episodes')
                    .select('*')
                    .eq('season_id', targetSeasonId)
                    .eq('episode_number', epNum)
                    .maybeSingle();
                episode = ep;
            } else {
                const { data: allSeasons } = await supabase
                    .from('seasons')
                    .select('id')
                    .eq('movie_id', movie.id);
                if (allSeasons && allSeasons.length > 0) {
                    const sIds = allSeasons.map(s => s.id);
                    const { data: ep } = await supabase
                        .from('episodes')
                        .select('*')
                        .in('season_id', sIds)
                        .eq('episode_number', epNum)
                        .maybeSingle();
                    episode = ep;
                    if (ep?.season_id) {
                        targetSeasonId = ep.season_id;
                    }
                }
            }

            if (episode?.streaming_url) {
                const epStreams = parseJsonStreams(episode.streaming_url);
                if (epStreams.rareanimes) {
                    rrStreamUrl = epStreams.rareanimes;
                } else if (typeof episode.streaming_url === 'string' && !episode.streaming_url.startsWith('{')) {
                    // Fallback to episode direct streaming url
                    rrStreamUrl = episode.streaming_url;
                }
            }

            // Also check multi-scraper config on streaming row or movie level
            if (!rrStreamUrl) {
                const rawConfig = (streamingRow as any)?.multi_scraper_config || (movie.scraper_source === 'multi' ? movie.scraper_url : null);
                if (rawConfig) {
                    const config = parseMultiConfig(rawConfig);
                    const rrConfig = config.rareanimes;
                    if (rrConfig) {
                        const epKey = `${seasonNum}_${epNum}`;
                        const seasonKey = String(seasonNum);
                        const firstAvailableSeasonUrl = rrConfig.urls && typeof rrConfig.urls === 'object'
                            ? (Object.values(rrConfig.urls).find((u: any) => typeof u === 'string' && u.trim().length > 0) as string | undefined)
                            : undefined;
                        rrStreamUrl = rrConfig.mode === 'episode'
                            ? rrConfig.episodeUrls?.[epKey]
                            : rrConfig.mode === 'separate'
                                ? (rrConfig.urls?.[seasonKey] || rrConfig.url || firstAvailableSeasonUrl || '')
                                : rrConfig.url;
                    }
                }
            }

            // Direct fallback to movie scraper_url if configured for rareanimes
            if (!rrStreamUrl && (movie.scraper_source === 'rareanimes' || movie.scraper_source === 'multi')) {
                rrStreamUrl = movie.scraper_url || '';
            }
        } else {
            // Single content (Movie)
            const streams = parseJsonStreams(movie.streaming_url || (streamingRow as any)?.streaming_url);
            if (streams.rareanimes) {
                rrStreamUrl = streams.rareanimes;
            } else if (movie.streaming_url && !movie.streaming_url.startsWith('{')) {
                rrStreamUrl = movie.streaming_url;
            } else if ((movie.scraper_source === 'rareanimes' || movie.scraper_source === 'multi') && movie.scraper_url) {
                rrStreamUrl = movie.scraper_url;
            }
        }

        // If rrStreamUrl is a page URL and epNum is an absolute continuous number (e.g. 372),
        // determine the relative episode index within the season (e.g. 11)
        let resolvedEpNum = epNum;
        if (targetSeasonId && (!rrStreamUrl.includes('/embed/') && !rrStreamUrl.includes('.m3u8'))) {
            const { count } = await supabase
                .from('episodes')
                .select('*', { count: 'exact', head: true })
                .eq('season_id', targetSeasonId)
                .lte('episode_number', epNum);
            if (count && count > 0) {
                resolvedEpNum = count;
            }
        }

        // 3. Resolve direct HLS stream (extract from rareanimes post, zipper, embed, or live search)
        let extracted = await extractRRStream(rrStreamUrl || null, resolvedEpNum, seasonNum, movie.title);
        if ((!extracted.success || !extracted.m3u8Url) && resolvedEpNum !== epNum) {
            extracted = await extractRRStream(rrStreamUrl || null, epNum, seasonNum, movie.title);
        }

        // Seamless fallback check: if RR direct m3u8 could not be resolved,
        // use embedUrl or fallback sources so playback never fails
        let resolvedTargetUrl = extracted.m3u8Url || '';
        let resolvedFormat = 'hls_stream';
        let streamCookies = extracted.cookies || '';
        let resolvedEmbedUrl = extracted.embedUrl || '';

        if (!resolvedTargetUrl) {
            if (extracted.embedUrl) {
                resolvedTargetUrl = extracted.embedUrl;
                resolvedFormat = 'embed';
            } else if (episode?.streaming_url_toonplay && !episode.streaming_url_toonplay.includes('streamindia.co.in') && !episode.streaming_url_toonplay.includes('groovy.monster')) {
                resolvedTargetUrl = episode.streaming_url_toonplay;
                resolvedFormat = 'toonplay';
            } else if (episode?.streaming_url_animerulz) {
                resolvedTargetUrl = episode.streaming_url_animerulz;
                resolvedFormat = 'animerulz';
            } else if (episode?.streaming_url) {
                const epStreams = parseJsonStreams(episode.streaming_url);
                const firstAvailable = epStreams.voe || epStreams.abyss || epStreams.streamtape || epStreams.doodstream || Object.values(epStreams)[0];
                if (firstAvailable) {
                    resolvedTargetUrl = firstAvailable;
                    resolvedFormat = 'embed';
                }
            }
        }

        if (!resolvedTargetUrl) {
            return NextResponse.json(
                {
                    success: false,
                    error: 'Stream could not be loaded for this episode. Please try another server.',
                    title: movie.title,
                    season: seasonNum,
                    episode: epNum
                },
                { status: 404, headers: { 'Access-Control-Allow-Origin': '*' } }
            );
        }

        // 4. Encrypt the direct stream URL with expiration (2 hours)
        const now = Date.now();
        const expiresAt = now + 2 * 60 * 60 * 1000;

        const cryptoFormat: 'hls_stream' | 'embed_stream' = resolvedFormat === 'embed' ? 'embed_stream' : 'hls_stream';
        const token = encryptStream({
            url: resolvedTargetUrl,
            server: 'rareanimes',
            cookies: streamCookies,
            format: cryptoFormat,
            contentId: movie.id,
            slug: movie.slug,
            season: seasonNum,
            episode: epNum,
            createdAt: now,
            expiresAt
        });

        const origin = getLiveOrigin(request);
        const playbackUrl = resolvedFormat === 'embed'
            ? resolvedTargetUrl
            : `${origin}/api/v1/anime/playback?token=${encodeURIComponent(token)}`;
        const embedKeyParam = apiKey ? `&apiKey=${encodeURIComponent(apiKey)}` : '';
        const embedUrl = resolvedEmbedUrl || `${origin}/embed/rr?slug=${encodeURIComponent(movie.slug)}&season=${seasonNum}&episode=${epNum}${embedKeyParam}`;

        return NextResponse.json(
            {
                success: true,
                title: movie.title,
                type: movie.type,
                slug: movie.slug,
                season: seasonNum,
                episode: epNum,
                server: 'RR Nexiplay Server',
                format: resolvedFormat,
                keyType: accessCheck.keyRecord?.type || (apiKey ? 'custom' : 'demo'),
                expiresInSeconds: 7200,
                token,
                playbackUrl,
                embedUrl,
                directStreamUrl: resolvedTargetUrl,
                iframeCode: `<iframe src="${embedUrl}" width="100%" height="100%" frameborder="0" allowfullscreen allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"></iframe>`
            },
            {
                headers: {
                    'Access-Control-Allow-Origin': '*',
                    'Access-Control-Allow-Methods': 'GET, OPTIONS',
                    'Access-Control-Allow-Headers': 'Content-Type, Authorization, x-api-key, apikey',
                    'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=300'
                }
            }
        );
    } catch (err: any) {
        console.error('[Stream API Error]:', err);
        return NextResponse.json(
            { success: false, error: err.message || 'Internal server error.' },
            { status: 500, headers: { 'Access-Control-Allow-Origin': '*' } }
        );
    }
}

export async function OPTIONS() {
    return new NextResponse(null, {
        headers: {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'GET, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type, Authorization, x-api-key, apikey'
        }
    });
}
