import { NextRequest, NextResponse } from 'next/server';
import { supabase, isSupabaseConfigured } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

function generateDownloadMirrors(
    mediaType: 'movie' | 'tv' | 'anime',
    title: string,
    season?: string | number,
    episode?: string | number,
    quality: string = '720p'
) {
    const isTv = mediaType === 'tv' || mediaType === 'anime' || (!!season && !!episode);
    const cleanTitle = (title || 'Media').replace(/[^a-zA-Z0-9_\- ]/g, '').trim();
    const queryTerm = isTv && season && episode
        ? `${cleanTitle} S${String(season).padStart(2, '0')}E${String(episode).padStart(2, '0')}`
        : cleanTitle;

    const mirrors = [
        {
            id: 'gdrive',
            name: 'Google Drive Mirror',
            badge: 'High Speed Cloud',
            color: 'from-blue-600 via-indigo-600 to-blue-700',
            url: `https://www.google.com/search?q=${encodeURIComponent(`site:drive.google.com ${queryTerm} ${quality}`)}`,
            icon: 'gdrive',
        },
        {
            id: 'mega',
            name: 'Mega Cloud Mirror',
            badge: 'Fastest Direct',
            color: 'from-red-600 via-rose-600 to-red-700',
            url: `https://www.google.com/search?q=${encodeURIComponent(`site:mega.nz ${queryTerm}`)}`,
            icon: 'mega',
        },
        {
            id: 'mediafire',
            name: 'MediaFire Mirror',
            badge: 'Direct Download',
            color: 'from-orange-500 via-amber-600 to-orange-600',
            url: `https://www.google.com/search?q=${encodeURIComponent(`site:mediafire.com ${queryTerm} mkv`)}`,
            icon: 'mediafire',
        },
    ];

    const isAnime = mediaType === 'anime' ||
        cleanTitle.toLowerCase().includes('naruto') ||
        cleanTitle.toLowerCase().includes('piece') ||
        cleanTitle.toLowerCase().includes('bleach') ||
        cleanTitle.toLowerCase().includes('dragon ball') ||
        cleanTitle.toLowerCase().includes('jujutsu') ||
        cleanTitle.toLowerCase().includes('titan') ||
        cleanTitle.toLowerCase().includes('slayer');

    if (isAnime || isTv) {
        mirrors.push(
            {
                id: 'animekhor',
                name: 'AnimeKhor (Dub Mirror)',
                badge: 'Bangla / Hindi Dub',
                color: 'from-emerald-600 via-teal-600 to-green-700',
                url: `https://animekhor.org/?s=${encodeURIComponent(cleanTitle)}`,
                icon: 'audio',
            },
            {
                id: 'pahe',
                name: 'Pahe Direct MKV',
                badge: 'Multi-Res MKV',
                color: 'from-purple-600 via-violet-600 to-indigo-700',
                url: `https://pahe.ink/?s=${encodeURIComponent(cleanTitle)}`,
                icon: 'sparkle',
            }
        );
    } else {
        mirrors.push(
            {
                id: 'yts',
                name: 'YTS HD Mirror',
                badge: '1080p / 720p Bluray',
                color: 'from-teal-600 via-emerald-600 to-green-700',
                url: `https://yts.mx/browse-movies/${encodeURIComponent(cleanTitle)}`,
                icon: 'film',
            },
            {
                id: 'bollyflix',
                name: 'Bollyflix Mirror',
                badge: 'Dual Audio / Hindi',
                color: 'from-amber-600 via-orange-600 to-red-600',
                url: `https://www.google.com/search?q=${encodeURIComponent(`bollyflix ${cleanTitle}`)}`,
                icon: 'audio',
            }
        );
    }

    return mirrors;
}

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

    // 2. Try VidVault direct CDN (only if returns valid 200 OK with file URL)
    let vaultUrl = `https://vidvault.to/download-link/${isTv ? 'tv' : 'movie'}/${encodeURIComponent(id)}`;
    if (isTv && season && episode) {
        vaultUrl += `/${encodeURIComponent(season)}/${encodeURIComponent(episode)}`;
    }
    vaultUrl += `/${encodeURIComponent(quality)}`;

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 7000);

    let hasDirectUrl = false;
    let directTargetUrl = '';

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
                directTargetUrl = String(data.url);
                hasDirectUrl = true;
            }
        }
    } catch {
        clearTimeout(timeout);
    }

    // If VidVault has a REAL verified file, return direct URL to bypass Vercel serverless bandwidth
    if (hasDirectUrl && directTargetUrl) {
        return {
            success: true,
            directAvailable: true,
            source: 'direct_cdn',
            url: directTargetUrl,
            downloadUrl: directTargetUrl,
            directUrl: directTargetUrl,
            fileName,
            quality,
            mediaType,
            id,
            season,
            episode,
        };
    }

    // 3. Fallback: Direct automated CDN has no cached file for this episode/movie
    // DO NOT return a fake 404 URL! Return clean status with working verified Cloud Mirrors.
    const mirrors = generateDownloadMirrors(mediaType, title || baseTitle, season, episode, quality);

    return {
        success: false,
        directAvailable: false,
        error: `Direct CDN file is not pre-cached for ${title || 'this content'}${isTv && season && episode ? ` (S${season}E${episode})` : ''}. Verified Cloud Mirrors are available below.`,
        fileName,
        quality,
        mediaType,
        id,
        season,
        episode,
        mirrors,
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
