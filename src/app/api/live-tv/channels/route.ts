import { NextResponse } from 'next/server';

interface ChannelItem {
    id: string;
    name: string;
    logo: string;
    group: string;
    country: string;
    streamUrl: string;
    youtubeLiveUrl?: string;
    isTop?: boolean;
}

// Memory cache to prevent hitting iptv-org every request
const channelCache: Record<string, { timestamp: number; channels: ChannelItem[] }> = {};
const CACHE_TTL_MS = 1000 * 60 * 30; // 30 minutes cache

// Curated verified fallbacks for prominent channels that may have CORS on raw HTTP
const VERIFIED_FALLBACKS: Record<string, { youtubeLive?: string; fallbackHls?: string }> = {
    'somoy-tv': {
        youtubeLive: 'https://www.youtube.com/embed/live_stream?channel=UC24_68cW_zSgJb_4Kx4d1oA',
        fallbackHls: 'https://live-somoytv.b-cdn.net/somoytv/somoytv.stream/playlist.m3u8'
    },
    'jamuna-tv': {
        youtubeLive: 'https://www.youtube.com/embed/live_stream?channel=UC4_rK296k1vE4K_iB8pI1bA',
        fallbackHls: 'https://edge.jamuna.tv/live/jamunatv/playlist.m3u8'
    },
    'channel-24': {
        youtubeLive: 'https://www.youtube.com/embed/live_stream?channel=UC5m_xPqF1r_1m1X0L5p0Gvg'
    },
    'ekattor-tv': {
        youtubeLive: 'https://www.youtube.com/embed/live_stream?channel=UC_Tf6Z0m_m3e5qZf8Z1gJbw'
    },
    'independent-tv': {
        youtubeLive: 'https://www.youtube.com/embed/live_stream?channel=UC5x0k0fA_m9f4P2x9bQ0t3g'
    },
    'dbc-news': {
        youtubeLive: 'https://www.youtube.com/embed/live_stream?channel=UCLg3k-m6mR4j-1m9qZ2t4fw'
    },
    'aaj-tak': {
        youtubeLive: 'https://www.youtube.com/embed/live_stream?channel=UCt4t-jeY85JegMlZ-E5UWtA'
    },
    'ndtv-india': {
        youtubeLive: 'https://www.youtube.com/embed/live_stream?channel=UCZFMm1mMw0F81Z37aa5T_vA'
    },
    'al-jazeera': {
        fallbackHls: 'https://live-hls-web-aje.getaj.net/AJE/03.m3u8'
    },
    'dw-english': {
        fallbackHls: 'https://dwamdstream102.akamaized.net/hls/live/2015525/dwstream102/index.m3u8'
    },
    'france-24': {
        fallbackHls: 'https://stream.france24.com/hls/live/2037568/F24_EN_LO_HLS/master_500.m3u8'
    }
};

function parseM3U(m3uText: string, countryCode: string): ChannelItem[] {
    const lines = m3uText.split(/\r?\n/);
    const channels: ChannelItem[] = [];
    let currentChannel: Partial<ChannelItem> | null = null;

    for (let i = 0; i < lines.length; i++) {
        const line = lines[i].trim();
        if (line.startsWith('#EXTINF:')) {
            const logoMatch = line.match(/tvg-logo="([^"]+)"/);
            const groupMatch = line.match(/group-title="([^"]+)"/);
            const idMatch = line.match(/tvg-id="([^"]+)"/);
            const commaIndex = line.lastIndexOf(',');
            const title = commaIndex !== -1 ? line.substring(commaIndex + 1).trim() : 'Live Channel';

            const cleanId = (idMatch ? idMatch[1] : title).toLowerCase().replace(/[^a-z0-9]+/g, '-');

            currentChannel = {
                id: cleanId,
                name: title,
                logo: logoMatch ? logoMatch[1] : '',
                group: groupMatch ? groupMatch[1] : 'General',
                country: countryCode.toUpperCase(),
                streamUrl: '',
            };
        } else if (line && !line.startsWith('#') && currentChannel) {
            currentChannel.streamUrl = line;

            // Check if we have verified fallbacks
            for (const key of Object.keys(VERIFIED_FALLBACKS)) {
                if (currentChannel.id?.includes(key) || currentChannel.name?.toLowerCase().includes(key)) {
                    const meta = VERIFIED_FALLBACKS[key];
                    if (meta.youtubeLive) currentChannel.youtubeLiveUrl = meta.youtubeLive;
                    if (meta.fallbackHls) currentChannel.streamUrl = meta.fallbackHls;
                    currentChannel.isTop = true;
                }
            }

            channels.push(currentChannel as ChannelItem);
            currentChannel = null;
        }
    }

    // Sort to keep top channels at top
    return channels.sort((a, b) => {
        if (a.isTop && !b.isTop) return -1;
        if (!a.isTop && b.isTop) return 1;
        return a.name.localeCompare(b.name);
    });
}

export async function GET(req: Request) {
    try {
        const { searchParams } = new URL(req.url);
        const country = (searchParams.get('country') || 'bd').toLowerCase();
        const category = searchParams.get('category')?.toLowerCase();

        const cacheKey = category ? `cat_${category}` : `country_${country}`;

        // Return from memory cache if fresh
        if (channelCache[cacheKey] && Date.now() - channelCache[cacheKey].timestamp < CACHE_TTL_MS) {
            return NextResponse.json({
                success: true,
                cached: true,
                channels: channelCache[cacheKey].channels,
            });
        }

        let m3uUrl = `https://iptv-org.github.io/iptv/countries/${country}.m3u`;
        if (category) {
            m3uUrl = `https://iptv-org.github.io/iptv/categories/${category}.m3u`;
        }

        const res = await fetch(m3uUrl, {
            headers: {
                'User-Agent': 'MovieBari-Nexiplay/1.0',
            },
            next: { revalidate: 3600 },
        });

        if (!res.ok) {
            // Fallback to bd if country not found
            if (country !== 'bd') {
                const fallbackRes = await fetch('https://iptv-org.github.io/iptv/countries/bd.m3u');
                const fallbackText = await fallbackRes.text();
                const channels = parseM3U(fallbackText, 'bd');
                return NextResponse.json({ success: true, channels });
            }
            return NextResponse.json({ success: false, error: 'Failed to load M3U playlist' }, { status: 502 });
        }

        const m3uText = await res.text();
        const channels = parseM3U(m3uText, country);

        channelCache[cacheKey] = {
            timestamp: Date.now(),
            channels,
        };

        return NextResponse.json({
            success: true,
            total: channels.length,
            channels,
        });
    } catch (err: any) {
        console.error('[Live TV API Error]', err);
        return NextResponse.json({ success: false, error: err.message }, { status: 500 });
    }
}
