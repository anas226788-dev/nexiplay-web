/**
 * SSRF and Open Proxy Prevention Utility for NexiPlay
 * Validates external URLs before fetching or proxying.
 */

const RESERVED_HOSTNAMES = new Set([
    'localhost',
    'metadata.google.internal',
    'metadata',
    'instance-data',
    'instance-data.ec2.internal',
    'kubernetes.default',
    'kubernetes.default.svc',
]);

const RESERVED_DOMAIN_SUFFIXES = [
    '.local',
    '.internal',
    '.localhost',
    '.lan',
    '.home',
    '.localdomain',
    '.corp',
    '.arpa'
];

/**
 * Checks if an IPv4 address string (in standard dotted format) is private or reserved.
 */
function isPrivateIPv4(octets: number[]): boolean {
    if (octets.length !== 4) return false;
    const [a, b, c, d] = octets;

    // 0.0.0.0/8 (Current network)
    if (a === 0) return true;

    // 10.0.0.0/8 (Private network)
    if (a === 10) return true;

    // 127.0.0.0/8 (Loopback)
    if (a === 127) return true;

    // 169.254.0.0/16 (Link-local / Cloud Metadata)
    if (a === 169 && b === 254) return true;

    // 172.16.0.0/12 (Private network: 172.16.0.0 – 172.31.255.255)
    if (a === 172 && b >= 16 && b <= 31) return true;

    // 192.168.0.0/16 (Private network)
    if (a === 192 && b === 168) return true;

    // 100.64.0.0/10 (Shared address space / Carrier-grade NAT)
    if (a === 100 && b >= 64 && b <= 127) return true;

    // 192.0.0.0/24 (IETF Protocol Assignments)
    if (a === 192 && b === 0 && c === 0) return true;

    // 192.0.2.0/24, 198.51.100.0/24, 203.0.113.0/24 (TEST-NET-1, 2, 3)
    if (a === 192 && b === 0 && c === 2) return true;
    if (a === 198 && b === 51 && c === 100) return true;
    if (a === 203 && b === 0 && c === 113) return true;

    // 224.0.0.0/4 (Multicast)
    if (a >= 224 && a <= 239) return true;

    // 240.0.0.0/4 (Reserved / Future use) & 255.255.255.255 (Broadcast)
    if (a >= 240) return true;

    return false;
}

/**
 * Parses numeric IPv4 representations (standard decimal, hex, octal, single integer).
 */
function tryParseIPv4(host: string): number[] | null {
    // Single integer IP (e.g. 2130706433 or 0x7f000001)
    if (/^\d+$/.test(host)) {
        const num = parseInt(host, 10);
        if (num >= 0 && num <= 0xffffffff) {
            return [
                (num >>> 24) & 255,
                (num >>> 16) & 255,
                (num >>> 8) & 255,
                num & 255
            ];
        }
    }
    if (/^0x[0-9a-f]+$/i.test(host)) {
        const num = parseInt(host, 16);
        if (num >= 0 && num <= 0xffffffff) {
            return [
                (num >>> 24) & 255,
                (num >>> 16) & 255,
                (num >>> 8) & 255,
                num & 255
            ];
        }
    }

    // Dotted quad notation (supports octal, hex, and decimal components)
    const parts = host.split('.');
    if (parts.length === 4) {
        const octets: number[] = [];
        for (const p of parts) {
            let val: number;
            if (/^0x[0-9a-f]+$/i.test(p)) {
                val = parseInt(p, 16);
            } else if (/^0\d+$/.test(p)) {
                val = parseInt(p, 8);
            } else if (/^\d+$/.test(p)) {
                val = parseInt(p, 10);
            } else {
                return null;
            }
            if (val < 0 || val > 255 || isNaN(val)) return null;
            octets.push(val);
        }
        return octets;
    }

    return null;
}

/**
 * Checks if an IPv6 address string is private, loopback, or cloud-internal.
 */
function isPrivateIPv6(host: string): boolean {
    const cleanHost = host.replace(/^\[|\]$/g, '').toLowerCase();

    // Loopback ::1 or unspecified ::
    if (cleanHost === '::1' || cleanHost === '::' || cleanHost === '0:0:0:0:0:0:0:1') return true;

    // Unique Local Addresses (fc00::/7)
    if (cleanHost.startsWith('fc') || cleanHost.startsWith('fd')) return true;

    // Link-local addresses (fe80::/10)
    if (cleanHost.startsWith('fe8') || cleanHost.startsWith('fe9') || cleanHost.startsWith('fea') || cleanHost.startsWith('feb')) return true;

    // IPv4-mapped IPv6 (::ffff:x.x.x.x)
    if (cleanHost.includes('::ffff:')) {
        const ip4Part = cleanHost.split('::ffff:').pop() || '';
        const octets = tryParseIPv4(ip4Part);
        if (octets && isPrivateIPv4(octets)) return true;
    }

    return false;
}

/**
 * Validates whether a hostname is safe (not private, loopback, or metadata service).
 */
export function isSafeHostname(rawHost: string): boolean {
    if (!rawHost) return false;
    const hostname = rawHost.trim().toLowerCase().split(':')[0]; // strip port

    if (RESERVED_HOSTNAMES.has(hostname)) return false;

    for (const suffix of RESERVED_DOMAIN_SUFFIXES) {
        if (hostname.endsWith(suffix)) return false;
    }

    // Check IPv4
    const ip4 = tryParseIPv4(hostname);
    if (ip4 && isPrivateIPv4(ip4)) return false;

    // Check IPv6
    if (hostname.startsWith('[') || hostname.includes(':')) {
        if (isPrivateIPv6(hostname)) return false;
    }

    return true;
}

/**
 * Comprehensive SSRF safety check on any target URL.
 */
export function validateUrlSafety(urlString: string): { safe: boolean; error?: string; parsed?: URL } {
    if (!urlString || typeof urlString !== 'string') {
        return { safe: false, error: 'Empty or invalid URL' };
    }

    let parsed: URL;
    try {
        parsed = new URL(urlString.trim());
    } catch {
        return { safe: false, error: 'Malformed URL' };
    }

    // Only allow HTTP/HTTPS
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
        return { safe: false, error: `Disallowed protocol: ${parsed.protocol}` };
    }

    // Check hostname safety against SSRF
    if (!isSafeHostname(parsed.hostname)) {
        return { safe: false, error: 'Access to private or reserved network address is forbidden' };
    }

    return { safe: true, parsed };
}

/**
 * Streaming domains and CDN hosts used by NexiPlay providers.
 */
const KNOWN_STREAMING_DOMAINS = [
    'anidb.app',
    'animerulz',
    'toonplay',
    'toonsouthindia',
    'streamindia',
    'animesalt',
    'as-cdn21.top',
    'hakunaymatata.com',
    'netfilm.world',
    'vidvault.to',
    'workers.dev',
    'streamtape.com',
    'streamta.pe',
    'dood.to',
    'doodstream.com',
    'playmogo.com',
    'ds2play',
    'voe.sx',
    'ashleyhardat.com',
    'shannoncoldalready.com',
    'voe-network',
    'abyssplayer.com',
    'abyss.to',
    'short.ink',
    'groovy.monster',
    'razorshell.space',
    'megacloud.tv',
    'rapid-cloud.co',
    'b-cdn.net',
    'bunnycdn.com',
    'googleusercontent.com',
    'drive.google.com',
    'mediafire.com',
    'terabox.com',
    'pcloud.link',
    'catbox.moe',
    'freeimage.host',
    'supabase.co'
];

const STREAMING_EXTENSIONS = /\.(m3u8|ts|m4s|mp4|webm|mkv|aac|mp3|key|vtt|srt)(?:[?#]|$)/i;

/**
 * Validates that an external URL is safe and permitted for media streaming proxying.
 */
export function isAllowedStreamingUrl(urlString: string): boolean {
    const check = validateUrlSafety(urlString);
    if (!check.safe || !check.parsed) return false;

    const hostname = check.parsed.hostname.toLowerCase();
    const pathname = check.parsed.pathname.toLowerCase();

    // 1. Check known streaming domains
    const isKnownDomain = KNOWN_STREAMING_DOMAINS.some(domain => 
        hostname === domain || hostname.endsWith(`.${domain}`)
    );
    if (isKnownDomain) return true;

    // 2. Check environment variable override
    const extraAllowed = (process.env.EXTRA_ALLOWED_STREAM_DOMAINS || '')
        .split(',')
        .map(d => d.trim().toLowerCase())
        .filter(Boolean);
    if (extraAllowed.some(domain => hostname === domain || hostname.endsWith(`.${domain}`))) {
        return true;
    }

    // 3. Or verify it is a direct streaming media playlist or segment
    if (STREAMING_EXTENSIONS.test(pathname) || check.parsed.search.includes('.m3u8') || check.parsed.search.includes('.ts')) {
        return true;
    }

    return false;
}
