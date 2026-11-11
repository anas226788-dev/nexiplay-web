export interface AnimeDownloadResolution {
    success: boolean;
    source: 'animeheaven_direct' | 'toonplay_api';
    url: string;
    directUrl: string;
    fileName: string;
    quality: string;
    qualities?: Array<{
        quality: string;
        qualityLabel: string;
        size: string | null;
        links: {
            mega?: string | null;
            direct?: string | null;
            server?: string;
            lang?: string;
        };
    }>;
    matchedTitle?: string;
}

const CHROME_UA =
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36';

const TOONPLAY_HEADERS = {
    'User-Agent': CHROME_UA,
    'Accept': 'application/json, text/plain, */*',
    'Referer': 'https://toonplay.in/',
    'Origin': 'https://toonplay.in',
};

function cleanTitle(rawTitle: string): string {
    return (rawTitle || '')
        .replace(/\(?\b(?:season|s)\s*\d+(?:\s*[-–to]+\s*\d+)?\)?/gi, '')
        .replace(/\[.*?\]/g, '')
        .replace(/\(?\b(?:19|20)\d{2}\b\)?/g, '')
        .replace(/\b(?:hindi|dubbed|dual\s*audio|multi\s*audio|english|japanese|subbed|4k|1080p|720p)\b/gi, '')
        .replace(/[-–:]+$/, '')
        .replace(/\s+/g, ' ')
        .trim();
}

function unescapeBasic(raw: string): string {
    return (raw || '')
        .replace(/&#039;|&#x27;|&apos;/g, "'")
        .replace(/&quot;/g, '"')
        .replace(/&amp;/g, '&')
        .replace(/&rsquo;|’/g, "'");
}

function normalizeCompare(raw: string): string {
    return unescapeBasic(raw)
        .toLowerCase()
        .replace(/[^a-z0-9\s]/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();
}

export function scoreAnimeCandidate(
    candidateTitle: string,
    candidateType: string,
    targetTitle: string,
    isTv: boolean,
    season: number
): number {
    const normTarget = normalizeCompare(cleanTitle(targetTitle));
    const normCand = normalizeCompare(cleanTitle(candidateTitle));
    if (!normTarget || !normCand) return 0;

    let score = 0;
    if (normCand === normTarget) score += 120;
    else if (normCand.startsWith(normTarget)) score += 55;
    else if (normCand.includes(normTarget)) score += 45;
    else if (normTarget.includes(normCand) && normCand.length >= 4) score += 35;

    const words = normTarget.split(' ').filter((w) => w.length >= 2);
    if (words.length > 0) {
        const candWords = normCand.split(' ');
        const matched = words.filter((w) => candWords.includes(w) || normCand.includes(w)).length;
        score += Math.round((matched * 40) / words.length);
    }

    const lowerCand = candidateTitle.toLowerCase();
    const lowerTarget = targetTitle.toLowerCase();
    const cleanType = (candidateType || '').trim().toLowerCase();

    if (isTv) {
        if (cleanType === 'series' || cleanType === 'tv') score += 30;
        if (['movie', 'ova', 'special', 'ona', 'tv_short'].includes(cleanType)) score -= 45;
    } else if (cleanType === 'movie') {
        score += 30;
    }

    for (const tok of ['lego', 'chibi', 'live action', 'parody', 'recap', 'special', 'ova', 'pv']) {
        if (lowerCand.includes(tok) && !lowerTarget.includes(tok)) {
            score -= 75;
        }
    }

    if (isTv && season > 1) {
        const sRx = new RegExp(`\\b(?:season\\s*0*${season}|${season}(?:nd|rd|th)\\s*season|part\\s*0*${season}|s0*${season})\\b`, 'i');
        if (sRx.test(lowerCand)) score += 65;
    } else if (isTv && season === 1) {
        const laterRx = /\b(?:season\s*[2-9]|[2-9](?:nd|rd|th)\s*season|part\s*[2-9]|2nd\s*season)\b/i;
        if (laterRx.test(lowerCand) && !laterRx.test(lowerTarget)) score -= 55;
    }

    return score;
}

async function resolveRedirectLocation(urlStr: string, referer: string): Promise<string> {
    let cur = urlStr;
    for (let i = 0; i < 3; i++) {
        try {
            const res = await fetch(cur, {
                method: 'GET',
                redirect: 'manual',
                headers: { 'User-Agent': CHROME_UA, Referer: referer },
                signal: AbortSignal.timeout(5000),
            });
            const loc = res.headers.get('location');
            if ([301, 302, 303, 307, 308].includes(res.status) && loc) {
                cur = new URL(loc, cur).href;
                continue;
            }
            return cur;
        } catch {
            return cur;
        }
    }
    return cur;
}

async function verifyDirectMp4Size(targetUrl: string): Promise<number | null> {
    try {
        const res = await fetch(targetUrl, {
            method: 'GET',
            headers: {
                'User-Agent': CHROME_UA,
                Referer: 'https://animeheaven.me/',
                Range: 'bytes=0-63',
            },
            signal: AbortSignal.timeout(6000),
        });
        const ctype = (res.headers.get('content-type') || '').toLowerCase();
        if (!res.ok || ctype.startsWith('text/html')) return null;
        const contentRange = res.headers.get('content-range') || '';
        const rangeTotal = contentRange.includes('/') ? Number(contentRange.split('/').pop()) : NaN;
        if (!Number.isNaN(rangeTotal) && rangeTotal > 0) return rangeTotal;
        const cLen = Number(res.headers.get('content-length') || '0');
        return cLen > 0 ? cLen : null;
    } catch {
        return null;
    }
}

export async function resolveAnimeHeavenDownload(params: {
    title: string;
    isTv: boolean;
    season?: number;
    episode?: number;
    quality?: string;
}): Promise<AnimeDownloadResolution | null> {
    const clean = cleanTitle(params.title);
    if (!clean) return null;
    const sNum = params.season || 1;
    const eNum = params.episode || 1;
    const quality = params.quality || '1080p';
    const safeBase = clean.replace(/[^a-zA-Z0-9_\- ]/g, '').trim().replace(/\s+/g, '_') || 'anime';

    const queries = Array.from(
        new Set(
            [
                params.isTv && sNum > 1 ? `${clean} Season ${sNum}` : '',
                clean,
                clean.includes(':') ? clean.split(':')[0].trim() : '',
            ].filter((q) => q.length >= 2)
        )
    );

    for (const q of queries) {
        try {
            const searchUrl = `https://animeheaven.me/search.php?s=${encodeURIComponent(q)}`;
            const searchRes = await fetch(searchUrl, {
                headers: { 'User-Agent': CHROME_UA, Referer: 'https://animeheaven.me/' },
                signal: AbortSignal.timeout(7000),
            });
            if (!searchRes.ok) continue;
            const searchHtml = await searchRes.text();

            const cards: Array<{ href: string; title: string }> = [];
            const seen = new Set<string>();
            const cardRx = /<a[^>]+href=['"](anime\.php\?[^'"]+)['"][^>]*class=['"][^'"]*\bc\b[^'"]*['"][^>]*>([\s\S]*?)<\/a>/gi;
            let match: RegExpExecArray | null;
            while ((match = cardRx.exec(searchHtml)) !== null) {
                const href = match[1].trim();
                const titleText = unescapeBasic(match[2].replace(/<[^>]+>/g, ' ').trim());
                if (href && !seen.has(href)) {
                    seen.add(href);
                    cards.push({ href, title: titleText || clean });
                }
            }
            if (cards.length === 0) {
                const fallbackRx = /href=['"](anime\.php\?[^'"]+)['"]/gi;
                while ((match = fallbackRx.exec(searchHtml)) !== null) {
                    const href = match[1].trim();
                    if (href && !seen.has(href)) {
                        seen.add(href);
                        cards.push({ href, title: clean });
                    }
                }
            }
            if (cards.length === 0) continue;

            const ranked = cards
                .map((c, idx) => ({
                    ...c,
                    score:
                        scoreAnimeCandidate(c.title, params.isTv ? 'series' : 'movie', clean, params.isTv, sNum) +
                        (idx === 0 ? 20 : Math.max(0, 10 - idx)),
                }))
                .sort((a, b) => b.score - a.score);

            for (const cand of ranked.slice(0, 2)) {
                const pageUrl = `https://animeheaven.me/${cand.href}`;
                const aRes = await fetch(pageUrl, {
                    headers: { 'User-Agent': CHROME_UA, Referer: searchUrl },
                    signal: AbortSignal.timeout(7000),
                });
                if (!aRes.ok) continue;
                const animeHtml = await aRes.text();

                const eps: Array<{ key: string; num: string }> = [];
                const epRx = /gatea\(\s*["']([a-f0-9]+)["']\s*\)[\s\S]{0,300}?watch2[^>]*>\s*([^<\s]+)\s*</gi;
                while ((match = epRx.exec(animeHtml)) !== null) {
                    eps.push({ key: match[1].trim(), num: match[2].trim() });
                }
                if (eps.length === 0) continue;

                const epMatch =
                    eps.find((e) => parseInt(e.num, 10) === eNum) ||
                    (sNum === 1 && !params.isTv ? eps[eps.length - 1] : undefined);
                if (!epMatch?.key) continue;

                const gRes = await fetch('https://animeheaven.me/gate.php', {
                    headers: {
                        'User-Agent': CHROME_UA,
                        Referer: pageUrl,
                        Cookie: `key=${epMatch.key}`,
                    },
                    signal: AbortSignal.timeout(7000),
                });
                if (!gRes.ok) continue;
                const gateHtml = await gRes.text();
                const vidStart = gateHtml.toLowerCase().indexOf('<video');
                const vidEnd = vidStart !== -1 ? gateHtml.toLowerCase().indexOf('</video>', vidStart) : -1;
                const videoBlock = vidStart !== -1 && vidEnd !== -1 ? gateHtml.slice(vidStart, vidEnd) : gateHtml;

                const srcUrls: string[] = [];
                const srcRx = /<source[^>]+src=['"](https?:\/\/[^'"]+)['"]/gi;
                while ((match = srcRx.exec(videoBlock)) !== null) {
                    const u = match[1].trim();
                    if (u && !u.includes('&error') && !srcUrls.includes(u)) {
                        srcUrls.push(u);
                    }
                }

                let verifiedUrl: string | null = null;
                for (const u of srcUrls) {
                    const sz = await verifyDirectMp4Size(u);
                    if (sz !== null && sz >= 1_000_000) {
                        verifiedUrl = u;
                        break;
                    }
                }
                if (!verifiedUrl && srcUrls.length > 0) {
                    verifiedUrl = srcUrls[0];
                }

                if (verifiedUrl) {
                    return {
                        success: true,
                        source: 'animeheaven_direct',
                        url: verifiedUrl,
                        directUrl: verifiedUrl,
                        fileName: `${safeBase}${params.isTv ? `_S${sNum}E${eNum}` : ''}_${quality}.mp4`,
                        quality,
                        matchedTitle: cand.title,
                    };
                }
            }
        } catch {
            // Try next search variant
        }
    }

    return null;
}

export async function resolveAnimeSaltDownload(params: {
    title: string;
    isTv: boolean;
    season?: number;
    episode?: number;
    quality?: string;
}): Promise<AnimeDownloadResolution | null> {
    const clean = cleanTitle(params.title);
    if (!clean) return null;
    const sNum = params.season || 1;
    const eNum = params.episode || 1;
    const quality = params.quality || '720p';
    const safeBase = clean.replace(/[^a-zA-Z0-9_\- ]/g, '').trim().replace(/\s+/g, '_') || 'anime';

    const queries = Array.from(
        new Set([clean, clean.includes(':') ? clean.split(':')[0].trim() : ''].filter((q) => q.length >= 2))
    );

    for (const q of queries) {
        try {
            const sRes = await fetch(
                `https://animesalt.streamindia.co.in/api/search?q=${encodeURIComponent(q)}&page=1`,
                { headers: TOONPLAY_HEADERS, signal: AbortSignal.timeout(8000) }
            );
            if (!sRes.ok) continue;
            const sJson = await sRes.json().catch(() => ({}));
            const items: any[] = Array.isArray(sJson?.data) ? sJson.data : [];
            if (items.length === 0) continue;

            let bestItem: any = null;
            let bestScore = -Infinity;
            for (const item of items) {
                if (!item?.id || !item?.title) continue;
                const score = scoreAnimeCandidate(item.title, item.type || '', clean, params.isTv, sNum);
                if (score > bestScore) {
                    bestScore = score;
                    bestItem = item;
                }
            }
            if (!bestItem || bestScore < 20) continue;

            const infoRes = await fetch(
                `https://animesalt.streamindia.co.in/api/info?id=${encodeURIComponent(bestItem.id)}`,
                { headers: TOONPLAY_HEADERS, signal: AbortSignal.timeout(8000) }
            );
            if (!infoRes.ok) continue;
            const infoJson = await infoRes.json().catch(() => ({}));
            const seasonsList: any[] = Array.isArray(infoJson?.anime?.seasonsList) ? infoJson.anime.seasonsList : [];
            const targetSeason =
                seasonsList.find((s: any) => parseInt(String(s.season), 10) === sNum) ||
                (sNum === 1 ? seasonsList[0] : null);
            const episodes: any[] = Array.isArray(targetSeason?.episodes) ? targetSeason.episodes : [];
            const targetEp =
                episodes.find((e: any) => e.number === eNum) ||
                (eNum >= 1 && eNum <= episodes.length ? episodes[eNum - 1] : null);

            if (!targetEp?.id) continue;

            const dlRes = await fetch(
                `https://animesalt.streamindia.co.in/api/toonplay/download?id=${encodeURIComponent(targetEp.id)}`,
                { headers: TOONPLAY_HEADERS, signal: AbortSignal.timeout(8000) }
            );
            if (!dlRes.ok) continue;
            const dlJson = await dlRes.json().catch(() => ({}));
            const downloads: any[] = Array.isArray(dlJson?.downloads) ? dlJson.downloads : [];
            if (downloads.length === 0) continue;

            const resolvedQualities = await Promise.all(
                downloads.map(async (d: any) => {
                    const rawLink = String(d?.link || '').trim();
                    const finalLink =
                        rawLink.includes('animesalt.') && rawLink.includes('trdownload')
                            ? await resolveRedirectLocation(rawLink, 'https://animesalt.cx/')
                            : rawLink;
                    return {
                        quality: String(d?.quality || '720p').toLowerCase(),
                        qualityLabel: String(d?.quality || 'HD'),
                        size: d?.size || null,
                        links: {
                            mega: finalLink,
                            server: d?.server,
                            lang: d?.lang,
                        },
                    };
                })
            );

            const picked =
                resolvedQualities.find((qItem) => qItem.quality.includes(quality.toLowerCase())) ||
                resolvedQualities.find((qItem) => qItem.quality.includes('720')) ||
                resolvedQualities.find((qItem) => qItem.quality.includes('1080')) ||
                resolvedQualities[0];

            if (!picked?.links?.mega) continue;

            return {
                success: true,
                source: 'toonplay_api',
                url: picked.links.mega,
                directUrl: picked.links.mega,
                fileName: `${safeBase}${params.isTv ? `_S${sNum}E${eNum}` : ''}_${picked.qualityLabel}.mkv`,
                quality: picked.qualityLabel,
                qualities: resolvedQualities,
                matchedTitle: infoJson.anime?.title || bestItem.title,
            };
        } catch {
            // Try next query variant
        }
    }

    return null;
}
