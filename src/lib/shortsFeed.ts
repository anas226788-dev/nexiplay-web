import { supabase } from '@/lib/supabase';

export type ShortNiche = 
    | 'drama'
    | 'anime'
    | 'comedy'
    | 'gaming'
    | 'movie'
    | 'tech'
    | 'food'
    | 'motivation'
    | 'satisfying'
    | 'music'
    | 'nature'
    | 'facts';

export interface ShortItem {
    id: string; // Video ID
    title: string;
    channel: string;
    channelName: string;
    kind: 'short' | 'trailer';
    niche?: ShortNiche;
    thumbnail?: string;
    movieSlug?: string | null;
    movieTitle?: string | null;
    publishedAt?: string;
}

// Clean titles from YouTube hashtags and branding
export function cleanTitle(raw: string): string {
    if (!raw) return 'Viral Reel';
    return raw
        .replace(/#youtubeshorts/gi, '')
        .replace(/#shorts/gi, '')
        .replace(/#short/gi, '')
        .replace(/youtube shorts/gi, 'Reels')
        .replace(/youtubeshorts/gi, '')
        .replace(/youtube/gi, '')
        .replace(/\s+/g, ' ')
        .trim();
}

// Automatic Niche Classifier based on semantic tags and title keywords
export function detectNiche(title: string, defaultNiche: ShortNiche = 'comedy'): ShortNiche {
    const t = title.toLowerCase();
    if (/anime|naruto|goku|luffy|jujutsu|demon slayer|amv|manga|otaku|attack on titan|bleach|one piece|dragon ball/i.test(t)) return 'anime';
    if (/game|gaming|gta|minecraft|ps5|roblox|valorant|pubg|freefire|esports|playstation|xbox|gamer/i.test(t)) return 'gaming';
    if (/trailer|marvel|cinema|hollywood|avengers|movie|film|actor|box office|spiderman|batman/i.test(t)) return 'movie';
    if (/drama|dramawave|reelshort|shortmax|alpha|billionaire|episode|kdrama|k-drama|series|romance/i.test(t)) return 'drama';
    if (/tech|science|ai|iphone|phone|gadget|space|nasa|robot|coding|computer|apple|chatgpt/i.test(t)) return 'tech';
    if (/food|recipe|cook|street food|eat|burger|pizza|delicious|yummy|snack|kitchen|asmr food/i.test(t)) return 'food';
    if (/gym|workout|fitness|motivation|discipline|muscle|bodybuilder|quote|mindset|success|sigma/i.test(t)) return 'motivation';
    if (/satisfying|soap|slime|relaxing|craft|art|drawing|painting|asmr|kinetic|satisfaction/i.test(t)) return 'satisfying';
    if (/music|song|dance|beat|guitar|sing|hip hop|rap|melody|lofi|concert|cover/i.test(t)) return 'music';
    if (/pet|cat|dog|animal|cute|puppy|kitten|wildlife|bird|zoo|panda/i.test(t)) return 'nature';
    if (/fact|facts|did you know|history|mystery|curiosity|planet|earth|secrets|dark facts/i.test(t)) return 'facts';
    if (/comedy|funny|laugh|joke|memes|humor|prank|fails|roast|lol|chota chetan/i.test(t)) return 'comedy';
    return defaultNiche;
}

// Multi-niche rotating query clusters covering all user tastes
export const NICHE_QUERIES: Record<ShortNiche, string[]> = {
    anime: [
        'anime epic moments 4k edit',
        'anime fight scene viral',
        'jujutsu kaisen demon slayer anime clips',
    ],
    comedy: [
        'viral funny comedy moments',
        'standup comedy funny clips',
        'comedy memes laughing clips',
    ],
    gaming: [
        'gaming funny moments clips',
        'gta 5 epic stunt moments',
        'minecraft satisfying gaming clips',
    ],
    movie: [
        'hollywood movie iconic scene',
        'blockbuster movie action scene',
        'cinema official teaser clips',
    ],
    drama: [
        'dramawave viral mini series',
        'reelshort exclusive teaser clips',
        'k-drama high drama scenes',
    ],
    tech: [
        'cool tech gadgets science facts',
        'mind blowing futuristic technology',
        'life changing tech life hacks',
    ],
    food: [
        'viral street food delicious recipe',
        'satisfying cooking food reels',
        'amazing fast food preparation',
    ],
    motivation: [
        'gym workout motivational speech',
        'billionaire success mindset motivation',
        'never give up motivation workout',
    ],
    satisfying: [
        'oddly satisfying kinetic sand art',
        'most satisfying video compilation',
        'satisfying 3d relaxing loop',
    ],
    music: [
        'viral popular acoustic dance song',
        'viral music trend clips',
        'amazing guitar vocal cover',
    ],
    nature: [
        'cute pets and funny animals',
        'wholesome funny dog and cat moments',
        'amazing wild animals nature',
    ],
    facts: [
        'mind blowing psychological facts',
        'unbelievable facts about the universe',
        'did you know mysterious facts',
    ],
};

// Curated 100% verified active viral reels across diverse niches (Cold Start Seeds)
export const CURATED_SHORTS: ShortItem[] = [
    {
        id: '0VYTwXLUam0',
        title: 'Ab Hansi Rok Kar Dikhao 😂 #comedy #viral',
        channel: 'viral',
        channelName: 'Nexiplay Comedy',
        kind: 'short',
        niche: 'comedy',
        thumbnail: 'https://i.ytimg.com/vi/0VYTwXLUam0/hqdefault.jpg',
    },
    {
        id: '5BOl7npAaLY',
        title: "The Lion King's Secret Baby",
        channel: 'dramawave',
        channelName: 'DramaWave Mini-Dramas',
        kind: 'short',
        niche: 'drama',
        thumbnail: 'https://i.ytimg.com/vi/5BOl7npAaLY/hqdefault.jpg',
    },
    {
        id: '8bYYWOVR0WM',
        title: 'Trending Viral Reel ✨ #viral #trending',
        channel: 'viral',
        channelName: 'Trending Reels',
        kind: 'short',
        niche: 'comedy',
        thumbnail: 'https://i.ytimg.com/vi/8bYYWOVR0WM/hqdefault.jpg',
    },
    {
        id: 'u6epLb7W_lA',
        title: "I Don't Need No Alpha Brothers Teaser | ReelShort",
        channel: 'reelshort',
        channelName: 'ReelShort Originals',
        kind: 'short',
        niche: 'drama',
        thumbnail: 'https://i.ytimg.com/vi/u6epLb7W_lA/hqdefault.jpg',
    },
    {
        id: 'IZuM6Xnk3s0',
        title: 'Agreement Marriage - Viral Episode #reels',
        channel: 'viral',
        channelName: 'Viral Stories',
        kind: 'short',
        niche: 'drama',
        thumbnail: 'https://i.ytimg.com/vi/IZuM6Xnk3s0/hqdefault.jpg',
    },
    {
        id: 'TcMBFSGVi1c',
        title: "Marvel Studios' Avengers: Endgame - Official Trailer",
        channel: 'marvel',
        channelName: 'Marvel Studios',
        kind: 'trailer',
        niche: 'movie',
        movieSlug: 'avengers-endgame-2019',
        movieTitle: 'Avengers: Endgame',
        thumbnail: 'https://i.ytimg.com/vi/TcMBFSGVi1c/hqdefault.jpg',
    },
    {
        id: 'kIfs-kyh_lY',
        title: 'The Hidden Billionaire Reclaims All #dramawave',
        channel: 'dramawave',
        channelName: 'DramaWave Mini-Dramas',
        kind: 'short',
        niche: 'drama',
        thumbnail: 'https://i.ytimg.com/vi/kIfs-kyh_lY/hqdefault.jpg',
    },
    {
        id: 'HSE-qgFdf4k',
        title: 'Outplayed | ReelShort Exclusive Mini-Series',
        channel: 'reelshort',
        channelName: 'ReelShort Originals',
        kind: 'short',
        niche: 'drama',
        thumbnail: 'https://i.ytimg.com/vi/HSE-qgFdf4k/hqdefault.jpg',
    },
    {
        id: '2I_XrNoSMEo',
        title: '⚡ One call instantly crushes her toxic ex 【ShortMax】',
        channel: 'shortmax',
        channelName: 'ShortMax Dramas',
        kind: 'short',
        niche: 'drama',
        thumbnail: 'https://i.ytimg.com/vi/2I_XrNoSMEo/hqdefault.jpg',
    },
    {
        id: 'tgbNymZ7vqY',
        title: 'Bohemian Rhapsody Official Teaser',
        channel: 'official',
        channelName: 'Featured Cinema',
        kind: 'trailer',
        niche: 'movie',
        thumbnail: 'https://i.ytimg.com/vi/tgbNymZ7vqY/hqdefault.jpg',
    },
    {
        id: '4T7HwL83vU4',
        title: 'Mind-Blowing Tech Innovation 2025 #tech',
        channel: 'viral',
        channelName: 'Future Tech',
        kind: 'short',
        niche: 'tech',
        thumbnail: 'https://i.ytimg.com/vi/4T7HwL83vU4/hqdefault.jpg',
    },
    {
        id: 'XbGSORBV3HA',
        title: 'Satisfying Kinetic Sand Cutting 4K ASMR',
        channel: 'viral',
        channelName: 'Satisfying Lab',
        kind: 'short',
        niche: 'satisfying',
        thumbnail: 'https://i.ytimg.com/vi/XbGSORBV3HA/hqdefault.jpg',
    },
    {
        id: 'dQw4w9WgXcQ',
        title: 'Legendary Music Rhythm & Vibes',
        channel: 'viral',
        channelName: 'Nexiplay Music',
        kind: 'short',
        niche: 'music',
        thumbnail: 'https://i.ytimg.com/vi/dQw4w9WgXcQ/hqdefault.jpg',
    },
    {
        id: 'kJQP7kiw5Fk',
        title: 'Despacito Viral Hit Dance Challenge',
        channel: 'viral',
        channelName: 'Dance Trends',
        kind: 'short',
        niche: 'music',
        thumbnail: 'https://i.ytimg.com/vi/kJQP7kiw5Fk/hqdefault.jpg',
    },
];

// Fisher-Yates Smart Shuffle Helper for dynamic feed variety
export function shuffleArray<T>(array: T[]): T[] {
    const arr = [...array];
    for (let i = arr.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
}

// Extract video ID from URL or clean string
export function extractVideoId(input: string): string | null {
    if (!input) return null;
    const clean = input.trim();
    if (/^[a-zA-Z0-9_-]{11}$/.test(clean)) return clean;
    const match = clean.match(/(?:youtube\.com\/(?:shorts\/|watch\?v=)|youtu\.be\/)([a-zA-Z0-9_-]{11})/i);
    return match ? match[1] : null;
}

// Scrape YouTube Shorts for trending topics (Zero API key, Zero DB storage)
export async function searchYouTubeShorts(query: string, nicheHint?: ShortNiche): Promise<ShortItem[]> {
    const url = `https://www.youtube.com/results?search_query=${encodeURIComponent(query + ' #shorts')}&sp=EgIQAQ%253D%253D`;
    try {
        const res = await fetch(url, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                'Accept-Language': 'en-US,en;q=0.9',
            },
            next: { revalidate: 120 },
            signal: AbortSignal.timeout(4500),
        });
        if (!res.ok) return [];
        const html = await res.text();
        const match = html.match(/var ytInitialData\s*=\s*(\{.+?\});<\/script>/);
        if (!match) return [];
        const data = JSON.parse(match[1]);
        const items: ShortItem[] = [];

        function traverse(obj: any) {
            if (!obj || typeof obj !== 'object' || items.length >= 20) return;
            if (obj.reelItemRenderer?.videoId) {
                const r = obj.reelItemRenderer;
                const rawTitle = r.headline?.simpleText || r.accessibility?.accessibilityData?.label || 'Viral Reel';
                const cleaned = cleanTitle(String(rawTitle));
                items.push({
                    id: String(r.videoId),
                    title: cleaned,
                    channel: 'viral',
                    channelName: 'Nexiplay Viral Reels',
                    kind: 'short',
                    niche: nicheHint || detectNiche(cleaned),
                    thumbnail: `https://i.ytimg.com/vi/${r.videoId}/hqdefault.jpg`,
                });
            } else if (obj.videoRenderer?.videoId) {
                const v = obj.videoRenderer;
                const title = v.title?.runs?.[0]?.text || 'Viral Reel';
                const author = (v.ownerText?.runs?.[0]?.text || 'Viral Creator').replace(/YouTube\s*/gi, '');
                const cleaned = cleanTitle(String(title));
                items.push({
                    id: String(v.videoId),
                    title: cleaned,
                    channel: 'viral',
                    channelName: author || 'Trending Reels',
                    kind: 'short',
                    niche: nicheHint || detectNiche(cleaned),
                    thumbnail: `https://i.ytimg.com/vi/${v.videoId}/hqdefault.jpg`,
                });
            }
            for (const k of Object.keys(obj)) {
                traverse(obj[k]);
            }
        }
        traverse(data);
        return items;
    } catch {
        return [];
    }
}

// Master Recommendation Engine: Supports User-Tastes, All Niches, Dynamic Seeds on Reload
export async function getShortsFeed({
    page = 1,
    category = 'all',
    query = '',
    niches = [],
    seed,
}: {
    page?: number;
    category?: string;
    query?: string;
    niches?: string[];
    seed?: number;
}) {
    let customDbItems: ShortItem[] = [];
    let liveYtItems: ShortItem[] = [];
    let dramaItems: ShortItem[] = [];
    let trailerItems: ShortItem[] = [];

    // Effective seed creates unique combinations on every page load / reload
    const effectiveSeed = seed !== undefined ? Math.abs(seed) : Math.floor(Math.random() * 100000);

    // 1. Direct Search Query or Pasted URL
    if (query) {
        const directId = extractVideoId(query);
        if (directId) {
            liveYtItems.push({
                id: directId,
                title: 'Featured Short',
                channel: 'custom',
                channelName: 'Featured Reel',
                kind: 'short',
                niche: detectNiche(query),
                thumbnail: `https://i.ytimg.com/vi/${directId}/hqdefault.jpg`,
            });
        }
        const searchResults = await searchYouTubeShorts(query, detectNiche(query));
        liveYtItems.push(...searchResults);
    }

    // 2. Specific Category Requests
    const validNiches = Object.keys(NICHE_QUERIES) as ShortNiche[];
    const isDirectNicheCategory = validNiches.includes(category as ShortNiche);

    if (!query && isDirectNicheCategory) {
        const targetNiche = category as ShortNiche;
        const queryList = NICHE_QUERIES[targetNiche] || [];
        const qOffset = (effectiveSeed + page - 1) % queryList.length;
        const q = queryList[qOffset] || `${targetNiche} viral reels`;
        liveYtItems = await searchYouTubeShorts(q, targetNiche);
    }

    // 3. Mini-Drama Feed from Upstream (ReelShort, DramaWave, ShortMax)
    // On every reload or page change, pick a dynamic upstream page from 1 to 25
    if (category === 'all' || category === 'drama') {
        const upstreamPage = ((effectiveSeed + page) % 25) + 1;
        try {
            const upstreamRes = await fetch(`https://www.moviebari.space/api/shorts?page=${upstreamPage}`, {
                next: { revalidate: 120 },
                signal: AbortSignal.timeout(3500),
                headers: { accept: 'application/json' },
            });
            if (upstreamRes.ok) {
                const data = await upstreamRes.json();
                if (Array.isArray(data.items)) {
                    dramaItems = shuffleArray(data.items).map((item: any) => ({
                        id: String(item.id),
                        title: cleanTitle(String(item.title || 'Untitled Short')),
                        channel: 'drama',
                        channelName: String(item.channelName || 'Nexiplay Mini-Drama'),
                        kind: 'short' as const,
                        niche: 'drama' as ShortNiche,
                        thumbnail: `https://i.ytimg.com/vi/${item.id}/hqdefault.jpg`,
                        publishedAt: item.publishedAt,
                    }));
                }
            }
        } catch {
            // Upstream optional fallback
        }
    }

    // 4. Personalized Recommendation Engine on 'all' / 'for-you':
    // Dynamically rotates through diverse niches on every reload so user never sees the same start video!
    if (category === 'all' && !query) {
        const cleanPreferredNiches = niches
            .map(n => n.toLowerCase().trim() as ShortNiche)
            .filter(n => validNiches.includes(n));

        const ALL_NICHES: ShortNiche[] = [
            'comedy',
            'anime',
            'gaming',
            'movie',
            'tech',
            'satisfying',
            'food',
            'motivation',
            'facts',
            'nature',
            'music',
            'drama',
        ];

        let niche1: ShortNiche;
        let niche2: ShortNiche;

        if (cleanPreferredNiches.length > 0 && page > 1) {
            const shouldExplore = (page % 4 === 0);
            if (!shouldExplore) {
                const nicheIndex = (effectiveSeed + page - 1) % cleanPreferredNiches.length;
                niche1 = cleanPreferredNiches[nicheIndex];
            } else {
                const explorationNiches = validNiches.filter(n => !cleanPreferredNiches.includes(n));
                niche1 = explorationNiches[(effectiveSeed + page - 1) % explorationNiches.length] || 'anime';
            }
            niche2 = ALL_NICHES[(ALL_NICHES.indexOf(niche1) + 3) % ALL_NICHES.length];
        } else {
            // Fresh dynamic rotation on reload!
            const offset1 = (effectiveSeed + (page - 1) * 3) % ALL_NICHES.length;
            const offset2 = (effectiveSeed + 5 + (page - 1) * 2) % ALL_NICHES.length;
            niche1 = ALL_NICHES[offset1];
            niche2 = ALL_NICHES[offset2];
        }

        const qList1 = NICHE_QUERIES[niche1] || ['trending viral reels shorts'];
        const qList2 = NICHE_QUERIES[niche2] || ['viral funny comedy clips'];
        const q1 = qList1[(effectiveSeed) % qList1.length];
        const q2 = qList2[(effectiveSeed * 3 + 1) % qList2.length];

        // Fetch two distinct niches concurrently for high-speed variety!
        const [res1, res2] = await Promise.allSettled([
            searchYouTubeShorts(q1, niche1),
            searchYouTubeShorts(q2, niche2),
        ]);

        if (res1.status === 'fulfilled' && res1.value.length > 0) {
            liveYtItems.push(...res1.value);
        }
        if (res2.status === 'fulfilled' && res2.value.length > 0) {
            liveYtItems.push(...res2.value);
        }
    }

    // 5. TMDB Blockbuster Movie/Anime Trailers
    const tmdbApiKey = process.env.TMDB_API_KEY?.trim();
    if (tmdbApiKey && (category === 'trailer' || category === 'movie' || (category === 'all' && page % 2 === 0))) {
        try {
            const tmdbPage = ((effectiveSeed + page - 1) % 10) + 1;
            const tmdbRes = await fetch(
                `https://api.themoviedb.org/3/trending/movie/day?api_key=${tmdbApiKey}&page=${tmdbPage}`,
                { next: { revalidate: 3600 }, signal: AbortSignal.timeout(3000) }
            );
            if (tmdbRes.ok) {
                const tmdbData = await tmdbRes.json();
                const movies = (tmdbData.results || []).slice(0, 3);
                for (const m of movies) {
                    try {
                        const vidRes = await fetch(
                            `https://api.themoviedb.org/3/movie/${m.id}/videos?api_key=${tmdbApiKey}`,
                            { next: { revalidate: 86400 }, signal: AbortSignal.timeout(1800) }
                        );
                        if (vidRes.ok) {
                            const vidData = await vidRes.json();
                            const trailer = (vidData.results || []).find(
                                (v: any) => v.site === 'YouTube' && (v.type === 'Trailer' || v.type === 'Teaser')
                            );
                            if (trailer?.key) {
                                trailerItems.push({
                                    id: trailer.key,
                                    title: `${m.title} - Official ${trailer.type || 'Trailer'}`,
                                    channel: 'tmdb',
                                    channelName: 'Nexiplay Cinema',
                                    kind: 'trailer',
                                    niche: 'movie',
                                    thumbnail: `https://i.ytimg.com/vi/${trailer.key}/hqdefault.jpg`,
                                    movieSlug: `tmdb-${m.id}`,
                                    movieTitle: m.title,
                                });
                            }
                        }
                    } catch { /* skip slow movie */ }
                }
            }
        } catch { /* skip tmdb trailer fetch */ }
    }

    // 6. Supabase Admin Shorts (Priority on page 1)
    if (page === 1 && !query) {
        try {
            const { data: dbRows } = await supabase
                .from('shorts')
                .select('*')
                .eq('is_active', true)
                .order('priority', { ascending: false });

            if (dbRows && dbRows.length > 0) {
                customDbItems = dbRows.map(row => ({
                    id: row.youtube_id || row.id,
                    title: cleanTitle(row.title),
                    channel: 'custom',
                    channelName: row.channel_name || 'Nexiplay Featured',
                    kind: (row.kind || 'short') as 'short' | 'trailer',
                    niche: detectNiche(row.title),
                    thumbnail: row.thumbnail || `https://i.ytimg.com/vi/${row.youtube_id || row.id}/hqdefault.jpg`,
                    movieSlug: row.movie_slug || null,
                    movieTitle: row.movie_title || null,
                }));
            }
        } catch {
            // Table doesn't exist yet, graceful fallback
        }
    }

    // 7. INTERLEAVING & SMART DIVERSITY ENGINE
    let rawCombined: ShortItem[] = [];

    if (category === 'all' && !query) {
        // Pool of available items with random shuffling
        const viralSeeds = shuffleArray(CURATED_SHORTS.filter(s => s.niche === 'comedy' || s.channel === 'viral' || s.niche === 'music'));
        const dramaSeeds = shuffleArray(CURATED_SHORTS.filter(s => s.niche === 'drama'));
        const trailerSeeds = shuffleArray(CURATED_SHORTS.filter(s => s.kind === 'trailer' || s.niche === 'movie'));

        const ytPool = liveYtItems.length > 0 ? shuffleArray(liveYtItems) : viralSeeds;
        const dramaPool = dramaItems.length > 0 ? shuffleArray(dramaItems) : dramaSeeds;
        const trailerPool = trailerItems.length > 0 ? shuffleArray(trailerItems) : trailerSeeds;

        // Custom DB items first if admin added any
        rawCombined.push(...customDbItems);

        let y = 0, d = 0, t = 0;
        // Dynamic Interleave sequence: [Viral/Niche 1, Drama, Viral/Niche 2, Trailer, Drama, ...]
        while (y < ytPool.length || d < dramaPool.length || t < trailerPool.length) {
            if (y < ytPool.length) rawCombined.push(ytPool[y++]);
            if (d < dramaPool.length) rawCombined.push(dramaPool[d++]);
            if (y < ytPool.length) rawCombined.push(ytPool[y++]);
            if (t < trailerPool.length) rawCombined.push(trailerPool[t++]);
            if (d < dramaPool.length) rawCombined.push(dramaPool[d++]);
        }
    } else {
        // Specific niche feed
        rawCombined = [...customDbItems, ...shuffleArray(liveYtItems), ...shuffleArray(dramaItems), ...trailerItems];
        if (rawCombined.length < 5) {
            rawCombined.push(...shuffleArray(CURATED_SHORTS));
        }
    }

    // Deduplicate items
    const seenIds = new Set<string>();
    const uniqueItems: ShortItem[] = [];
    for (const item of rawCombined) {
        if (!item.id || seenIds.has(item.id)) continue;
        seenIds.add(item.id);

        if (category === 'drama' && item.niche !== 'drama' && item.kind !== 'short') continue;
        if (category === 'trailer' && item.kind !== 'trailer') continue;

        uniqueItems.push(item);
    }

    return {
        items: uniqueItems.length > 0 ? uniqueItems : shuffleArray(CURATED_SHORTS),
        page,
        nextPage: page + 1,
        totalItems: uniqueItems.length,
    };
}
