import vm from 'vm';

let cachedPlayerJs: string | null = null;
let lastPlayerJsFetch = 0;

async function getPlayerJs(): Promise<string> {
    const now = Date.now();
    // Cache for 1 hour
    if (cachedPlayerJs && now - lastPlayerJsFetch < 3600000) {
        return cachedPlayerJs;
    }
    try {
        const res = await fetch('https://argon.razorshell.space/assets/players/jwplayer/player.js', {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                'Referer': 'https://argon.razorshell.space/'
            },
            signal: AbortSignal.timeout(7000)
        });
        if (res.ok) {
            cachedPlayerJs = await res.text();
            lastPlayerJsFetch = now;
            return cachedPlayerJs;
        }
    } catch (e: any) {
        console.warn('[RR Extractor] Failed to fetch player.js:', e.message);
    }
    return cachedPlayerJs || '';
}

function pickBestZipperFromHtml(chunk: string): string | null {
    const linkRegex = /<a\b[^>]*href=["'](https?:\/\/[^"']*zipper\/[^"']*)["'][^>]*>([\s\S]*?)<\/a>/gi;
    const links: { href: string; label: string }[] = [];
    let m: RegExpExecArray | null;
    while ((m = linkRegex.exec(chunk)) !== null) {
        const href = m[1].replace(/&amp;/g, '&').replace(/&#038;/g, '&').trim();
        const label = m[2].replace(/<[^>]+>/g, '').trim().toLowerCase();
        if (href) links.push({ href, label });
    }
    if (links.length === 0) return null;
    return (
        links.find(l => l.label.includes('watchnow'))?.href ||
        links.find(l => l.label.includes('watchmultiquality') || l.label.includes('watchmulti'))?.href ||
        links.find(l => l.label.includes('watch') || l.label.includes('stream') || l.label.includes('player') || l.label.includes('online'))?.href ||
        links.find(l => !/hubcloud|mega|dlbeta|gdrive|drive|japanese|hepburn/.test(l.label))?.href ||
        links[0].href
    );
}

function decodeJuicyCodesConfig(embedHtml: string): string | null {
    try {
        const jcMatch = embedHtml.match(/_juicycodes\(([\s\S]*?)\)/);
        if (!jcMatch) return null;
        const rawArg = jcMatch[1].replace(/["'\s+]/g, '');
        if (rawArg.length <= 3) return null;

        const bodyPart = rawArg.slice(0, -3);
        const saltPart = rawArg.slice(-3);
        let saltStr = '';
        for (const ch of saltPart) {
            saltStr += (ch.charCodeAt(0) - 100).toString();
        }
        const salt = parseInt(saltStr, 10);
        if (Number.isNaN(salt)) return null;

        const b64 = bodyPart.replace(/_/g, '+').replace(/-/g, '/');
        const decodedB64 = Buffer.from(b64, 'base64').toString('binary');
        const rot13 = decodedB64.replace(/[a-zA-Z]/g, (c) => {
            const base = c <= 'Z' ? 65 : 97;
            return String.fromCharCode(((c.charCodeAt(0) - base + 13) % 26) + base);
        });

        const symbols = ['`', '%', '-', '+', '*', '$', '!', '_', '^', '='];
        let digits = '';
        for (const ch of rot13) {
            const idx = symbols.indexOf(ch);
            if (idx >= 0) digits += idx.toString();
        }

        let out = '';
        for (let i = 0; i + 4 <= digits.length; i += 4) {
            const chunk = parseInt(digits.slice(i, i + 4), 10);
            out += String.fromCharCode((chunk % 1000) - salt);
        }
        return out || null;
    } catch {
        return null;
    }
}

/**
 * Live searches RareAnimes for the anime title and season, returning the post URL.
 */
export async function liveSearchRareAnimesPost(title: string, seasonNum: number = 1): Promise<string | null> {
    try {
        const cleanTitle = title
            .replace(/\([^)]*\)/g, '')
            .replace(/Season\s*\d+(?:-\d+)?/gi, '')
            .replace(/Hindi(?:\s*Dub(?:bed)?)?/gi, '')
            .replace(/Dual\s*Audio/gi, '')
            .trim();
        const searchUrl = `https://www.rareanimes.fans/?s=${encodeURIComponent(cleanTitle)}`;
        
        const res = await fetch(searchUrl, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
                'Referer': 'https://www.rareanimes.fans/'
            },
            signal: AbortSignal.timeout(8000)
        });

        if (!res.ok) return null;
        const html = await res.text();

        const articleRegex = /<a\b[^>]*href=["'](https?:\/\/(?:www\.)?(?:rareanimes|raretoons)\.[a-z]+\/[^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi;
        let m: RegExpExecArray | null;
        const candidates: { url: string; title: string; score: number }[] = [];

        while ((m = articleRegex.exec(html)) !== null) {
            const href = m[1].trim();
            const linkText = m[2].replace(/<[^>]+>/g, '').trim().toLowerCase();
            if (href.includes('/category/') || href.includes('/tag/') || href.includes('/page/') || href === 'https://www.rareanimes.fans/' || href === 'https://rareanimes.fans/') {
                continue;
            }

            let score = 0;
            const seasonRegex = new RegExp(`season\\s*0*${seasonNum}\\b`, 'i');
            if (seasonRegex.test(linkText) || seasonRegex.test(href)) {
                score += 10;
            }
            if (linkText.includes('hindi') || href.includes('hindi')) {
                score += 5;
            }
            if (linkText.includes('dub') || href.includes('dub')) {
                score += 3;
            }
            candidates.push({ url: href, title: linkText, score });
        }

        candidates.sort((a, b) => b.score - a.score);
        return candidates[0]?.url || null;
    } catch (e: any) {
        console.warn('[RR Extractor Live Search Warning]:', e.message);
        return null;
    }
}

export interface ExtractedRRStream {
    success: boolean;
    m3u8Url?: string;
    embedUrl?: string;
    cookies?: string;
    title?: string;
}

/**
 * Extracts the direct .m3u8 stream and session cookies from:
 * 1. A rareanimes article post page (e.g. https://www.rareanimes.mov/hindi/.../)
 * 2. A codedew zipper link (e.g. https://codedew.com/zipper/?url=...)
 * 3. An argon razorshell embed URL (e.g. https://argon.razorshell.space/embed/...)
 * 4. A direct .m3u8 playlist URL
 * 5. Live RareAnimes search fallback when rawUrl is invalid/empty.
 */
export async function extractRRStream(
    rawUrl?: string | null,
    epNum: number = 1,
    seasonNum: number = 1,
    animeTitle?: string
): Promise<ExtractedRRStream> {
    let cleanUrl = (rawUrl || '').trim();

    // 0. If it's already an m3u8 or mp4
    if (cleanUrl.includes('.m3u8') || cleanUrl.includes('.mp4')) {
        return { success: true, m3u8Url: cleanUrl, embedUrl: cleanUrl };
    }

    // If cleanUrl is empty but animeTitle is provided, try live search
    if (!cleanUrl && animeTitle) {
        const foundUrl = await liveSearchRareAnimesPost(animeTitle, seasonNum);
        if (foundUrl) {
            cleanUrl = foundUrl;
        }
    }

    if (!cleanUrl) {
        return { success: false };
    }

    try {
        let currentTarget = cleanUrl;
        let matchedExactEpisodeFromPost = false;

        // 1. If it's a rareanimes blog post, find the episode zipper link
        if (currentTarget.includes('rareanimes.') || currentTarget.includes('raretoons.') || (!currentTarget.includes('codedew.com/zipper') && !currentTarget.includes('razorshell.space'))) {
            const baseCandidates: string[] = [];
            const urlSeasonMatch = currentTarget.match(/season-0*(\d+)\b/i);
            if (urlSeasonMatch && parseInt(urlSeasonMatch[1], 10) !== seasonNum) {
                baseCandidates.push(currentTarget.replace(/season-0*\d+\b/i, `season-${seasonNum}`));
                const paddedSeason = String(seasonNum).padStart(2, '0');
                if (paddedSeason !== String(seasonNum)) {
                    baseCandidates.push(currentTarget.replace(/season-0*\d+\b/i, `season-${paddedSeason}`));
                }
            }
            baseCandidates.push(currentTarget);
            const postCandidates: string[] = [];
            for (const u of baseCandidates) {
                if (/rareanimes\.net/i.test(u)) {
                    postCandidates.push(u.replace(/https?:\/\/(?:www\.)?rareanimes\.net/i, 'https://www.rareanimes.fans'));
                }
                postCandidates.push(u);
            }

            for (const candidatePostUrl of Array.from(new Set(postCandidates))) {
                try {
                    const postRes = await fetch(candidatePostUrl, {
                        headers: {
                            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
                            'Referer': 'https://rareanimes.net/'
                        },
                        signal: AbortSignal.timeout(8000)
                    });

                    if (postRes.ok) {
                        const postHtml = await postRes.text();
                        const epNumStr = String(epNum);
                        const padded = epNumStr.padStart(2, '0');
                        const epHeaderRegex = new RegExp(`(?:Episode|Ep\\.?)\\s*(?:0*${epNumStr}|${padded})\\b`, 'gi');
                        const anyEpHeaderRegex = /(?:Episode|Ep\.?)\s*0*(\d+)\b/gi;
                        let matchedZipper: string | null = null;
                        let em: RegExpExecArray | null;
                        while ((em = epHeaderRegex.exec(postHtml)) !== null) {
                            const prefix = postHtml.substring(Math.max(0, em.index - 20), em.index).toLowerCase();
                            if (prefix.includes('href=') || prefix.includes('url=')) continue;

                            const maxWindowEnd = Math.min(postHtml.length, em.index + 2500);
                            let windowEnd = maxWindowEnd;
                            anyEpHeaderRegex.lastIndex = em.index + em[0].length;
                            let nextEpMatch: RegExpExecArray | null;
                            while ((nextEpMatch = anyEpHeaderRegex.exec(postHtml)) !== null) {
                                if (nextEpMatch.index >= maxWindowEnd) break;
                                const nextPrefix = postHtml.substring(Math.max(0, nextEpMatch.index - 20), nextEpMatch.index).toLowerCase();
                                if (nextPrefix.includes('href=') || nextPrefix.includes('url=')) continue;
                                const nextNum = parseInt(nextEpMatch[1], 10);
                                if (nextNum !== epNum) {
                                    windowEnd = nextEpMatch.index;
                                    break;
                                }
                            }

                            const subHtml = postHtml.substring(em.index, windowEnd);
                            const picked = pickBestZipperFromHtml(subHtml);
                            if (picked) {
                                matchedZipper = picked;
                                matchedExactEpisodeFromPost = true;
                                break;
                            }
                        }

                        if (!matchedZipper) {
                            matchedZipper = pickBestZipperFromHtml(postHtml);
                        }

                        if (!matchedZipper) {
                            const firstZip = postHtml.match(/href=["'](https?:\/\/[^"']*codedew\.com\/zipper\/[^"']*)["']/i);
                            if (firstZip) {
                                matchedZipper = firstZip[1].replace(/&amp;/g, '&');
                            }
                        }

                        if (matchedZipper) {
                            currentTarget = matchedZipper;
                            break;
                        }
                    }
                } catch (err: any) {
                    console.warn('[RR Extractor Post Resolve Warning]:', err.message);
                }
            }
        }

        // 2. Unwrap codedew zipper if present
        let playerEmbedUrl = currentTarget;
        if (currentTarget.includes('codedew.com/zipper') || currentTarget.includes('/zipper/') || currentTarget.includes('streambeta')) {
            try {
                const zipperRes = await fetch(currentTarget, {
                    headers: {
                        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
                        'Referer': 'https://rareanimes.net/'
                    },
                    signal: AbortSignal.timeout(8000)
                });

                if (zipperRes.ok) {
                    const zipperHtml = await zipperRes.text();

                    // Check if zipper resolved to a direct stream player (e.g. streambeta / Cloudflare worker stream)
                    const directStreamMatch = zipperHtml.match(/"stream_url"\s*:\s*"([^"]+)"/);
                    if (directStreamMatch) {
                        return {
                            success: true,
                            m3u8Url: directStreamMatch[1].replace(/\\\//g, '/'),
                            embedUrl: zipperRes.url || currentTarget,
                            cookies: '',
                            title: ''
                        };
                    }

                    const iframeMatch = zipperHtml.match(/<iframe[^>]+src=["']([^"']+)["']/i);
                    const firstIframe = iframeMatch?.[1] || '';
                    let baseEmbedHost = 'argon.razorshell.space';
                    if (firstIframe) {
                        try { baseEmbedHost = new URL(firstIframe).host; } catch {}
                    }

                    // Match (season, episode) in Codedew's relatedData JSON array
                    const objRegex = /\{[^{}]+\}/g;
                    const epObjects: { id: string; s: number | null; e: number }[] = [];
                    let om: RegExpExecArray | null;
                    while ((om = objRegex.exec(zipperHtml)) !== null) {
                        const block = om[0];
                        const idM = block.match(/"(?:id|fid)"\s*:\s*"([A-Za-z0-9_-]+)"/);
                        const sM = block.match(/"(?:s|season_num)"\s*:\s*(\d+)/);
                        const eM = block.match(/"(?:e|episode_num)"\s*:\s*(\d+)/);
                        if (idM && eM && !idM[1].startsWith('sb_')) {
                            epObjects.push({
                                id: idM[1],
                                s: sM ? parseInt(sM[1], 10) : null,
                                e: parseInt(eM[1], 10)
                            });
                        }
                    }

                    const exactSeasonMatch = epObjects.find(o => o.s === seasonNum && o.e === epNum);
                    if (exactSeasonMatch) {
                        playerEmbedUrl = `https://${baseEmbedHost}/embed/${exactSeasonMatch.id}`;
                    } else if (matchedExactEpisodeFromPost && firstIframe) {
                        // When zipper was already picked from the exact Episode block of the target season's post,
                        // its primary iframe IS the exact episode — do not let a wrong season's relatedData entry override it!
                        playerEmbedUrl = firstIframe;
                    } else {
                        const anySeasonMatch = epObjects.find(o => o.e === epNum);
                        if (anySeasonMatch) {
                            playerEmbedUrl = `https://${baseEmbedHost}/embed/${anySeasonMatch.id}`;
                        } else if (firstIframe) {
                            playerEmbedUrl = firstIframe;
                        }
                    }
                }
            } catch (err: any) {
                console.warn('[RR Extractor Zipper Resolve Warning]:', err.message);
            }
        }

        // Must be an embed URL to extract juicycodes from
        if (!playerEmbedUrl.includes('razorshell.space') && !playerEmbedUrl.includes('embed')) {
            // If direct embed wasn't reached but we have an anime title, try live search
            if (animeTitle && cleanUrl !== currentTarget) {
                const postUrl = await liveSearchRareAnimesPost(animeTitle, seasonNum);
                if (postUrl && postUrl !== cleanUrl) {
                    return extractRRStream(postUrl, epNum, seasonNum);
                }
            }
            return { success: false };
        }

        // 3. Fetch the player embed HTML
        const embedRes = await fetch(playerEmbedUrl, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
                'Referer': 'https://codedew.com/'
            },
            signal: AbortSignal.timeout(8000)
        });

        if (!embedRes.ok) {
            return { success: false, embedUrl: playerEmbedUrl };
        }

        const rawCookies = embedRes.headers.get('set-cookie') || '';
        const cookies = rawCookies
            .split(/,(?=\s*[a-zA-Z0-9_-]+=)/)
            .map(c => c.split(';')[0].trim())
            .join('; ');

        const html = await embedRes.text();

        // 4a. Check for direct Vidstack / streambeta playerSources
        const streamUrlMatch = html.match(/"stream_url"\s*:\s*"([^"]+)"/);
        if (streamUrlMatch) {
            const rawStreamUrl = streamUrlMatch[1].replace(/\\\//g, '/');
            return {
                success: true,
                m3u8Url: rawStreamUrl,
                embedUrl: embedRes.url || playerEmbedUrl,
                cookies,
                title: ''
            };
        }

        // 4b. Fast pure-JS JuicyCodes decoding (no external player.js fetch required)
        const decodedConfig = decodeJuicyCodesConfig(html);
        if (decodedConfig) {
            const cleanConfig = decodedConfig.replace(/\\\//g, '/');
            const directMatch = cleanConfig.match(/https?:\/\/[^\s"'<>]+\.(?:m3u8|mp4)[^\s"'<>]*/)
                || cleanConfig.match(/https?:\/\/[^\s"'<>]+\/stream\/[^\s"'<>]*/);
            const titleMatch = decodedConfig.match(/"title":"([^"]+)"/);
            if (directMatch) {
                return {
                    success: true,
                    m3u8Url: directMatch[0],
                    embedUrl: playerEmbedUrl,
                    cookies,
                    title: titleMatch?.[1] || ''
                };
            }
        }

        const jcMatch = html.match(/_juicycodes\([\s\S]*?\)/);
        if (!jcMatch) {
            return { success: false, embedUrl: playerEmbedUrl };
        }

        // 5. Fallback deobfuscate using VM to obtain direct source URL
        const playerJs = await getPlayerJs();
        if (!playerJs) {
            return { success: false, embedUrl: playerEmbedUrl };
        }

        let m3u8Url = '';
        let streamTitle = '';

        const context: any = {
            window: {},
            document: {
                getElementById: () => ({ appendChild: () => {}, innerHTML: '' }),
                querySelector: () => null,
                addEventListener: () => {}
            },
            location: { href: playerEmbedUrl },
            navigator: { userAgent: 'Mozilla/5.0' },
            eval: (code: string) => {
                const match = code.match(/https:\\\/\\\/[^"]+\.m3u8/) || code.match(/https:\\\/\\\/[^"]+\/stream\/[^"]+/);
                if (match) {
                    m3u8Url = match[0].replace(/\\\//g, '/');
                }
                const titleMatch = code.match(/"title":"([^"]+)"/);
                if (titleMatch) {
                    streamTitle = titleMatch[1];
                }
                return {};
            }
        };
        context.window = context;

        vm.createContext(context);
        try {
            vm.runInContext(playerJs, context, { timeout: 3000 });
            vm.runInContext(jcMatch[0], context, { timeout: 3000 });
        } catch {
            // Ignore runtime UI errors inside VM
        }

        if (m3u8Url) {
            return {
                success: true,
                m3u8Url,
                embedUrl: playerEmbedUrl,
                cookies,
                title: streamTitle
            };
        }

        return { success: false, embedUrl: playerEmbedUrl };
    } catch (err: any) {
        console.error('[RR Stream Extractor Error]:', err.message);
        return { success: false };
    }
}
