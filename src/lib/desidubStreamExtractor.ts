export interface DesiDubServers {
    desidub?: string;
    desidub_abyss?: string;
    desidub_filemoon?: string;
    desidub_streamtape?: string;
    desidub_earnvids?: string;
    desidub_doodstream?: string;
}

export interface DesiDubStreamResult {
    success: boolean;
    title?: string;
    servers?: DesiDubServers;
    primaryUrl?: string;
    embedUrl?: string;
    directStreamUrl?: string;
    format?: string;
    error?: string;
    notFound?: boolean;
}

// In-memory LRU-like cache (2 hours TTL)
const streamCache = new Map<string, { data: DesiDubStreamResult; expiresAt: number }>();
const CACHE_TTL_MS = 2 * 60 * 60 * 1000;

function cleanString(str: string): string {
    return (str || '')
        .toLowerCase()
        .replace(/\([^)]*\)/g, '')
        .replace(/season\s*\d+(?:-\d+)?/gi, '')
        .replace(/[^a-z0-9]/g, '');
}

function cleanTitleToSlug(s: string): string {
    const t = (s || '')
        .replace(/\(.*?\)/g, '')
        .replace(/\[.*?\]/g, '')
        .replace(/Season\s*\d+/gi, '')
        .replace(/[^a-zA-Z0-9\s-]/g, '')
        .trim();
    return t.replace(/\s+/g, '-').toLowerCase().replace(/-+/g, '-').replace(/^-|-$/g, '');
}

async function getRomajiTitle(englishTitle: string): Promise<string | null> {
    try {
        const res = await fetch('https://graphql.anilist.co', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'User-Agent': 'Mozilla/5.0' },
            body: JSON.stringify({
                query: 'query ($q: String) { Media(search: $q, type: ANIME) { title { romaji } } }',
                variables: { q: englishTitle }
            }),
            signal: AbortSignal.timeout(4000)
        });
        if (res.ok) {
            const data = await res.json();
            return data?.data?.Media?.title?.romaji || null;
        }
    } catch {}
    return null;
}

/**
 * Searches DesiDubAnime for the anime post matching title or slug
 */
export async function searchDesiDubAnime(title: string, slug?: string, seasonNum: number = 1): Promise<{ id: number; slug: string; link: string; title: string } | null> {
    try {
        const cleanTitle = (title || '')
            .replace(/\([^)]*\)/g, '')
            .replace(/\[[^\]]*\]/g, '')
            .replace(/Season\s*\d+(?:-\d+)?(?:\.)?/gi, '')
            .replace(/-\d{4}$/, '')
            .replace(/\./g, ' ')
            .trim();

        const searchCandidates: string[] = [cleanTitle];
        if (slug) {
            const cleanSlug = slug.replace(/-/g, ' ').trim();
            if (cleanSlug && !searchCandidates.includes(cleanSlug)) searchCandidates.push(cleanSlug);
        }

        // Fetch Romaji title from AniList for English titles (e.g. Slime -> Tensei Shitara Slime Datta Ken)
        const romaji = await getRomajiTitle(cleanTitle);
        if (romaji && !searchCandidates.includes(romaji)) {
            searchCandidates.push(romaji);
        }

        // Keyword fallback (e.g. "Slime")
        const stopwords = new Set(['that', 'time', 'got', 'this', 'with', 'from', 'anime', 'season', 'series', 'the', 'and', 'for', 'you']);
        const keywords = cleanTitle.split(/\s+/).filter(w => w.length >= 4 && !stopwords.has(w.toLowerCase()));
        if (keywords.length > 0) {
            const kw = keywords[keywords.length - 1]; // e.g. "Slime"
            if (!searchCandidates.includes(kw)) searchCandidates.push(kw);
        }

        let animes: any[] = [];
        for (const term of searchCandidates) {
            const searchUrl = `https://www.desidubanime.me/wp-json/wp/v2/anime?search=${encodeURIComponent(term)}&per_page=10`;
            try {
                const res = await fetch(searchUrl, {
                    headers: {
                        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36',
                        'Referer': 'https://www.desidubanime.me/'
                    },
                    signal: AbortSignal.timeout(6000)
                });
                if (res.ok) {
                    const data = await res.json();
                    if (Array.isArray(data) && data.length > 0) {
                        animes = data;
                        break;
                    }
                }
            } catch {}
        }

        if (animes.length === 0) return null;

        const targetTitleClean = cleanString(cleanTitle);
        const targetSlugClean = cleanString(slug || cleanTitle);

        const seasonMarker = `season-${seasonNum}`;
        const seasonMarker2 = `${seasonNum}nd-season`;
        const seasonMarker2Short = `${seasonNum}nd-sea`;
        const seasonMarker3 = `${seasonNum}rd-season`;
        const seasonMarker3Short = `${seasonNum}rd-sea`;
        const seasonMarker4 = `${seasonNum}th-season`;
        const seasonMarker4Short = `${seasonNum}th-sea`;

        let matched = null;
        if (seasonNum > 1) {
            matched = animes.find(a => {
                const s = (a.slug || '').toLowerCase();
                const t = (a.title?.rendered || '').toLowerCase();
                return s.includes(seasonMarker) || s.includes(seasonMarker2) || s.includes(seasonMarker2Short) ||
                       s.includes(seasonMarker3) || s.includes(seasonMarker3Short) ||
                       s.includes(seasonMarker4) || s.includes(seasonMarker4Short) ||
                       t.includes(`season ${seasonNum}`) || t.includes(`${seasonNum}nd season`) || t.includes(`${seasonNum}rd season`);
            });
        } else {
            // Season 1: prefer items WITHOUT season 2, 3, 4, movie, or items with season-1
            matched = animes.find(a => {
                const s = (a.slug || '').toLowerCase();
                return (s.includes('season-1') || s.includes('1st-season') || s.includes('1st-sea')) && !s.includes('movie');
            }) || animes.find(a => {
                const s = (a.slug || '').toLowerCase();
                return !s.includes('season-') && !s.includes('2nd-') && !s.includes('3rd-') && !s.includes('4th-') && !s.includes('movie');
            });
        }

        if (!matched) {
            matched = animes.find(a => cleanString(a.slug) === targetSlugClean || cleanString(a.slug) === targetTitleClean);
        }
        if (!matched) {
            matched = animes.find(a => {
                const aTitle = cleanString(a.title?.rendered || '');
                return aTitle.includes(targetTitleClean) || targetTitleClean.includes(aTitle);
            });
        }
        if (!matched && animes.length > 0) {
            matched = animes[0];
        }

        if (matched) {
            return {
                id: matched.id,
                slug: matched.slug,
                link: matched.link,
                title: matched.title?.rendered || cleanTitle
            };
        }
    } catch (e: any) {
        console.warn('[DesiDub Extractor] Search error:', e.message);
    }
    return null;
}

/**
 * Resolves all 5 servers from a DesiDub episode watch URL or anime page
 */
export async function extractDesiDubStream(
    title: string,
    slug: string,
    seasonNum: number = 1,
    epNum: number = 1
): Promise<DesiDubStreamResult> {
    const cacheKey = `${cleanString(title)}_${seasonNum}_${epNum}`;
    const cached = streamCache.get(cacheKey);
    if (cached && cached.expiresAt > Date.now()) {
        return cached.data;
    }

    try {
        // Step 1: Find anime
        const anime = await searchDesiDubAnime(title, slug, seasonNum);
        if (!anime) {
            return {
                success: false,
                notFound: true,
                error: 'Anime not found on DesiDub Server.'
            };
        }

        // Step 2: Determine episode watch URL
        const titleSlug = cleanTitleToSlug(anime.title);
        const candidateWatchUrls = [
            `https://www.desidubanime.me/watch/${titleSlug}-episode-${epNum}/`,
            `https://www.desidubanime.me/watch/${titleSlug}-season-${seasonNum}-episode-${epNum}/`,
            `https://www.desidubanime.me/watch/${titleSlug}-${epNum}/`,
            `https://www.desidubanime.me/watch/${anime.slug}-episode-${epNum}/`,
            `https://www.desidubanime.me/watch/${anime.slug}-${epNum}/`,
            `https://www.desidubanime.me/watch/${anime.slug}-season-${seasonNum}-episode-${epNum}/`
        ];

        let targetWatchUrl: string | null = null;
        let epHtml = '';

        // Try candidates directly
        for (const candidate of candidateWatchUrls) {
            try {
                const testRes = await fetch(candidate, {
                    headers: {
                        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36',
                        'Referer': anime.link
                    },
                    signal: AbortSignal.timeout(6000)
                });
                if (testRes.ok) {
                    const html = await testRes.text();
                    if (html.includes('<iframe')) {
                        targetWatchUrl = candidate;
                        epHtml = html;
                        break;
                    }
                }
            } catch {}
        }

        // If direct candidate didn't match, fetch anime page to parse watch links
        if (!targetWatchUrl && anime.link) {
            try {
                const animeRes = await fetch(anime.link, {
                    headers: {
                        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36',
                        'Referer': 'https://www.desidubanime.me/'
                    },
                    signal: AbortSignal.timeout(8000)
                });
                if (animeRes.ok) {
                    const animeHtml = await animeRes.text();
                    const watchMatches = [...animeHtml.matchAll(/href=["'](https?:\/\/(?:www\.)?desidubanime\.me\/watch\/[^"']+)["']/gi)].map(m => m[1]);
                    const uniqueWatchUrls = [...new Set(watchMatches)];

                    // Check exact episode in page
                    const matchedEp = uniqueWatchUrls.find(u => {
                        const m = u.match(/episode-(\d+)/i) || u.match(/ep-(\d+)/i) || u.match(/-(\d+)\/?$/);
                        return m && parseInt(m[1], 10) === epNum;
                    });

                    if (matchedEp) {
                        targetWatchUrl = matchedEp;
                        const epRes = await fetch(matchedEp, {
                            headers: {
                                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36',
                                'Referer': anime.link
                            },
                            signal: AbortSignal.timeout(7000)
                        });
                        if (epRes.ok) {
                            epHtml = await epRes.text();
                        }
                    } else if (uniqueWatchUrls.length > 0) {
                        // Reconstruct slug pattern from any existing watch URL (handles paginated episodes 1-14)
                        const sample = uniqueWatchUrls[0];
                        const baseSlug = sample
                            .replace(/^https?:\/\/[^\/]+\/watch\//i, '')
                            .replace(/-episode-\d+.*$/i, '')
                            .replace(/-\d+\/?$/i, '')
                            .replace(/\/$/, '');
                        if (baseSlug) {
                            const reconstructed = `https://www.desidubanime.me/watch/${baseSlug}-episode-${epNum}/`;
                            const rRes = await fetch(reconstructed, {
                                headers: {
                                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36',
                                    'Referer': anime.link
                                },
                                signal: AbortSignal.timeout(6000)
                            });
                            if (rRes.ok) {
                                const rHtml = await rRes.text();
                                if (rHtml.includes('<iframe')) {
                                    targetWatchUrl = reconstructed;
                                    epHtml = rHtml;
                                }
                            }
                        }
                    }
                }
            } catch {}
        }

        if (!targetWatchUrl || !epHtml) {
            return {
                success: false,
                notFound: true,
                error: `Episode ${epNum} not found on DesiDub Server.`
            };
        }

        // Step 3: Extract iframe
        const iframeMatch = epHtml.match(/<iframe[^>]+src=["']([^"']+)["']/i);
        const iframeSrc = iframeMatch ? iframeMatch[1] : null;
        if (!iframeSrc) {
            return {
                success: false,
                notFound: true,
                error: 'No video player found on this episode.'
            };
        }

        const serverMap: DesiDubServers = {};

        // Step 4: Extract 5 servers via embedhelper2.php
        if (iframeSrc.includes('filesforever.link/embed/') || iframeSrc.includes('pro.iqsmartgames.com/svid/')) {
            const sidMatch = iframeSrc.match(/(?:embed|svid)\/([a-zA-Z0-9_-]+)/);
            if (sidMatch) {
                const sid = sidMatch[1];
                const helperRes = await fetch('https://pro.iqsmartgames.com/embedhelper2.php', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
                        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36',
                        'Referer': `https://pro.iqsmartgames.com/svid/${sid}`,
                        'Origin': 'https://pro.iqsmartgames.com'
                    },
                    body: new URLSearchParams({ sid, UserFavSite: '', currentDomain: '[]' }).toString(),
                    signal: AbortSignal.timeout(8000)
                });

                if (helperRes.ok) {
                    const data = await helperRes.json() as any;
                    if (data?.mresult) {
                        const decoded = Buffer.from(data.mresult, 'base64').toString('utf8');
                        const ids = JSON.parse(decoded);
                        const sources = data.sources || {};

                        // 1. Filemoon (Primary high-speed clean embed)
                        if (ids.flmn && sources.flmn) {
                            serverMap.desidub_filemoon = `${sources.flmn.siteUrl}${ids.flmn}`;
                        }
                        // 2. Abyss (Routed through Clean Proxy to prevent abyss.to marketing redirect)
                        if (ids.abys && sources.abys) {
                            const rawAbyss = `${sources.abys.siteUrl}${ids.abys}`;
                            serverMap.desidub_abyss = `/api/player/abyss?url=${encodeURIComponent(rawAbyss)}`;
                        }
                        // 3. Streamtape
                        if (ids.strmtp && sources.strmtp) {
                            const suffix = sources.strmtp.embed_suffix || '';
                            serverMap.desidub_streamtape = `${sources.strmtp.siteUrl}${ids.strmtp}${suffix}`;
                        }
                        // 4. Earnvids
                        if (ids.flls && sources.flls) {
                            serverMap.desidub_earnvids = `${sources.flls.siteUrl}${ids.flls}`;
                        } else if (ids.smwh && sources.smwh) {
                            serverMap.desidub_earnvids = `${sources.smwh.siteUrl}${ids.smwh}`;
                        }
                        // 5. Doodstream
                        if (ids.ddstm && sources.ddstm) {
                            serverMap.desidub_doodstream = `${sources.ddstm.siteUrl}${ids.ddstm}`;
                        }
                    }
                }
            }
        }

        if (iframeSrc.includes('abyssplayer.com') || iframeSrc.includes('abyss.to') || iframeSrc.includes('short.ink')) {
            const parts = iframeSrc.split('/').filter(Boolean);
            const id = parts[parts.length - 1];
            serverMap.desidub_abyss = `/api/player/abyss?url=${encodeURIComponent(`https://player.abyssplayer.com/${id}`)}`;
        }

        const primary = serverMap.desidub_filemoon || serverMap.desidub_abyss || serverMap.desidub_earnvids || serverMap.desidub_streamtape || serverMap.desidub_doodstream || iframeSrc;
        serverMap.desidub = primary;

        const result: DesiDubStreamResult = {
            success: true,
            title: anime.title,
            servers: serverMap,
            primaryUrl: primary,
            embedUrl: primary,
            format: 'embed'
        };

        // Cache result for 2 hours
        streamCache.set(cacheKey, { data: result, expiresAt: Date.now() + CACHE_TTL_MS });
        return result;
    } catch (e: any) {
        return {
            success: false,
            error: e.message || 'Failed to extract DesiDub stream.'
        };
    }
}
