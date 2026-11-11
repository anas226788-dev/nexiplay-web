'use client';

/**
 * 100% Client-Side Direct Download & Stream Resolver
 * Runs directly in the user's browser — ZERO Supabase DB queries & ZERO Vercel function execution.
 */

const PARX_API_BASE = 'https://parxstream.vercel.app/api';

let parxBlockedUntil = 0;

function isParxAvailable(): boolean {
    return Date.now() >= parxBlockedUntil;
}

export interface DirectDownloadParams {
    type?: string;
    id?: string | number | null;
    title?: string | null;
    season?: number;
    episode?: number;
    quality?: string;
}

export interface DirectDownloadResult {
    success: boolean;
    url: string;
    fileName: string;
    quality: string;
    source: string;
    serverName?: string;
}

export interface DirectStreamParams {
    provider: 'cinepro' | 'animesalt' | 'movieBoxWeb' | '4khdhub';
    type?: string;
    tmdbId?: string | number | null;
    title?: string | null;
    season?: number;
    episode?: number;
}

function cleanMediaTitle(rawTitle: string): string {
    return (rawTitle || '')
        .replace(/\(?\b(?:season|s)\s*\d+(?:\s*[-–to]+\s*\d+)?\)?/gi, '')
        .replace(/\[.*?\]/g, '')
        .replace(/\(?\b(?:19|20)\d{2}\b\)?/g, '')
        .replace(/\b(?:hindi|dubbed|dual\s*audio|multi\s*audio|english|japanese|subbed|4k|1080p|720p)\b/gi, '')
        .replace(/[-–:]+$/, '')
        .replace(/\s+/g, ' ')
        .trim();
}

function normalizeForCompare(str: string): string {
    return (str || '')
        .toLowerCase()
        .replace(/[^a-z0-9\s]/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();
}

function isTitleMatch(candidateTitle: string, targetTitle: string): boolean {
    const cleanTarget = normalizeForCompare(cleanMediaTitle(targetTitle));
    const cleanCandidate = normalizeForCompare(cleanMediaTitle(candidateTitle));
    if (!cleanTarget || !cleanCandidate) return false;
    if (cleanCandidate.includes(cleanTarget) || cleanTarget.includes(cleanCandidate)) {
        return true;
    }
    const targetWords = cleanTarget.split(' ').filter(w => w.length >= 2);
    if (targetWords.length === 0) return false;
    const matchedWords = targetWords.filter(w => cleanCandidate.includes(w));
    return matchedWords.length >= Math.max(1, Math.ceil(targetWords.length * 0.7));
}

async function fetchJsonWithTimeout<T = any>(url: string, timeoutMs = 9000): Promise<T | null> {
    if (url.startsWith(PARX_API_BASE) && !isParxAvailable()) {
        return null;
    }
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    try {
        const res = await fetch(url, {
            method: 'GET',
            signal: controller.signal,
            headers: {
                Accept: 'application/json',
            },
        });
        if (url.startsWith(PARX_API_BASE) && (res.status === 402 || res.status === 403)) {
            parxBlockedUntil = Date.now() + 30 * 60 * 1000;
            return null;
        }
        if (!res.ok) return null;
        return (await res.json()) as T;
    } catch {
        return null;
    } finally {
        clearTimeout(timer);
    }
}

function extractQualityNumber(quality: string): number {
    const m = (quality || '').match(/(2160|1080|720|480|360)/);
    if (m) return parseInt(m[1], 10);
    if ((quality || '').toLowerCase().includes('4k')) return 2160;
    return 720;
}

function matchesEpisodeTitle(epTitle: string, epNum: number, seasonNum?: number): boolean {
    const t = (epTitle || '').toLowerCase();
    // Match patterns like "Episode-1", "Episode 01", "Ep 1", "E01", "S01 E01", "S1E1"
    const sPattern = seasonNum
        ? new RegExp(`\\bs0*${seasonNum}\\s*e0*${epNum}\\b`, 'i')
        : null;
    if (sPattern && sPattern.test(t)) return true;

    const epPatterns = [
        new RegExp(`\\b(?:episode|ep)[\\s\\-_.:]*0*${epNum}\\b`, 'i'),
        new RegExp(`\\be0*${epNum}\\b`, 'i'),
        new RegExp(`^0*${epNum}$`, 'i'),
    ];
    return epPatterns.some(rx => rx.test(t));
}

function pickBestDirectStream(
    streams: Array<{ server?: string; link?: string; type?: string; quality?: string }>,
    targetQualityNum: number
): { link: string; server: string } | null {
    if (!Array.isArray(streams) || streams.length === 0) return null;
    const valid = streams.filter(s => typeof s?.link === 'string' && s.link.trim().startsWith('http'));
    if (valid.length === 0) return null;

    // 1. Check if streams have explicit quality fields (like movieBoxWeb: "360", "480", "720", "1080")
    const withQuality = valid.filter(s => s.quality || /(2160|1080|720|480|360)/.test(s.server || ''));
    if (withQuality.length > 0) {
        const exact = withQuality.find(s => {
            const qStr = `${s.quality || ''} ${s.server || ''}`;
            return qStr.includes(String(targetQualityNum));
        });
        if (exact && exact.link) {
            return { link: exact.link.trim(), server: exact.server || 'Direct CDN' };
        }
    }

    // 2. Prioritize Pixeldrain ?download, Google Video Downloads, Hakunaymatata MP4, Worker CDNs
    const priorityOrder = [
        (s: any) => (s.link || '').includes('pixeldrain') && (s.link || '').includes('download'),
        (s: any) => (s.link || '').includes('googleusercontent.com') || (s.link || '').includes('googlevideo'),
        (s: any) => (s.link || '').includes('hakunaymatata.com'),
        (s: any) => (s.link || '').includes('pixeldrain'),
        (s: any) => (s.link || '').includes('workers.dev') || (s.link || '').includes('hubcloud') || (s.link || '').includes('fsl'),
        (s: any) => (s.type || '').toLowerCase() === 'mkv' || (s.type || '').toLowerCase() === 'mp4',
    ];

    for (const check of priorityOrder) {
        const found = valid.find(check);
        if (found && found.link) {
            return { link: found.link.trim(), server: found.server || 'Direct Cloud' };
        }
    }

    return { link: valid[0].link!.trim(), server: valid[0].server || 'Direct Cloud' };
}

/**
 * Resolves a direct download link from 4khdHub / HdHub4u
 */
async function resolveFromHubProvider(
    provider: '4khdhub' | 'hdhub4u',
    cleanTitle: string,
    isTv: boolean,
    seasonNum: number,
    epNum: number,
    targetQualityNum: number
): Promise<{ link: string; server: string; provider: string } | null> {
    const searchUrl = `${PARX_API_BASE}/providers/${provider}/search?q=${encodeURIComponent(cleanTitle)}&page=1`;
    const searchResults = await fetchJsonWithTimeout<Array<{ title: string; link: string }>>(searchUrl, 8000);
    if (!Array.isArray(searchResults) || searchResults.length === 0) return null;

    const matchedPost = searchResults.find(item => isTitleMatch(item.title, cleanTitle));
    if (!matchedPost?.link) return null;

    const metaUrl = `${PARX_API_BASE}/providers/${provider}/meta?link=${encodeURIComponent(matchedPost.link)}`;
    const meta = await fetchJsonWithTimeout<{
        title?: string;
        type?: string;
        linkList?: Array<{
            title?: string;
            quality?: string;
            episodesLink?: string;
            directLinks?: Array<{ title?: string; link?: string; type?: string }>;
        }>;
    }>(metaUrl, 8500);

    if (!meta?.linkList || !Array.isArray(meta.linkList) || meta.linkList.length === 0) return null;

    // Filter linkList by Season if TV/Anime
    let candidates = [...meta.linkList];
    if (isTv) {
        const seasonMatches = candidates.filter(item => {
            const t = (item.title || '').toLowerCase();
            return (
                new RegExp(`\\b(?:season|s)\\s*0*${seasonNum}\\b`, 'i').test(t) ||
                !/(?:season|s)\s*\d+/i.test(t)
            );
        });
        if (seasonMatches.length > 0) {
            candidates = seasonMatches;
        }
    }

    // Sort candidates so requested quality comes first
    const qualityStr = String(targetQualityNum);
    candidates.sort((a, b) => {
        const aHasQ = `${a.quality || ''} ${a.title || ''}`.includes(qualityStr) ? 1 : 0;
        const bHasQ = `${b.quality || ''} ${b.title || ''}`.includes(qualityStr) ? 1 : 0;
        return bHasQ - aHasQ;
    });

    for (const group of candidates.slice(0, 3)) {
        let targetPageLink: string | null = null;
        let streamType = isTv ? 'series' : 'movie';

        if (isTv) {
            // Check directLinks for matching episode first
            if (Array.isArray(group.directLinks) && group.directLinks.length > 0) {
                const epObj =
                    group.directLinks.find(d => matchesEpisodeTitle(d.title || '', epNum, seasonNum)) ||
                    (epNum >= 1 && epNum <= group.directLinks.length ? group.directLinks[epNum - 1] : null);
                if (epObj?.link) {
                    targetPageLink = epObj.link;
                    streamType = epObj.type || 'series';
                }
            }
            // Otherwise fetch episodesLink
            if (!targetPageLink && group.episodesLink) {
                const epList = await fetchJsonWithTimeout<Array<{ title?: string; link?: string }>>(
                    `${PARX_API_BASE}/providers/${provider}/episodes?url=${encodeURIComponent(group.episodesLink)}`,
                    8000
                );
                if (Array.isArray(epList) && epList.length > 0) {
                    const epObj =
                        epList.find(d => matchesEpisodeTitle(d.title || '', epNum, seasonNum)) ||
                        (epNum >= 1 && epNum <= epList.length ? epList[epNum - 1] : null);
                    if (epObj?.link) {
                        targetPageLink = epObj.link;
                    }
                }
            }
        } else {
            // Movie
            if (Array.isArray(group.directLinks) && group.directLinks.length > 0 && group.directLinks[0]?.link) {
                targetPageLink = group.directLinks[0].link;
                streamType = group.directLinks[0].type || 'movie';
            } else if (group.episodesLink) {
                targetPageLink = group.episodesLink;
                streamType = 'movie';
            }
        }

        if (!targetPageLink) continue;

        const streams = await fetchJsonWithTimeout<Array<{ server?: string; link?: string; type?: string; quality?: string }>>(
            `${PARX_API_BASE}/providers/${provider}/stream?link=${encodeURIComponent(targetPageLink)}&type=${encodeURIComponent(streamType)}`,
            9000
        );
        const best = pickBestDirectStream(streams || [], targetQualityNum);
        if (best) {
            return { ...best, provider };
        }
    }

    return null;
}

/**
 * Resolves a direct MP4 download/stream link from MovieBox Web
 */
async function resolveFromMovieBox(
    cleanTitle: string,
    isTv: boolean,
    seasonNum: number,
    epNum: number,
    targetQualityNum: number
): Promise<{ link: string; server: string; provider: string } | null> {
    const searchUrl = `${PARX_API_BASE}/providers/movieBoxWeb/search?q=${encodeURIComponent(cleanTitle)}&page=1`;
    const searchResults = await fetchJsonWithTimeout<Array<{ title: string; link: string }>>(searchUrl, 8000);
    if (!Array.isArray(searchResults) || searchResults.length === 0) return null;

    const matchedPost = searchResults.find(item => isTitleMatch(item.title, cleanTitle));
    if (!matchedPost?.link) return null;

    const meta = await fetchJsonWithTimeout<{
        linkList?: Array<{
            title?: string;
            episodesLink?: string;
            directLinks?: Array<{ title?: string; link?: string; type?: string }>;
        }>;
    }>(`${PARX_API_BASE}/providers/movieBoxWeb/meta?link=${encodeURIComponent(matchedPost.link)}`, 8000);

    if (!meta?.linkList || !Array.isArray(meta.linkList) || meta.linkList.length === 0) return null;

    // Prefer Hindi / Multi / Original track first
    const sortedGroups = [...meta.linkList].sort((a, b) => {
        const aHindi = /hindi|multi|hin/i.test(a.title || '') ? 1 : 0;
        const bHindi = /hindi|multi|hin/i.test(b.title || '') ? 1 : 0;
        return bHindi - aHindi;
    });

    const group = sortedGroups[0];
    if (!group) return null;

    let targetStreamPayload: string | null = null;
    let streamType = isTv ? 'series' : 'movie';

    if (isTv && group.episodesLink) {
        const epList = await fetchJsonWithTimeout<Array<{ title?: string; link?: string }>>(
            `${PARX_API_BASE}/providers/movieBoxWeb/episodes?url=${encodeURIComponent(group.episodesLink)}`,
            8000
        );
        if (Array.isArray(epList) && epList.length > 0) {
            const epObj =
                epList.find(d => matchesEpisodeTitle(d.title || '', epNum, seasonNum)) ||
                (epNum >= 1 && epNum <= epList.length ? epList[epNum - 1] : null);
            if (epObj?.link) {
                targetStreamPayload = epObj.link;
            }
        }
    } else if (Array.isArray(group.directLinks) && group.directLinks[0]?.link) {
        targetStreamPayload = group.directLinks[0].link;
        streamType = group.directLinks[0].type || 'movie';
    } else if (group.episodesLink) {
        targetStreamPayload = group.episodesLink;
    }

    if (!targetStreamPayload) return null;

    const streams = await fetchJsonWithTimeout<Array<{ server?: string; link?: string; type?: string; quality?: string }>>(
        `${PARX_API_BASE}/providers/movieBoxWeb/stream?link=${encodeURIComponent(targetStreamPayload)}&type=${encodeURIComponent(streamType)}`,
        8500
    );
    const best = pickBestDirectStream(streams || [], targetQualityNum);
    if (best) {
        return { ...best, provider: 'movieBoxWeb' };
    }
    return null;
}

/**
 * Main Client-Side Direct Download Resolver (Zero DB & Zero Vercel Pressure)
 */
export async function resolveClientDirectDownload(
    params: DirectDownloadParams
): Promise<DirectDownloadResult | null> {
    const rawTitle = (params.title || '').trim();
    if (!rawTitle) return null;

    // Extract season from title if not explicitly provided
    const titleSeasonMatch = rawTitle.match(/\b(?:season|s)\s*(\d+)\b/i);
    const isTv =
        params.type === 'series' ||
        params.type === 'anime' ||
        params.type === 'tv' ||
        (params.season !== undefined && params.episode !== undefined);

    const seasonNum = params.season || (titleSeasonMatch ? parseInt(titleSeasonMatch[1], 10) : 1);
    const epNum = params.episode || 1;
    const cleanTitle = cleanMediaTitle(rawTitle);
    const qualityLabel = params.quality || '720p';
    const targetQualityNum = extractQualityNumber(qualityLabel);

    const safeFileTitle = (cleanTitle || 'NexiPlay_Video').replace(/[^a-zA-Z0-9_\- ]/g, '').trim().replace(/\s+/g, '_');

    // 1. Try 4khdHub (Fastest Pixeldrain & Google Drive Direct MKV CDN for Movies, Series & Anime)
    const hub4k = await resolveFromHubProvider('4khdhub', cleanTitle, isTv, seasonNum, epNum, targetQualityNum);
    if (hub4k?.link) {
        const ext = hub4k.link.toLowerCase().includes('.mp4') ? 'mp4' : 'mkv';
        return {
            success: true,
            url: hub4k.link,
            fileName: `${safeFileTitle}${isTv ? `_S${seasonNum}E${epNum}` : ''}_${qualityLabel}.${ext}`,
            quality: qualityLabel,
            source: '4khdhub_direct',
            serverName: hub4k.server,
        };
    }

    // 2. Try MovieBox Web (Instant Direct MP4 360p/480p/720p/1080p CDN)
    const mbox = await resolveFromMovieBox(cleanTitle, isTv, seasonNum, epNum, targetQualityNum);
    if (mbox?.link) {
        return {
            success: true,
            url: mbox.link,
            fileName: `${safeFileTitle}${isTv ? `_S${seasonNum}E${epNum}` : ''}_${qualityLabel}.mp4`,
            quality: qualityLabel,
            source: 'moviebox_direct',
            serverName: mbox.server,
        };
    }

    // 3. Try HdHub4u (Backup HubCloud / Pixeldrain Direct CDN)
    const hdhub = await resolveFromHubProvider('hdhub4u', cleanTitle, isTv, seasonNum, epNum, targetQualityNum);
    if (hdhub?.link) {
        const ext = hdhub.link.toLowerCase().includes('.mp4') ? 'mp4' : 'mkv';
        return {
            success: true,
            url: hdhub.link,
            fileName: `${safeFileTitle}${isTv ? `_S${seasonNum}E${epNum}` : ''}_${qualityLabel}.${ext}`,
            quality: qualityLabel,
            source: 'hdhub4u_direct',
            serverName: hdhub.server,
        };
    }

    return null;
}

/**
 * Resolves a direct HLS (.m3u8) or MP4 stream 100% client-side in the browser
 * for special direct servers (`parx_cinepro`, `parx_animesalt`, `parx_moviebox`, `parx_4khdhub`).
 */
export async function resolveClientDirectStream(
    params: DirectStreamParams
): Promise<string | null> {
    const isTv =
        params.type === 'series' ||
        params.type === 'anime' ||
        params.type === 'tv' ||
        (params.season !== undefined && params.episode !== undefined);
    const seasonNum = params.season || 1;
    const epNum = params.episode || 1;
    const cleanTitle = cleanMediaTitle(params.title || '');

    // 1. CinePro Direct 1080p HLS (TMDB-based)
    if (params.provider === 'cinepro' && params.tmdbId) {
        const endpoint = isTv
            ? `${PARX_API_BASE}/cinepro/tv/${params.tmdbId}/${seasonNum}/${epNum}`
            : `${PARX_API_BASE}/cinepro/movie/${params.tmdbId}`;
        const data = await fetchJsonWithTimeout<{ streams?: Array<{ link?: string; type?: string }> }>(endpoint, 8000);
        const firstStream = data?.streams?.find(s => typeof s?.link === 'string' && s.link.startsWith('http'));
        if (firstStream?.link) return firstStream.link;
    }

    // 2. AnimeSalt Direct Multi-Audio HLS
    if (params.provider === 'animesalt' && cleanTitle) {
        const searchResults = await fetchJsonWithTimeout<Array<{ title: string; link: string }>>(
            `${PARX_API_BASE}/providers/animesalt/search?q=${encodeURIComponent(cleanTitle)}&page=1`,
            8000
        );
        const matched = searchResults?.find(item => isTitleMatch(item.title, cleanTitle));
        if (matched?.link) {
            const meta = await fetchJsonWithTimeout<{
                linkList?: Array<{ title?: string; episodesLink?: string }>;
            }>(`${PARX_API_BASE}/providers/animesalt/meta?link=${encodeURIComponent(matched.link)}`, 8000);

            const seasonGroup =
                meta?.linkList?.find(g => new RegExp(`\\b(?:season|s)\\s*0*${seasonNum}\\b`, 'i').test(g.title || '')) ||
                meta?.linkList?.[0];

            if (seasonGroup?.episodesLink) {
                const epList = await fetchJsonWithTimeout<Array<{ title?: string; link?: string }>>(
                    `${PARX_API_BASE}/providers/animesalt/episodes?url=${encodeURIComponent(seasonGroup.episodesLink)}`,
                    8000
                );
                const epObj =
                    epList?.find(e => matchesEpisodeTitle(e.title || '', epNum, seasonNum)) ||
                    (epList && epNum >= 1 && epNum <= epList.length ? epList[epNum - 1] : null);

                if (epObj?.link) {
                    const streams = await fetchJsonWithTimeout<Array<{ link?: string; type?: string }>>(
                        `${PARX_API_BASE}/providers/animesalt/stream?link=${encodeURIComponent(epObj.link)}&type=series`,
                        8000
                    );
                    const m3u8 = streams?.find(s => typeof s?.link === 'string' && s.link.startsWith('http'));
                    if (m3u8?.link) return m3u8.link;
                }
            }
        }
    }

    // 3. MovieBox Direct MP4 Stream
    if (params.provider === 'movieBoxWeb' && cleanTitle) {
        const res = await resolveFromMovieBox(cleanTitle, isTv, seasonNum, epNum, 1080);
        if (res?.link) return res.link;
    }

    // 4. 4khdHub Direct Cloud Stream
    if (params.provider === '4khdhub' && cleanTitle) {
        const res = await resolveFromHubProvider('4khdhub', cleanTitle, isTv, seasonNum, epNum, 1080);
        if (res?.link) return res.link;
    }

    return null;
}
