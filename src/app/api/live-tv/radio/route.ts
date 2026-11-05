import { NextResponse } from 'next/server';

interface RadioStation {
    stationuuid: string;
    name: string;
    url: string;
    url_resolved: string;
    favicon: string;
    tags: string;
    country: string;
    countrycode: string;
    bitrate: number;
    codec: string;
}

const MIRRORS = [
    'https://de1.api.radio-browser.info',
    'https://nl1.api.radio-browser.info',
    'https://all.api.radio-browser.info',
];

const radioCache: Record<string, { timestamp: number; stations: RadioStation[] }> = {};
const CACHE_TTL_MS = 1000 * 60 * 30; // 30 minutes

async function fetchFromMirrors(endpoint: string): Promise<any> {
    for (const mirror of MIRRORS) {
        try {
            const res = await fetch(`${mirror}${endpoint}`, {
                headers: { 'User-Agent': 'MovieBari-Nexiplay/1.0' },
                next: { revalidate: 3600 },
            });
            if (res.ok) {
                return await res.json();
            }
        } catch (e) {
            console.warn(`[Radio Mirror Failed: ${mirror}]`, e);
        }
    }
    throw new Error('All Radio Browser mirrors failed');
}

function isValidHttpUrl(string: string | undefined | null): boolean {
    if (!string || typeof string !== 'string' || string.trim().length < 8) return false;
    try {
        const url = new URL(string);
        return url.protocol === 'http:' || url.protocol === 'https:';
    } catch (_) {
        return false;
    }
}

export async function GET(req: Request) {
    try {
        const { searchParams } = new URL(req.url);
        const country = (searchParams.get('country') || 'BD').toUpperCase();
        const search = searchParams.get('q')?.trim();

        const cacheKey = search ? `search_${search}` : `country_${country}`;

        if (radioCache[cacheKey] && Date.now() - radioCache[cacheKey].timestamp < CACHE_TTL_MS) {
            return NextResponse.json({
                success: true,
                cached: true,
                stations: radioCache[cacheKey].stations,
            });
        }

        let endpoint = `/json/stations/bycountrycodeexact/${country}?limit=60&order=votes&reverse=true`;
        if (search) {
            endpoint = `/json/stations/search?name=${encodeURIComponent(search)}&limit=60&order=votes&reverse=true`;
        }

        const rawStations = await fetchFromMirrors(endpoint);

        const stations: RadioStation[] = (rawStations || [])
            .filter((s: any) => s.url_resolved || s.url)
            .map((s: any) => ({
                stationuuid: s.stationuuid,
                name: s.name?.trim() || 'Live Radio',
                url: s.url,
                url_resolved: s.url_resolved || s.url,
                favicon: isValidHttpUrl(s.favicon) ? s.favicon.trim() : '',
                tags: s.tags || '',
                country: s.country || country,
                countrycode: s.countrycode || country,
                bitrate: s.bitrate || 128,
                codec: s.codec || 'MP3',
            }));

        radioCache[cacheKey] = {
            timestamp: Date.now(),
            stations,
        };

        return NextResponse.json({
            success: true,
            total: stations.length,
            stations,
        }, {
            headers: {
                'Cache-Control': 'public, s-maxage=1800, stale-while-revalidate=3600'
            }
        });
    } catch (err: any) {
        console.error('[Radio API Error]', err);
        return NextResponse.json({ success: false, error: err.message }, { status: 500 });
    }
}
