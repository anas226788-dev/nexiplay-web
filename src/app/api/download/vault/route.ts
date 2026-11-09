import { NextRequest, NextResponse } from 'next/server';
import { supabase, isSupabaseConfigured } from '@/lib/supabase';
import toonplayCatalogRaw from '@/lib/toonplay_catalog.json';

const toonplayCatalog = toonplayCatalogRaw as Record<string, any>;

export const dynamic = 'force-dynamic';

async function resolveVaultDownload(
    mediaType: 'movie' | 'tv' | 'anime',
    id: string,
    season?: string | number,
    episode?: string | number,
    quality: string = '720p',
    title?: string
) {
    const isTv = mediaType === 'tv' || mediaType === 'anime' || (!!season && !!episode);
    const baseTitle = (title || (isTv ? `Series_${id}_S${season}E${episode}` : `Movie_${id}`))
        .replace(/[^a-zA-Z0-9_\- ]/g, '')
        .trim();
    const fileName = `${baseTitle || 'media'}_${quality}.mkv`;

    // 1. Check if database has active manual links in Supabase
    if (isSupabaseConfigured) {
        try {
            const { data: movie } = await supabase
                .from('movies')
                .select('id, type, title, download_links')
                .or(`id.eq.${id},tmdb_id.eq.${id},imdb_id.eq.${id}`)
                .maybeSingle();

            if (movie) {
                if (isTv && season && episode) {
                    const { data: seasons } = await supabase
                        .from('seasons')
                        .select('id, season_number')
                        .eq('movie_id', movie.id)
                        .eq('season_number', Number(season));

                    if (seasons && seasons.length > 0) {
                        const seasonId = seasons[0].id;
                        const { data: eps } = await supabase
                            .from('episodes')
                            .select('id, download_links')
                            .eq('season_id', seasonId)
                            .eq('episode_number', Number(episode));

                        if (eps && eps.length > 0 && Array.isArray(eps[0].download_links) && eps[0].download_links.length > 0) {
                            const links = eps[0].download_links;
                            const match = links.find((l: any) => l.resolution === quality) || links[0];
                            const directUrl = match.gdrive_link || match.mega_link || match.mediafire_link || match.terabox_link;
                            if (directUrl) {
                                return {
                                    success: true,
                                    directAvailable: true,
                                    source: 'database',
                                    url: directUrl,
                                    downloadUrl: directUrl,
                                    fileName,
                                    quality,
                                    mediaType,
                                    id,
                                    season,
                                    episode,
                                };
                            }
                        }
                    }
                } else if (!isTv && Array.isArray(movie.download_links) && movie.download_links.length > 0) {
                    const links = movie.download_links;
                    const match = links.find((l: any) => l.resolution === quality) || links[0];
                    const directUrl = match.gdrive_link || match.mega_link || match.mediafire_link || match.terabox_link;
                    if (directUrl) {
                        return {
                            success: true,
                            directAvailable: true,
                            source: 'database',
                            url: directUrl,
                            downloadUrl: directUrl,
                            fileName,
                            quality,
                            mediaType,
                            id,
                        };
                    }
                }
            }
        } catch (dbErr) {
            console.warn('[Download DB Lookup Warning]:', dbErr);
        }
    }

    // 2. VidVault Direct Download (Attempt requested quality, then fallback qualities)
    const qualitiesToTry = [quality, ...['720p', '1080p', '480p'].filter(q => q.toLowerCase() !== quality.toLowerCase())];
    let vidvaultDirectUrl: string | null = null;
    let resolvedQuality: string = quality;

    for (const qTry of qualitiesToTry) {
        let vaultUrl = `https://vidvault.to/download-link/${isTv ? 'tv' : 'movie'}/${encodeURIComponent(id)}`;
        if (isTv && season && episode) {
            vaultUrl += `/${encodeURIComponent(season)}/${encodeURIComponent(episode)}`;
        }
        vaultUrl += `/${encodeURIComponent(qTry)}`;

        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 4000);

        try {
            const res = await fetch(vaultUrl, {
                signal: controller.signal,
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                    'Referer': `https://vidvault.to/${isTv ? 'tv' : 'movie'}/${id}`,
                    'Accept': 'application/json, text/plain, */*',
                },
            });
            clearTimeout(timeout);

            if (res.ok) {
                const data = await res.json().catch(() => ({}));
                if (data && data.url && typeof data.url === 'string' && data.url.startsWith('http')) {
                    vidvaultDirectUrl = String(data.url);
                    resolvedQuality = qTry;
                    break;
                }
            }
        } catch {
            clearTimeout(timeout);
        }
    }

    // 2a. If VidVault returned a working direct link, use it immediately
    if (vidvaultDirectUrl) {
        const proxyDownloadUrl = `/api/download/file?url=${encodeURIComponent(vidvaultDirectUrl)}&filename=${encodeURIComponent(fileName)}`;
        return {
            success: true,
            directAvailable: true,
            source: 'vidvault',
            url: proxyDownloadUrl,
            downloadUrl: proxyDownloadUrl,
            directUrl: vidvaultDirectUrl,
            fileName,
            quality: resolvedQuality,
            mediaType,
            id,
            season,
            episode,
        };
    }

    // 3. If VidVault didn't have it, check ToonPlay for Anime ONLY
    const isAnime = mediaType === 'anime' || (!!title && (() => {
        const clean = (s: string) => s.replace(/\(.*?\)/g, '').replace(/Season\s*[\d\s\-]+/gi, '').replace(/[^a-zA-Z0-9\s]/g, '').toLowerCase().trim();
        const ct = clean(title);
        return Object.values(toonplayCatalog).some((item: any) => {
            const it = clean(item.meta?.title || item.slug || '');
            return it && (it.includes(ct) || ct.includes(it));
        });
    })());

    if (isAnime) {
        try {
            const lookupTitle = title || '';
            if (lookupTitle) {
                const clean = (s: string) => {
                    let res = s.replace(/\(.*?\)/g, '');
                    res = res.replace(/Season\s*[\d\s\-]+/gi, '');
                    res = res.replace(/[^a-zA-Z0-9\s]/g, '');
                    return res.toLowerCase().trim();
                };
                const cleanTarget = clean(lookupTitle);

                // 3a. Check fast bundled snapshot (0ms, 100% immune to CF blocks)
                let matchedSeries: any = null;
                for (const item of Object.values(toonplayCatalog)) {
                    const ct = clean(item.meta?.title || item.slug || '');
                    if (ct && (ct.includes(cleanTarget) || cleanTarget.includes(ct))) {
                        matchedSeries = item;
                        break;
                    }
                }

                // 3b. If not in snapshot, try live fetch
                if (!matchedSeries) {
                    try {
                        const toonplayRes = await fetch(`https://toonplay.in/downloads/index.json`, {
                            headers: { 'User-Agent': 'Mozilla/5.0' },
                            signal: AbortSignal.timeout(5000),
                        });
                        if (toonplayRes.ok) {
                            const toonData = await toonplayRes.json();
                            const matched = (toonData.series || []).find((s: any) => {
                                const ct = clean(s.meta?.title || s.slug || '');
                                return ct && (ct.includes(cleanTarget) || cleanTarget.includes(ct));
                            });
                            if (matched?.slug) {
                                const epRes = await fetch(`https://toonplay.in/downloads/${encodeURIComponent(matched.slug)}.json`, {
                                    headers: { 'User-Agent': 'Mozilla/5.0' },
                                    signal: AbortSignal.timeout(5000),
                                });
                                if (epRes.ok) {
                                    const epData = await epRes.json();
                                    matchedSeries = {
                                        slug: matched.slug,
                                        meta: matched.meta,
                                        episodes: epData.page?.episodes || []
                                    };
                                }
                            }
                        }
                    } catch {}
                }

                if (matchedSeries) {
                    const epNum = Number(episode || 1);
                    const epList: any[] = matchedSeries.episodes || [];
                    const targetEp = epList.find((e: any) => e.episode === epNum) || epList[epNum - 1];
                    if (targetEp) {
                        const qualities = targetEp.qualities || [];
                        const matchedQuality = qualities.find((q: any) => (q.quality || '').toLowerCase().includes(quality.toLowerCase())) || qualities[0];
                        const links = matchedQuality?.links || {};
                        const chosen = links.Hcloud || links.MEGA || links.GDF || links.Multi || links.Fprs;
                        if (chosen) {
                            return {
                                success: true,
                                directAvailable: true,
                                source: 'toonplay',
                                url: chosen,
                                downloadUrl: chosen,
                                directUrl: chosen,
                                fileName,
                                quality: matchedQuality?.quality || quality,
                                mediaType,
                                id,
                                season,
                                episode,
                            };
                        }
                    }
                }
            }
        } catch (tpErr) {
            console.warn('[ToonPlay Download Error]:', tpErr);
        }

        return {
            success: false,
            error: 'Download link is currently unavailable for this anime episode. Please watch online.',
        };
    }

    // 4. For Movie and Series: If VidVault has no working file after checking all qualities
    return {
        success: false,
        error: 'Direct download link is currently not available on VidVault for this title. Please try another quality or watch online.',
    };
}

export async function GET(request: NextRequest) {
    const { searchParams } = new URL(request.url);
    const type = (searchParams.get('type') || 'movie') as 'movie' | 'tv' | 'anime';
    const id = searchParams.get('id') || searchParams.get('tmdbId');
    const season = searchParams.get('season') || searchParams.get('s');
    const episode = searchParams.get('episode') || searchParams.get('e');
    const quality = searchParams.get('quality') || '720p';
    const title = searchParams.get('title') || undefined;

    if (!id) {
        return NextResponse.json(
            { success: false, error: 'Content ID is required' },
            { status: 400 }
        );
    }

    const result = await resolveVaultDownload(
        type,
        id,
        season || undefined,
        episode || undefined,
        quality,
        title
    );
    return NextResponse.json(result);
}

export async function POST(request: NextRequest) {
    try {
        const body = await request.json().catch(() => ({}));
        const type = (body.type || 'movie') as 'movie' | 'tv' | 'anime';
        const id = body.id || body.tmdbId;
        const season = body.season || body.s;
        const episode = body.episode || body.e;
        const quality = body.quality || '720p';
        const title = body.title || undefined;

        if (!id) {
            return NextResponse.json(
                { success: false, error: 'Content ID is required' },
                { status: 400 }
            );
        }

        const result = await resolveVaultDownload(
            type,
            id,
            season || undefined,
            episode || undefined,
            quality,
            title
        );
        return NextResponse.json(result);
    } catch (e: any) {
        return NextResponse.json(
            { success: false, error: e.message || 'Internal error' },
            { status: 500 }
        );
    }
}
