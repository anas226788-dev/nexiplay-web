import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { validateApiKeyAccess, recordApiKeyUsage } from '@/lib/streamApiKeyService';
import { extractDesiDubStream, DesiDubServers } from '@/lib/desidubStreamExtractor';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

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

export async function GET(request: NextRequest) {
    const { searchParams } = new URL(request.url);

    // 1. API Key & Security validation
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

    const accessCheck = await validateApiKeyAccess(apiKey, originHeader, refererHeader, {
        secFetchSite,
        hostHeader
    });
    if (!accessCheck.allowed) {
        return NextResponse.json(
            {
                success: false,
                error: accessCheck.reason || 'Access denied.',
                code: 'UNAUTHORIZED_KEY'
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

    const titleParam = searchParams.get('title')?.trim();
    const slug = searchParams.get('slug')?.trim();
    const id = searchParams.get('id')?.trim();
    const seasonNum = parseInt(searchParams.get('season') || '1', 10) || 1;
    const epNum = parseInt(searchParams.get('episode') || searchParams.get('ep') || '1', 10) || 1;
    const requestedServer = searchParams.get('server')?.trim().toLowerCase() || 'desidub';

    let movieTitle = titleParam || '';

    // Step 2: Check Supabase DB for existing movie metadata
    if (!movieTitle && (id || slug)) {
        try {
            let movie: any = null;
            if (id) {
                const { data } = await supabase.from('movies').select('id, title, slug').eq('id', id).maybeSingle();
                movie = data;
            }
            if (!movie && slug) {
                const { data } = await supabase.from('movies').select('id, title, slug').eq('slug', slug).maybeSingle();
                movie = data;
            }
            if (movie?.title) {
                movieTitle = movie.title;
            }
        } catch {}
    }

    if (!movieTitle && !slug) {
        return NextResponse.json(
            { success: false, error: 'Either "title" or "slug" parameter is required.' },
            { status: 400, headers: { 'Access-Control-Allow-Origin': '*' } }
        );
    }

    // Step 3: Check if the episode already has pre-scraped DesiDub links in database
    if (slug || id) {
        try {
            const { data: movie } = await (id
                ? supabase.from('movies').select('id, title').eq('id', id).maybeSingle()
                : supabase.from('movies').select('id, title').eq('slug', slug!).maybeSingle());

            if (movie?.id) {
                const { data: season } = await supabase
                    .from('seasons')
                    .select('id')
                    .eq('movie_id', movie.id)
                    .eq('season_number', seasonNum)
                    .maybeSingle();

                if (season?.id) {
                    const { data: episode } = await supabase
                        .from('episodes')
                        .select('streaming_url')
                        .eq('season_id', season.id)
                        .eq('episode_number', epNum)
                        .maybeSingle();

                    if (episode?.streaming_url) {
                        const parsed = parseJsonStreams(episode.streaming_url);
                        const hasDesi = Object.keys(parsed).some(k => k.startsWith('desidub'));
                        if (hasDesi) {
                            const origin = request.nextUrl.origin || 'https://nexiplay.vercel.app';
                            const wrapUrl = (url?: string): string | undefined => {
                                if (!url) return undefined;
                                let u = url.trim();
                                if (u.includes('abyssplayer.com') || u.includes('abyss.to') || u.includes('short.ink')) {
                                    if (!u.includes('/api/player/abyss')) {
                                        u = `/api/player/abyss?url=${encodeURIComponent(u)}`;
                                    }
                                }
                                if (u.startsWith('/')) {
                                    return `${origin}${u}`;
                                }
                                return u;
                            };

                            const dbServers: DesiDubServers = {
                                desidub: wrapUrl(parsed.desidub_vidmoly) || wrapUrl(parsed.desidub_mirror) || wrapUrl(parsed.desidub) || wrapUrl(parsed.desidub_filemoon) || wrapUrl(parsed.desidub_abyss),
                                desidub_vidmoly: wrapUrl(parsed.desidub_vidmoly),
                                desidub_mirror: wrapUrl(parsed.desidub_mirror),
                                desidub_ruby: wrapUrl(parsed.desidub_ruby),
                                desidub_p2p: wrapUrl(parsed.desidub_p2p),
                                desidub_abyss: wrapUrl(parsed.desidub_abyss),
                                desidub_filemoon: wrapUrl(parsed.desidub_filemoon) || wrapUrl(parsed.desidub_vidmoly) || wrapUrl(parsed.desidub_mirror),
                                desidub_streamtape: wrapUrl(parsed.desidub_streamtape),
                                desidub_earnvids: wrapUrl(parsed.desidub_earnvids),
                                desidub_doodstream: wrapUrl(parsed.desidub_doodstream)
                            };

                            const target = (dbServers as any)[requestedServer] || dbServers.desidub || Object.values(dbServers)[0];
                            return NextResponse.json(
                                {
                                    success: true,
                                    title: movie.title,
                                    season: seasonNum,
                                    episode: epNum,
                                    server: requestedServer,
                                    playbackUrl: target,
                                    embedUrl: target,
                                    servers: dbServers,
                                    source: 'database'
                                },
                                { headers: { 'Access-Control-Allow-Origin': '*' } }
                            );
                        }
                    }
                }
            }
        } catch {}
    }

    // Step 4: Live On-Demand Extraction from DesiDubAnime
    const targetTitle = movieTitle || slug || '';
    const extracted = await extractDesiDubStream(targetTitle, slug || '', seasonNum, epNum);

    if (!extracted.success || !extracted.servers || Object.keys(extracted.servers).length === 0) {
        return NextResponse.json(
            {
                success: false,
                notFound: true,
                error: extracted.error || 'Anime not found on DesiDub Server. Please choose Server Nexiplay.',
                title: targetTitle,
                season: seasonNum,
                episode: epNum
            },
            {
                status: 404,
                headers: { 'Access-Control-Allow-Origin': '*' }
            }
        );
    }

    // Select requested server or primary
    const origin = request.nextUrl.origin || 'https://nexiplay.vercel.app';
    const makeAbsolute = (url?: string): string => {
        if (!url) return '';
        let u = url.trim();
        if (u.includes('abyssplayer.com') || u.includes('abyss.to') || u.includes('short.ink')) {
            if (!u.includes('/api/player/abyss')) {
                u = `/api/player/abyss?url=${encodeURIComponent(u)}`;
            }
        }
        if (u.startsWith('/')) {
            return `${origin}${u}`;
        }
        return u;
    };

    const servers: Record<string, string> = {};
    for (const [k, v] of Object.entries(extracted.servers)) {
        if (typeof v === 'string') {
            servers[k] = makeAbsolute(v);
        }
    }

    const targetUrl = servers[requestedServer] || servers.desidub || makeAbsolute(extracted.primaryUrl);

    return NextResponse.json(
        {
            success: true,
            title: extracted.title || targetTitle,
            season: seasonNum,
            episode: epNum,
            server: requestedServer,
            playbackUrl: targetUrl,
            embedUrl: targetUrl,
            servers,
            source: 'live_desidub'
        },
        { headers: { 'Access-Control-Allow-Origin': '*' } }
    );
}
