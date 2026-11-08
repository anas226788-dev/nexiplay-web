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

        const searchUrl = `https://www.desidubanime.me/wp-json/wp/v2/anime?search=${encodeURIComponent(cleanTitle)}&per_page=10`;
        const res = await fetch(searchUrl, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36',
                'Referer': 'https://www.desidubanime.me/'
            },
            signal: AbortSignal.timeout(8000)
        });

        if (!res.ok) return null;
        const animes = (await res.json()) as any[];
        if (!Array.isArray(animes) || animes.length === 0) return null;

        const targetTitleClean = cleanString(cleanTitle);
        const targetSlugClean = cleanString(slug || cleanTitle);

        const seasonMarker = `season-${seasonNum}`;
        const seasonMarker2 = `${seasonNum}nd-season`;
        const seasonMarker3 = `${seasonNum}rd-season`;
        const seasonMarker4 = `${seasonNum}th-season`;

        let matched = null;
        if (seasonNum > 1) {
            matched = animes.find(a => {
                const s = (a.slug || '').toLowerCase();
                const t = (a.title?.rendered || '').toLowerCase();
                return s.includes(seasonMarker) || s.includes(seasonMarker2) || s.includes(seasonMarker3) || s.includes(seasonMarker4) ||
                       t.includes(`season ${seasonNum}`) || t.includes(`${seasonNum}nd season`) || t.includes(`${seasonNum}rd season`);
            });
        } else {
            // Season 1: prefer items WITHOUT season 2, 3, 4, movie, or items with season-1
            matched = animes.find(a => {
                const s = (a.slug || '').toLowerCase();
                return (s.includes('season-1') || s.includes('1st-season')) && !s.includes('movie');
            }) || animes.find(a => {
                const s = (a.slug || '').toLowerCase();
                return !s.includes('season-') && !s.includes('2nd-') && !s.includes('3rd-') && !s.includes('movie');
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
        // DesiDub watch URL convention: https://www.desidubanime.me/watch/{slug}-episode-{epNum}/
        const candidateWatchUrls = [
            `https://www.desidubanime.me/watch/${anime.slug}-episode-${epNum}/`,
            `https://www.desidubanime.me/watch/${anime.slug}-${epNum}/`,
            `https://www.desidubanime.me/watch/${anime.slug}-season-${seasonNum}-episode-${epNum}/`
        ];

        let targetWatchUrl: string | null = null;
        let epHtml = '';

        // Try candidate 1 directly (fastest)
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
        if (!targetWatchUrl) {
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

                        // 1. Abyss
                        if (ids.abys && sources.abys) {
                            serverMap.desidub_abyss = `${sources.abys.siteUrl}${ids.abys}`;
                        }
                        // 2. Filemoon
                        if (ids.flmn && sources.flmn) {
                            serverMap.desidub_filemoon = `${sources.flmn.siteUrl}${ids.flmn}`;
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
            serverMap.desidub_abyss = `https://player.abyssplayer.com/${id}`;
        }

        const primary = serverMap.desidub_abyss || serverMap.desidub_filemoon || serverMap.desidub_streamtape || serverMap.desidub_earnvids || serverMap.desidub_doodstream || iframeSrc;
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
