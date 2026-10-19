'use client';

import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useSearchParams } from 'next/navigation';

function isValidHttpUrl(string: string | undefined | null): boolean {
    if (!string || typeof string !== 'string' || string.trim().length < 8) return false;
    try {
        const url = new URL(string.trim());
        return url.protocol === 'http:' || url.protocol === 'https:';
    } catch (_) {
        return false;
    }
}

function SafeMediaIcon({
    src,
    alt,
    fallbackEmoji,
    className = 'w-full h-full object-contain p-1',
}: {
    src?: string;
    alt: string;
    fallbackEmoji: string;
    className?: string;
}) {
    const [hasError, setHasError] = useState(false);
    const valid = !hasError && isValidHttpUrl(src);

    if (!valid) {
        return <span className="select-none text-base sm:text-lg">{fallbackEmoji}</span>;
    }

    return (
        // eslint-disable-next-line @next/next/no-img-element
        <img
            src={src!.trim()}
            alt={alt}
            loading="lazy"
            onError={() => setHasError(true)}
            className={className}
        />
    );
}

// ────────────────────────────────────────────────────────────
// PREMIUM SVG VECTOR FLAGS (100% Vector, Never renders as "BD")
// ────────────────────────────────────────────────────────────
export function CountryFlagSvg({ code, className = 'w-6 h-4' }: { code: string; className?: string }) {
    const c = (code || '').toLowerCase();

    if (c === 'all' || c === 'world') {
        return (
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" className={className}>
                <circle cx="12" cy="12" r="9" stroke="url(#globeGrad)" strokeWidth="1.8" fill="#9273F5" fillOpacity="0.15" />
                <path d="M3.6 9h16.8M3.6 15h16.8" stroke="url(#globeGrad)" strokeWidth="1.4" strokeLinecap="round" />
                <path d="M12 3a15 15 0 0 1 0 18M12 3a15 15 0 0 0 0 18" stroke="url(#globeGrad)" strokeWidth="1.4" />
                <defs>
                    <linearGradient id="globeGrad" x1="0" y1="0" x2="24" y2="24">
                        <stop offset="0%" stopColor="#9273F5" />
                        <stop offset="100%" stopColor="#57D6C0" />
                    </linearGradient>
                </defs>
            </svg>
        );
    }

    if (c === 'bd') {
        return (
            <svg viewBox="0 0 32 24" className={className}>
                <rect width="32" height="24" fill="#006A4E" rx="3" />
                <circle cx="14" cy="12" r="6.8" fill="#F42A41" />
            </svg>
        );
    }

    if (c === 'in') {
        return (
            <svg viewBox="0 0 32 24" className={className}>
                <rect width="32" height="8" fill="#FF9933" rx="3" />
                <rect y="8" width="32" height="8" fill="#FFFFFF" />
                <rect y="16" width="32" height="8" fill="#138808" rx="3" />
                <circle cx="16" cy="12" r="3.2" fill="none" stroke="#000080" strokeWidth="0.8" />
                <circle cx="16" cy="12" r="0.8" fill="#000080" />
            </svg>
        );
    }

    if (c === 'pk') {
        return (
            <svg viewBox="0 0 32 24" className={className}>
                <rect width="32" height="24" fill="#01411C" rx="3" />
                <rect width="8" height="24" fill="#FFFFFF" rx="3" />
                <circle cx="20" cy="12" r="5.5" fill="#FFFFFF" />
                <circle cx="21.5" cy="10.8" r="5" fill="#01411C" />
                <polygon points="21,7.5 22,10 24.5,10 22.5,11.5 23.2,14 21,12.5 18.8,14 19.5,11.5 17.5,10 20,10" fill="#FFFFFF" transform="scale(0.55) translate(14, 4)" />
            </svg>
        );
    }

    if (c === 'us') {
        return (
            <svg viewBox="0 0 32 24" className={className}>
                <rect width="32" height="24" fill="#B22234" rx="3" />
                <path d="M0,3.7h32M0,7.4h32M0,11.1h32M0,14.8h32M0,18.5h32M0,22.2h32" stroke="#FFFFFF" strokeWidth="1.85" />
                <rect width="13" height="13" fill="#3C3B6E" rx="2" />
                <circle cx="3" cy="3" r="0.8" fill="#FFFFFF" />
                <circle cx="7" cy="3" r="0.8" fill="#FFFFFF" />
                <circle cx="10" cy="3" r="0.8" fill="#FFFFFF" />
                <circle cx="5" cy="6.5" r="0.8" fill="#FFFFFF" />
                <circle cx="9" cy="6.5" r="0.8" fill="#FFFFFF" />
                <circle cx="3" cy="10" r="0.8" fill="#FFFFFF" />
                <circle cx="7" cy="10" r="0.8" fill="#FFFFFF" />
                <circle cx="10" cy="10" r="0.8" fill="#FFFFFF" />
            </svg>
        );
    }

    if (c === 'uk' || c === 'gb') {
        return (
            <svg viewBox="0 0 32 24" className={className}>
                <rect width="32" height="24" fill="#012169" rx="3" />
                <path d="M0,0 L32,24 M32,0 L0,24" stroke="#FFFFFF" strokeWidth="4" />
                <path d="M0,0 L32,24 M32,0 L0,24" stroke="#C8102E" strokeWidth="2" />
                <path d="M16,0 V24 M0,12 H32" stroke="#FFFFFF" strokeWidth="6" />
                <path d="M16,0 V24 M0,12 H32" stroke="#C8102E" strokeWidth="3.5" />
            </svg>
        );
    }

    if (c === 'ca') {
        return (
            <svg viewBox="0 0 32 24" className={className}>
                <rect width="32" height="24" fill="#FFFFFF" rx="3" />
                <rect width="8" height="24" fill="#D80621" rx="3" />
                <rect x="24" width="8" height="24" fill="#D80621" rx="3" />
                <path d="M16,6 L17.5,9.5 L20,9 L19,11.5 L21.5,13 L19.5,14 L19.8,16 L17.5,15 L16.8,18 H15.2 L14.5,15 L12.2,16 L12.5,14 L10.5,13 L13,11.5 L12,9 L14.5,9.5 Z" fill="#D80621" />
            </svg>
        );
    }

    if (c === 'au') {
        return (
            <svg viewBox="0 0 32 24" className={className}>
                <rect width="32" height="24" fill="#00008B" rx="3" />
                <rect width="16" height="12" fill="#012169" rx="1" />
                <path d="M0,0 L16,12 M16,0 L0,12" stroke="#FFFFFF" strokeWidth="2" />
                <path d="M0,0 L16,12 M16,0 L0,12" stroke="#C8102E" strokeWidth="1" />
                <path d="M8,0 V12 M0,6 H16" stroke="#FFFFFF" strokeWidth="3" />
                <path d="M8,0 V12 M0,6 H16" stroke="#C8102E" strokeWidth="1.8" />
                <circle cx="8" cy="18" r="2.2" fill="#FFFFFF" />
                <circle cx="24" cy="5" r="1" fill="#FFFFFF" />
                <circle cx="21" cy="9" r="1" fill="#FFFFFF" />
                <circle cx="27" cy="10" r="1" fill="#FFFFFF" />
                <circle cx="23" cy="14" r="0.8" fill="#FFFFFF" />
                <circle cx="24" cy="19" r="1.3" fill="#FFFFFF" />
            </svg>
        );
    }

    if (c === 'ae') {
        return (
            <svg viewBox="0 0 32 24" className={className}>
                <rect width="32" height="8" fill="#00732F" rx="3" />
                <rect y="8" width="32" height="8" fill="#FFFFFF" />
                <rect y="16" width="32" height="8" fill="#000000" rx="3" />
                <rect width="8" height="24" fill="#FF0000" rx="3" />
            </svg>
        );
    }

    if (c === 'sa') {
        return (
            <svg viewBox="0 0 32 24" className={className}>
                <rect width="32" height="24" fill="#006C35" rx="3" />
                <path d="M7,15 H25 M20,13 L25,15 L20,17" stroke="#FFFFFF" strokeWidth="1.2" strokeLinecap="round" />
                <path d="M9,9 Q16,8 23,9 M11,11 Q16,10 21,11" stroke="#FFFFFF" strokeWidth="1" strokeLinecap="round" />
            </svg>
        );
    }

    if (c === 'my') {
        return (
            <svg viewBox="0 0 32 24" className={className}>
                <rect width="32" height="24" fill="#CC0000" rx="3" />
                <path d="M0,3.4h32M0,6.8h32M0,10.2h32M0,13.6h32M0,17h32M0,20.4h32" stroke="#FFFFFF" strokeWidth="1.7" />
                <rect width="16" height="12" fill="#000066" rx="2" />
                <circle cx="7" cy="6" r="3.5" fill="#FFCC00" />
                <circle cx="8" cy="6" r="3" fill="#000066" />
                <circle cx="11.5" cy="6" r="2.2" fill="#FFCC00" />
            </svg>
        );
    }

    if (c === 'id') {
        return (
            <svg viewBox="0 0 32 24" className={className}>
                <rect width="32" height="12" fill="#FF0000" rx="3" />
                <rect y="12" width="32" height="12" fill="#FFFFFF" rx="3" />
            </svg>
        );
    }

    if (c === 'tr') {
        return (
            <svg viewBox="0 0 32 24" className={className}>
                <rect width="32" height="24" fill="#E30A17" rx="3" />
                <circle cx="13" cy="12" r="6" fill="#FFFFFF" />
                <circle cx="15" cy="12" r="4.8" fill="#E30A17" />
                <polygon points="19,10.5 20,11.8 21.8,11.8 20.3,12.8 20.9,14.5 19.5,13.4 18.1,14.5 18.7,12.8 17.2,11.8 19,11.8" fill="#FFFFFF" />
            </svg>
        );
    }

    if (c === 'de') {
        return (
            <svg viewBox="0 0 32 24" className={className}>
                <rect width="32" height="8" fill="#000000" rx="3" />
                <rect y="8" width="32" height="8" fill="#DD0000" />
                <rect y="16" width="32" height="8" fill="#FFCE00" rx="3" />
            </svg>
        );
    }

    if (c === 'fr') {
        return (
            <svg viewBox="0 0 32 24" className={className}>
                <rect width="11" height="24" fill="#002395" rx="3" />
                <rect x="10.5" width="11" height="24" fill="#FFFFFF" />
                <rect x="21" width="11" height="24" fill="#ED2939" rx="3" />
            </svg>
        );
    }

    if (c === 'br') {
        return (
            <svg viewBox="0 0 32 24" className={className}>
                <rect width="32" height="24" fill="#009739" rx="3" />
                <polygon points="16,3 29,12 16,21 3,12" fill="#FEDF00" />
                <circle cx="16" cy="12" r="4.8" fill="#002776" />
                <path d="M12,13 Q16,11 20,13.5" stroke="#FFFFFF" strokeWidth="0.8" fill="none" />
            </svg>
        );
    }

    // Default stylish flag badge for all other world countries
    return (
        <div className={`flex items-center justify-center font-black text-[9px] tracking-wider uppercase bg-gradient-to-br from-violet-600/35 to-indigo-900/50 text-violet-300 border border-violet-500/30 rounded shrink-0 select-none ${className}`}>
            {c.toUpperCase().slice(0, 2)}
        </div>
    );
}

// ────────────────────────────────────────────────────────────
// PREMIUM SVG CATEGORY ICONS
// ────────────────────────────────────────────────────────────
export function CategorySvgIcon({ category, className = 'w-3.5 h-3.5' }: { category: string; className?: string }) {
    const c = category.toLowerCase();

    if (c === 'all') {
        return (
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" className={className}>
                <rect x="3" y="3" width="7" height="7" rx="1.5" />
                <rect x="14" y="3" width="7" height="7" rx="1.5" />
                <rect x="14" y="14" width="7" height="7" rx="1.5" />
                <rect x="3" y="14" width="7" height="7" rx="1.5" />
            </svg>
        );
    }
    if (c.includes('entertain') || c.includes('movie')) {
        return (
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
                <rect x="2" y="4" width="20" height="16" rx="2" />
                <path d="M2 8h20M7 4v4M12 4v4M17 4v4" />
                <polygon points="10,12 16,15 10,18" fill="currentColor" stroke="none" />
            </svg>
        );
    }
    if (c.includes('news')) {
        return (
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
                <path d="M4 22h16a2 2 0 0 0 2-2V4a2 2 0 0 0-2-2H8a2 2 0 0 0-2 2v16a2 2 0 0 1-2 2Zm0 0a2 2 0 0 1-2-2v-9c0-1.1.9-2 2-2h2" />
                <path d="M18 14h-8M15 18h-5M10 6h8v4h-8z" />
            </svg>
        );
    }
    if (c.includes('sport')) {
        return (
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
                <path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6" />
                <path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18" />
                <path d="M4 22h16" />
                <path d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22" />
                <path d="M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22" />
                <path d="M18 2H6v7a6 6 0 0 0 12 0V2Z" />
            </svg>
        );
    }
    if (c.includes('music')) {
        return (
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
                <path d="M9 18V5l12-2v13" />
                <circle cx="6" cy="18" r="3" />
                <circle cx="18" cy="16" r="3" />
            </svg>
        );
    }
    if (c.includes('kid') || c.includes('toon') || c.includes('anim')) {
        return (
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
                <rect x="2" y="6" width="20" height="12" rx="4" />
                <path d="M6 12h4M8 10v4" />
                <circle cx="17" cy="10" r="1.2" fill="currentColor" />
                <circle cx="15" cy="13" r="1.2" fill="currentColor" />
            </svg>
        );
    }
    if (c.includes('relig')) {
        return (
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
                <path d="M12 2v20M7 8h10" />
            </svg>
        );
    }
    if (c.includes('cultur')) {
        return (
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
                <circle cx="12" cy="12" r="10" />
                <path d="M8 14s1.5 2 4 2 4-2 4-2" />
                <line x1="9" y1="9" x2="9.01" y2="9" strokeWidth="3" />
                <line x1="15" y1="9" x2="15.01" y2="9" strokeWidth="3" />
            </svg>
        );
    }
    if (c.includes('busin') || c.includes('econ')) {
        return (
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
                <polyline points="22 7 13.5 15.5 8.5 10.5 2 17" />
                <polyline points="16 7 22 7 22 13" />
            </svg>
        );
    }
    if (c.includes('docu')) {
        return (
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
                <circle cx="12" cy="12" r="10" />
                <circle cx="12" cy="12" r="4" />
                <line x1="4.93" y1="4.93" x2="9.17" y2="9.17" />
                <line x1="14.83" y1="14.83" x2="19.07" y2="19.07" />
            </svg>
        );
    }

    return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
            <rect x="2" y="7" width="20" height="15" rx="2" />
            <polyline points="17 2 12 7 7 2" />
        </svg>
    );
}

interface Channel {
    id: string;
    name: string;
    logo: string;
    group: string;
    country: string;
    streamUrl: string;
    youtubeLiveUrl?: string;
    isTop?: boolean;
}

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

const POPULAR_COUNTRIES = [
    { code: 'bd', label: 'Bangladesh' },
    { code: 'in', label: 'India' },
    { code: 'pk', label: 'Pakistan' },
    { code: 'us', label: 'United States' },
    { code: 'uk', label: 'United Kingdom' },
    { code: 'ca', label: 'Canada' },
    { code: 'au', label: 'Australia' },
    { code: 'ae', label: 'United Arab Emirates' },
    { code: 'sa', label: 'Saudi Arabia' },
    { code: 'my', label: 'Malaysia' },
    { code: 'id', label: 'Indonesia' },
    { code: 'tr', label: 'Turkiye' },
    { code: 'de', label: 'Germany' },
    { code: 'fr', label: 'France' },
    { code: 'br', label: 'Brazil' },
];

const ALL_WORLD_COUNTRIES = [
    { code: 'af', label: 'Afghanistan' },
    { code: 'al', label: 'Albania' },
    { code: 'dz', label: 'Algeria' },
    { code: 'ad', label: 'Andorra' },
    { code: 'ao', label: 'Angola' },
    { code: 'ar', label: 'Argentina' },
    { code: 'am', label: 'Armenia' },
    { code: 'au', label: 'Australia' },
    { code: 'at', label: 'Austria' },
    { code: 'az', label: 'Azerbaijan' },
    { code: 'bh', label: 'Bahrain' },
    { code: 'bd', label: 'Bangladesh' },
    { code: 'by', label: 'Belarus' },
    { code: 'be', label: 'Belgium' },
    { code: 'bo', label: 'Bolivia' },
    { code: 'br', label: 'Brazil' },
    { code: 'bg', label: 'Bulgaria' },
    { code: 'ca', label: 'Canada' },
    { code: 'cl', label: 'Chile' },
    { code: 'cn', label: 'China' },
    { code: 'co', label: 'Colombia' },
    { code: 'cr', label: 'Costa Rica' },
    { code: 'hr', label: 'Croatia' },
    { code: 'cy', label: 'Cyprus' },
    { code: 'cz', label: 'Czechia' },
    { code: 'dk', label: 'Denmark' },
    { code: 'ec', label: 'Ecuador' },
    { code: 'eg', label: 'Egypt' },
    { code: 'ee', label: 'Estonia' },
    { code: 'fi', label: 'Finland' },
    { code: 'fr', label: 'France' },
    { code: 'ge', label: 'Georgia' },
    { code: 'de', label: 'Germany' },
    { code: 'gh', label: 'Ghana' },
    { code: 'gr', label: 'Greece' },
    { code: 'hk', label: 'Hong Kong' },
    { code: 'hu', label: 'Hungary' },
    { code: 'is', label: 'Iceland' },
    { code: 'in', label: 'India' },
    { code: 'id', label: 'Indonesia' },
    { code: 'ir', label: 'Iran' },
    { code: 'iq', label: 'Iraq' },
    { code: 'ie', label: 'Ireland' },
    { code: 'il', label: 'Israel' },
    { code: 'it', label: 'Italy' },
    { code: 'jp', label: 'Japan' },
    { code: 'jo', label: 'Jordan' },
    { code: 'kz', label: 'Kazakhstan' },
    { code: 'ke', label: 'Kenya' },
    { code: 'kw', label: 'Kuwait' },
    { code: 'lb', label: 'Lebanon' },
    { code: 'my', label: 'Malaysia' },
    { code: 'mx', label: 'Mexico' },
    { code: 'ma', label: 'Morocco' },
    { code: 'np', label: 'Nepal' },
    { code: 'nl', label: 'Netherlands' },
    { code: 'nz', label: 'New Zealand' },
    { code: 'ng', label: 'Nigeria' },
    { code: 'no', label: 'Norway' },
    { code: 'om', label: 'Oman' },
    { code: 'pk', label: 'Pakistan' },
    { code: 'ps', label: 'Palestine' },
    { code: 'pe', label: 'Peru' },
    { code: 'ph', label: 'Philippines' },
    { code: 'pl', label: 'Poland' },
    { code: 'pt', label: 'Portugal' },
    { code: 'qa', label: 'Qatar' },
    { code: 'ro', label: 'Romania' },
    { code: 'ru', label: 'Russia' },
    { code: 'sa', label: 'Saudi Arabia' },
    { code: 'rs', label: 'Serbia' },
    { code: 'sg', label: 'Singapore' },
    { code: 'za', label: 'South Africa' },
    { code: 'kr', label: 'South Korea' },
    { code: 'es', label: 'Spain' },
    { code: 'lk', label: 'Sri Lanka' },
    { code: 'se', label: 'Sweden' },
    { code: 'ch', label: 'Switzerland' },
    { code: 'tw', label: 'Taiwan' },
    { code: 'th', label: 'Thailand' },
    { code: 'tr', label: 'Turkiye' },
    { code: 'ua', label: 'Ukraine' },
    { code: 'ae', label: 'United Arab Emirates' },
    { code: 'uk', label: 'United Kingdom' },
    { code: 'us', label: 'United States' },
    { code: 'vn', label: 'Vietnam' },
];

function parseChannelDisplay(rawName: string, defaultGroup: string = 'General') {
    let name = rawName;
    let quality = '';

    const qMatch = name.match(/\b(360p|480p|576p|720p|1080p|2160p|4k|fhd|hd)\b/i);
    if (qMatch) {
        quality = qMatch[1].toUpperCase();
    }

    name = name
        .replace(/\s*[\(\[]\s*(360p|480p|576p|720p|1080p|2160p|4k|fhd|hd|not 24\/7|geo-blocked|geo-block|part-time|backup)[^\]\)]*[\)\]]/gi, '')
        .replace(/\s*[\(\[]\s*[\)\]]/g, '')
        .trim();

    return {
        cleanName: name || rawName,
        quality: quality || 'HD',
        category: defaultGroup || 'General',
    };
}

export default function LiveTvClient() {
    const searchParams = useSearchParams();
    const paramCountry = searchParams?.get('country') || '';
    const paramChannel = searchParams?.get('ch') || searchParams?.get('play') || '';

    // Mode: 'tv' | 'radio'
    const [mode, setMode] = useState<'tv' | 'radio'>('tv');

    // Selected Country
    const [selectedCountry, setSelectedCountry] = useState<typeof POPULAR_COUNTRIES[0] | null>(() => {
        if (paramCountry) {
            const found = ALL_WORLD_COUNTRIES.find(c => c.code.toLowerCase() === paramCountry.toLowerCase());
            return found || POPULAR_COUNTRIES[0];
        }
        return POPULAR_COUNTRIES[0];
    });

    const [channels, setChannels] = useState<Channel[]>([]);
    const [selectedCategory, setSelectedCategory] = useState<string>('all');
    const [activeChannel, setActiveChannel] = useState<Channel | null>(null);
    const [isPlayerOpen, setIsPlayerOpen] = useState(false);
    const [isTvLoading, setIsTvLoading] = useState(false);
    const [tvSearch, setTvSearch] = useState('');
    const [tvStreamFailed, setTvStreamFailed] = useState(false);
    const [usingYoutubeFallback, setUsingYoutubeFallback] = useState(false);

    // Radio State
    const [radioCountry, setRadioCountry] = useState('BD');
    const [radioStations, setRadioStations] = useState<RadioStation[]>([]);
    const [activeStation, setActiveStation] = useState<RadioStation | null>(null);
    const [isRadioPlaying, setIsRadioPlaying] = useState(false);
    const [isRadioLoading, setIsRadioLoading] = useState(false);
    const [radioSearch, setRadioSearch] = useState('');
    const [radioVolume, setRadioVolume] = useState(1);
    const [isRadioMuted, setIsRadioMuted] = useState(false);

    // Refs
    const videoRef = useRef<HTMLVideoElement>(null);
    const audioRef = useRef<HTMLAudioElement>(null);
    const playerContainerRef = useRef<HTMLDivElement>(null);

    // ----------------------------------------------------
    // Load Channels
    // ----------------------------------------------------
    const loadChannels = useCallback(async (countryCode: string) => {
        setIsTvLoading(true);
        setTvStreamFailed(false);
        setUsingYoutubeFallback(false);

        try {
            const res = await fetch(`/api/live-tv/channels?country=${countryCode}`);
            const data = await res.json();

            if (data.success && Array.isArray(data.channels)) {
                setChannels(data.channels);
                setSelectedCategory('all');
                if (paramChannel) {
                    const matched = data.channels.find((c: Channel) =>
                        c.name.toLowerCase().includes(paramChannel.toLowerCase()) || c.id === paramChannel
                    );
                    if (matched) {
                        setActiveChannel(matched);
                        setIsPlayerOpen(true);
                    }
                }
            } else {
                setChannels([]);
            }
        } catch (e) {
            console.error('Error loading channels:', e);
            setChannels([]);
        } finally {
            setIsTvLoading(false);
        }
    }, [paramChannel]);

    useEffect(() => {
        if (selectedCountry) {
            loadChannels(selectedCountry.code);
        }
    }, [selectedCountry, loadChannels]);

    // ----------------------------------------------------
    // Load Radio Stations
    // ----------------------------------------------------
    const loadRadioStations = useCallback(async (cCode: string, query?: string) => {
        setIsRadioLoading(true);
        try {
            const url = query
                ? `/api/live-tv/radio?q=${encodeURIComponent(query)}`
                : `/api/live-tv/radio?country=${cCode}`;
            const res = await fetch(url);
            const data = await res.json();
            if (data.success && Array.isArray(data.stations)) {
                setRadioStations(data.stations);
            } else {
                setRadioStations([]);
            }
        } catch (e) {
            console.error('Error loading radio stations:', e);
            setRadioStations([]);
        } finally {
            setIsRadioLoading(false);
        }
    }, []);

    useEffect(() => {
        if (mode === 'radio') {
            loadRadioStations(radioCountry, radioSearch);
        }
    }, [mode, radioCountry, radioSearch, loadRadioStations]);

    // ----------------------------------------------------
    // Video Player Stream Attachment (HLS & Native)
    // ----------------------------------------------------
    useEffect(() => {
        if (!activeChannel || !isPlayerOpen || usingYoutubeFallback || !videoRef.current) return;
        const video = videoRef.current;
        let hlsInstance: any = null;
        let isCancelled = false;

        setTvStreamFailed(false);

        const playStream = () => {
            if (video.canPlayType('application/vnd.apple.mpegurl')) {
                video.src = activeChannel.streamUrl;
                video.play().catch(() => {
                    if (!isCancelled) setTvStreamFailed(true);
                });
            } else {
                const win = window as any;
                const attachHls = () => {
                    if (isCancelled || !videoRef.current) return;
                    if (win.Hls && win.Hls.isSupported()) {
                        hlsInstance = new win.Hls({
                            enableWorker: true,
                            backBufferLength: 30,
                            manifestLoadingTimeOut: 10000,
                        });
                        hlsInstance.loadSource(activeChannel.streamUrl);
                        hlsInstance.attachMedia(video);
                        hlsInstance.on(win.Hls.Events.MANIFEST_PARSED, () => {
                            if (!isCancelled) video.play().catch(() => {});
                        });
                        hlsInstance.on(win.Hls.Events.ERROR, (_event: any, data: any) => {
                            if (data.fatal) {
                                if (!isCancelled) setTvStreamFailed(true);
                                hlsInstance.destroy();
                            }
                        });
                    } else {
                        video.src = activeChannel.streamUrl;
                    }
                };

                if (win.Hls) {
                    attachHls();
                } else {
                    const script = document.createElement('script');
                    script.src = 'https://cdn.jsdelivr.net/npm/hls.js@1.5.8/dist/hls.min.js';
                    script.onload = attachHls;
                    script.onerror = () => {
                        if (!isCancelled) setTvStreamFailed(true);
                    };
                    document.head.appendChild(script);
                }
            }
        };

        playStream();

        return () => {
            isCancelled = true;
            if (hlsInstance) hlsInstance.destroy();
        };
    }, [activeChannel, isPlayerOpen, usingYoutubeFallback]);

    // ----------------------------------------------------
    // Audio Player Attachment for Radio
    // ----------------------------------------------------
    useEffect(() => {
        if (!activeStation || !audioRef.current) return;
        const audio = audioRef.current;
        audio.src = activeStation.url_resolved || activeStation.url;
        audio.volume = isRadioMuted ? 0 : radioVolume;
        audio
            .play()
            .then(() => setIsRadioPlaying(true))
            .catch(() => setIsRadioPlaying(false));
    }, [activeStation, radioVolume, isRadioMuted]);

    const handleNextChannel = () => {
        if (!activeChannel || channels.length === 0) return;
        const idx = channels.findIndex((c) => c.id === activeChannel.id);
        const nextIdx = (idx + 1) % channels.length;
        setActiveChannel(channels[nextIdx]);
        setUsingYoutubeFallback(false);
        setTvStreamFailed(false);
    };

    const handlePrevChannel = () => {
        if (!activeChannel || channels.length === 0) return;
        const idx = channels.findIndex((c) => c.id === activeChannel.id);
        const prevIdx = (idx - 1 + channels.length) % channels.length;
        setActiveChannel(channels[prevIdx]);
        setUsingYoutubeFallback(false);
        setTvStreamFailed(false);
    };

    const stopRadio = () => {
        if (audioRef.current) {
            audioRef.current.pause();
            audioRef.current.src = '';
        }
        setIsRadioPlaying(false);
        setActiveStation(null);
    };

    // Calculate dynamic categories and their channel counts
    const categoryCounts = useMemo(() => {
        const counts: Record<string, number> = {};
        channels.forEach((ch) => {
            const grp = ch.group || 'General';
            counts[grp] = (counts[grp] || 0) + 1;
        });
        return counts;
    }, [channels]);

    const availableCategories = useMemo(() => {
        const sortedCats = Object.keys(categoryCounts).sort((a, b) => categoryCounts[b] - categoryCounts[a]);
        return ['all', ...sortedCats];
    }, [categoryCounts]);

    // Filter channels based on selected category & search input
    const filteredChannels = useMemo(() => {
        return channels.filter((ch) => {
            const matchesCat =
                selectedCategory === 'all' ||
                (ch.group || 'General').toLowerCase() === selectedCategory.toLowerCase();
            const matchesSearch =
                !tvSearch ||
                ch.name.toLowerCase().includes(tvSearch.toLowerCase()) ||
                (ch.group || '').toLowerCase().includes(tvSearch.toLowerCase());
            return matchesCat && matchesSearch;
        });
    }, [channels, selectedCategory, tvSearch]);

    const handleChannelClick = (ch: Channel) => {
        setActiveChannel(ch);
        setIsPlayerOpen(true);
        setUsingYoutubeFallback(false);
        setTvStreamFailed(false);
        setTimeout(() => {
            playerContainerRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }, 100);
    };

    return (
        <div className="min-h-screen bg-[#0A0812] text-[#F4F0FA] pt-24 md:pt-28 pb-32">
            <div className="container mx-auto px-4 max-w-6xl">
                {/* ──────────────────────────────────────────────────────── */}
                {/* Nexiplay Brand Mode Switcher (Live TV vs Live Radio)      */}
                {/* ──────────────────────────────────────────────────────── */}
                <div className="flex justify-center mb-10">
                    <div className="p-1.5 rounded-full bg-[#17141F]/90 border border-white/10 shadow-np-inset inline-flex items-center gap-1.5 backdrop-blur-xl">
                        <button
                            onClick={() => setMode('tv')}
                            className={`px-6 py-2 rounded-full text-xs sm:text-sm font-bold flex items-center gap-2 transition-all duration-300 ${
                                mode === 'tv'
                                    ? 'text-white bg-gradient-to-r from-[#9273F5] to-[#5C46B2] shadow-[0_4px_16px_rgba(146,115,245,0.45)] scale-[1.02]'
                                    : 'text-[#ADA6B9] hover:text-white hover:bg-white/5'
                            }`}
                        >
                            <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24">
                                <path d="M21 6h-7.586l2.293-2.293a1 1 0 0 0-1.414-1.414L11.586 5H4a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h17a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2Zm0 13H4V7h17v12Z" />
                            </svg>
                            <span>Live TV</span>
                        </button>
                        <button
                            onClick={() => setMode('radio')}
                            className={`px-6 py-2 rounded-full text-xs sm:text-sm font-bold flex items-center gap-2 transition-all duration-300 ${
                                mode === 'radio'
                                    ? 'text-white bg-gradient-to-r from-[#9273F5] to-[#5C46B2] shadow-[0_4px_16px_rgba(146,115,245,0.45)] scale-[1.02]'
                                    : 'text-[#ADA6B9] hover:text-white hover:bg-white/5'
                            }`}
                        >
                            <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24">
                                <path d="M12 3a9 9 0 0 0-9 9v7a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7a9 9 0 0 0-9-9Zm0 2a7 7 0 0 1 7 7v1H5v-1a7 7 0 0 1 7-7Zm-7 14v-4h14v4H5Z" />
                                <circle cx="12" cy="17" r="1.5" />
                            </svg>
                            <span>Live Radio</span>
                        </button>
                    </div>
                </div>

                {/* ======================================================== */}
                {/* MODE 1: LIVE TV                                          */}
                {/* ======================================================== */}
                {mode === 'tv' && (
                    <div className="space-y-8 animate-fade-in">
                        {/* ──────────────────────────────────────────────────── */}
                        {/* Nexiplay Brand Header (Clean Modern Sans-Serif)      */}
                        {/* ──────────────────────────────────────────────────── */}
                        <div className="space-y-3">
                            <div className="inline-flex items-center gap-2.5 px-3 py-1 rounded-full bg-[#9273F5]/10 border border-[#9273F5]/25 text-[#B09AFF] text-[11px] font-bold uppercase tracking-wider">
                                <span className="w-2 h-2 rounded-full bg-[#9273F5] animate-pulse" />
                                <span>Nexiplay Broadcast Network</span>
                            </div>

                            {selectedCountry ? (
                                <div className="space-y-2">
                                    <h1 className="text-3xl sm:text-4xl md:text-5xl font-black tracking-tight text-white flex items-center gap-3.5 flex-wrap">
                                        <CountryFlagSvg code={selectedCountry.code} className="w-8 h-6 sm:w-10 sm:h-7 rounded-md shadow-md border border-white/10 shrink-0" />
                                        <span>{selectedCountry.label}</span>
                                        <span className="bg-gradient-to-r from-[#9273F5] via-[#B09AFF] to-[#57D6C0] bg-clip-text text-transparent">
                                            Live TV
                                        </span>
                                    </h1>
                                    <p className="text-sm sm:text-base text-[#ADA6B9] max-w-2xl font-normal leading-relaxed">
                                        High-definition channels broadcasting live from {selectedCountry.label}. Stream 100% free with ultra-low latency.
                                    </p>
                                </div>
                            ) : (
                                <div className="space-y-2">
                                    <h1 className="text-3xl sm:text-4xl md:text-5xl font-black tracking-tight text-white">
                                        Global <span className="bg-gradient-to-r from-[#9273F5] via-[#B09AFF] to-[#57D6C0] bg-clip-text text-transparent">Live TV</span> Directory
                                    </h1>
                                    <p className="text-sm sm:text-base text-[#ADA6B9] max-w-3xl font-normal leading-relaxed">
                                        Explore live channels from across the globe — breaking news, live sports, entertainment, movies, and animation.
                                    </p>
                                </div>
                            )}
                        </div>

                        {/* ──────────────────────────────────────────────────── */}
                        {/* Nexiplay Glass Search Bar                            */}
                        {/* ──────────────────────────────────────────────────── */}
                        <div className="relative max-w-md">
                            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-[#9273F5]">
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 1114 0z" />
                                </svg>
                            </div>
                            <input
                                type="text"
                                placeholder={
                                    selectedCountry
                                        ? `Search ${selectedCountry.label} channels...`
                                        : 'Search channels by name...'
                                }
                                value={tvSearch}
                                onChange={(e) => setTvSearch(e.target.value)}
                                className="w-full pl-11 pr-10 py-3 bg-[#17141F]/80 border border-white/10 rounded-2xl text-white placeholder-[#ADA6B9]/60 text-sm focus:outline-none focus:border-[#9273F5] focus:ring-2 focus:ring-[#9273F5]/20 transition-all shadow-inner"
                            />
                            {tvSearch && (
                                <button
                                    onClick={() => setTvSearch('')}
                                    className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-gray-400 hover:text-white text-xs"
                                >
                                    ✕
                                </button>
                            )}
                        </div>

                        {/* ──────────────────────────────────────────────────── */}
                        {/* Two Filter Rows (COUNTRY & CATEGORY with SVG icons) */}
                        {/* ──────────────────────────────────────────────────── */}
                        <div className="space-y-3.5 pt-2 border-t border-white/10">
                            {/* Row 1: COUNTRY Filter */}
                            <div className="flex items-center gap-3 overflow-x-auto pb-1.5 scrollbar-hide">
                                <span className="text-[10px] font-black uppercase tracking-[0.2em] text-[#9273F5] shrink-0">
                                    COUNTRY
                                </span>
                                <div className="flex items-center gap-2">
                                    <button
                                        onClick={() => {
                                            setSelectedCountry(null);
                                            setIsPlayerOpen(false);
                                        }}
                                        className={`px-4 py-1.5 rounded-full text-xs font-bold whitespace-nowrap transition-all duration-200 flex items-center gap-2 shrink-0 ${
                                            selectedCountry === null
                                                ? 'bg-gradient-to-r from-[#9273F5] to-[#5C46B2] text-white shadow-[0_4px_16px_rgba(146,115,245,0.45)] border border-violet-400/30 scale-105'
                                                : 'bg-[#17141F]/80 text-[#ADA6B9] hover:text-white hover:bg-[#211D2D] border border-white/10'
                                        }`}
                                    >
                                        <CountryFlagSvg code="all" className="w-4 h-4 shrink-0" />
                                        <span>All countries</span>
                                    </button>

                                    {POPULAR_COUNTRIES.map((c) => {
                                        const isSelected = selectedCountry?.code === c.code;
                                        return (
                                            <button
                                                key={c.code}
                                                onClick={() => {
                                                    setSelectedCountry(c);
                                                    setTvSearch('');
                                                }}
                                                className={`px-3.5 py-1.5 rounded-full text-xs font-bold whitespace-nowrap transition-all duration-200 flex items-center gap-2 shrink-0 ${
                                                    isSelected
                                                        ? 'bg-gradient-to-r from-[#9273F5] to-[#5C46B2] text-white shadow-[0_4px_16px_rgba(146,115,245,0.45)] border border-violet-400/30 scale-105'
                                                        : 'bg-[#17141F]/80 text-[#ADA6B9] hover:text-white hover:bg-[#211D2D] border border-white/10 hover:border-violet-500/30'
                                                }`}
                                            >
                                                <CountryFlagSvg code={c.code} className="w-4 h-3 rounded-sm shrink-0 border border-white/10" />
                                                <span>{c.label}</span>
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>

                            {/* Row 2: CATEGORY Filter with Premium SVG Icons */}
                            {selectedCountry && availableCategories.length > 1 && (
                                <div className="flex items-center gap-3 overflow-x-auto pb-1.5 scrollbar-hide">
                                    <span className="text-[10px] font-black uppercase tracking-[0.2em] text-[#9273F5] shrink-0">
                                        CATEGORY
                                    </span>
                                    <div className="flex items-center gap-2">
                                        {availableCategories.map((cat) => {
                                            const isSelected = selectedCategory === cat;
                                            const count = cat === 'all' ? channels.length : categoryCounts[cat] || 0;
                                            const label = cat === 'all' ? 'All' : cat;

                                            return (
                                                <button
                                                    key={cat}
                                                    onClick={() => setSelectedCategory(cat)}
                                                    className={`px-3.5 py-1.5 rounded-full text-xs font-bold whitespace-nowrap transition-all duration-200 flex items-center gap-2 shrink-0 ${
                                                        isSelected
                                                            ? 'bg-gradient-to-r from-[#9273F5] to-[#5C46B2] text-white shadow-[0_4px_16px_rgba(146,115,245,0.4)] border border-violet-400/30'
                                                            : 'bg-[#17141F]/80 text-[#ADA6B9] hover:text-white hover:bg-[#211D2D] border border-white/10 hover:border-violet-500/25'
                                                    }`}
                                                >
                                                    <CategorySvgIcon category={cat} className={`w-3.5 h-3.5 shrink-0 ${isSelected ? 'text-white' : 'text-[#9273F5]'}`} />
                                                    <span>{label}</span>
                                                    <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-black ${isSelected ? 'bg-white/25 text-white' : 'bg-white/5 text-gray-400'}`}>
                                                        {count}
                                                    </span>
                                                </button>
                                            );
                                        })}
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* ──────────────────────────────────────────────────── */}
                        {/* Cinema Player (Opens on channel click)               */}
                        {/* ──────────────────────────────────────────────────── */}
                        {activeChannel && isPlayerOpen && (
                            <div
                                ref={playerContainerRef}
                                className="w-full rounded-3xl overflow-hidden bg-[#0D0B14] border border-white/15 shadow-2xl relative transition-all animate-fade-in"
                            >
                                {/* Channel Bar */}
                                <div className="px-5 py-3.5 bg-[#171422] border-b border-white/10 flex items-center justify-between gap-4">
                                    <div className="flex items-center gap-3.5 min-w-0">
                                        <div className="w-11 h-11 rounded-2xl overflow-hidden bg-black/60 border border-white/10 shrink-0 relative flex items-center justify-center p-1 shadow-inner">
                                            <SafeMediaIcon src={activeChannel.logo} alt={activeChannel.name} fallbackEmoji="📺" />
                                        </div>
                                        <div className="min-w-0">
                                            <div className="flex items-center gap-2.5">
                                                <h3 className="text-white font-black text-base truncate">
                                                    {parseChannelDisplay(activeChannel.name).cleanName}
                                                </h3>
                                                <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-[10px] font-black uppercase tracking-wider bg-rose-500/20 text-rose-400 border border-rose-500/30 shrink-0">
                                                    <span className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-pulse" />
                                                    LIVE
                                                </span>
                                            </div>
                                            <p className="text-xs text-[#ADA6B9] truncate mt-0.5 font-medium">
                                                {selectedCountry ? selectedCountry.label : activeChannel.country} · {activeChannel.group} · {parseChannelDisplay(activeChannel.name).quality}
                                            </p>
                                        </div>
                                    </div>

                                    {/* Action Switchers & Close */}
                                    <div className="flex items-center gap-2 shrink-0">
                                        <button
                                            onClick={handlePrevChannel}
                                            className="px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-gray-300 hover:text-white border border-white/10 text-xs font-bold transition-all flex items-center gap-1"
                                            title="Previous Channel"
                                        >
                                            <svg className="w-3 h-3 fill-current" viewBox="0 0 24 24"><path d="M15.41 7.41L14 6l-6 6 6 6 1.41-1.41L10.83 12z"/></svg>
                                            <span>Prev</span>
                                        </button>
                                        <button
                                            onClick={handleNextChannel}
                                            className="px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-gray-300 hover:text-white border border-white/10 text-xs font-bold transition-all flex items-center gap-1"
                                            title="Next Channel"
                                        >
                                            <span>Next</span>
                                            <svg className="w-3 h-3 fill-current" viewBox="0 0 24 24"><path d="M10 6L8.59 7.41 13.17 12l-4.58 4.59L10 18l6-6z"/></svg>
                                        </button>
                                        <button
                                            onClick={() => setIsPlayerOpen(false)}
                                            className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white border border-white/10 text-xs font-bold transition-all ml-1"
                                            title="Close Player"
                                        >
                                            ✕
                                        </button>
                                    </div>
                                </div>

                                {/* Video Frame */}
                                <div className="relative aspect-video w-full bg-black flex items-center justify-center overflow-hidden">
                                    {usingYoutubeFallback && activeChannel.youtubeLiveUrl ? (
                                        <iframe
                                            src={activeChannel.youtubeLiveUrl}
                                            title={activeChannel.name}
                                            className="w-full h-full border-0"
                                            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                                            allowFullScreen
                                        />
                                    ) : (
                                        <video
                                            ref={videoRef}
                                            className="w-full h-full object-contain"
                                            playsInline
                                            autoPlay
                                            controls
                                            onError={() => setTvStreamFailed(true)}
                                        />
                                    )}

                                    {/* Offline / Stream Failed Overlay */}
                                    {tvStreamFailed && !usingYoutubeFallback && (
                                        <div className="absolute inset-0 bg-[#0E0B16]/95 backdrop-blur-md flex flex-col items-center justify-center p-6 text-center z-20">
                                            <div className="w-12 h-12 rounded-2xl bg-rose-500/15 border border-rose-500/30 flex items-center justify-center text-rose-400 mb-3 text-xl">
                                                📡
                                            </div>
                                            <h4 className="text-white font-bold text-base mb-1">
                                                This channel is currently buffering or unavailable
                                            </h4>
                                            <p className="text-xs text-gray-400 max-w-md mb-4 leading-relaxed">
                                                The stream may be geo-restricted or broadcasting part-time. You can switch to the next channel or try the official YouTube stream if available.
                                            </p>
                                            <div className="flex flex-wrap items-center justify-center gap-3">
                                                {activeChannel.youtubeLiveUrl && (
                                                    <button
                                                        onClick={() => {
                                                            setUsingYoutubeFallback(true);
                                                            setTvStreamFailed(false);
                                                        }}
                                                        className="px-4 py-2 bg-gradient-to-r from-rose-600 to-red-600 hover:from-rose-500 hover:to-red-500 text-white text-xs font-bold rounded-xl shadow-lg transition-all"
                                                    >
                                                        📺 Switch to YouTube Live
                                                    </button>
                                                )}
                                                <button
                                                    onClick={handleNextChannel}
                                                    className="px-4 py-2 bg-white/10 hover:bg-white/20 text-white text-xs font-bold rounded-xl border border-white/10 transition-all"
                                                >
                                                    Next Channel ▶
                                                </button>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}

                        {/* ──────────────────────────────────────────────────── */}
                        {/* VIEW A: COUNTRY CHANNELS GRID                        */}
                        {/* ──────────────────────────────────────────────────── */}
                        {selectedCountry && (
                            <div className="space-y-4">
                                <div className="flex items-center justify-between border-b border-white/10 pb-3">
                                    <h3 className="text-base font-bold text-white flex items-center gap-2">
                                        <CategorySvgIcon category={selectedCategory} className="w-4 h-4 text-[#9273F5]" />
                                        <span>{selectedCategory === 'all' ? 'All channels' : `${selectedCategory} channels`}</span>
                                    </h3>
                                    <span className="text-xs text-[#ADA6B9] font-mono">
                                        {filteredChannels.length} channels
                                    </span>
                                </div>

                                {isTvLoading ? (
                                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
                                        {[...Array(15)].map((_, i) => (
                                            <div key={i} className="h-16 rounded-2xl bg-[#171422] animate-pulse" />
                                        ))}
                                    </div>
                                ) : filteredChannels.length > 0 ? (
                                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
                                        {filteredChannels.map((ch) => {
                                            const { cleanName, quality, category } = parseChannelDisplay(ch.name, ch.group);
                                            const isPlaying = activeChannel?.id === ch.id && isPlayerOpen;

                                            return (
                                                <button
                                                    key={ch.id}
                                                    onClick={() => handleChannelClick(ch)}
                                                    className={`p-3 rounded-2xl border text-left flex items-center gap-3.5 transition-all duration-300 group relative ${
                                                        isPlaying
                                                            ? 'bg-[#1E1933] border-[#9273F5] shadow-[0_0_25px_rgba(146,115,245,0.3)] ring-1 ring-[#9273F5]/40 scale-[1.02]'
                                                            : 'bg-[#14121E]/90 hover:bg-[#1C182B] border-white/[0.08] hover:border-[#9273F5]/40 hover:shadow-[0_8px_25px_rgba(146,115,245,0.18)] hover:-translate-y-0.5'
                                                    }`}
                                                >
                                                    {/* Logo container */}
                                                    <div className="w-12 h-12 rounded-xl bg-black/60 border border-white/10 group-hover:border-[#9273F5]/40 flex items-center justify-center p-1.5 shrink-0 overflow-hidden shadow-inner">
                                                        <SafeMediaIcon src={ch.logo} alt={cleanName} fallbackEmoji="📺" />
                                                    </div>

                                                    {/* Details */}
                                                    <div className="flex-1 min-w-0">
                                                        <h4 className="text-sm font-bold text-white truncate group-hover:text-[#B09AFF] transition-colors">
                                                            {cleanName}
                                                        </h4>
                                                        <div className="flex items-center gap-2 mt-1 text-[11px] text-[#ADA6B9] font-medium">
                                                            {quality && (
                                                                <span className="text-[10px] font-black uppercase tracking-wider px-1.5 py-0.2 rounded bg-[#9273F5]/15 text-[#B09AFF] border border-[#9273F5]/25">
                                                                    {quality}
                                                                </span>
                                                            )}
                                                            <span className="truncate">{category}</span>
                                                        </div>
                                                    </div>

                                                    {/* Active / Playing Indicator */}
                                                    {isPlaying ? (
                                                        <span className="px-1.5 py-0.5 rounded text-[9px] font-black uppercase tracking-wider bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 animate-pulse shrink-0">
                                                            ● LIVE
                                                        </span>
                                                    ) : (
                                                        <span className="opacity-0 group-hover:opacity-100 transition-opacity text-xs text-[#9273F5] shrink-0">
                                                            ▶
                                                        </span>
                                                    )}
                                                </button>
                                            );
                                        })}
                                    </div>
                                ) : (
                                    <div className="p-12 text-center rounded-3xl bg-[#14121E] border border-white/10 text-gray-400 text-sm">
                                        <p className="text-2xl mb-2">📡</p>
                                        <p className="text-white font-bold">No channels found</p>
                                        <p className="text-xs text-[#ADA6B9] mt-1">Try another search keyword or select a different category.</p>
                                    </div>
                                )}
                            </div>
                        )}

                        {/* ──────────────────────────────────────────────────── */}
                        {/* VIEW B: WORLDWIDE OVERVIEW (Popular & Every Country) */}
                        {/* ──────────────────────────────────────────────────── */}
                        {!selectedCountry && (
                            <div className="space-y-10">
                                {/* Popular Countries Section */}
                                <div className="space-y-4">
                                    <h3 className="text-lg font-bold text-white flex items-center gap-2">
                                        <span className="w-1.5 h-5 bg-[#9273F5] rounded-full" />
                                        <span>Popular countries</span>
                                    </h3>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
                                        {POPULAR_COUNTRIES.map((c) => (
                                            <button
                                                key={c.code}
                                                onClick={() => {
                                                    setSelectedCountry(c);
                                                    setTvSearch('');
                                                }}
                                                className="p-3.5 rounded-2xl bg-[#14121E]/90 hover:bg-[#1C182B] border border-white/10 hover:border-[#9273F5]/40 transition-all text-left flex items-center gap-3.5 group cursor-pointer shadow-md hover:-translate-y-0.5"
                                            >
                                                <CountryFlagSvg code={c.code} className="w-8 h-6 rounded-md shadow border border-white/10 shrink-0 group-hover:scale-105 transition-transform" />
                                                <span className="text-sm font-bold text-gray-200 group-hover:text-white truncate">
                                                    {c.label}
                                                </span>
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                {/* Every Country Directory */}
                                <div className="space-y-4 pt-4 border-t border-white/10">
                                    <h3 className="text-lg font-bold text-white flex items-center gap-2">
                                        <span className="w-1.5 h-5 bg-gradient-to-b from-[#9273F5] to-[#57D6C0] rounded-full" />
                                        <span>Every country</span>
                                    </h3>
                                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-2 sm:gap-2.5">
                                        {ALL_WORLD_COUNTRIES.map((c) => (
                                            <button
                                                key={c.code}
                                                onClick={() => {
                                                    setSelectedCountry(c);
                                                    setTvSearch('');
                                                }}
                                                className="px-3 py-2 rounded-xl bg-[#13111C] hover:bg-[#1C182B] border border-white/5 hover:border-[#9273F5]/30 text-left flex items-center gap-2.5 text-xs text-[#ADA6B9] hover:text-white transition-all group"
                                            >
                                                <CountryFlagSvg code={c.code} className="w-5 h-3.5 rounded-sm shrink-0 border border-white/10 group-hover:scale-105 transition-transform" />
                                                <span className="truncate font-semibold">{c.label}</span>
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                )}

                {/* ======================================================== */}
                {/* MODE 2: LIVE RADIO                                       */}
                {/* ======================================================== */}
                {mode === 'radio' && (
                    <div className="space-y-8 animate-fade-in">
                        {/* Radio Header */}
                        <div className="space-y-3">
                            <div className="inline-flex items-center gap-2.5 px-3 py-1 rounded-full bg-[#9273F5]/10 border border-[#9273F5]/25 text-[#B09AFF] text-[11px] font-bold uppercase tracking-wider">
                                <span className="w-2 h-2 rounded-full bg-[#9273F5] animate-pulse" />
                                <span>Nexiplay Audio Stream</span>
                            </div>
                            <div className="space-y-2">
                                <h1 className="text-3xl sm:text-4xl md:text-5xl font-black tracking-tight text-white">
                                    Worldwide <span className="bg-gradient-to-r from-[#9273F5] via-[#B09AFF] to-[#57D6C0] bg-clip-text text-transparent">Live Radio</span>
                                </h1>
                                <p className="text-sm sm:text-base text-[#ADA6B9] max-w-2xl font-normal leading-relaxed">
                                    Stream thousands of live music, news, and talk radio stations from around the globe in crystal clear audio.
                                </p>
                            </div>
                        </div>

                        {/* Search Bar */}
                        <div className="relative max-w-md">
                            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-[#9273F5]">
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 1114 0z" />
                                </svg>
                            </div>
                            <input
                                type="text"
                                placeholder="Search radio stations by name or genre..."
                                value={radioSearch}
                                onChange={(e) => setRadioSearch(e.target.value)}
                                className="w-full pl-11 pr-10 py-3 bg-[#17141F]/80 border border-white/10 rounded-2xl text-white placeholder-[#ADA6B9]/60 text-sm focus:outline-none focus:border-[#9273F5] focus:ring-2 focus:ring-[#9273F5]/20 transition-all shadow-inner"
                            />
                            {radioSearch && (
                                <button
                                    onClick={() => setRadioSearch('')}
                                    className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-gray-400 hover:text-white text-xs"
                                >
                                    ✕
                                </button>
                            )}
                        </div>

                        {/* Country Filter Pills */}
                        <div className="flex items-center gap-3 overflow-x-auto pb-1.5 scrollbar-hide border-t border-white/10 pt-4">
                            <span className="text-[10px] font-black uppercase tracking-[0.2em] text-[#9273F5] shrink-0">
                                COUNTRY
                            </span>
                            <div className="flex items-center gap-2">
                                {[
                                    { code: 'BD', label: 'Bangladesh' },
                                    { code: 'IN', label: 'India' },
                                    { code: 'PK', label: 'Pakistan' },
                                    { code: 'US', label: 'USA' },
                                    { code: 'GB', label: 'UK' },
                                    { code: 'SA', label: 'Saudi Arabia' },
                                    { code: 'AE', label: 'UAE' },
                                    { code: 'CA', label: 'Canada' },
                                    { code: 'AU', label: 'Australia' },
                                ].map((c) => {
                                    const isSelected = radioCountry === c.code;
                                    return (
                                        <button
                                            key={c.code}
                                            onClick={() => setRadioCountry(c.code)}
                                            className={`px-3.5 py-1.5 rounded-full text-xs font-bold whitespace-nowrap transition-all duration-200 flex items-center gap-2 shrink-0 ${
                                                isSelected
                                                    ? 'bg-gradient-to-r from-[#9273F5] to-[#5C46B2] text-white shadow-[0_4px_16px_rgba(146,115,245,0.45)] border border-violet-400/30 scale-105'
                                                    : 'bg-[#17141F]/80 text-[#ADA6B9] hover:text-white hover:bg-[#211D2D] border border-white/10 hover:border-violet-500/30'
                                            }`}
                                        >
                                            <CountryFlagSvg code={c.code} className="w-4 h-3 rounded-sm shrink-0 border border-white/10" />
                                            <span>{c.label}</span>
                                        </button>
                                    );
                                })}
                            </div>
                        </div>

                        {/* Stations Grid */}
                        <div className="space-y-4">
                            <div className="flex items-center justify-between border-b border-white/10 pb-3">
                                <h3 className="text-base font-bold text-white">
                                    Available Radio Stations
                                </h3>
                                <span className="text-xs text-[#ADA6B9] font-mono">
                                    {radioStations.length} stations
                                </span>
                            </div>

                            {isRadioLoading ? (
                                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
                                    {[...Array(15)].map((_, i) => (
                                        <div key={i} className="h-16 rounded-2xl bg-[#171422] animate-pulse" />
                                    ))}
                                </div>
                            ) : radioStations.length > 0 ? (
                                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
                                    {radioStations.map((st) => {
                                        const isPlaying = activeStation?.stationuuid === st.stationuuid && isRadioPlaying;

                                        return (
                                            <button
                                                key={st.stationuuid}
                                                onClick={() => {
                                                    setActiveStation(st);
                                                    setIsRadioPlaying(true);
                                                }}
                                                className={`p-3 rounded-2xl border text-left flex items-center gap-3.5 transition-all duration-300 group relative ${
                                                    isPlaying
                                                        ? 'bg-[#1E1933] border-[#9273F5] shadow-[0_0_25px_rgba(146,115,245,0.3)] ring-1 ring-[#9273F5]/40 scale-[1.02]'
                                                        : 'bg-[#14121E]/90 hover:bg-[#1C182B] border-white/[0.08] hover:border-[#9273F5]/40 hover:shadow-[0_8px_25px_rgba(146,115,245,0.18)] hover:-translate-y-0.5'
                                                }`}
                                            >
                                                {/* Favicon */}
                                                <div className="w-12 h-12 rounded-xl bg-black/60 border border-white/10 group-hover:border-[#9273F5]/40 flex items-center justify-center p-1.5 shrink-0 overflow-hidden shadow-inner">
                                                    <SafeMediaIcon src={st.favicon} alt={st.name} fallbackEmoji="📻" />
                                                </div>

                                                {/* Details */}
                                                <div className="flex-1 min-w-0">
                                                    <h4 className="text-sm font-bold text-white truncate group-hover:text-[#B09AFF] transition-colors">
                                                        {st.name}
                                                    </h4>
                                                    <div className="flex items-center gap-2 mt-1 text-[11px] text-[#ADA6B9] font-medium">
                                                        {st.bitrate > 0 && (
                                                            <span className="text-[10px] font-black uppercase tracking-wider px-1.5 py-0.2 rounded bg-[#9273F5]/15 text-[#B09AFF] border border-[#9273F5]/25">
                                                                {st.bitrate}K
                                                            </span>
                                                        )}
                                                        <span className="truncate">{st.tags?.split(',')[0] || st.codec || 'Live Audio'}</span>
                                                    </div>
                                                </div>

                                                {/* Pulse Indicator */}
                                                {isPlaying ? (
                                                    <span className="px-1.5 py-0.5 rounded text-[9px] font-black uppercase tracking-wider bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 animate-pulse shrink-0">
                                                        ● ON AIR
                                                    </span>
                                                ) : (
                                                    <span className="opacity-0 group-hover:opacity-100 transition-opacity text-xs text-[#9273F5] shrink-0">
                                                        ▶
                                                    </span>
                                                )}
                                            </button>
                                        );
                                    })}
                                </div>
                            ) : (
                                <div className="p-12 text-center rounded-3xl bg-[#14121E] border border-white/10 text-gray-400 text-sm">
                                    <p className="text-2xl mb-2">📻</p>
                                    <p className="text-white font-bold">No radio stations found</p>
                                    <p className="text-xs text-[#ADA6B9] mt-1">Try another search or country.</p>
                                </div>
                            )}
                        </div>
                    </div>
                )}
            </div>

            {/* Hidden native audio element for radio */}
            <audio ref={audioRef} onEnded={() => setIsRadioPlaying(false)} />

            {/* ──────────────────────────────────────────────────────────── */}
            {/* PERSISTENT RADIO MINI-PLAYER BAR (Floating at bottom)        */}
            {/* ──────────────────────────────────────────────────────────── */}
            {activeStation && (
                <div className="fixed bottom-16 md:bottom-6 left-4 right-4 max-w-xl mx-auto z-50 animate-slide-up">
                    <div className="p-3.5 rounded-2xl bg-[#171422]/95 backdrop-blur-xl border border-white/15 shadow-2xl flex items-center justify-between gap-4">
                        <div className="flex items-center gap-3 min-w-0">
                            <div className="w-10 h-10 rounded-xl bg-black/60 border border-white/10 shrink-0 flex items-center justify-center p-1 overflow-hidden shadow-inner">
                                <SafeMediaIcon src={activeStation.favicon} alt={activeStation.name} fallbackEmoji="📻" />
                            </div>
                            <div className="min-w-0">
                                <div className="flex items-center gap-2">
                                    <h5 className="text-white font-bold text-xs sm:text-sm truncate">
                                        {activeStation.name}
                                    </h5>
                                    {isRadioPlaying && (
                                        <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse shrink-0" />
                                    )}
                                </div>
                                <p className="text-[11px] text-[#ADA6B9] truncate">
                                    {activeStation.country} · {activeStation.bitrate > 0 ? `${activeStation.bitrate} kbps` : activeStation.codec || 'Live Audio'}
                                </p>
                            </div>
                        </div>

                        {/* Controls */}
                        <div className="flex items-center gap-2.5 shrink-0">
                            <button
                                onClick={() => {
                                    if (audioRef.current) {
                                        if (isRadioPlaying) {
                                            audioRef.current.pause();
                                            setIsRadioPlaying(false);
                                        } else {
                                            audioRef.current.play();
                                            setIsRadioPlaying(true);
                                        }
                                    }
                                }}
                                className="w-8 h-8 rounded-full bg-gradient-to-r from-[#9273F5] to-[#5C46B2] text-white font-bold flex items-center justify-center text-xs hover:scale-105 active:scale-95 transition-all shadow-md shadow-violet-950/40"
                            >
                                {isRadioPlaying ? '⏸' : '▶'}
                            </button>

                            <button
                                onClick={() => setIsRadioMuted(!isRadioMuted)}
                                className="p-2 text-[#ADA6B9] hover:text-white text-xs transition-colors"
                            >
                                {isRadioMuted ? '🔇' : '🔊'}
                            </button>

                            <button
                                onClick={stopRadio}
                                className="px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-gray-300 hover:text-white text-xs font-semibold border border-white/10 transition-all"
                            >
                                Stop
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
