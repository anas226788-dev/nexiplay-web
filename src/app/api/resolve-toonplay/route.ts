import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

const HEADERS = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36',
    'Referer': 'https://toonplay.in/',
    'Origin': 'https://toonplay.in'
};

/**
 * Resolve a ToonPlay/AnimeSalt episode URL to a fresh m3u8 streaming URL.
 * 
 * Query params:
 *   - toonplay_id: The AnimeSalt series ID (e.g., "series-tomo-chan-is-a-girl")
 *   - season: Season number (default: 1)
 *   - episode: Episode number (required)
 *   
 * OR:
 *   - cached_url: A previously cached m3u8 URL to test first. If it works, returns it directly.
 */
export async function GET(request: NextRequest) {
    const { searchParams } = new URL(request.url);
    const toonplayId = searchParams.get('toonplay_id');
    const season = parseInt(searchParams.get('season') || '1');
    const episode = parseInt(searchParams.get('episode') || '0');
    const cachedUrl = searchParams.get('cached_url');

    // If a cached URL is provided, test if it still works first
    if (cachedUrl) {
        try {
            const testRes = await fetch(cachedUrl, {
                method: 'HEAD',
                headers: HEADERS,
                signal: AbortSignal.timeout(5000),
            });
            if (testRes.ok) {
                return NextResponse.json({ url: cachedUrl, source: 'cache' });
            }
        } catch {
            // Cache expired, continue to fresh resolve
        }
    }

    if (!toonplayId || !episode) {
        return NextResponse.json(
            { error: 'Missing toonplay_id and episode parameters' },
            { status: 400 }
        );
    }

    try {
        // Step 1: Get series info from AnimeSalt
        const infoUrl = `https://animesalt.streamindia.co.in/api/info?id=${encodeURIComponent(toonplayId)}`;
        const infoRes = await fetch(infoUrl, {
            headers: HEADERS,
            signal: AbortSignal.timeout(10000),
        });

        if (!infoRes.ok) {
            return NextResponse.json(
                { error: `AnimeSalt info API returned ${infoRes.status}` },
                { status: 502 }
            );
        }

        const infoData = await infoRes.json();
        if (!infoData.anime) {
            return NextResponse.json(
                { error: 'Anime not found on AnimeSalt' },
                { status: 404 }
            );
        }

        // Step 2: Find the episode
        const seasonsList = infoData.anime.seasonsList || [];
        let targetEp: any = null;

        for (const s of seasonsList) {
            const sNum = parseInt(s.season || '1');
            if (sNum === season) {
                const eps = s.episodes || [];
                targetEp = eps.find((e: any) => e.number === episode);
                break;
            }
        }

        // If not found in the target season, search all seasons
        if (!targetEp) {
            for (const s of seasonsList) {
                const eps = s.episodes || [];
                targetEp = eps.find((e: any) => e.number === episode);
                if (targetEp) break;
            }
        }

        if (!targetEp) {
            return NextResponse.json(
                { error: `Episode ${episode} (S${season}) not found on AnimeSalt` },
                { status: 404 }
            );
        }

        // Step 3: Extract video player URL
        const epId = targetEp.id;
        const episodeUrl = epId.startsWith('http') ? epId : `https://animesalt.ac/${epId}`;

        const extractUrl = `https://anime.streamindia.co.in/api/extract?url=${encodeURIComponent(episodeUrl)}`;
        const extractRes = await fetch(extractUrl, {
            headers: HEADERS,
            signal: AbortSignal.timeout(10000),
        });

        if (!extractRes.ok) {
            return NextResponse.json(
                { error: `Extract API returned ${extractRes.status}` },
                { status: 502 }
            );
        }

        const extractData = await extractRes.json();
        const playerUrl = extractData.data?.videoPlayerUrl;

        if (!playerUrl) {
            return NextResponse.json(
                { error: 'No video player URL found' },
                { status: 404 }
            );
        }

        // Step 4: Get the actual m3u8 stream URL
        const streamUrl = `https://extract.streamindia.co.in/api?url=${encodeURIComponent(playerUrl)}`;
        const streamRes = await fetch(streamUrl, {
            headers: HEADERS,
            signal: AbortSignal.timeout(10000),
        });

        if (!streamRes.ok) {
            return NextResponse.json(
                { error: `Stream API returned ${streamRes.status}` },
                { status: 502 }
            );
        }

        const streamData = await streamRes.json();
        const files = streamData.files || {};
        const m3u8 = files.hin || files.eng || files.jpn || Object.values(files)[0];

        if (!m3u8) {
            return NextResponse.json(
                { error: 'No streaming files found' },
                { status: 404 }
            );
        }

        return NextResponse.json({
            url: m3u8 as string,
            source: 'fresh',
            languages: Object.keys(files),
        });

    } catch (e: any) {
        console.error('[ToonPlay Resolve Error]:', e.message);
        return NextResponse.json(
            { error: e.message || 'Failed to resolve ToonPlay URL' },
            { status: 500 }
        );
    }
}
