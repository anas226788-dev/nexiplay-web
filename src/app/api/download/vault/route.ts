import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

async function resolveVaultDownload(
    mediaType: 'movie' | 'tv',
    id: string,
    season?: string | number,
    episode?: string | number,
    quality: string = '720p',
    title?: string
) {
    let vaultUrl = `https://vidvault.to/download-link/${mediaType}/${encodeURIComponent(id)}`;
    if (mediaType === 'tv' && season && episode) {
        vaultUrl += `/${encodeURIComponent(season)}/${encodeURIComponent(episode)}`;
    }
    vaultUrl += `/${encodeURIComponent(quality)}`;

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 12000);

    const directFallback = mediaType === 'tv' && season && episode
        ? `https://vidvault.to/direct/tv/${id}/${season}/${episode}`
        : `https://vidvault.to/direct/movie/${id}/0`;

    const baseTitle = (title || (mediaType === 'tv' ? `Series_${id}_S${season}E${episode}` : `Movie_${id}`))
        .replace(/[^a-zA-Z0-9_\- ]/g, '')
        .trim();
    const fileName = `${baseTitle || 'media'}_${quality}.mkv`;

    let directTargetUrl = directFallback;

    try {
        const res = await fetch(vaultUrl, {
            signal: controller.signal,
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                'Referer': `https://vidvault.to/${mediaType}/${id}`,
                'Accept': 'application/json, text/plain, */*',
            },
        });
        clearTimeout(timeout);

        if (res.ok) {
            const data = await res.json().catch(() => ({}));
            if (data && data.url) {
                directTargetUrl = String(data.url);
            }
        }
    } catch {
        clearTimeout(timeout);
    }

    // Wrap the direct target URL inside our internal download file proxy to bypass hotlink (403 Forbidden)
    const proxyDownloadUrl = `/api/download/file?url=${encodeURIComponent(directTargetUrl)}&filename=${encodeURIComponent(fileName)}`;

    return {
        success: true,
        url: proxyDownloadUrl,
        downloadUrl: proxyDownloadUrl,
        directUrl: directTargetUrl,
        fileName,
        quality,
        mediaType,
        id,
        season,
        episode,
    };
}

export async function GET(request: NextRequest) {
    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type') || 'movie';
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

    const isTv = type === 'tv' || type === 'series' || type === 'anime' || (!!season && !!episode);
    const result = await resolveVaultDownload(
        isTv ? 'tv' : 'movie',
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
        const type = body.type || 'movie';
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

        const isTv = type === 'tv' || type === 'series' || type === 'anime' || (!!season && !!episode);
        const result = await resolveVaultDownload(
            isTv ? 'tv' : 'movie',
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
