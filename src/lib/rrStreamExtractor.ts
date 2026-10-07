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
            }
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

export interface ExtractedRRStream {
    success: boolean;
    m3u8Url?: string;
    cookies?: string;
    title?: string;
    fallbackUrl?: string;
}

/**
 * Extracts the direct .m3u8 stream and session cookies from a codedew zipper or razorshell embed URL.
 */
export async function extractRRStream(rawUrl: string): Promise<ExtractedRRStream> {
    if (!rawUrl) {
        return { success: false };
    }

    const cleanUrl = rawUrl.trim();

    // If it's already an m3u8 or mp4
    if (cleanUrl.includes('.m3u8') || cleanUrl.includes('.mp4')) {
        return { success: true, m3u8Url: cleanUrl };
    }

    try {
        let playerEmbedUrl = cleanUrl;
        let referer = 'https://codedew.com/';

        // 1. Unwrap codedew zipper if present
        if (cleanUrl.includes('codedew.com/zipper')) {
            const zipperRes = await fetch(cleanUrl, {
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                    'Referer': 'https://rareanimes.net/'
                }
            });

            if (zipperRes.ok) {
                const zipperHtml = await zipperRes.text();
                const iframeMatch = zipperHtml.match(/<iframe[^>]+src=["']([^"']+)["']/i);
                if (iframeMatch && iframeMatch[1]) {
                    playerEmbedUrl = iframeMatch[1];
                }
            }
        }

        // 2. Fetch the player embed HTML
        const embedRes = await fetch(playerEmbedUrl, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                'Referer': referer
            }
        });

        if (!embedRes.ok) {
            return { success: false, fallbackUrl: playerEmbedUrl };
        }

        const rawCookies = embedRes.headers.get('set-cookie') || '';
        const cookies = rawCookies
            .split(/,(?=\s*[a-zA-Z0-9_-]+=)/)
            .map(c => c.split(';')[0].trim())
            .join('; ');

        const html = await embedRes.text();
        const jcMatch = html.match(/_juicycodes\([\s\S]*?\)/);

        if (!jcMatch) {
            // No juicycodes found, fallback to embed URL
            return { success: false, fallbackUrl: playerEmbedUrl };
        }

        // 3. Deobfuscate using VM to obtain direct m3u8 source URL
        const playerJs = await getPlayerJs();
        if (!playerJs) {
            return { success: false, fallbackUrl: playerEmbedUrl };
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
                const match = code.match(/https:\\\/\\\/[^"]+\.m3u8/);
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
                cookies,
                title: streamTitle
            };
        }

        return { success: false, fallbackUrl: playerEmbedUrl };
    } catch (err: any) {
        console.error('[RR Stream Extractor Error]:', err.message);
        return { success: false, fallbackUrl: cleanUrl };
    }
}
