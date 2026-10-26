'use client';

import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { Movie, Season, Episode } from '@/lib/types';
import { useAdSettings } from '@/hooks/useAdSettings';
import { supabase } from '@/lib/supabase';
import { AdBanner, NativeAd } from '@/components/ads';
import CommentSection from '@/components/CommentSection';
import RelatedPosts from '@/components/RelatedPosts';
import AdVerificationPopup from '@/components/AdVerificationPopup';
import { canRequestPlayerFullscreen, FULLSCREEN_IFRAME_ATTRS, isAntiSandboxUrl, requestPlayerFullscreen } from '@/lib/playerFullscreen';
import { useAuth } from '@/context/AuthContext';

interface WatchPageClientProps {
    movie: Movie;
    seasons?: Season[];
    type: string;
    slug: string;
}

const checkIsContentVerified = (contentId: string, contentType: string): boolean => {
    if (typeof window === 'undefined') return false;
    try {
        const raw = localStorage.getItem('nexiplay_verification_records');
        if (!raw) return false;
        const records = JSON.parse(raw);
        const record = records[contentId];
        if (!record) return false;

        const now = Date.now();
        const verifiedAt = record.verifiedAt;

        if (contentType === 'movie') {
            // For movies, daily verify (24 hours)
            const ONE_DAY_MS = 24 * 60 * 60 * 1000;
            return now - verifiedAt < ONE_DAY_MS;
        } else {
            // For series/anime, 25 minutes
            const TWENTY_FIVE_MIN_MS = 25 * 60 * 1000;
            return now - verifiedAt < TWENTY_FIVE_MIN_MS;
        }
    } catch (e) {
        return false;
    }
};

const saveContentVerification = (contentId: string, contentType: string) => {
    if (typeof window === 'undefined') return;
    try {
        const raw = localStorage.getItem('nexiplay_verification_records') || '{}';
        const records = JSON.parse(raw);
        records[contentId] = {
            verifiedAt: Date.now(),
            contentType: contentType
        };
        localStorage.setItem('nexiplay_verification_records', JSON.stringify(records));
    } catch (e) {
        console.error('Failed to save verification:', e);
    }
};

interface Server {
    id: string;
    name: string;
    icon?: string;
    badge?: string;
    isHindi?: boolean;
    getUrl: (movieId: string, tmdbId?: string, imdbId?: string, malId?: string, season?: number, episode?: number) => string | null;
    animeOnly?: boolean;
    movieOnly?: boolean;
}

function ServerSvgIcon({ id, isHindi, className = "w-4 h-4" }: { id: string; isHindi?: boolean; className?: string }) {
    const cleanId = (id || '').toLowerCase();

    // Trailer
    if (cleanId === 'trailer') {
        return (
            <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10" />
                <polygon points="10 8 16 12 10 16 10 8" fill="currentColor" stroke="none" />
            </svg>
        );
    }

    // DoodStream
    if (cleanId === 'doodstream' || cleanId === 'multi_doodstream') {
        return (
            <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10" stroke="#f97316" />
                <polygon points="10 8 16 12 10 16 10 8" fill="#f97316" />
            </svg>
        );
    }

    // Streamtape
    if (cleanId === 'streamtape' || cleanId === 'multi_streamtape') {
        return (
            <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                <rect x="2" y="4" width="20" height="16" rx="3" stroke="#3b82f6" />
                <circle cx="8" cy="12" r="2.5" fill="#3b82f6" />
                <circle cx="16" cy="12" r="2.5" fill="#3b82f6" />
                <line x1="8" y1="14.5" x2="16" y2="14.5" stroke="#3b82f6" strokeWidth={1.5} />
            </svg>
        );
    }

    // Voe
    if (cleanId === 'voe' || cleanId === 'multi_voe') {
        return (
            <svg className={className} viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" fill="#10b981" />
            </svg>
        );
    }

    // Abyss
    if (cleanId === 'abyss' || cleanId === 'multi_abyss') {
        return (
            <svg className={className} viewBox="0 0 24 24" fill="none" stroke="#06b6d4" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="9" />
                <path d="M12 3a9 9 0 0 1 9 9" />
                <circle cx="12" cy="12" r="3" fill="#06b6d4" />
            </svg>
        );
    }

    // Hindi Dubbed / Multi-Audio / Soundwave
    if (isHindi || ['moviesnexus', 'multiembed', 'vixsrc', 'twoembed', 'vidsrc_su', 'anyembed', 'rareanimes', 'screenscape'].includes(cleanId)) {
        return (
            <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                <path d="M2 10v4M6 7v10M10 4v16M14 8v8M18 11v2M22 9v6" />
            </svg>
        );
    }

    // Ultra Fast Speed / Zap
    if (['vidlink', 'vidfast', 'vidcore', 'vidsrc_pm', 'vidsrc_to', 'vidsrc_io', 'vidsrc_sh', 'vidapi'].includes(cleanId)) {
        return (
            <svg className={className} viewBox="0 0 24 24" fill="currentColor">
                <path d="M13 2L3 14h7l-1 8 10-12h-7l1-8z" />
            </svg>
        );
    }

    // Premium VIP / Crown
    if (cleanId === 'vidking') {
        return (
            <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                <path d="m2 4 3 12h14l3-12-6 7-4-7-4 7-6-7zm3 16h14" />
            </svg>
        );
    }

    // Heart / Love / Premium Stream
    if (cleanId === 'nexi_love') {
        return (
            <svg className={className} viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
            </svg>
        );
    }

    // Cloud Stream / Direct CDN / Server Stack
    if (['vidvault_stream', 'custom'].includes(cleanId) || cleanId.startsWith('multi_')) {
        return (
            <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                <rect width="20" height="7" x="2" y="3" rx="2" />
                <rect width="20" height="7" x="2" y="14" rx="2" />
                <line x1="6" x2="6.01" y1="6.5" y2="6.5" strokeWidth={3} />
                <line x1="6" x2="6.01" y1="17.5" y2="17.5" strokeWidth={3} />
                <line x1="10" x2="18" y1="6.5" y2="6.5" />
                <line x1="10" x2="18" y1="17.5" y2="17.5" />
            </svg>
        );
    }

    // 4K Ultra HD Sparkle
    if (cleanId === 'vidrock' || cleanId === 'ultra_4k' || cleanId === 'cinebros' || cleanId === 'nexi_frame' || cleanId === 'nexi_joy' || cleanId === 'cinesrc' || cleanId === 'cineruv' || cleanId === 'vexo' || cleanId === 'atlantic' || cleanId === 'vidbolt' || cleanId === 'nexi_velvet' || cleanId === 'nexi_flow' || cleanId === 'nexi_core' || cleanId === 'nexi_nerds') {
        return (
            <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 2v20M2 12h20M4.93 4.93l14.14 14.14M4.93 19.07l14.14-14.14" />
            </svg>
        );
    }

    // Cinema / Film / Default Video Player
    return (
        <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
            <rect width="20" height="15" x="2" y="5" rx="3" />
            <polyline points="2 10 22 10" />
            <circle cx="7" cy="7.5" r="1" fill="currentColor" />
            <circle cx="12" cy="7.5" r="1" fill="currentColor" />
            <circle cx="17" cy="7.5" r="1" fill="currentColor" />
            <polygon points="10 13 15 16 10 19 10 13" fill="currentColor" stroke="none" />
        </svg>
    );
}

const BUILT_IN_SERVERS: Server[] = [
    {
        id: 'ultra_4k',
        name: 'Nexi 4K (Ultra)',
        icon: 'sparkle',
        badge: '4K ULTRA',
        getUrl: (id, tmdb, imdb, mal, s, e) => {
            const targetId = tmdb || (!id?.startsWith('tt') ? id : null);
            if (!targetId) return null;
            return s !== undefined && e !== undefined
                ? `https://cinebros.net/watch/tv/${targetId}?s=${s}&e=${e}`
                : `https://cinebros.net/watch/movie/${targetId}`;
        }
    },
    {
        id: 'luma_stream',
        name: 'Luma Stream (HD)',
        icon: 'film',
        badge: 'DASH HD',
        getUrl: (id, tmdb, imdb, mal, s, e) => {
            const targetId = tmdb || (!id?.startsWith('tt') ? id : null);
            if (!targetId) return null;
            return s !== undefined && e !== undefined
                ? `https://embed.cinevu.icu/embed/tv/${targetId}/${s}/${e}`
                : `https://embed.cinevu.icu/embed/movie/${targetId}`;
        }
    },
    {
        id: 'nexi_frame',
        name: 'Nexi Frame (Ultra)',
        icon: 'sparkle',
        badge: 'ULTRA HD',
        getUrl: (id, tmdb, imdb, mal, s, e) => {
            const targetId = tmdb || imdb || id;
            if (!targetId) return null;
            return s !== undefined && e !== undefined
                ? `https://framextv.cc/embed/tv/${targetId}/${s}/${e}?no_ads=1&autoplay=1`
                : `https://framextv.cc/embed/movie/${targetId}?no_ads=1&autoplay=1`;
        }
    },
    {
        id: 'nexi_joy',
        name: 'Nexi Joy (Pro HD)',
        icon: 'sparkle',
        badge: 'PRO HD',
        getUrl: (id, tmdb, imdb, mal, s, e) => {
            const targetId = tmdb || (!id?.startsWith('tt') ? id : null);
            if (!targetId) return null;
            return s !== undefined && e !== undefined
                ? `https://flaxjoy.app/watch/${targetId}/${s}/${e}`
                : `https://flaxjoy.app/watch/${targetId}`;
        }
    },
    {
        id: 'cinesrc',
        name: 'CineSrc (Ultra HD)',
        icon: 'sparkle',
        badge: 'ULTRA HD',
        getUrl: (id, tmdb, imdb, mal, s, e) => {
            const targetId = tmdb || imdb || id;
            if (!targetId) return null;
            return s !== undefined && e !== undefined
                ? `https://cinesrc.st/embed/tv/${targetId}?s=${s}&e=${e}&color=%2300f2fe`
                : `https://cinesrc.st/embed/movie/${targetId}?color=%2300f2fe`;
        }
    },
    {
        id: 'cineruv',
        name: 'CineRuv (Studio 4K)',
        icon: 'sparkle',
        badge: 'STUDIO 4K',
        getUrl: (id, tmdb, imdb, mal, s, e) => {
            const targetId = tmdb || (!id?.startsWith('tt') ? id : null);
            if (!targetId) return null;
            return s !== undefined && e !== undefined
                ? `https://cineruv.website/watch/tv/${targetId}/${s}/${e}`
                : `https://cineruv.website/watch/movie/${targetId}`;
        }
    },
    {
        id: 'vexo',
        name: 'Vexo (Glass 4K)',
        icon: 'sparkle',
        badge: 'GLASS 4K',
        getUrl: (id, tmdb, imdb, mal, s, e) => {
            const targetId = tmdb || (!id?.startsWith('tt') ? id : null);
            if (!targetId) return null;
            return s !== undefined && e !== undefined
                ? `https://vexo.surf/watch/tv/${targetId}/${s}/${e}`
                : `https://vexo.surf/watch/movie/${targetId}`;
        }
    },
    {
        id: 'atlantic',
        name: 'Nexi Wave (Multi-Audio)',
        icon: 'sparkle',
        badge: 'MULTI-AUDIO',
        getUrl: (id, tmdb, imdb, mal, s, e) => {
            const targetId = tmdb || (!id?.startsWith('tt') ? id : null);
            if (!targetId) return null;
            return s !== undefined && e !== undefined
                ? `https://embed.atlantic.st/embed/tv/${targetId}/${s}/${e}`
                : `https://embed.atlantic.st/embed/movie/${targetId}`;
        }
    },
    {
        id: 'vidbolt',
        name: 'VidBolt (1080p HD)',
        icon: 'sparkle',
        badge: '1080P HD',
        getUrl: (id, tmdb, imdb, mal, s, e) => {
            const targetId = tmdb || (!id?.startsWith('tt') ? id : null);
            if (!targetId) return null;
            return s !== undefined && e !== undefined
                ? `https://vidbolt.xyz/tv/${targetId}/${s}/${e}`
                : `https://vidbolt.xyz/movie/${targetId}`;
        }
    },
    {
        id: 'nexi_velvet',
        name: 'Nexi Velvet (Ultra HLS)',
        icon: 'sparkle',
        badge: 'ULTRA HLS',
        getUrl: (id, tmdb, imdb, mal, s, e) => {
            const targetId = tmdb || (!id?.startsWith('tt') ? id : null);
            if (!targetId) return null;
            return s !== undefined && e !== undefined
                ? `https://dulo.mov/watch/tv/${targetId}?s=${s}&e=${e}`
                : `https://dulo.mov/watch/movie/${targetId}`;
        }
    },
    {
        id: 'nexi_flow',
        name: 'Nexi Flow (Multi-Stream)',
        icon: 'sparkle',
        badge: 'MULTI-STREAM',
        getUrl: (id, tmdb, imdb, mal, s, e) => {
            const targetId = tmdb || (!id?.startsWith('tt') ? id : null);
            if (!targetId) return null;
            return s !== undefined && e !== undefined
                ? `https://watch.rivestream.app/embed?type=tv&id=${targetId}&season=${s}&episode=${e}`
                : `https://watch.rivestream.app/embed?type=movie&id=${targetId}`;
        }
    },
    {
        id: 'nexi_love',
        name: 'Nexi Love (Pro HD)',
        icon: 'heart',
        badge: 'PRO HD',
        getUrl: (id, tmdb, imdb, mal, s, e) => {
            const targetId = tmdb || (!id?.startsWith('tt') ? id : null);
            if (!targetId) return null;
            return s !== undefined && e !== undefined
                ? `https://player.vidlove.cc/embed/tv/${targetId}/${s}/${e}`
                : `https://player.vidlove.cc/embed/movie/${targetId}`;
        }
    },
    {
        id: 'nexi_core',
        name: 'Nexi Core (Ultra HD)',
        icon: 'sparkle',
        badge: 'CORE HD',
        getUrl: (id, tmdb, imdb, mal, s, e) => {
            const targetId = tmdb || (!id?.startsWith('tt') ? id : null);
            if (!targetId) return null;
            return s !== undefined && e !== undefined
                ? `https://vidcore.io/tv/${targetId}/${s}/${e}?autoPlay=false`
                : `https://vidcore.io/movie/${targetId}?autoPlay=false`;
        }
    },
    {
        id: 'nexi_cinema',
        name: 'Nexi Cinema (CinemaOS)',
        icon: 'film',
        badge: 'CINEMA OS',
        getUrl: (id, tmdb, imdb, mal, s, e) => {
            const targetId = tmdb || (!id?.startsWith('tt') ? id : null);
            if (!targetId) return null;
            return s !== undefined && e !== undefined
                ? `https://cinemaos.me/player/${targetId}/${s}/${e}?autoPlay=false`
                : `https://cinemaos.me/player/${targetId}?autoPlay=false`;
        }
    },
    {
        id: 'nexi_nerds',
        name: 'Nexi Nerds (Master HD)',
        icon: 'sparkle',
        badge: 'MASTER HD',
        getUrl: (id, tmdb, imdb, mal, s, e) => {
            const targetId = tmdb || (!id?.startsWith('tt') ? id : null);
            if (!targetId) return null;
            return s !== undefined && e !== undefined
                ? `https://movienerds.site/watch/tv/${targetId}?season=${s}&episode=${e}`
                : `https://movienerds.site/watch/movie/${targetId}`;
        }
    },
    {
        id: 'vidrock',
        name: 'VidRock',
        icon: 'sparkle',
        badge: 'FAST HD',
        getUrl: (id, tmdb, imdb, mal, s, e) => {
            const targetId = tmdb || imdb || id;
            if (!targetId) return null;
            return s !== undefined && e !== undefined
                ? `https://vidrock.net/tv/${targetId}/${s}/${e}`
                : `https://vidrock.net/movie/${targetId}`;
        }
    },
    {
        id: 'videasy',
        name: 'Videasy HD',
        icon: 'zap',
        badge: 'FAST HD',
        getUrl: (id, tmdb, imdb, mal, s, e) => {
            const targetId = tmdb || imdb || id;
            if (!targetId) return null;
            return s !== undefined && e !== undefined
                ? `https://player.videasy.to/tv/${targetId}/${s}/${e}`
                : `https://player.videasy.to/movie/${targetId}`;
        }
    },
    {
        id: 'vidlink',
        name: 'VidLink (Ultra)',
        icon: 'zap',
        badge: '1080P ULTRA',
        getUrl: (id, tmdb, imdb, mal, s, e) => {
            const targetId = tmdb || imdb || id;
            if (!targetId) return null;
            return s !== undefined && e !== undefined
                ? `https://vidlink.pro/tv/${targetId}/${s}/${e}`
                : `https://vidlink.pro/movie/${targetId}`;
        }
    },
    {
        id: 'vidsrc_pm',
        name: 'VidSrc (PM)',
        icon: 'zap',
        badge: 'HD STREAM',
        getUrl: (id, tmdb, imdb, mal, s, e) => {
            const targetId = tmdb || imdb || id;
            if (!targetId) return null;
            return s !== undefined && e !== undefined
                ? `https://vidsrc.pm/embed/tv/${targetId}/${s}/${e}`
                : `https://vidsrc.pm/embed/movie/${targetId}`;
        }
    },
    {
        id: 'vidfast',
        name: 'VidFast',
        icon: 'zap',
        badge: '1080P FAST',
        getUrl: (id, tmdb, imdb, mal, s, e) => {
            const targetId = tmdb || imdb || id;
            if (!targetId) return null;
            return s !== undefined && e !== undefined
                ? `https://vidfast.vc/tv/${targetId}/${s}/${e}`
                : `https://vidfast.vc/movie/${targetId}`;
        }
    },
    {
        id: 'vidsrc_to',
        name: 'VidSrc.to',
        icon: 'zap',
        badge: 'PRO STREAM',
        getUrl: (id, tmdb, imdb, mal, s, e) => {
            const targetId = tmdb || imdb || id;
            if (!targetId) return null;
            return s !== undefined && e !== undefined
                ? `https://vidsrc.to/embed/tv/${targetId}/${s}/${e}`
                : `https://vidsrc.to/embed/movie/${targetId}`;
        }
    },
    {
        id: 'twoembed',
        name: '2Embed (Multi-Audio)',
        icon: 'audio',
        badge: 'MULTI-AUDIO',
        isHindi: true,
        getUrl: (id, tmdb, imdb, mal, s, e) => {
            const targetId = tmdb || id;
            if (!targetId) return null;
            return s !== undefined && e !== undefined
                ? `https://www.2embed.cc/embedtv/${targetId}&s=${s}&e=${e}`
                : `https://www.2embed.cc/embed/${targetId}`;
        }
    },
    {
        id: 'moviesapi',
        name: 'MoviesAPI',
        icon: 'film',
        badge: 'HD STREAM',
        getUrl: (id, tmdb, imdb, mal, s, e) => {
            const targetId = tmdb || imdb || id;
            if (!targetId) return null;
            return s !== undefined && e !== undefined
                ? `https://moviesapi.to/tv/${targetId}/${s}/${e}`
                : `https://moviesapi.to/movie/${targetId}`;
        }
    },
    {
        id: 'vixsrc',
        name: 'VixSrc (Multi-Lang)',
        icon: 'audio',
        badge: 'MULTI-LANG',
        isHindi: true,
        getUrl: (id, tmdb, imdb, mal, s, e) => {
            const targetId = tmdb || imdb || id;
            if (!targetId) return null;
            return s !== undefined && e !== undefined
                ? `https://vixsrc.to/tv/${targetId}/${s}/${e}`
                : `https://vixsrc.to/movie/${targetId}`;
        }
    },
    {
        id: 'nontongo',
        name: 'Nontongo',
        icon: 'film',
        badge: 'ULTRA HD',
        getUrl: (id, tmdb, imdb, mal, s, e) => {
            const targetId = tmdb || imdb || id;
            if (!targetId) return null;
            return s !== undefined && e !== undefined
                ? `https://nontongo.win/embed/tv/${targetId}/${s}/${e}`
                : `https://nontongo.win/embed/movie/${targetId}`;
        }
    },
    {
        id: 'multiembed',
        name: 'MultiEmbed (Hindi)',
        icon: 'audio',
        badge: 'MULTI',
        isHindi: true,
        getUrl: (id, tmdb, imdb, mal, s, e) => {
            const targetId = tmdb || imdb || id;
            if (!targetId) return null;
            return s !== undefined && e !== undefined
                ? `https://multiembed.mov/?video_id=${targetId}&tmdb=1&s=${s}&e=${e}`
                : `https://multiembed.mov/?video_id=${targetId}&tmdb=1`;
        }
    },
    {
        id: 'screenscape',
        name: 'Nexi Hindi (Dubbed)',
        icon: 'audio',
        badge: 'HINDI DUBBED',
        isHindi: true,
        getUrl: (id, tmdb, imdb, mal, s, e) => {
            const targetId = tmdb || (!id?.startsWith('tt') ? id : null);
            if (!targetId) return null;
            return s !== undefined && e !== undefined
                ? `https://screenscape.me/embed?tmdb=${targetId}&type=tv&lan=hindi&s=${s}&e=${e}`
                : `https://screenscape.me/embed?tmdb=${targetId}&type=movie&lan=hindi`;
        }
    },
    {
        id: 'godrive',
        name: 'GDrivePlayer',
        icon: 'sparkle',
        badge: 'DIRECT',
        getUrl: (id, tmdb, imdb, mal, s, e) => {
            const targetId = imdb || tmdb || id;
            if (!targetId) return null;
            return s !== undefined && e !== undefined
                ? `https://database.gdriveplayer.us/player.php?imdb=${targetId}&s=${s}&e=${e}`
                : `https://database.gdriveplayer.us/player.php?imdb=${targetId}`;
        }
    },
    {
        id: 'vidapi',
        name: 'VidAPI',
        icon: 'film',
        badge: 'FAST HD',
        getUrl: (id, tmdb, imdb, mal, s, e) => {
            const targetId = tmdb || imdb || id;
            if (!targetId) return null;
            return s !== undefined && e !== undefined
                ? `https://vaplayer.ru/embed/tv/${targetId}/${s}/${e}`
                : `https://vaplayer.ru/embed/movie/${targetId}`;
        }
    },
    {
        id: 'vidcore',
        name: 'VidCore (Fast HD)',
        icon: 'zap',
        badge: '1080P ULTRA',
        getUrl: (id, tmdb, imdb, mal, s, e) => {
            const targetId = tmdb || imdb || id;
            if (!targetId) return null;
            return s !== undefined && e !== undefined
                ? `https://vidcore.io/tv/${targetId}/${s}/${e}?autoPlay=true&autoNext=true`
                : `https://vidcore.io/movie/${targetId}?autoPlay=true`;
        }
    },
    {
        id: 'vidsrc_su',
        name: 'VidSrc SU (Multi)',
        icon: 'audio',
        badge: 'MULTI-AUDIO',
        isHindi: true,
        getUrl: (id, tmdb, imdb, mal, s, e) => {
            const targetId = tmdb || imdb || id;
            if (!targetId) return null;
            return s !== undefined && e !== undefined
                ? `https://vidsrc.su/embed/tv/${targetId}/${s}/${e}`
                : `https://vidsrc.su/embed/movie/${targetId}`;
        }
    },
    {
        id: 'anyembed',
        name: 'AnyEmbed (Multi-Audio)',
        icon: 'audio',
        badge: 'MULTI-AUDIO',
        isHindi: true,
        getUrl: (id, tmdb, imdb, mal, s, e) => {
            const targetId = tmdb || id;
            if (!targetId) return null;
            return s !== undefined && e !== undefined
                ? `https://anyembed.xyz/embed/tmdb-tv-${targetId}-${s}-${e}`
                : `https://anyembed.xyz/embed/tmdb-movie-${targetId}`;
        }
    }
];

const SERVERS: Server[] = BUILT_IN_SERVERS;
const STREAM_PROXY_ENDPOINT = (process.env.NEXT_PUBLIC_STREAM_PROXY_URL || '').trim().replace(/\/$/, '') || '/api/proxy-stream';

const AD_BLOCK_SANDBOX =
    'allow-scripts allow-same-origin allow-forms allow-presentation allow-pointer-lock allow-orientation-lock allow-modals';

const DISABLED_MULTI_SERVER_IDS = new Set(['muse_india', 'anione_india']);

type MultiScraperServerConfig = {
    mode?: string;
    url?: string;
    urls?: Record<string, string>;
    episodeUrls?: Record<string, string>;
};

function normalizeConfiguredServerUrl(serverKey: string, url: string): string {
    const cleanUrl = url.trim();
    return normalizePlayerUrl(cleanUrl);
}

function getYouTubeVideoId(urlOrId: string): string | null {
    const input = urlOrId.trim();
    if (/^[a-zA-Z0-9_-]{11}$/.test(input)) return input;

    try {
        const parsed = new URL(input);
        const host = parsed.hostname.replace(/^www\./, '').toLowerCase();

        if (host === 'youtu.be') {
            const id = parsed.pathname.split('/').filter(Boolean)[0];
            return id && /^[a-zA-Z0-9_-]{11}$/.test(id) ? id : null;
        }

        if (host.endsWith('youtube.com') || host.endsWith('youtube-nocookie.com')) {
            const watchId = parsed.searchParams.get('v');
            if (watchId && /^[a-zA-Z0-9_-]{11}$/.test(watchId)) return watchId;

            const parts = parsed.pathname.split('/').filter(Boolean);
            const marker = ['embed', 'shorts', 'live'].find(part => parts.includes(part));
            if (marker) {
                const id = parts[parts.indexOf(marker) + 1];
                return id && /^[a-zA-Z0-9_-]{11}$/.test(id) ? id : null;
            }
        }
    } catch {
        const match = input.match(/(?:v=|youtu\.be\/|embed\/|shorts\/|live\/)([a-zA-Z0-9_-]{11})/);
        if (match) return match[1];
    }

    return null;
}

function normalizePlayerUrl(url: string): string {
    const cleanUrl = (url || '').trim();
    if (!cleanUrl) return '';

    const youtubeId = getYouTubeVideoId(cleanUrl);
    if (youtubeId) {
        return `https://www.youtube-nocookie.com/embed/${youtubeId}?rel=0&modestbranding=1&playsinline=1&iv_load_policy=3&fs=1`;
    }

    try {
        const parsed = new URL(cleanUrl);
        const host = parsed.hostname.toLowerCase();

        // 1. Doodstream
        if (host.includes('dood') || host.includes('ds2play') || host.includes('playmogo')) {
            if (parsed.pathname.startsWith('/d/') || parsed.pathname.startsWith('/f/')) {
                parsed.pathname = parsed.pathname.replace(/^\/(?:d|f)\//, '/e/');
                return parsed.toString();
            }
        }

        // 2. Streamtape
        if (host.includes('streamtape') || host.includes('streamta.pe')) {
            if (parsed.pathname.startsWith('/v/')) {
                parsed.pathname = parsed.pathname.replace(/^\/v\//, '/e/');
                return parsed.toString();
            }
        }

        // 3. Voe
        if (host.includes('voe.sx') || host.includes('voe-network') || host.includes('ashleyhardat')) {
            const parts = parsed.pathname.split('/').filter(Boolean);
            if (parts.length === 1 && parts[0] !== 'e') {
                return `https://${parsed.host}/e/${parts[0]}`;
            }
        }

        // 4. Abyss
        if (host.includes('abyss.to') || host.includes('abyssplayer') || host.includes('abysscdn')) {
            const parts = parsed.pathname.split('/').filter(Boolean);
            const id = parts[parts.length - 1];
            if (parts.includes('watch') && id) {
                return `https://short.ink/${id}`;
            }
        }
    } catch {
        // Fallback to original
    }

    return cleanUrl;
}

function HLSVideoPlayer({ src, onEnded, onErrorFallback }: { src: string; onEnded?: () => void; onErrorFallback?: () => void }) {
    const videoRef = useRef<HTMLVideoElement>(null);
    const hlsRef = useRef<any>(null);
    const [hlsLoaded, setHlsLoaded] = useState(false);
    const [audioTracks, setAudioTracks] = useState<any[]>([]);
    const [currentTrackIndex, setCurrentTrackIndex] = useState<number>(-1);

    // Error handling state
    const [videoError, setVideoError] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const retryCountRef = useRef(0);
    const loadingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
    const MAX_RETRIES = 3;

    const [leftSkipActive, setLeftSkipActive] = useState(false);
    const [rightSkipActive, setRightSkipActive] = useState(false);
    const [accumulatedSkip, setAccumulatedSkip] = useState(0);

    // Custom controls state
    const containerRef = useRef<HTMLDivElement>(null);
    const [playbackSpeed, setPlaybackSpeed] = useState<number>(1.0);
    const [showSpeedMenu, setShowSpeedMenu] = useState<boolean>(false);
    const [isFullscreen, setIsFullscreen] = useState<boolean>(false);
    const [customSpeedVal, setCustomSpeedVal] = useState<string>('1.0');

    // Quality controls state
    const [hlsLevels, setHlsLevels] = useState<any[]>([]);
    const [currentQualityIndex, setCurrentQualityIndex] = useState<number>(-1);
    const [showQualityMenu, setShowQualityMenu] = useState<boolean>(false);

    const leftSkipActiveRef = useRef(false);
    const rightSkipActiveRef = useRef(false);
    const skipTimeoutRef = useRef<NodeJS.Timeout | null>(null);
    const lastTapRef = useRef<{ time: number; x: number }>({ time: 0, x: 0 });
    const clickTimeoutRef = useRef<NodeJS.Timeout | null>(null);

    const setLeftActive = (val: boolean) => {
        leftSkipActiveRef.current = val;
        setLeftSkipActive(val);
    };

    const setRightActive = (val: boolean) => {
        rightSkipActiveRef.current = val;
        setRightSkipActive(val);
    };

    const triggerSkip = (side: 'left' | 'right') => {
        if (skipTimeoutRef.current) {
            clearTimeout(skipTimeoutRef.current);
        }

        const currentActiveSide = leftSkipActiveRef.current ? 'left' : (rightSkipActiveRef.current ? 'right' : null);

        if (currentActiveSide && currentActiveSide !== side) {
            setLeftActive(false);
            setRightActive(false);
            setAccumulatedSkip(0);
        }

        if (videoRef.current) {
            if (side === 'left') {
                videoRef.current.currentTime = Math.max(0, videoRef.current.currentTime - 10);
            } else {
                videoRef.current.currentTime = Math.min(videoRef.current.duration || 0, videoRef.current.currentTime + 10);
            }
        }

        setAccumulatedSkip(prev => prev + 10);

        if (side === 'left') {
            setLeftActive(true);
            setRightActive(false);
        } else {
            setRightActive(true);
            setLeftActive(false);
        }

        skipTimeoutRef.current = setTimeout(() => {
            setLeftActive(false);
            setRightActive(false);
            setAccumulatedSkip(0);
        }, 800);
    };

    const triggerSkipRef = useRef<((side: 'left' | 'right') => void) | null>(null);
    triggerSkipRef.current = triggerSkip;

    const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
        const rect = e.currentTarget.getBoundingClientRect();
        const clickX = e.clientX - rect.left;
        const isLeft = clickX < rect.width / 2;

        const currentTime = new Date().getTime();
        const tapDelay = currentTime - lastTapRef.current.time;

        if (tapDelay < 350 && tapDelay > 0) {
            // Double click/tap detected!
            if (clickTimeoutRef.current) {
                clearTimeout(clickTimeoutRef.current);
                clickTimeoutRef.current = null;
            }

            triggerSkip(isLeft ? 'left' : 'right');
        } else {
            // Single tap/click - delay toggle to wait for double tap
            lastTapRef.current = { time: currentTime, x: clickX };

            if (clickTimeoutRef.current) clearTimeout(clickTimeoutRef.current);

            clickTimeoutRef.current = setTimeout(() => {
                if (videoRef.current) {
                    if (videoRef.current.paused) {
                        videoRef.current.play().catch(() => { });
                    } else {
                        videoRef.current.pause();
                    }
                }
                clickTimeoutRef.current = null;
            }, 250);
        }
    };

    // Keyboard hotkeys (ArrowLeft/ArrowRight to skip, Space to play/pause)
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (document.activeElement?.tagName === 'INPUT' || document.activeElement?.tagName === 'TEXTAREA') {
                return;
            }

            if (e.key === 'ArrowLeft') {
                e.preventDefault();
                if (triggerSkipRef.current) triggerSkipRef.current('left');
            } else if (e.key === 'ArrowRight') {
                e.preventDefault();
                if (triggerSkipRef.current) triggerSkipRef.current('right');
            } else if (e.key === ' ' || e.key === 'Spacebar') {
                e.preventDefault();
                if (videoRef.current) {
                    if (videoRef.current.paused) {
                        videoRef.current.play().catch(() => { });
                    } else {
                        videoRef.current.pause();
                    }
                }
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => {
            window.removeEventListener('keydown', handleKeyDown);
        };
    }, []);

    useEffect(() => {
        if ((window as any).Hls) {
            setHlsLoaded(true);
            return;
        }

        const script = document.createElement('script');
        script.src = 'https://cdn.jsdelivr.net/npm/hls.js@1.5.8/dist/hls.min.js';
        script.async = true;
        script.onload = () => setHlsLoaded(true);
        document.body.appendChild(script);
    }, []);

    useEffect(() => {
        setAudioTracks([]);
        setCurrentTrackIndex(-1);
        setVideoError(null);
        setIsLoading(true);
        retryCountRef.current = 0;

        if (!hlsLoaded || !videoRef.current) return;

        const video = videoRef.current;
        const Hls = (window as any).Hls;

        if (hlsRef.current) {
            hlsRef.current.destroy();
            hlsRef.current = null;
        }

        // Loading timeout — if video doesn't start within 15s, show error and auto-switch
        if (loadingTimeoutRef.current) clearTimeout(loadingTimeoutRef.current);
        loadingTimeoutRef.current = setTimeout(() => {
            if (video.readyState < 2) {
                setVideoError('Video failed to load from this server. Auto-switching...');
                setIsLoading(false);
                if (onErrorFallback) {
                    setTimeout(() => onErrorFallback(), 1200);
                }
            }
        }, 15000);

        const isMp4 = src.toLowerCase().includes('.mp4') || src.includes('mp4');

        if (Hls.isSupported() && !isMp4) {
            const hls = new Hls({
                maxMaxBufferLength: 30,
                enableWorker: true,
                lowLatencyMode: true
            });
            hlsRef.current = hls;
            hls.loadSource(src);
            hls.attachMedia(video);

            hls.on(Hls.Events.MANIFEST_PARSED, () => {
                setIsLoading(false);
                setVideoError(null);
                if (loadingTimeoutRef.current) clearTimeout(loadingTimeoutRef.current);

                // Read and set quality levels
                const levels = hls.levels || [];
                setHlsLevels(levels);
                setCurrentQualityIndex(hls.currentLevel);

                const tracks = hls.audioTracks || [];
                setAudioTracks(tracks);
                setCurrentTrackIndex(hls.audioTrack);

                if (tracks.length > 0) {
                    const hindiIdx = tracks.findIndex((t: any) =>
                        t.name.toLowerCase().includes('hindi') ||
                        t.name.toLowerCase().includes('hin') ||
                        t.lang?.toLowerCase().startsWith('hi')
                    );
                    if (hindiIdx !== -1) {
                        console.log(`[HLSPlayer] Auto-switched to Hindi audio track (index ${hindiIdx})`);
                        hls.audioTrack = hindiIdx;
                        setCurrentTrackIndex(hindiIdx);
                    }
                }
            });

            hls.on(Hls.Events.AUDIO_TRACK_SWITCHED, (event: any, data: any) => {
                setCurrentTrackIndex(data.id);
            });

            hls.on(Hls.Events.ERROR, function (event: any, data: any) {
                if (data.fatal) {
                    retryCountRef.current++;
                    console.warn(`[HLSPlayer] Fatal error (attempt ${retryCountRef.current}/${MAX_RETRIES}):`, data.type, data.details);

                    if (retryCountRef.current >= MAX_RETRIES) {
                        // Max retries reached — show error and auto-switch
                        setVideoError('Video could not be loaded. Auto-switching to next server...');
                        setIsLoading(false);
                        if (loadingTimeoutRef.current) clearTimeout(loadingTimeoutRef.current);
                        hls.destroy();
                        if (onErrorFallback) {
                            setTimeout(() => onErrorFallback(), 1200);
                        }
                        return;
                    }

                    switch (data.type) {
                        case Hls.ErrorTypes.NETWORK_ERROR:
                            hls.startLoad();
                            break;
                        case Hls.ErrorTypes.MEDIA_ERROR:
                            hls.recoverMediaError();
                            break;
                        default:
                            setVideoError('Unable to play this video.');
                            setIsLoading(false);
                            if (loadingTimeoutRef.current) clearTimeout(loadingTimeoutRef.current);
                            hls.destroy();
                            break;
                    }
                }
            });
        } else {
            video.src = src;

            // For non-HLS (mp4), listen for native errors
            video.onerror = () => {
                setVideoError('Video failed to load.');
                setIsLoading(false);
                if (loadingTimeoutRef.current) clearTimeout(loadingTimeoutRef.current);
            };
        }

        const handleLoadedMetadata = () => {
            const nativeTracks = (video as any).audioTracks;
            if (nativeTracks && nativeTracks.length > 0) {
                const tracksList = [];
                let activeIdx = 0;
                let hasHindi = false;
                let hindiIdx = -1;

                for (let i = 0; i < nativeTracks.length; i++) {
                    const track = nativeTracks[i];
                    tracksList.push({
                        name: track.label || track.language || `Track ${i + 1}`,
                        lang: track.language,
                        id: i
                    });

                    const isHindi = track.language?.toLowerCase().startsWith('hi') ||
                        track.label?.toLowerCase().includes('hindi') ||
                        track.label?.toLowerCase().includes('hin');

                    if (isHindi) {
                        hasHindi = true;
                        hindiIdx = i;
                    }

                    if (track.enabled) {
                        activeIdx = i;
                    }
                }

                if (hasHindi && hindiIdx !== -1) {
                    for (let i = 0; i < nativeTracks.length; i++) {
                        nativeTracks[i].enabled = (i === hindiIdx);
                    }
                    activeIdx = hindiIdx;
                    console.log(`[HLSPlayer] Native audio auto-switched to Hindi track`);
                }

                setAudioTracks(tracksList);
                setCurrentTrackIndex(activeIdx);
            }
        };
        video.addEventListener('loadedmetadata', handleLoadedMetadata);

        // Clear loading when video can play
        const handleCanPlay = () => {
            setIsLoading(false);
            setVideoError(null);
            if (loadingTimeoutRef.current) clearTimeout(loadingTimeoutRef.current);
        };
        video.addEventListener('canplay', handleCanPlay);

        return () => {
            video.removeEventListener('loadedmetadata', handleLoadedMetadata);
            video.removeEventListener('canplay', handleCanPlay);
            if (loadingTimeoutRef.current) clearTimeout(loadingTimeoutRef.current);
            if (hlsRef.current) {
                hlsRef.current.destroy();
                hlsRef.current = null;
            }
        };
    }, [src, hlsLoaded]);

    // Handle playback speed changes
    useEffect(() => {
        if (videoRef.current) {
            videoRef.current.playbackRate = playbackSpeed;
        }
    }, [playbackSpeed]);

    // Reset playback speed and quality on source changes
    useEffect(() => {
        setPlaybackSpeed(1.0);
        setCustomSpeedVal('1.0');
        setHlsLevels([]);
        setCurrentQualityIndex(-1);
        setShowQualityMenu(false);
    }, [src]);

    // Keep custom input in sync with current speed
    useEffect(() => {
        setCustomSpeedVal(String(playbackSpeed));
    }, [playbackSpeed]);

    // Listen for fullscreen change events
    useEffect(() => {
        const handleFullscreenChange = () => {
            const isFS = !!(document.fullscreenElement || (document as any).webkitFullscreenElement);
            setIsFullscreen(isFS);
            if (!isFS) {
                if (screen.orientation && screen.orientation.unlock) {
                    try {
                        screen.orientation.unlock();
                    } catch (e) { }
                }
            }
        };
        document.addEventListener('fullscreenchange', handleFullscreenChange);
        document.addEventListener('webkitfullscreenchange', handleFullscreenChange);
        return () => {
            document.removeEventListener('fullscreenchange', handleFullscreenChange);
            document.removeEventListener('webkitfullscreenchange', handleFullscreenChange);
        };
    }, []);

    const toggleFullscreen = () => {
        const container = containerRef.current;
        const video = videoRef.current;
        if (!container || !video) return;

        const isFS = !!(document.fullscreenElement || (document as any).webkitFullscreenElement);
        const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as any).MSStream;

        if (!isFS) {
            // iOS Native Fullscreen auto-rotates natively
            if (isIOS && (video as any).webkitEnterFullscreen) {
                (video as any).webkitEnterFullscreen();
                return;
            }

            const req = container.requestFullscreen || (container as any).webkitRequestFullscreen || (container as any).mozRequestFullScreen || (container as any).msRequestFullscreen;
            if (req) {
                req.call(container).then(() => {
                    // Lock orientation to landscape on Android Chrome
                    if (screen.orientation && (screen.orientation as any).lock) {
                        (screen.orientation as any).lock('landscape').catch((err: any) => {
                            console.warn("Screen orientation lock failed:", err);
                        });
                    }
                }).catch(() => {
                    if ((video as any).webkitEnterFullscreen) {
                        (video as any).webkitEnterFullscreen();
                    }
                });
            } else if ((video as any).webkitEnterFullscreen) {
                (video as any).webkitEnterFullscreen();
            }
        } else {
            const exit = document.exitFullscreen || (document as any).webkitExitFullscreen || (document as any).mozCancelFullScreen || (document as any).msExitFullscreen;
            if (exit) {
                exit.call(document);
            }
        }
    };

    const handleQualityChange = (index: number) => {
        if (hlsRef.current) {
            hlsRef.current.currentLevel = index;
            hlsRef.current.nextLevel = index;
            setCurrentQualityIndex(index);
            setShowQualityMenu(false);
        }
    };

    const getQualityLabel = (level: any, idx: number) => {
        if (!level) return 'Auto';
        if (level.height) return `${level.height}p`;
        if (level.name) return level.name;
        return `Quality ${idx + 1}`;
    };

    // Set up onEnded event listener
    useEffect(() => {
        const video = videoRef.current;
        if (!video) return;

        const handleEnded = () => {
            if (onEnded) onEnded();
        };

        video.addEventListener('ended', handleEnded);
        return () => {
            video.removeEventListener('ended', handleEnded);
        };
    }, [onEnded]);

    const handleAudioTrackChange = (index: number) => {
        if (hlsRef.current) {
            hlsRef.current.audioTrack = index;
            setCurrentTrackIndex(index);
        } else if (videoRef.current && (videoRef.current as any).audioTracks) {
            const nativeTracks = (videoRef.current as any).audioTracks;
            for (let i = 0; i < nativeTracks.length; i++) {
                nativeTracks[i].enabled = (i === index);
            }
            setCurrentTrackIndex(index);
        }
    };

    const handleRetry = () => {
        setVideoError(null);
        setIsLoading(true);
        retryCountRef.current = 0;
        if (hlsRef.current) {
            hlsRef.current.destroy();
            hlsRef.current = null;
        }
        if (videoRef.current) {
            videoRef.current.src = '';
        }
        // Re-trigger the effect by toggling hlsLoaded
        setHlsLoaded(false);
        setTimeout(() => {
            if ((window as any).Hls) setHlsLoaded(true);
        }, 100);
    };

    return (
        <div ref={containerRef} className="absolute inset-0 w-full h-full bg-[#000000] flex flex-col justify-between group">
            <style dangerouslySetInnerHTML={{
                __html: `
                @keyframes rippleExpandLeft {
                    0% {
                        transform: translate(-50%, -50%) scale(0.2);
                        opacity: 0;
                    }
                    30% {
                        opacity: 1;
                    }
                    100% {
                        transform: translate(-50%, -50%) scale(1);
                        opacity: 0;
                    }
                }
                @keyframes rippleExpandRight {
                    0% {
                        transform: translate(50%, -50%) scale(0.2);
                        opacity: 0;
                    }
                    30% {
                        opacity: 1;
                    }
                    100% {
                        transform: translate(50%, -50%) scale(1);
                        opacity: 0;
                    }
                }
                .animate-ripple-expand-left {
                    animation: rippleExpandLeft 0.8s cubic-bezier(0.1, 0.8, 0.3, 1) forwards;
                }
                .animate-ripple-expand-right {
                    animation: rippleExpandRight 0.8s cubic-bezier(0.1, 0.8, 0.3, 1) forwards;
                }
                @keyframes flashChevron {
                    0%, 100% { opacity: 0.2; }
                    50% { opacity: 1; }
                }
                .animate-chevron-1-right {
                    animation: flashChevron 0.6s infinite;
                }
                .animate-chevron-2-right {
                    animation: flashChevron 0.6s infinite;
                    animation-delay: 0.15s;
                }
                .animate-chevron-3-right {
                    animation: flashChevron 0.6s infinite;
                    animation-delay: 0.3s;
                }
                .animate-chevron-1-left {
                    animation: flashChevron 0.6s infinite;
                }
                .animate-chevron-2-left {
                    animation: flashChevron 0.6s infinite;
                    animation-delay: 0.15s;
                }
                .animate-chevron-3-left {
                    animation: flashChevron 0.6s infinite;
                    animation-delay: 0.3s;
                }
            `}} />

            <div className="relative w-full flex-grow overflow-hidden">
                {/* Error Overlay */}
                {videoError && (
                    <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-sm">
                        <div className="flex flex-col items-center gap-4 p-6 max-w-md text-center">
                            <div className="w-16 h-16 rounded-full bg-red-500/20 flex items-center justify-center">
                                <svg className="w-8 h-8 text-violet-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
                                </svg>
                            </div>
                            <div>
                                <h3 className="text-white font-bold text-lg mb-1">Video Unavailable</h3>
                                <p className="text-gray-400 text-sm">{videoError}</p>
                            </div>
                            <div className="flex flex-wrap justify-center gap-3">
                                <button
                                    onClick={handleRetry}
                                    className="px-5 py-2.5 bg-gradient-to-r from-violet-600 to-violet-700 text-white font-bold text-sm rounded-xl hover:from-violet-500 hover:to-violet-600 transition-all shadow-lg shadow-violet-950/30 flex items-center gap-2"
                                >
                                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182" />
                                    </svg>
                                    Retry
                                </button>
                                {onErrorFallback && (
                                    <button
                                        onClick={onErrorFallback}
                                        className="px-5 py-2.5 bg-gradient-to-r from-emerald-600 to-teal-600 text-white font-bold text-sm rounded-xl hover:from-emerald-500 hover:to-teal-500 transition-all shadow-lg shadow-emerald-950/30 flex items-center gap-2"
                                    >
                                        <span>⚡ Next Server</span>
                                        <span>➔</span>
                                    </button>
                                )}
                            </div>
                            <p className="text-gray-500 text-xs mt-2">Try switching to a different server if the problem persists.</p>
                        </div>
                    </div>
                )}

                {/* Loading Spinner */}
                {isLoading && !videoError && (
                    <div className="absolute inset-0 z-40 flex items-center justify-center bg-black/60 pointer-events-none">
                        <div className="flex flex-col items-center gap-3">
                            <div className="w-10 h-10 border-3 border-white/20 border-t-red-500 rounded-full animate-spin" />
                            <span className="text-gray-400 text-xs font-medium">Loading video...</span>
                        </div>
                    </div>
                )}

                <video
                    ref={videoRef}
                    controls
                    className={`absolute inset-0 w-full h-full object-contain ${videoError ? 'hidden' : ''}`}
                    autoPlay
                    playsInline
                />

                {/* Floating custom controls (Speed & Quality & Fullscreen) */}
                {!videoError && !isLoading && (
                    <div className="absolute top-4 right-4 z-30 flex items-center gap-2 bg-black/60 backdrop-blur-md border border-white/10 rounded-xl p-1 md:p-1.5 shadow-lg">
                        {/* Quality Selector */}
                        {hlsLevels.length > 0 && (
                            <div className="relative">
                                <button
                                    onClick={() => {
                                        setShowQualityMenu(!showQualityMenu);
                                        setShowSpeedMenu(false);
                                    }}
                                    className="px-2.5 py-1 text-[10px] md:text-xs font-black text-white bg-white/5 hover:bg-white/15 rounded-lg transition-all flex items-center gap-1 border border-white/5"
                                >
                                    <span>⚙️</span>
                                    <span>
                                        {currentQualityIndex === -1
                                            ? 'Auto'
                                            : getQualityLabel(hlsLevels[currentQualityIndex], currentQualityIndex)}
                                    </span>
                                </button>

                                {showQualityMenu && (
                                    <div className="absolute right-0 mt-2 w-28 bg-[#0f0f0f]/95 backdrop-blur-md border border-white/10 rounded-xl shadow-2xl overflow-hidden py-1 z-50 max-h-60 overflow-y-auto scrollbar-thin scrollbar-thumb-white/10">
                                        <button
                                            onClick={() => handleQualityChange(-1)}
                                            className={`w-full text-left px-3.5 py-1.5 text-[10px] md:text-xs font-black transition-colors ${currentQualityIndex === -1
                                                    ? 'bg-violet-600 text-white'
                                                    : 'text-gray-300 hover:bg-white/15 hover:text-white'
                                                }`}
                                        >
                                            Auto
                                        </button>
                                        {hlsLevels.map((level, idx) => (
                                            <button
                                                key={idx}
                                                onClick={() => handleQualityChange(idx)}
                                                className={`w-full text-left px-3.5 py-1.5 text-[10px] md:text-xs font-black transition-colors ${currentQualityIndex === idx
                                                        ? 'bg-violet-600 text-white'
                                                        : 'text-gray-300 hover:bg-white/15 hover:text-white'
                                                    }`}
                                            >
                                                {getQualityLabel(level, idx)}
                                            </button>
                                        ))}
                                    </div>
                                )}
                            </div>
                        )}

                        {/* Speed Selector */}
                        <div className="relative">
                            <button
                                onClick={() => {
                                    setShowSpeedMenu(!showSpeedMenu);
                                    setShowQualityMenu(false);
                                }}
                                className="px-2.5 py-1 text-[10px] md:text-xs font-black text-white bg-white/5 hover:bg-white/15 rounded-lg transition-all flex items-center gap-1 border border-white/5"
                            >
                                <span>⏱️</span>
                                <span>{playbackSpeed === 1.0 ? 'Normal' : `${playbackSpeed}x`}</span>
                            </button>

                            {showSpeedMenu && (
                                <div className="absolute right-0 mt-2 w-32 bg-[#0f0f0f]/95 backdrop-blur-md border border-white/10 rounded-xl shadow-2xl overflow-hidden py-1 z-50 max-h-64 overflow-y-auto scrollbar-thin scrollbar-thumb-white/10">
                                    {[0.25, 0.5, 0.75, 1.0, 1.25, 1.5, 1.75, 2.0, 2.5, 3.0].map((speed) => (
                                        <button
                                            key={speed}
                                            onClick={() => {
                                                setPlaybackSpeed(speed);
                                                setShowSpeedMenu(false);
                                            }}
                                            className={`w-full text-left px-3.5 py-1.5 text-[10px] md:text-xs font-black transition-colors ${playbackSpeed === speed
                                                    ? 'bg-violet-600 text-white'
                                                    : 'text-gray-300 hover:bg-white/15 hover:text-white'
                                                }`}
                                        >
                                            {speed === 1.0 ? '1.0x (Normal)' : `${speed}x`}
                                        </button>
                                    ))}

                                    {/* Custom Speed Form */}
                                    <div className="border-t border-white/10 px-3 py-2 mt-1 bg-white/[0.02]">
                                        <span className="text-[9px] text-gray-500 font-black uppercase tracking-wider block mb-1">Custom Speed</span>
                                        <div className="flex items-center gap-1.5">
                                            <input
                                                type="number"
                                                min="0.1"
                                                max="5.0"
                                                step="0.05"
                                                value={customSpeedVal}
                                                onChange={(e) => setCustomSpeedVal(e.target.value)}
                                                placeholder="1.0"
                                                className="w-12 px-1.5 py-1 text-[10px] bg-white/5 border border-white/10 rounded-lg text-white focus:outline-none focus:border-violet-400 font-black text-center"
                                            />
                                            <button
                                                onClick={() => {
                                                    const val = parseFloat(customSpeedVal);
                                                    if (!isNaN(val) && val >= 0.1 && val <= 5.0) {
                                                        setPlaybackSpeed(val);
                                                        setShowSpeedMenu(false);
                                                    } else {
                                                        alert("Please enter a speed between 0.1 and 5.0");
                                                    }
                                                }}
                                                className="px-2 py-1 bg-gradient-to-r from-violet-600 to-violet-700 hover:from-violet-500 hover:to-violet-600 rounded-lg text-[9px] font-black text-white shadow-md transition-all active:scale-95"
                                            >
                                                Set
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Fullscreen Button */}
                        <button
                            onClick={toggleFullscreen}
                            className="p-1.5 text-white bg-white/5 hover:bg-white/15 rounded-lg transition-all"
                            aria-label="Toggle Fullscreen"
                        >
                            {isFullscreen ? (
                                <svg className="w-3.5 h-3.5 md:w-4.5 md:h-4.5 fill-current" viewBox="0 0 24 24">
                                    <path d="M5 16h3v3h2v-5H5v2zm3-8H5v2h5V5H8v3zm6 11h2v-3h3v-2h-5v5zm2-11V5h-2v5h5V8h-3z" />
                                </svg>
                            ) : (
                                <svg className="w-3.5 h-3.5 md:w-4.5 md:h-4.5 fill-current" viewBox="0 0 24 24">
                                    <path d="M7 14H5v5h5v-2H7v-3zm-2-4h2V7h3V5H5v5zm12 7h-3v2h5v-5h-2v3zM14 5v2h3v3h2V5h-5z" />
                                </svg>
                            )}
                        </button>
                    </div>
                )}

                {/* Click overlay for double-click skip & play/pause toggling */}
                <div
                    onPointerDown={handlePointerDown}
                    className="absolute top-0 left-0 w-full h-[85%] cursor-pointer z-10 select-none touch-none"
                />

                {/* Left Skip Overlay */}
                {leftSkipActive && (
                    <div className="absolute left-0 top-0 bottom-0 w-1/2 pointer-events-none z-20 overflow-hidden rounded-l-3xl flex flex-col items-center justify-center">
                        {/* Ripple background */}
                        <div className="absolute left-0 top-1/2 -translate-y-1/2 w-[180%] aspect-square bg-white/[0.04] rounded-full animate-ripple-expand-left" />

                        {/* Chevrons and text */}
                        <div className="relative z-30 flex flex-col items-center justify-center">
                            <div className="flex items-center justify-center gap-0.5 text-white mb-2">
                                <svg className="w-6 h-6 animate-chevron-3-left fill-current text-white/90" viewBox="0 0 24 24">
                                    <path d="M15.41 7.41L14 6l-6 6 6 6 1.41-1.41L10.83 12z" />
                                </svg>
                                <svg className="w-6 h-6 animate-chevron-2-left fill-current text-white/90" viewBox="0 0 24 24">
                                    <path d="M15.41 7.41L14 6l-6 6 6 6 1.41-1.41L10.83 12z" />
                                </svg>
                                <svg className="w-6 h-6 animate-chevron-1-left fill-current text-white/90" viewBox="0 0 24 24">
                                    <path d="M15.41 7.41L14 6l-6 6 6 6 1.41-1.41L10.83 12z" />
                                </svg>
                            </div>
                            <span className="text-xs font-black text-white/90 tracking-widest uppercase bg-black/30 px-3 py-1 rounded-full backdrop-blur-sm border border-white/5 shadow-md">
                                {accumulatedSkip}s
                            </span>
                        </div>
                    </div>
                )}

                {/* Right Skip Overlay */}
                {rightSkipActive && (
                    <div className="absolute right-0 top-0 bottom-0 w-1/2 pointer-events-none z-20 overflow-hidden rounded-r-3xl flex flex-col items-center justify-center">
                        {/* Ripple background */}
                        <div className="absolute right-0 top-1/2 -translate-y-1/2 w-[180%] aspect-square bg-white/[0.04] rounded-full animate-ripple-expand-right" />

                        {/* Chevrons and text */}
                        <div className="relative z-30 flex flex-col items-center justify-center">
                            <div className="flex items-center justify-center gap-0.5 text-white mb-2">
                                <svg className="w-6 h-6 animate-chevron-1-right fill-current text-white/90" viewBox="0 0 24 24">
                                    <path d="M10 6L8.59 7.41 13.17 12l-4.58 4.59L10 18l6-6z" />
                                </svg>
                                <svg className="w-6 h-6 animate-chevron-2-right fill-current text-white/90" viewBox="0 0 24 24">
                                    <path d="M10 6L8.59 7.41 13.17 12l-4.58 4.59L10 18l6-6z" />
                                </svg>
                                <svg className="w-6 h-6 animate-chevron-3-right fill-current text-white/90" viewBox="0 0 24 24">
                                    <path d="M10 6L8.59 7.41 13.17 12l-4.58 4.59L10 18l6-6z" />
                                </svg>
                            </div>
                            <span className="text-xs font-black text-white/90 tracking-widest uppercase bg-black/30 px-3 py-1 rounded-full backdrop-blur-sm border border-white/5 shadow-md">
                                {accumulatedSkip}s
                            </span>
                        </div>
                    </div>
                )}
            </div>
            {audioTracks.length > 1 && (
                <div className="absolute bottom-16 left-4 right-4 z-50 bg-black/85 backdrop-blur-md p-3 rounded-xl border border-white/10 shadow-2xl flex items-center justify-between gap-4">
                    <div className="flex items-center gap-2">
                        <span className="text-sm">🎧</span>
                        <span className="text-xs font-bold text-gray-300 uppercase tracking-wider">Audio Tracks:</span>
                    </div>
                    <div className="flex flex-wrap gap-1.5 justify-end">
                        {audioTracks.map((track, idx) => (
                            <button
                                key={idx}
                                onClick={() => handleAudioTrackChange(idx)}
                                className={`px-3 py-1.5 rounded-lg text-xs font-black transition-all flex items-center gap-1 ${currentTrackIndex === idx
                                        ? 'bg-gradient-to-r from-violet-600 to-violet-700 text-white shadow-lg shadow-violet-950/20 scale-105'
                                        : 'bg-white/5 text-gray-300 hover:bg-white/10 hover:text-white'
                                    }`}
                            >
                                <span>{currentTrackIndex === idx ? '🟢' : '⚪'}</span>
                                <span>{track.name || `Track ${idx + 1}`}</span>
                            </button>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}

export default function WatchPageClient({ movie, seasons = [], type, slug }: WatchPageClientProps) {
    const isSeriesOrAnime = movie.type === 'series' || movie.type === 'anime';

    // State
    const [currentSeasonNum, setCurrentSeasonNum] = useState<number>(1);
    const [currentEpisodeNum, setCurrentEpisodeNum] = useState<number>(1);
    const [activeServerId, setActiveServerId] = useState<string>('');
    const [clientTmdbId, setClientTmdbId] = useState<string | null>(movie.tmdb_id || null);

    useEffect(() => {
        if (!clientTmdbId && !movie.imdb_id && movie.title) {
            fetch(`/api/tmdb/resolve?title=${encodeURIComponent(movie.title)}&type=${movie.type}&id=${movie.id}`)
                .then(res => res.json())
                .then(data => {
                    if (data?.success && data?.tmdb_id) {
                        setClientTmdbId(String(data.tmdb_id));
                    }
                })
                .catch(() => {});
        }
    }, [clientTmdbId, movie.imdb_id, movie.title, movie.type, movie.id]);
    const [autoNext, setAutoNext] = useState<boolean>(true);
    const [failedServerIds, setFailedServerIds] = useState<Set<string>>(new Set());
    const [serverFilter, setServerFilter] = useState<'all' | 'hindi' | 'fast'>('all');
    const [switchNotification, setSwitchNotification] = useState<string | null>(null);
    const [isServerDropdownOpen, setIsServerDropdownOpen] = useState<boolean>(false);
    const [serverSearchQuery, setServerSearchQuery] = useState<string>('');
    const serverDropdownRef = useRef<HTMLDivElement>(null);

    // Player AdBlocker: Blocks popups & new tabs from 3rd-party video servers (does not affect site ads)
    const [playerAdBlocker, setPlayerAdBlocker] = useState<boolean>(() => {
        if (typeof window !== 'undefined') {
            const saved = localStorage.getItem('nexiplay_player_adblocker');
            return saved !== null ? saved === 'true' : true;
        }
        return true;
    });

    const togglePlayerAdBlocker = useCallback(() => {
        setPlayerAdBlocker(prev => {
            const next = !prev;
            if (typeof window !== 'undefined') {
                localStorage.setItem('nexiplay_player_adblocker', String(next));
            }
            setSwitchNotification(next ? '🛡️ Player AdBlocker Enabled: Popups & New Tabs Blocked' : '⚠️ Player AdBlocker Disabled');
            setTimeout(() => setSwitchNotification(null), 3000);
            return next;
        });
    }, []);

    // Auto-close dropdown when clicking outside or pressing Escape
    useEffect(() => {
        const handleClickOutside = (e: MouseEvent) => {
            if (serverDropdownRef.current && !serverDropdownRef.current.contains(e.target as Node)) {
                setIsServerDropdownOpen(false);
            }
        };
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape') setIsServerDropdownOpen(false);
        };
        document.addEventListener('mousedown', handleClickOutside);
        document.addEventListener('keydown', handleKeyDown);
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
            document.removeEventListener('keydown', handleKeyDown);
        };
    }, []);
    const [searchQuery, setSearchQuery] = useState<string>('');
    const [relatedMovies, setRelatedMovies] = useState<any[]>([]);
    const [watchedEpisodes, setWatchedEpisodes] = useState<string[]>([]);
    const [resolvedUrl, setResolvedUrl] = useState<string>('');
    const [resolvingUrl, setResolvingUrl] = useState<boolean>(false);
    const [activeEpisodeStreams, setActiveEpisodeStreams] = useState<Pick<Episode, 'streaming_url'> | null>(null);
    const [canUseFullscreenAssist, setCanUseFullscreenAssist] = useState(false);
    const playerShellRef = useRef<HTMLDivElement>(null);
    const playerIframeRef = useRef<HTMLIFrameElement>(null);

    // Ad Verification state
    const [isAdVerified, setIsAdVerified] = useState<boolean>(() => {
        if (typeof window !== 'undefined') {
            return checkIsContentVerified(movie.id, movie.type);
        }
        return false;
    });
    const [showAdVerification, setShowAdVerification] = useState<boolean>(false);
    const [pendingServerId, setPendingServerId] = useState<string>('');

    // Fast Direct Download Modal State
    const [showVaultModal, setShowVaultModal] = useState<boolean>(false);
    const [vaultLoadingQuality, setVaultLoadingQuality] = useState<string | null>(null);
    const [vaultError, setVaultError] = useState<string | null>(null);
    const [vaultLinks, setVaultLinks] = useState<Record<string, string>>({});
    const [vaultCopiedQuality, setVaultCopiedQuality] = useState<string | null>(null);

    useEffect(() => {
        setCanUseFullscreenAssist(canRequestPlayerFullscreen());
    }, []);

    const handlePlayerFullscreenRequest = useCallback(() => {
        requestPlayerFullscreen(playerShellRef.current, playerIframeRef.current);
    }, []);

    const sortedSeasons = [...seasons].sort((a, b) => a.season_number - b.season_number);
    const activeSeason = sortedSeasons.find(s => s.season_number === currentSeasonNum) || sortedSeasons[0];
    const episodes = activeSeason?.episodes?.sort((a, b) => a.episode_number - b.episode_number) || [];
    const activeEpisode = episodes.find(e => e.episode_number === currentEpisodeNum) || episodes[0];

    const { settings: adSettings } = useAdSettings();
    const { user, trackEvent } = useAuth();

    // Load watched episodes and initial URL params on mount
    useEffect(() => {
        if (typeof window !== 'undefined') {
            const watched = JSON.parse(localStorage.getItem('watched_episodes') || '[]');
            setWatchedEpisodes(watched);

            const params = new URLSearchParams(window.location.search);
            const s = params.get('season');
            const e = params.get('episode');
            if (s) {
                const sNum = parseInt(s);
                if (!isNaN(sNum)) setCurrentSeasonNum(sNum);
            }
            if (e) {
                const eNum = parseInt(e);
                if (!isNaN(eNum)) setCurrentEpisodeNum(eNum);
            }
        }
    }, []);

    // Re-check and lock/unlock player on settings loaded, content change, or episode/season navigation
    useEffect(() => {
        console.log('[WatchPageClient] Verification check run:', {
            movieId: movie.id,
            movieType: movie.type,
            episode: currentEpisodeNum,
            season: currentSeasonNum,
            hasSettings: !!adSettings,
            isEnabled: adSettings?.isVerificationEnabled
        });
        if (adSettings) {
            console.log('[WatchPageClient] adSettings object:', adSettings);
            const isVerificationEnabled = adSettings.isVerificationEnabled;
            if (!isVerificationEnabled) {
                console.log('[WatchPageClient] verification is disabled, bypassing.');
                setIsAdVerified(true);
                setShowAdVerification(false);
                return;
            }

            const verified = checkIsContentVerified(movie.id, movie.type);
            console.log('[WatchPageClient] checkIsContentVerified result:', verified);
            setIsAdVerified(verified);
            if (!verified) {
                console.log('[WatchPageClient] Not verified, showing popup modal');
                setShowAdVerification(true);
            } else {
                console.log('[WatchPageClient] Verified, hiding popup modal');
                setShowAdVerification(false);
            }
        }
    }, [adSettings, movie.id, movie.type, currentEpisodeNum, currentSeasonNum]);

    // Update URL query parameters on season/episode change
    const updateUrlParams = (season: number, episode: number) => {
        if (typeof window !== 'undefined') {
            const url = new URL(window.location.href);
            url.searchParams.set('season', season.toString());
            url.searchParams.set('episode', episode.toString());
            window.history.pushState({}, '', url.toString());
        }
    };

    // Save watched status when active episode changes
    useEffect(() => {
        if (isSeriesOrAnime && activeEpisode?.id) {
            const watched = JSON.parse(localStorage.getItem('watched_episodes') || '[]');
            if (!watched.includes(activeEpisode.id)) {
                watched.push(activeEpisode.id);
                localStorage.setItem('watched_episodes', JSON.stringify(watched));
                setWatchedEpisodes(watched);
            }
        }
    }, [activeEpisode, isSeriesOrAnime]);

    const currentEventIdRef = useRef<string | null>(null);
    const watchTimeRef = useRef<number>(0);

    useEffect(() => {
        if (!user || !movie.id) return;

        // Generate a new UUID for this specific watch event
        const eventId = crypto.randomUUID();
        currentEventIdRef.current = eventId;
        watchTimeRef.current = 0;

        // Map server ID to friendly name
        const serverName = (() => {
            if (!activeServerId) return 'Default Server';
            if (activeServerId.startsWith('multi_')) {
                const key = activeServerId.replace('multi_', '');
                return `${key.toUpperCase()} (Multi)`;
            }
            if (activeServerId === 'custom') return 'Custom';

            // Find name in availableServers
            const srv = availableServers.find(s => s.id === activeServerId);
            return srv ? srv.name : activeServerId;
        })();

        // Insert initial 0m watch event
        const isMovieUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(movie.id);
        trackEvent({
            id: eventId,
            event_type: 'watch',
            movie_id: isMovieUuid ? movie.id : null,
            episode_id: isSeriesOrAnime ? activeEpisode?.id : null,
            content_type: movie.type,
            content_title: movie.title,
            season_number: isSeriesOrAnime ? currentSeasonNum : null,
            episode_number: isSeriesOrAnime ? currentEpisodeNum : null,
            metadata: {
                server: serverName || null,
                slug,
                server_id: activeServerId
            }
        });

        // Industrial optimization: Update watch duration every 60 seconds (instead of 10s)
        // and flush the final duration on unmount so no watch progress is lost.
        const flushDuration = async () => {
            const elapsed = watchTimeRef.current;
            if (elapsed > 0 && eventId) {
                await supabase
                    .from('user_events')
                    .update({ duration_seconds: elapsed })
                    .eq('id', eventId);
            }
        };

        const timer = setInterval(async () => {
            watchTimeRef.current += 60;
            await flushDuration();
        }, 60000);

        return () => {
            clearInterval(timer);
            flushDuration();
        };
    }, [activeEpisode?.id, activeServerId, currentEpisodeNum, currentSeasonNum, isSeriesOrAnime, movie.id, movie.title, movie.type, slug, trackEvent, user]);

    useEffect(() => {
        if (!isSeriesOrAnime || !activeEpisode?.id) {
            setActiveEpisodeStreams(null);
            return;
        }

        let cancelled = false;

        const loadActiveEpisodeStreams = async () => {
            const { data, error } = await supabase
                .from('episodes')
                .select('streaming_url')
                .eq('id', activeEpisode.id)
                .single();

            if (!cancelled && !error) {
                setActiveEpisodeStreams(data || null);
            }
        };

        loadActiveEpisodeStreams();

        return () => {
            cancelled = true;
        };
    }, [isSeriesOrAnime, activeEpisode?.id, activeEpisode?.streaming_url]);

    // Fetch related movies for movies sidebar
    useEffect(() => {
        const fetchRelated = async () => {
            try {
                const { data } = await supabase
                    .from('movies')
                    .select('*')
                    .eq('type', movie.type)
                    .neq('id', movie.id)
                    .limit(6);
                if (data) setRelatedMovies(data);
            } catch (err) {
                console.error('Error fetching related movies:', err);
            }
        };
        fetchRelated();
    }, [movie.id, movie.type]);

    // Navigation logic
    const goToNextEpisode = () => {
        const nextEpNum = currentEpisodeNum + 1;
        const nextEp = episodes.find(e => e.episode_number === nextEpNum);
        if (nextEp) {
            setCurrentEpisodeNum(nextEpNum);
            updateUrlParams(currentSeasonNum, nextEpNum);
        } else {
            const nextSeasonNum = currentSeasonNum + 1;
            const nextSeason = sortedSeasons.find(s => s.season_number === nextSeasonNum);
            if (nextSeason) {
                setCurrentSeasonNum(nextSeasonNum);
                setCurrentEpisodeNum(1);
                updateUrlParams(nextSeasonNum, 1);
            }
        }
    };

    const goToPrevEpisode = () => {
        const prevEpNum = currentEpisodeNum - 1;
        const prevEp = episodes.find(e => e.episode_number === prevEpNum);
        if (prevEp) {
            setCurrentEpisodeNum(prevEpNum);
            updateUrlParams(currentSeasonNum, prevEpNum);
        } else if (currentSeasonNum > 1) {
            const prevSeasonNum = currentSeasonNum - 1;
            const prevSeason = sortedSeasons.find(s => s.season_number === prevSeasonNum);
            if (prevSeason && prevSeason.episodes && prevSeason.episodes.length > 0) {
                setCurrentSeasonNum(prevSeasonNum);
                const lastEpNum = Math.max(...prevSeason.episodes.map(e => e.episode_number));
                setCurrentEpisodeNum(lastEpNum);
                updateUrlParams(prevSeasonNum, lastEpNum);
            }
        }
    };

    // Determine custom URL
    const getCustomUrl = (): string | null => {
        if (!isSeriesOrAnime) {
            return movie.streaming_url || null;
        }
        return activeEpisode?.streaming_url ?? activeEpisodeStreams?.streaming_url ?? null;
    };

    const customUrl = getCustomUrl();

    // Parse JSON stream urls if present
    const parseStreamingUrlJson = (urlStr: string | null | undefined): Record<string, string> => {
        if (!urlStr) return {};
        const trimmed = urlStr.trim();
        if (trimmed.startsWith('{')) {
            try {
                return JSON.parse(trimmed);
            } catch (e) {
                console.error("Failed to parse streaming_url JSON:", e);
            }
        }
        return {};
    };

    const parseMultiScraperConfig = (raw: string | null | undefined): Record<string, MultiScraperServerConfig> => {
        if (!raw) return {};
        const trimmed = raw.trim();
        if (!trimmed.startsWith('{')) return {};
        try {
            const parsed = JSON.parse(trimmed);
            return parsed && typeof parsed === 'object' ? parsed : {};
        } catch (e) {
            console.error('Failed to parse multi scraper config:', e);
            return {};
        }
    };

    const getConfiguredMultiStreams = (): Record<string, string> => {
        const movieWithConfig = movie as unknown as { scraper_source?: string; scraper_url?: string };
        const streams: Record<string, string> = {};

        if (movieWithConfig.scraper_source === 'multi' && movieWithConfig.scraper_url) {
            const config = parseMultiScraperConfig(movieWithConfig.scraper_url);
            Object.entries(config).forEach(([serverKey, serverConfig]) => {
                if (!serverConfig) return;
                const seasonKey = String(currentSeasonNum);
                const episodeKey = `${currentSeasonNum}_${currentEpisodeNum}`;
                const rawUrl = serverConfig.mode === 'episode'
                    ? serverConfig.episodeUrls?.[episodeKey]
                    : serverConfig.mode === 'separate'
                        ? serverConfig.urls?.[seasonKey]
                        : serverConfig.url;

                if (rawUrl && rawUrl.trim()) {
                    streams[serverKey] = normalizeConfiguredServerUrl(serverKey, rawUrl);
                }
            });
        } else if (movieWithConfig.scraper_source && movieWithConfig.scraper_url) {
            streams[movieWithConfig.scraper_source] = normalizeConfiguredServerUrl(movieWithConfig.scraper_source, movieWithConfig.scraper_url);
        }

        return streams;
    };

    const episodeMultiStreams = parseStreamingUrlJson(isSeriesOrAnime ? (activeEpisode?.streaming_url ?? activeEpisodeStreams?.streaming_url) : movie.streaming_url);
    const multiStreams = {
        ...getConfiguredMultiStreams(),
        ...episodeMultiStreams
    };

    const isServerEnabled = (serverId: string) => {
        if (serverId === 'trailer') return true;
        if (DISABLED_MULTI_SERVER_IDS.has(serverId.toLowerCase())) return false;
        if (!adSettings || !adSettings.socialBarCode) return true;
        const enabledList = adSettings.socialBarCode.split(',').map(s => s.trim().toLowerCase());

        // If explicitly disabled in admin settings
        if (enabledList.includes('none')) return false;
        if (enabledList.includes(`!${serverId.toLowerCase()}`) || enabledList.includes(`disable_${serverId.toLowerCase()}`)) return false;

        // If explicitly in the enabled list
        if (enabledList.includes(serverId.toLowerCase())) return true;

        // Built-in servers are always available so all 20+ servers render for movies & series
        const isBuiltIn = BUILT_IN_SERVERS.some(s => s.id === serverId);
        if (isBuiltIn) return true;

        return false;
    };

    const availableServers = useMemo(() => {
        return SERVERS.filter(srv => {
            if (srv.animeOnly && movie.type !== 'anime') return false;
            if (srv.movieOnly && isSeriesOrAnime) return false;
            return true;
        });
    }, [isSeriesOrAnime, movie.type]);

    // Gate server selection behind ad verification
    const handleServerSelect = useCallback((serverId: string) => {
        const verified = checkIsContentVerified(movie.id, movie.type);
        if (verified) {
            setActiveServerId(serverId);
            setIsAdVerified(true);
        } else {
            setIsAdVerified(false);
            setPendingServerId(serverId);
            setShowAdVerification(true);
        }
    }, [movie.id, movie.type]);

    const handleVerificationComplete = useCallback(() => {
        saveContentVerification(movie.id, movie.type);
        setIsAdVerified(true);
        setShowAdVerification(false);
        if (pendingServerId) {
            setActiveServerId(pendingServerId);
            setPendingServerId('');
        } else if (activeServerId) {
            // Auto-select already set the server before verification.
            // Force re-trigger by briefly clearing and re-setting it.
            const currentServer = activeServerId;
            setActiveServerId('');
            setTimeout(() => setActiveServerId(currentServer), 0);
        } else {
            const firstEnabled = availableServers.find(srv => isServerEnabled(srv.id));
            if (firstEnabled) {
                setActiveServerId(firstEnabled.id);
            }
        }
    }, [movie.id, movie.type, pendingServerId, activeServerId, availableServers]);

    // Auto-select server: ALWAYS prioritize actual streaming players
    useEffect(() => {
        const activeMultiKeys = Object.keys(multiStreams).filter(k => isServerEnabled(k));
        if (activeMultiKeys.length > 0) {
            setActiveServerId(`multi_${activeMultiKeys[0]}`);
        } else if (customUrl && !customUrl.trim().startsWith('{') && isServerEnabled('custom')) {
            setActiveServerId('custom');
        } else {
            const isUpcomingOrFuture = Boolean(
                (movie.release_year && movie.release_year >= new Date().getFullYear() && !movie.streaming_url) ||
                (!movie.streaming_url && movie.trailer_url)
            );
            const isTrailerOnly = movie.streaming_url === 'trailer' || (isUpcomingOrFuture && Boolean(movie.trailer_url));

            if (isTrailerOnly && movie.trailer_url && isServerEnabled('trailer')) {
                setActiveServerId('trailer');
            } else {
                const isHindiTitle = movie.language?.toLowerCase().includes('hindi');
                const hindiServer = isHindiTitle ? availableServers.find(srv => srv.isHindi && isServerEnabled(srv.id)) : null;
                const firstStreaming = availableServers.find(srv => srv.id !== 'trailer' && isServerEnabled(srv.id));
                const firstEnabled = firstStreaming || hindiServer || availableServers.find(srv => isServerEnabled(srv.id));
                if (firstEnabled) {
                    setActiveServerId(firstEnabled.id);
                } else {
                    const firstMulti = Object.keys(multiStreams).find(k => isServerEnabled(k));
                    if (firstMulti) {
                        setActiveServerId(`multi_${firstMulti}`);
                    } else if (customUrl && !customUrl.trim().startsWith('{')) {
                        setActiveServerId('custom');
                    } else {
                        setActiveServerId('');
                    }
                }
            }
        }
    }, [customUrl, movie.id, movie.release_year, movie.language, currentEpisodeNum, currentSeasonNum, adSettings, JSON.stringify(multiStreams)]);

    // Build embed URL
    const getEmbedUrl = (): string => {
        if (activeServerId === 'trailer') {
            const ytId = getYouTubeVideoId(movie.trailer_url || '');
            return ytId ? `https://www.youtube-nocookie.com/embed/${ytId}?autoplay=1&rel=0` : '';
        }
        if (activeServerId.startsWith('multi_')) {
            const key = activeServerId.replace('multi_', '');
            if (key === 'rareanimes') {
                return `/embed/rr?id=${encodeURIComponent(movie.id)}&slug=${encodeURIComponent(movie.slug || '')}&season=${currentSeasonNum}&episode=${currentEpisodeNum}`;
            }
            return normalizePlayerUrl(multiStreams[key] || '');
        }
        if (activeServerId === 'custom') {
            return (customUrl && !customUrl.trim().startsWith('{')) ? normalizePlayerUrl(customUrl) : '';
        }
        const server = availableServers.find(s => s.id === activeServerId);
        if (!server) return '';

        const effectiveTmdb = clientTmdbId || movie.tmdb_id || undefined;
        const serverUrl = isSeriesOrAnime
            ? server.getUrl(movie.id, effectiveTmdb, movie.imdb_id || undefined, movie.mal_id || undefined, currentSeasonNum, currentEpisodeNum) || ''
            : server.getUrl(movie.id, effectiveTmdb, movie.imdb_id || undefined, movie.mal_id || undefined) || '';
        return normalizePlayerUrl(serverUrl);
    };

    const embedUrl = getEmbedUrl();

    // On-the-fly resolver for webpage URLs (Netfilm, Moviebox, Sflix)
    useEffect(() => {
        if (!embedUrl || !isAdVerified) {
            setResolvedUrl('');
            return;
        }

        const isWebPage = embedUrl.includes('netfilm') ||
            embedUrl.includes('moviebox') ||
            embedUrl.includes('sflix');

        if (isWebPage) {
            setResolvingUrl(true);
            fetch(`/api/resolve-embed?url=${encodeURIComponent(embedUrl)}`)
                .then(res => res.json())
                .then(data => {
                    if (data.url) {
                        setResolvedUrl(data.url);
                    } else {
                        setResolvedUrl(embedUrl);
                    }
                })
                .catch(() => {
                    setResolvedUrl(embedUrl);
                })
                .finally(() => {
                    setResolvingUrl(false);
                });
        } else {
            setResolvedUrl(embedUrl);
        }
    }, [embedUrl, isAdVerified]);

    const getActiveStreamUrl = (): string => {
        if (activeServerId.startsWith('multi_')) {
            const key = activeServerId.replace('multi_', '');
            return multiStreams[key] || '';
        }
        if (activeServerId === 'custom') return (customUrl && !customUrl.trim().startsWith('{')) ? customUrl : '';
        return '';
    };

    const activeStreamUrl = getActiveStreamUrl();

    const isM3U8Active = resolvedUrl ? (
        /(?:\.m3u8(?:[?#]|$)|\/hls(?:\/|[?#]|$))/i.test(resolvedUrl) ||
        resolvedUrl.toLowerCase().includes('.mp4') ||
        resolvedUrl.toLowerCase().includes('google-proxy') ||
        resolvedUrl.toLowerCase().includes('streamindia') ||
        resolvedUrl.toLowerCase().includes('fallback.streamindia.co.in/sources') ||
        resolvedUrl.toLowerCase().includes('hakunaymatata.com')
    ) : false;
    const isYouTubeActive = resolvedUrl ? !!getYouTubeVideoId(resolvedUrl) : false;
    const isNativeStreamActive = (
        activeServerId === 'custom' ||
        activeServerId.startsWith('multi_')
    ) && isM3U8Active;

    const isIframePlayerActive = !!resolvedUrl && !isNativeStreamActive;

    // Structured list of all enabled streaming servers
    type ActiveServerItem = {
        id: string;
        name: string;
        icon?: string;
        badge?: string;
        isHindi?: boolean;
        isFailed: boolean;
        isActive: boolean;
        index: number;
    };

    const allActiveServersList = useMemo<ActiveServerItem[]>(() => {
        const list: ActiveServerItem[] = [];

        if (customUrl && !customUrl.trim().startsWith('{') && isServerEnabled('custom')) {
            list.push({
                id: 'custom',
                name: 'Server Nexiplay',
                icon: 'server',
                badge: 'DIRECT CDN',
                isHindi: false,
                isFailed: failedServerIds.has('custom'),
                isActive: activeServerId === 'custom',
                index: list.length + 1
            });
        }

        Object.entries(multiStreams).forEach(([serverKey, streamUrl]) => {
            if (!streamUrl || !isServerEnabled(serverKey)) return;
            const serverNames: Record<string, string> = {
                custom: 'Server Nexiplay',
                rareanimes: 'RR Nexiplay Server',
                doodstream: 'DoodStream Server',
                streamtape: 'Streamtape Server',
                voe: 'Voe Server',
                abyss: 'Abyss Server'
            };
            const badges: Record<string, string> = {
                doodstream: 'DOOD FAST',
                streamtape: 'STREAMTAPE',
                voe: 'VOE PRO',
                abyss: 'ABYSS CDN',
                custom: 'DIRECT CDN',
                rareanimes: 'HINDI DUBBED'
            };
            const srvId = `multi_${serverKey}`;
            const isHindi = ['rareanimes'].includes(serverKey);
            list.push({
                id: srvId,
                name: serverNames[serverKey] || `${serverKey.toUpperCase()} Server`,
                icon: isHindi ? 'audio' : 'server',
                badge: badges[serverKey] || (isHindi ? 'HINDI DUBBED' : 'CUSTOM HD'),
                isHindi,
                isFailed: failedServerIds.has(srvId),
                isActive: activeServerId === srvId,
                index: list.length + 1
            });
        });

        availableServers.forEach(srv => {
            if (!isServerEnabled(srv.id)) return;
            const effectiveTmdb = clientTmdbId || movie.tmdb_id || undefined;
            const url = isSeriesOrAnime
                ? srv.getUrl(movie.id, effectiveTmdb, movie.imdb_id || undefined, movie.mal_id || undefined, currentSeasonNum, currentEpisodeNum)
                : srv.getUrl(movie.id, effectiveTmdb, movie.imdb_id || undefined, movie.mal_id || undefined);
            if (!url) return;

            list.push({
                id: srv.id,
                name: srv.name,
                icon: srv.icon,
                badge: srv.badge,
                isHindi: !!srv.isHindi,
                isFailed: failedServerIds.has(srv.id),
                isActive: activeServerId === srv.id,
                index: list.length + 1
            });
        });

        if (movie.trailer_url && getYouTubeVideoId(movie.trailer_url)) {
            list.push({
                id: 'trailer',
                name: 'Official Trailer (HD)',
                icon: 'trailer',
                badge: 'OFFICIAL 4K',
                isHindi: false,
                isFailed: failedServerIds.has('trailer'),
                isActive: activeServerId === 'trailer',
                index: list.length + 1
            });
        }

        return list;
    }, [customUrl, multiStreams, availableServers, isSeriesOrAnime, movie.id, movie.tmdb_id, movie.imdb_id, movie.mal_id, movie.trailer_url, clientTmdbId, currentSeasonNum, currentEpisodeNum, adSettings, activeServerId, failedServerIds]);

    const allActiveServerIds = useMemo(() => {
        return allActiveServersList.map(s => s.id);
    }, [allActiveServersList]);

    const activeServerName = useMemo(() => {
        if (!activeServerId) return 'Default Server';
        if (activeServerId.startsWith('multi_')) {
            const key = activeServerId.replace('multi_', '');
            const serverNames: Record<string, string> = {
                custom: 'Server Nexiplay',
                rareanimes: 'RR Nexiplay Server',
                doodstream: 'DoodStream Server',
                streamtape: 'Streamtape Server',
                voe: 'Voe Server',
                abyss: 'Abyss Server'
            };
            return serverNames[key] || `${key.toUpperCase()} (Multi)`;
        }
        if (activeServerId === 'trailer') return 'Official Trailer (HD)';
        if (activeServerId === 'custom') return 'Server Nexiplay';

        const srv = availableServers.find(s => s.id === activeServerId);
        return srv ? srv.name : activeServerId;
    }, [activeServerId, availableServers]);

    const currentServerIndex = useMemo(() => {
        return Math.max(0, allActiveServerIds.indexOf(activeServerId));
    }, [allActiveServerIds, activeServerId]);

    const hindiServersCount = useMemo(() => {
        return allActiveServersList.filter(s => s.isHindi && s.id !== 'trailer').length;
    }, [allActiveServersList]);

    const isCurrentServerHindi = useMemo(() => {
        const item = allActiveServersList.find(s => s.id === activeServerId);
        return !!item?.isHindi;
    }, [activeServerId, allActiveServersList]);

    const activeServerObj = useMemo(() => {
        return allActiveServersList.find(s => s.id === activeServerId) || allActiveServersList[0] || {
            id: activeServerId,
            name: activeServerName || 'Default Server',
            icon: 'film',
            badge: 'FAST HD',
            isHindi: false,
            isActive: true,
            isFailed: false,
            index: 1
        };
    }, [allActiveServersList, activeServerId, activeServerName]);

    const topQuickServers = useMemo(() => {
        const hindi = allActiveServersList.filter(s => s.isHindi && s.id !== 'trailer');
        const fast = allActiveServersList.filter(s => !s.isHindi && s.id !== 'trailer');
        const result: ActiveServerItem[] = [];

        // Add top fast servers from MovieBari stack
        if (fast[0]) result.push(fast[0]);
        if (fast[1]) result.push(fast[1]);
        if (fast[2]) result.push(fast[2]);
        // Add top multi-audio / Hindi servers
        if (hindi[0] && !result.some(r => r.id === hindi[0].id)) result.push(hindi[0]);
        if (hindi[1] && !result.some(r => r.id === hindi[1].id)) result.push(hindi[1]);
        if (hindi[2] && !result.some(r => r.id === hindi[2].id)) result.push(hindi[2]);

        for (const s of allActiveServersList) {
            if (result.length >= 6) break;
            if (s.id !== 'trailer' && !result.some(r => r.id === s.id)) result.push(s);
        }
        return result;
    }, [allActiveServersList]);

    const filteredDropdownServers = useMemo(() => {
        return allActiveServersList.filter(s => {
            if (serverFilter === 'hindi' && !s.isHindi) return false;
            if (serverFilter === 'fast' && s.isHindi) return false;
            if (serverSearchQuery.trim()) {
                const q = serverSearchQuery.toLowerCase();
                return s.name.toLowerCase().includes(q) || (s.badge && s.badge.toLowerCase().includes(q));
            }
            return true;
        });
    }, [allActiveServersList, serverFilter, serverSearchQuery]);

    // Fast switch to next working server with failure tracking
    const handleNextServer = useCallback((failedId?: string) => {
        if (allActiveServerIds.length <= 1) return;
        const currentFailed = failedId || activeServerId;

        if (currentFailed) {
            setFailedServerIds(prev => {
                const next = new Set(prev);
                next.add(currentFailed);
                return next;
            });
        }

        const currentIndex = allActiveServerIds.indexOf(activeServerId);

        // Find next non-failed server
        let nextIndex = -1;
        for (let offset = 1; offset < allActiveServerIds.length; offset++) {
            const candidateIdx = (currentIndex + offset) % allActiveServerIds.length;
            const candidateId = allActiveServerIds[candidateIdx];
            if (!failedServerIds.has(candidateId) && candidateId !== currentFailed) {
                nextIndex = candidateIdx;
                break;
            }
        }

        if (nextIndex === -1) {
            nextIndex = (currentIndex + 1) % allActiveServerIds.length;
        }

        const nextServerId = allActiveServerIds[nextIndex];
        const nextServerObj = availableServers.find(s => s.id === nextServerId);
        const nextName = nextServerObj ? nextServerObj.name : nextServerId;

        handleServerSelect(nextServerId);
        setSwitchNotification(`Switched to Server #${nextIndex + 1}: ${nextName}`);
        setTimeout(() => setSwitchNotification(null), 3500);
    }, [allActiveServerIds, activeServerId, failedServerIds, availableServers, handleServerSelect]);

    // Embed player error message listener (cross-origin window.postMessage)
    useEffect(() => {
        const handleWindowMessage = (event: MessageEvent) => {
            try {
                const data = typeof event.data === 'string' ? JSON.parse(event.data) : event.data;
                if (!data) return;
                const isErr = data.event === 'error' ||
                    data.type === 'error' ||
                    data.event === 'PLAYER_ERROR' ||
                    data.status === 'error' ||
                    data?.error;
                if (isErr && activeServerId) {
                    console.warn('[Nexiplay AutoSwitch] Detected error from embed player:', data);
                    handleNextServer(activeServerId);
                }
            } catch {
                // Ignore non-json
            }
        };

        window.addEventListener('message', handleWindowMessage);
        return () => window.removeEventListener('message', handleWindowMessage);
    }, [activeServerId, handleNextServer]);

    // Fast Direct MKV Downloader
    const handleVaultDownload = async (quality: string) => {
        setVaultLoadingQuality(quality);
        setVaultError(null);
        try {
            const targetId = movie.tmdb_id || movie.imdb_id || movie.id;
            const isTv = isSeriesOrAnime;
            const res = await fetch('/api/download/vault', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    type: isTv ? 'tv' : 'movie',
                    id: targetId,
                    season: isTv ? currentSeasonNum : undefined,
                    episode: isTv ? currentEpisodeNum : undefined,
                    quality,
                    title: movie.title,
                })
            });
            const data = await res.json();
            if (!res.ok || !data.success || !data.url) {
                throw new Error(data.error || 'Failed to fetch direct download link.');
            }
            const cleanUrl = data.url.startsWith('/')
                ? `${window.location.origin}${data.url}`
                : data.url;
            setVaultLinks(prev => ({ ...prev, [quality]: cleanUrl }));

            // Trigger direct browser download
            const a = document.createElement('a');
            a.href = cleanUrl;
            a.download = data.fileName || `${(movie.title || 'media').replace(/[^a-zA-Z0-9_\- ]/g, '')}${isTv ? `_S${currentSeasonNum}E${currentEpisodeNum}` : ''}_${quality}.mkv`;
            a.target = '_blank';
            a.rel = 'noopener noreferrer';
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
        } catch (err: any) {
            console.error('[Direct Download Error]:', err);
            setVaultError(err.message || 'Error generating download link. Please try another quality.');
        } finally {
            setVaultLoadingQuality(null);
        }
    };

    // Filter episodes by search query
    const filteredEpisodes = episodes.filter(ep => {
        if (!searchQuery) return true;
        const query = searchQuery.toLowerCase();
        return (
            ep.episode_number.toString() === query ||
            (ep.episode_title && ep.episode_title.toLowerCase().includes(query))
        );
    });

    // Categories names
    const categoriesList = (movie as any).movie_categories?.map((mc: any) => mc.categories?.name).join(', ') || 'N/A';

    const renderEpisodes = () => {
        if (!isSeriesOrAnime || sortedSeasons.length === 0) return null;

        return (
            <div className="glass-panel p-5 rounded-3xl space-y-4">

                {/* Season dropdown / title */}
                <div className="flex items-center justify-between gap-2 border-b border-white/5 pb-3">
                    <div className="flex items-center gap-2">
                        <span className="text-sm">📁</span>
                        <span className="text-sm font-black text-gray-400 uppercase tracking-wider">Episodes</span>
                    </div>

                    {/* Season Selector */}
                    {sortedSeasons.length > 1 && (
                        <select
                            value={currentSeasonNum}
                            onChange={(e) => {
                                const sNum = parseInt(e.target.value);
                                setCurrentSeasonNum(sNum);
                                setCurrentEpisodeNum(1);
                                updateUrlParams(sNum, 1);
                            }}
                            className="bg-white/5 hover:bg-white/10 text-xs font-bold text-white px-3 py-1.5 rounded-lg border border-white/10 outline-none cursor-pointer transition-colors"
                        >
                            {sortedSeasons.map((season) => (
                                <option key={season.id} value={season.season_number} className="bg-[#0f0f0f]">
                                    Season {season.season_number}
                                </option>
                            ))}
                        </select>
                    )}
                </div>

                {/* Episode Search Box */}
                <div className="relative">
                    <input
                        type="text"
                        placeholder="Search episode number..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-xs text-white placeholder-gray-500 outline-none focus:border-violet-400/50 transition-colors"
                    />
                    {searchQuery && (
                        <button
                            onClick={() => setSearchQuery('')}
                            className="absolute right-3 top-3 text-xs text-gray-500 hover:text-white"
                        >
                            ✕
                        </button>
                    )}
                </div>

                {/* Episodes Grid/List */}
                <div className="max-h-[50vh] overflow-y-auto pr-1 space-y-2 custom-scrollbar">
                    {filteredEpisodes.length === 0 ? (
                        <div className="text-center py-6 text-xs text-gray-500">
                            No episodes found
                        </div>
                    ) : (
                        filteredEpisodes.map((ep) => {
                            const isActive = ep.episode_number === currentEpisodeNum;
                            const isWatched = watchedEpisodes.includes(ep.id);
                            return (
                                <button
                                    key={ep.id}
                                    onClick={() => {
                                        setCurrentEpisodeNum(ep.episode_number);
                                        updateUrlParams(currentSeasonNum, ep.episode_number);
                                    }}
                                    className={`w-full p-3 rounded-xl border text-left transition-all flex items-center justify-between gap-3 group ${isActive
                                            ? 'bg-gradient-to-r from-violet-600/20 to-violet-700/10 border-red-500/50 shadow-md'
                                            : 'bg-white/[0.02] border-white/5 hover:bg-white/[0.06] hover:border-white/10'
                                        }`}
                                >
                                    <div className="flex items-center gap-3 min-w-0">
                                        <div className={`w-8 h-8 rounded-lg font-bold text-xs flex items-center justify-center flex-shrink-0 ${isActive
                                                ? 'bg-gradient-to-r from-violet-600 to-violet-700 text-white'
                                                : 'bg-white/5 text-gray-400 group-hover:text-white transition-colors'
                                            }`}>
                                            {ep.episode_number}
                                        </div>
                                        <div className="min-w-0">
                                            <div className={`text-xs font-bold truncate ${isActive ? 'text-violet-300' : 'text-gray-300'}`}>
                                                Episode {ep.episode_number}
                                            </div>
                                            {ep.episode_title && (
                                                <div className="text-[10px] text-gray-500 truncate mt-0.5">
                                                    {ep.episode_title}
                                                </div>
                                            )}
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-1.5 flex-shrink-0">
                                        {isActive && (
                                            <span className="text-[10px] font-black text-violet-300 uppercase tracking-widest flex items-center gap-1 animate-pulse">
                                                <span>🔴</span> PLAYING
                                            </span>
                                        )}
                                        {!isActive && isWatched && (
                                            <span className="text-green-500 text-xs" title="Watched">✓</span>
                                        )}
                                    </div>
                                </button>
                            );
                        })
                    )}
                </div>
            </div>
        );
    };

    return (
        <div className="min-h-screen bg-[#050505] text-white pt-20 pb-6 md:pt-24">
            {/* Background ambient lighting */}
            <div className="absolute top-0 left-0 w-full h-[60vh] overflow-hidden pointer-events-none z-0" suppressHydrationWarning>
                {movie.poster_url && (
                    <Image
                        src={movie.poster_url}
                        alt=""
                        fill
                        className="object-cover opacity-10 blur-[100px]"
                        priority
                    />
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-[#050505] to-transparent" />
            </div>

            <div className="container mx-auto px-4 max-w-7xl relative z-10 space-y-6">

                {/* Header navigation bar */}
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white/[0.02] border border-white/5 rounded-2xl p-4 backdrop-blur-md">
                    <div className="flex items-center gap-4">
                        <Link
                            href={`/${type}/${slug}`}
                            className="p-2.5 bg-white/5 hover:bg-white/10 rounded-xl transition-all border border-white/5 flex items-center justify-center group"
                        >
                            <svg className="w-5 h-5 text-gray-400 group-hover:text-white transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15 19l-7-7 7-7" />
                            </svg>
                        </Link>
                        <div>
                            <div className="flex items-center gap-2 text-xs text-gray-400 mb-1">
                                <Link href="/" className="hover:text-violet-300 transition-colors">Home</Link>
                                <span>›</span>
                                <Link href={`/${type}`} className="hover:text-violet-300 transition-colors capitalize">{type}</Link>
                                <span>›</span>
                                <span className="text-white truncate max-w-[150px]">{movie.title}</span>
                            </div>
                            <h1 className="text-xl md:text-2xl font-black text-white flex items-center gap-2">
                                {movie.title}
                                {isSeriesOrAnime && (
                                    <span className="text-violet-300 font-bold text-sm md:text-base bg-red-500/10 px-2 py-0.5 rounded border border-red-500/20">
                                        S{currentSeasonNum} E{currentEpisodeNum}
                                    </span>
                                )}
                            </h1>
                        </div>
                    </div>

                    {/* Auto Next Toggle */}
                    {isSeriesOrAnime && (
                        <div className="flex items-center gap-2.5 bg-white/5 px-4 py-2.5 rounded-xl border border-white/5">
                            <label className="relative inline-flex items-center cursor-pointer">
                                <input
                                    type="checkbox"
                                    checked={autoNext}
                                    onChange={(e) => setAutoNext(e.target.checked)}
                                    className="sr-only peer"
                                />
                                <div className="w-9 h-5 bg-dark-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-violet-600"></div>
                                <span className="ml-2 text-xs font-bold text-gray-300 whitespace-nowrap">
                                    ⏭️ Auto Next Episode
                                </span>
                            </label>
                        </div>
                    )}
                </div>

                {/* Main Content Grid */}
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">

                    {/* LEFT COLUMN: Player & Info */}
                    <div className="lg:col-span-8 xl:col-span-9 space-y-6">

                        {/* Video Container */}
                        <div
                            ref={playerShellRef}
                            className="nexiplay-player-shell relative w-full aspect-video bg-black rounded-3xl overflow-hidden shadow-2xl border border-white/10 group"
                        >
                            {!isAdVerified ? (
                                <div className="absolute inset-0 flex flex-col items-center justify-center text-gray-400 p-6 bg-dark-900/60 backdrop-blur-sm">
                                    <span className="text-4xl mb-3 animate-pulse">🔒</span>
                                    <p className="font-bold text-white mb-2">Stream Locked</p>
                                    <p className="text-xs text-gray-400 mb-4 text-center max-w-xs leading-relaxed">
                                        Please complete the 2-step verification popup to unlock streaming servers.
                                    </p>
                                    <button
                                        onClick={() => setShowAdVerification(true)}
                                        className="px-5 py-2.5 bg-gradient-to-r from-cyan-500 to-emerald-400 text-black font-black text-xs rounded-xl hover:shadow-[0_0_20px_rgba(0,255,200,0.3)] hover:scale-105 active:scale-95 transition-all duration-300"
                                    >
                                        Unlock Stream
                                    </button>
                                </div>
                            ) : resolvingUrl ? (
                                <div className="absolute inset-0 flex flex-col items-center justify-center text-gray-400 p-6 bg-dark-900/60 backdrop-blur-sm">
                                    <div className="w-10 h-10 border-4 border-red-500 border-t-transparent rounded-full animate-spin mb-4" />
                                    <p className="font-bold text-sm text-white animate-pulse">Resolving streaming server link...</p>
                                </div>
                            ) : resolvedUrl ? (
                                isNativeStreamActive ? (
                                    <HLSVideoPlayer 
                                        src={`${STREAM_PROXY_ENDPOINT}?url=${encodeURIComponent(resolvedUrl)}`} 
                                        onEnded={handleVideoEnded}
                                        onErrorFallback={() => handleNextServer(activeServerId)}
                                    />
                                ) : (
                                    <iframe
                                        ref={playerIframeRef}
                                        src={resolvedUrl}
                                        title="Streaming player"
                                        className="nexiplay-player-frame absolute inset-0 w-full h-full bg-black overflow-hidden"
                                        scrolling="no"
                                        sandbox={playerAdBlocker && !isAntiSandboxUrl(resolvedUrl, activeServerId) ? AD_BLOCK_SANDBOX : undefined}
                                        {...FULLSCREEN_IFRAME_ATTRS}
                                        referrerPolicy={isYouTubeActive ? 'strict-origin-when-cross-origin' : 'no-referrer'}
                                        onError={() => handleNextServer(activeServerId)}
                                    />
                                )
                            ) : (
                                <div className="absolute inset-0 flex flex-col items-center justify-center text-gray-400 p-6 bg-dark-900/60 backdrop-blur-sm">
                                    <span className="text-4xl animate-bounce mb-2">🎞️</span>
                                    <p className="font-bold">Select a server or episode to start streaming</p>
                                </div>
                            )}



                            {/* Toast Notification when server switches */}
                            {switchNotification && (
                                <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-30 px-4 py-2 bg-dark-950/90 backdrop-blur-md border border-violet-500/50 rounded-2xl text-xs font-bold text-white shadow-2xl flex items-center gap-2 animate-in fade-in zoom-in-95 duration-200">
                                    <span className="text-emerald-400">⚡</span>
                                    <span>{switchNotification}</span>
                                </div>
                            )}

                            {isIframePlayerActive && canUseFullscreenAssist && (
                                <button
                                    type="button"
                                    aria-label="Fullscreen"
                                    onClick={handlePlayerFullscreenRequest}
                                    className="nexiplay-fullscreen-assist absolute bottom-0 right-0 z-20 h-16 w-16 bg-transparent opacity-0 md:hidden"
                                    style={{ WebkitTapHighlightColor: 'transparent' }}
                                />
                            )}
                        </div>

                        {/* Player Navigation & Quick Settings */}
                        <div className="flex flex-wrap items-center justify-between gap-4 p-4 bg-white/[0.02] rounded-2xl border border-white/5">
                            {/* Prev / Next buttons */}
                            <div className="flex gap-2">
                                {isSeriesOrAnime && (
                                    <>
                                        <button
                                            onClick={goToPrevEpisode}
                                            disabled={currentSeasonNum === 1 && currentEpisodeNum === 1}
                                            className="px-4 py-2.5 bg-white/5 hover:bg-white/10 disabled:opacity-30 disabled:hover:bg-white/5 disabled:cursor-not-allowed rounded-xl text-xs font-bold transition-all border border-white/5 flex items-center gap-1.5"
                                        >
                                            ◀ Prev Episode
                                        </button>
                                        <button
                                            onClick={goToNextEpisode}
                                            disabled={
                                                currentSeasonNum === sortedSeasons.length &&
                                                currentEpisodeNum === episodes.length
                                            }
                                            className="px-4 py-2.5 bg-white/5 hover:bg-white/10 disabled:opacity-30 disabled:hover:bg-white/5 disabled:cursor-not-allowed rounded-xl text-xs font-bold transition-all border border-white/5 flex items-center gap-1.5"
                                        >
                                            Next Episode ▶
                                        </button>
                                    </>
                                )}
                            </div>

                            {/* Middle Actions: Fast Direct Download (shown only if manual download links are absent) */}
                            {(() => {
                                const currentSeasonObj = seasons.find((s) => s.season_number === currentSeasonNum);
                                const currentEpObj = currentSeasonObj?.episodes?.find((e) => e.episode_number === currentEpisodeNum);
                                const hasManualLinks = isSeriesOrAnime
                                    ? !!(currentEpObj?.download_links && currentEpObj.download_links.length > 0)
                                    : !!((movie as any).download_links && (movie as any).download_links.length > 0);

                                return (
                                    <div className="flex items-center gap-2">
                                        {hasManualLinks ? (
                                            <a
                                                href={`/${type}/${slug}#downloads`}
                                                className="px-4 py-2.5 bg-white/5 hover:bg-white/10 text-gray-200 hover:text-white font-bold text-xs rounded-xl border border-white/10 hover:border-white/20 transition-all flex items-center gap-2"
                                                title="View download links on details page"
                                            >
                                                <svg className="w-4 h-4 text-violet-400 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                                                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                                                    <polyline points="7 10 12 15 17 10" />
                                                    <line x1="12" y1="15" x2="12" y2="3" />
                                                </svg>
                                                <span>Download Links</span>
                                            </a>
                                        ) : (
                                            <button
                                                onClick={() => setShowVaultModal(true)}
                                                className="px-4 py-2.5 bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-white font-black text-xs rounded-xl shadow-lg shadow-emerald-950/40 hover:scale-105 active:scale-95 transition-all flex items-center gap-2"
                                                title="Instant direct MKV download (360p, 480p, 720p, 1080p)"
                                            >
                                                <svg className="w-4 h-4 text-white shrink-0" viewBox="0 0 24 24" fill="currentColor">
                                                    <path d="M13 2L3 14h7l-1 8 10-12h-7l1-8z" />
                                                </svg>
                                                <span>Fast Download</span>
                                                <span className="hidden sm:inline-block px-1.5 py-0.5 bg-black/30 rounded text-[9px] font-black uppercase tracking-wider text-emerald-200">
                                                    DIRECT MKV
                                                </span>
                                            </button>
                                        )}
                                    </div>
                                );
                            })()}


                        </div>

                        {/* Modern Professional Server Selector (Dropdown System) */}
                        <div ref={serverDropdownRef} className="relative z-30">
                            <div className="glass-panel p-4 sm:p-5 rounded-3xl border border-white/10 shadow-2xl bg-gradient-to-r from-white/[0.04] via-white/[0.02] to-black/40 backdrop-blur-xl">
                                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4">
                                    
                                    {/* Left: Active Server Dropdown Toggle */}
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center justify-between gap-2 mb-1.5 flex-wrap">
                                            <div className="flex items-center gap-2">
                                                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse shadow-md shadow-emerald-500/50" />
                                                <span className="text-[11px] font-black text-gray-400 uppercase tracking-widest">
                                                    Streaming Server
                                                </span>
                                                <span className="text-[10px] font-bold text-gray-500">
                                                    ({currentServerIndex + 1}/{allActiveServersList.length})
                                                </span>
                                            </div>

                                            {/* Player AdBlocker Toggle Button */}
                                            {isAntiSandboxUrl(resolvedUrl, activeServerId) ? (
                                                <div
                                                    className="px-2.5 py-1 rounded-xl text-[11px] font-extrabold border bg-emerald-500/10 border-emerald-500/30 text-emerald-300 flex items-center gap-1.5 select-none"
                                                    title="Direct Stream Mode is active for this server to prevent 'Sandbox not allowed' or 'Client blocked' errors. Video will play directly."
                                                >
                                                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                                                    <span>⚡ Direct Player Mode</span>
                                                </div>
                                            ) : (
                                                <button
                                                    type="button"
                                                    onClick={togglePlayerAdBlocker}
                                                    className={`px-2.5 py-1 rounded-xl text-[11px] font-extrabold border transition-all flex items-center gap-1.5 cursor-pointer select-none active:scale-95 ${
                                                        playerAdBlocker
                                                            ? 'bg-emerald-500/15 border-emerald-500/40 text-emerald-300 shadow-sm shadow-emerald-950/40'
                                                            : 'bg-white/5 border-white/10 text-gray-400 hover:text-gray-200'
                                                    }`}
                                                    title={playerAdBlocker ? 'Player AdBlocker is ACTIVE: Popups & new tab redirects from video servers are blocked.' : 'Click to enable Player AdBlocker'}
                                                >
                                                    <span className={`w-1.5 h-1.5 rounded-full ${playerAdBlocker ? 'bg-emerald-400 animate-pulse' : 'bg-gray-500'}`} />
                                                    <svg className="w-3.5 h-3.5 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round">
                                                        <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                                                    </svg>
                                                    <span>Player AdBlocker:</span>
                                                    <span className={playerAdBlocker ? 'text-emerald-400 font-black' : 'text-gray-400'}>
                                                        {playerAdBlocker ? 'ON' : 'OFF'}
                                                    </span>
                                                </button>
                                            )}
                                        </div>

                                        <button
                                            type="button"
                                            onClick={() => setIsServerDropdownOpen(prev => !prev)}
                                            className={`w-full px-4 py-3 rounded-2xl border transition-all duration-300 flex items-center justify-between gap-3 text-left group cursor-pointer ${
                                                isServerDropdownOpen
                                                    ? 'bg-gradient-to-r from-violet-600/30 to-purple-600/20 border-violet-500/60 shadow-[0_0_30px_rgba(139,92,246,0.3)] ring-2 ring-violet-500/40'
                                                    : 'bg-white/5 hover:bg-white/10 border-white/10 hover:border-violet-500/40 shadow-lg'
                                            }`}
                                        >
                                            <div className="flex items-center gap-3 min-w-0 truncate">
                                                <div className={`w-10 h-10 rounded-xl border flex items-center justify-center shrink-0 transition-transform group-hover:scale-105 shadow-inner ${
                                                    activeServerObj.isHindi
                                                        ? 'bg-amber-500/15 border-amber-500/30 text-amber-400'
                                                        : activeServerObj.id === 'vidking'
                                                            ? 'bg-yellow-500/15 border-yellow-500/30 text-yellow-400'
                                                            : activeServerObj.id === 'trailer'
                                                                ? 'bg-rose-500/15 border-rose-500/30 text-rose-400'
                                                                : 'bg-violet-500/15 border-violet-500/30 text-violet-300'
                                                }`}>
                                                    <ServerSvgIcon id={activeServerObj.id} isHindi={activeServerObj.isHindi} className="w-5 h-5" />
                                                </div>
                                                <div className="flex flex-col min-w-0 truncate">
                                                    <div className="flex items-center gap-2 truncate">
                                                        <span className="text-sm sm:text-base font-black text-white truncate group-hover:text-violet-200 transition-colors">
                                                            {activeServerObj.name}
                                                        </span>
                                                        {activeServerObj.badge && (
                                                            <span className={`text-[9px] font-black px-1.5 py-0.5 rounded uppercase tracking-wider shrink-0 ${
                                                                activeServerObj.isHindi
                                                                    ? 'bg-amber-500/25 text-amber-300 border border-amber-500/40'
                                                                    : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                                                            }`}>
                                                                {activeServerObj.badge}
                                                            </span>
                                                        )}
                                                    </div>
                                                    <span className="text-[11px] text-gray-400 flex items-center gap-1.5">
                                                        <span>Server #{activeServerObj.index}</span>
                                                        <span>•</span>
                                                        <span className="text-violet-400 font-semibold">Click to choose from {allActiveServersList.length} servers</span>
                                                    </span>
                                                </div>
                                            </div>

                                            <div className="flex items-center gap-2 pl-2 shrink-0">
                                                <span className="hidden sm:inline-block px-2.5 py-1 rounded-lg bg-white/5 border border-white/10 text-xs font-bold text-gray-300 group-hover:text-white group-hover:border-violet-500/40 transition-all">
                                                    Switch Server
                                                </span>
                                                <div className={`w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center text-gray-400 group-hover:text-white transition-all ${isServerDropdownOpen ? 'bg-violet-600/30 text-white' : ''}`}>
                                                    <svg
                                                        className={`w-4 h-4 transition-transform duration-300 ${isServerDropdownOpen ? 'rotate-180 text-violet-300' : ''}`}
                                                        fill="none"
                                                        viewBox="0 0 24 24"
                                                        stroke="currentColor"
                                                        strokeWidth={2.5}
                                                    >
                                                        <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                                                    </svg>
                                                </div>
                                            </div>
                                        </button>
                                    </div>

                                    {/* Right: Next Server Quick Action */}
                                    {allActiveServersList.length > 1 && (
                                        <div className="sm:self-end pb-0.5 shrink-0">
                                            <button
                                                type="button"
                                                onClick={() => handleNextServer(activeServerId)}
                                                className="w-full sm:w-auto px-4 py-3 bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-500 hover:to-purple-500 text-white font-extrabold text-xs rounded-2xl shadow-lg shadow-violet-950/40 transition-all active:scale-95 flex items-center justify-center gap-2 border border-violet-400/30 hover:border-violet-300/60 group cursor-pointer"
                                                title="Server slow or buffering? Instantly switch to next server"
                                            >
                                                <svg className="w-4 h-4 text-amber-300 shrink-0 group-hover:scale-110 transition-transform" viewBox="0 0 24 24" fill="currentColor">
                                                    <path d="M13 2L3 14h7l-1 8 10-12h-7l1-8z" />
                                                </svg>
                                                <span>Next Server</span>
                                                <svg className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}>
                                                    <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
                                                </svg>
                                            </button>
                                        </div>
                                    )}
                                </div>

                                {/* Quick Shortcuts Row (Top 3 Popular Servers + Dropdown Button) */}
                                {allActiveServersList.length > 1 && (
                                    <div className="mt-3.5 pt-3 border-t border-white/5 flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
                                        <span className="text-[10px] font-black text-gray-500 uppercase tracking-wider shrink-0 mr-1">
                                            Quick Switch:
                                        </span>
                                        {topQuickServers.map((s) => (
                                            <button
                                                key={s.id}
                                                type="button"
                                                onClick={() => handleServerSelect(s.id)}
                                                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0 flex items-center gap-1.5 cursor-pointer ${
                                                    activeServerId === s.id
                                                        ? 'bg-violet-600 text-white shadow-md shadow-violet-950/40 scale-105 ring-1 ring-violet-400'
                                                        : 'bg-white/5 hover:bg-white/10 text-gray-300 hover:text-white border border-white/5'
                                                }`}
                                            >
                                                <ServerSvgIcon id={s.id} isHindi={s.isHindi} className="w-3.5 h-3.5 shrink-0" />
                                                <span>{s.name}</span>
                                                {s.isHindi && (
                                                    <span className="text-[9px] px-1 py-0.2 bg-amber-500/20 text-amber-300 rounded font-black border border-amber-500/30 uppercase tracking-wider">
                                                        HINDI
                                                    </span>
                                                )}
                                            </button>
                                        ))}

                                        <button
                                            type="button"
                                            onClick={() => setIsServerDropdownOpen(prev => !prev)}
                                            className="px-3 py-1.5 rounded-xl text-xs font-bold text-violet-300 hover:text-white bg-violet-500/10 hover:bg-violet-500/20 border border-violet-500/30 shrink-0 flex items-center gap-1.5 transition-all cursor-pointer"
                                        >
                                            <svg className="w-3.5 h-3.5 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                                                <polygon points="12 2 2 7 12 12 22 7 12 2" />
                                                <polyline points="2 17 12 22 22 17" />
                                                <polyline points="2 12 12 17 22 12" />
                                            </svg>
                                            <span>All {allActiveServersList.length} Servers</span>
                                            <svg className={`w-3 h-3 transition-transform duration-200 shrink-0 ${isServerDropdownOpen ? 'rotate-180' : ''}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}>
                                                <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                                            </svg>
                                        </button>
                                    </div>
                                )}
                            </div>

                            {/* FLOATING DROPDOWN MENU */}
                            {isServerDropdownOpen && (
                                <div className="absolute top-full left-0 right-0 mt-3 p-4 sm:p-6 bg-[#0a0a10]/98 backdrop-blur-2xl border border-white/15 rounded-3xl shadow-[0_25px_80px_rgba(0,0,0,0.9)] z-50 animate-in fade-in zoom-in-95 duration-200 space-y-4">
                                    
                                    {/* Dropdown Header: Title, Search, and Close button */}
                                    <div className="flex items-center justify-between gap-3 border-b border-white/10 pb-3 flex-wrap">
                                        <div className="flex items-center gap-2.5">
                                            <div className="w-8 h-8 rounded-xl bg-violet-500/15 border border-violet-500/30 flex items-center justify-center text-violet-400 shrink-0">
                                                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                                                    <circle cx="12" cy="12" r="2" />
                                                    <path d="M16.24 7.76a6 6 0 0 1 0 8.49m-8.48-.01a6 6 0 0 1 0-8.49m11.31-2.82a10 10 0 0 1 0 14.14m-14.14 0a10 10 0 0 1 0-14.14" />
                                                </svg>
                                            </div>
                                            <div>
                                                <h4 className="text-sm font-black text-white uppercase tracking-wider">
                                                    Select Streaming Server
                                                </h4>
                                                <p className="text-[11px] text-gray-400">
                                                    {allActiveServersList.length} global servers available with auto-switch protection
                                                </p>
                                            </div>
                                        </div>

                                        <button
                                            type="button"
                                            onClick={() => setIsServerDropdownOpen(false)}
                                            className="w-8 h-8 rounded-xl bg-white/5 hover:bg-white/15 text-gray-400 hover:text-white transition-all flex items-center justify-center border border-white/5 cursor-pointer"
                                            title="Close server list"
                                        >
                                            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round">
                                                <line x1="18" y1="6" x2="6" y2="18" />
                                                <line x1="6" y1="6" x2="18" y2="18" />
                                            </svg>
                                        </button>
                                    </div>

                                    {/* Search & Filter Toolbar */}
                                    <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
                                        {/* Filter Tabs */}
                                        <div className="flex items-center gap-1.5 flex-wrap">
                                            <button
                                                type="button"
                                                onClick={() => setServerFilter('all')}
                                                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                                                    serverFilter === 'all'
                                                        ? 'bg-violet-600 text-white shadow-md shadow-violet-950/40 ring-1 ring-violet-400'
                                                        : 'bg-white/5 text-gray-400 hover:text-white border border-white/5'
                                                }`}
                                            >
                                                <svg className="w-3.5 h-3.5 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                                                    <polygon points="12 2 2 7 12 12 22 7 12 2" />
                                                    <polyline points="2 17 12 22 22 17" />
                                                    <polyline points="2 12 12 17 22 12" />
                                                </svg>
                                                <span>All ({allActiveServersList.length})</span>
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => setServerFilter('hindi')}
                                                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                                                    serverFilter === 'hindi'
                                                        ? 'bg-gradient-to-r from-amber-500 to-orange-600 text-white shadow-md shadow-amber-500/30'
                                                        : 'bg-amber-500/10 text-amber-300 hover:bg-amber-500/20 border border-amber-500/30'
                                                }`}
                                            >
                                                <svg className="w-3.5 h-3.5 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                                                    <path d="M2 10v4M6 7v10M10 4v16M14 8v8M18 11v2M22 9v6" />
                                                </svg>
                                                <span>Hindi Dubbed ({hindiServersCount})</span>
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => setServerFilter('fast')}
                                                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                                                    serverFilter === 'fast'
                                                        ? 'bg-emerald-600 text-white shadow-md shadow-emerald-950/40'
                                                        : 'bg-emerald-500/10 text-emerald-300 hover:bg-emerald-500/20 border border-emerald-500/30'
                                                }`}
                                            >
                                                <svg className="w-3.5 h-3.5 shrink-0" viewBox="0 0 24 24" fill="currentColor">
                                                    <path d="M13 2L3 14h7l-1 8 10-12h-7l1-8z" />
                                                </svg>
                                                <span>Ultra Fast HD</span>
                                            </button>
                                        </div>

                                        {/* Search Input */}
                                        <div className="relative min-w-[200px]">
                                            <input
                                                type="text"
                                                placeholder="Search server..."
                                                value={serverSearchQuery}
                                                onChange={(e) => setServerSearchQuery(e.target.value)}
                                                className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-1.5 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-violet-500/60 transition-all pr-7"
                                            />
                                            {serverSearchQuery ? (
                                                <button
                                                    onClick={() => setServerSearchQuery('')}
                                                    className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white p-1 rounded cursor-pointer"
                                                >
                                                    <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round">
                                                        <line x1="18" y1="6" x2="6" y2="18" />
                                                        <line x1="6" y1="6" x2="18" y2="18" />
                                                    </svg>
                                                </button>
                                            ) : (
                                                <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-500 pointer-events-none">
                                                    <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round">
                                                        <circle cx="11" cy="11" r="7" />
                                                        <path d="m21 21-4.35-4.35" />
                                                    </svg>
                                                </span>
                                            )}
                                        </div>
                                    </div>

                                    {/* Hindi Guidance in Dropdown */}
                                    {(serverFilter === 'hindi' || isCurrentServerHindi) && (
                                        <div className="p-3 bg-gradient-to-r from-amber-500/15 via-amber-500/5 to-transparent rounded-2xl border border-amber-500/30 flex items-start gap-2.5 text-xs">
                                            <div className="w-7 h-7 rounded-lg bg-amber-500/20 border border-amber-500/30 flex items-center justify-center text-amber-400 shrink-0">
                                                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                                                    <path d="M3 18v-6a9 9 0 0 1 18 0v6" />
                                                    <path d="M21 19a2 2 0 0 1-2 2h-1a2 2 0 0 1-2-2v-3a2 2 0 0 1 2-2h3zM3 19a2 2 0 0 0 2 2h1a2 2 0 0 0 2-2v-3a2 2 0 0 0-2-2H3z" />
                                                </svg>
                                            </div>
                                            <div className="leading-relaxed">
                                                <span className="font-bold text-amber-300">Hindi Dubbed Audio: </span>
                                                <span className="text-gray-300 text-[11px]">
                                                    যদি প্লেয়ার চালু হওয়ার পর English শোনা যায়, প্লেয়ারের <strong>Settings (⚙️)</strong> বা <strong>Audio Track</strong>-এ ক্লিক করে <strong>"Hindi"</strong> সিলেক্ট করুন।
                                                </span>
                                            </div>
                                        </div>
                                    )}

                                    {/* Scrollable Server Grid */}
                                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5 max-h-[360px] overflow-y-auto pr-1 scrollbar-thin scrollbar-thumb-white/15 scrollbar-track-transparent">
                                        {filteredDropdownServers.length === 0 ? (
                                            <div className="col-span-full py-8 text-center text-gray-400 text-xs">
                                                No servers found matching "{serverSearchQuery}".
                                            </div>
                                        ) : (
                                            filteredDropdownServers.map((s) => {
                                                const isActive = activeServerId === s.id;
                                                return (
                                                    <button
                                                        key={s.id}
                                                        type="button"
                                                        onClick={() => {
                                                            handleServerSelect(s.id);
                                                            setIsServerDropdownOpen(false);
                                                        }}
                                                        className={`p-3 rounded-2xl border transition-all flex items-center justify-between gap-3 text-left group cursor-pointer ${
                                                            isActive
                                                                ? 'bg-gradient-to-r from-violet-600/35 to-purple-600/25 border-violet-500/70 shadow-lg shadow-violet-950/40 ring-2 ring-violet-500/40 scale-[1.02]'
                                                                : s.isFailed
                                                                    ? 'bg-red-500/5 hover:bg-white/10 text-gray-400 border-red-500/20'
                                                                    : s.isHindi
                                                                        ? 'bg-amber-500/5 hover:bg-amber-500/15 border-amber-500/20 hover:border-amber-500/50'
                                                                        : 'bg-white/5 hover:bg-white/10 border-white/5 hover:border-violet-500/30'
                                                        }`}
                                                    >
                                                        <div className="flex items-center gap-2.5 min-w-0 truncate">
                                                            <div className={`w-9 h-9 rounded-xl border flex items-center justify-center shrink-0 transition-transform group-hover:scale-110 shadow-inner ${
                                                                s.isHindi
                                                                    ? 'bg-amber-500/10 border-amber-500/25 text-amber-400 group-hover:bg-amber-500/20'
                                                                    : s.id === 'vidking'
                                                                        ? 'bg-yellow-500/10 border-yellow-500/25 text-yellow-400 group-hover:bg-yellow-500/20'
                                                                        : s.id === 'trailer'
                                                                            ? 'bg-rose-500/10 border-rose-500/25 text-rose-400 group-hover:bg-rose-500/20'
                                                                            : 'bg-cyan-500/10 border-cyan-500/25 text-cyan-400 group-hover:bg-cyan-500/20'
                                                            }`}>
                                                                <ServerSvgIcon id={s.id} isHindi={s.isHindi} className="w-4 h-4" />
                                                            </div>
                                                            <div className="flex flex-col min-w-0 truncate">
                                                                <span className="text-xs font-bold text-white truncate flex items-center gap-1.5">
                                                                    {s.name}
                                                                </span>
                                                                <span className="text-[10px] text-gray-400">
                                                                    Server #{s.index}
                                                                </span>
                                                            </div>
                                                        </div>

                                                        <div className="flex items-center gap-1.5 shrink-0">
                                                            {s.badge && (
                                                                <span className={`text-[8px] font-black px-1.5 py-0.5 rounded uppercase tracking-wider ${
                                                                    s.isHindi
                                                                        ? 'bg-amber-500/25 text-amber-300 border border-amber-500/40'
                                                                        : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                                                                }`}>
                                                                    {s.badge}
                                                                </span>
                                                            )}
                                                            {isActive ? (
                                                                <span className="px-1.5 py-0.5 bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 text-[9px] font-black uppercase rounded tracking-wider flex items-center gap-1">
                                                                    <svg className="w-2.5 h-2.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={3} strokeLinecap="round" strokeLinejoin="round">
                                                                        <polyline points="20 6 9 17 4 12" />
                                                                    </svg>
                                                                    <span>Active</span>
                                                                </span>
                                                            ) : s.isFailed ? (
                                                                <span className="px-1.5 py-0.5 bg-red-500/20 text-red-400 text-[8px] font-bold rounded">
                                                                    Stalled
                                                                </span>
                                                            ) : null}
                                                        </div>
                                                    </button>
                                                );
                                            })
                                        )}
                                    </div>

                                    {/* Footer Watchdog Tip */}
                                    <div className="pt-2 border-t border-white/5 flex items-center justify-between text-[11px] text-gray-400">
                                        <span className="flex items-center gap-1.5">
                                            <div className="w-4 h-4 rounded-full bg-violet-500/20 text-violet-400 flex items-center justify-center shrink-0">
                                                <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round">
                                                    <circle cx="12" cy="12" r="10" />
                                                    <line x1="12" y1="16" x2="12" y2="12" />
                                                    <line x1="12" y1="8" x2="12.01" y2="8" strokeWidth={3} />
                                                </svg>
                                            </div>
                                            <span>Smart Auto-Switch: Server বাফারিং হলে ৩ সেকেন্ডে পরবর্তী সার্ভারে সুইচ হবে।</span>
                                        </span>
                                        <button
                                            type="button"
                                            onClick={() => setIsServerDropdownOpen(false)}
                                            className="text-violet-300 hover:text-white font-bold text-xs flex items-center gap-1 transition-colors cursor-pointer"
                                        >
                                            <span>Done</span>
                                            <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round">
                                                <line x1="18" y1="6" x2="6" y2="18" />
                                                <line x1="6" y1="6" x2="18" y2="18" />
                                            </svg>
                                        </button>
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Mobile Episodes selection (only visible on mobile/tablet) */}
                        {isSeriesOrAnime && sortedSeasons.length > 0 && (
                            <div className="block lg:hidden">
                                {renderEpisodes()}
                            </div>
                        )}

                        {/* Title Info & Description */}
                        <div className="glass-panel p-6 sm:p-8 rounded-3xl space-y-4">
                            <div className="flex flex-wrap gap-2.5">
                                <span className="px-3 py-1 bg-violet-600 text-white text-[10px] font-black uppercase rounded tracking-wider shadow-lg shadow-violet-950/40">
                                    {movie.type}
                                </span>
                                {movie.release_year && (
                                    <span className="px-3 py-1 bg-white/5 text-gray-300 text-[10px] font-bold rounded border border-white/5">
                                        {movie.release_year}
                                    </span>
                                )}
                                {movie.language && (
                                    <span className="px-3 py-1 bg-white/5 text-gray-300 text-[10px] font-bold rounded border border-white/5">
                                        {movie.language}
                                    </span>
                                )}
                            </div>

                            <h2 className="text-2xl md:text-3xl font-black text-white leading-tight">
                                {movie.title}
                                {isSeriesOrAnime && activeEpisode?.episode_title && (
                                    <span className="text-gray-400 font-normal ml-3 text-lg md:text-xl block md:inline mt-1 md:mt-0">
                                        - S{currentSeasonNum} E{currentEpisodeNum}: {activeEpisode.episode_title}
                                    </span>
                                )}
                            </h2>

                            <p className="text-gray-300 text-base md:text-lg leading-relaxed max-w-4xl border-t border-white/5 pt-4">
                                {movie.description}
                            </p>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 border-t border-white/5 pt-4 text-sm text-gray-400">
                                <div className="space-y-2">
                                    <div className="flex"><span className="font-bold text-white min-w-[100px]">Genres:</span> <span>{categoriesList}</span></div>
                                    {movie.cast_members && (
                                        <div className="flex"><span className="font-bold text-white min-w-[100px]">Cast:</span> <span className="line-clamp-2">{movie.cast_members}</span></div>
                                    )}
                                </div>
                                <div className="space-y-2">
                                    {movie.source && (
                                        <div className="flex"><span className="font-bold text-white min-w-[100px]">Source:</span> <span>{movie.source}</span></div>
                                    )}
                                    {movie.subtitle && (
                                        <div className="flex"><span className="font-bold text-white min-w-[100px]">Subtitles:</span> <span>{movie.subtitle}</span></div>
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* Banner Ad placement */}
                        <div className="w-full flex justify-center py-2">
                            <AdBanner placement="home_bottom" size="728x90" />
                        </div>

                    </div>

                    {/* RIGHT COLUMN: Sidebar (Episodes List or Related Content) */}
                    <div className="lg:col-span-4 xl:col-span-3 space-y-6">

                        {isSeriesOrAnime && sortedSeasons.length > 0 && (
                            <div className="hidden lg:block">
                                {renderEpisodes()}
                            </div>
                        )}

                        {!isSeriesOrAnime && (
                            /* Sidebar for movies: Display related movies */
                            <div className="glass-panel p-5 rounded-3xl space-y-4">
                                <div className="flex items-center gap-2 border-b border-white/5 pb-3">
                                    <span className="text-sm">🎬</span>
                                    <span className="text-sm font-black text-gray-400 uppercase tracking-wider">Related Movies</span>
                                </div>

                                <div className="space-y-3.5">
                                    {relatedMovies.length === 0 ? (
                                        <div className="text-center py-6 text-xs text-gray-500">
                                            No related movies found
                                        </div>
                                    ) : (
                                        relatedMovies.map((m) => (
                                            <Link
                                                key={m.id}
                                                href={`/watch/${m.type}/${m.slug}`}
                                                className="flex gap-3 bg-white/[0.01] hover:bg-white/[0.05] p-2 rounded-2xl border border-white/5 transition-all group"
                                            >
                                                <div className="relative w-14 aspect-[2/3] rounded-lg overflow-hidden flex-shrink-0 border border-white/5">
                                                    {m.poster_url ? (
                                                        <Image
                                                            src={m.poster_url}
                                                            alt={m.title}
                                                            fill
                                                            className="object-cover"
                                                        />
                                                    ) : (
                                                        <div className="w-full h-full bg-dark-800 flex items-center justify-center text-[8px] text-gray-600">
                                                            No Poster
                                                        </div>
                                                    )}
                                                </div>
                                                <div className="min-w-0 flex flex-col justify-center">
                                                    <h4 className="text-xs font-bold text-gray-200 group-hover:text-violet-300 transition-colors line-clamp-2 leading-snug">
                                                        {m.title}
                                                    </h4>
                                                    <div className="flex items-center gap-2 text-[10px] text-gray-500 mt-1">
                                                        <span>{m.release_year}</span>
                                                        <span>•</span>
                                                        <span className="capitalize">{m.type}</span>
                                                    </div>
                                                </div>
                                            </Link>
                                        ))
                                    )}
                                </div>
                            </div>
                        )}

                        {/* Sidebar Ad Placement */}
                        <div className="w-full flex justify-center py-2">
                            <AdBanner placement="movie_sidebar" size="300x250" />
                        </div>
                    </div>

                </div>

                {/* Comment Section & Related Posts bottom block */}
                <div className="border-t border-white/5 pt-10 grid grid-cols-1 lg:grid-cols-12 gap-8">
                    <div className="lg:col-span-8 xl:col-span-9 space-y-8">
                        {/* Related posts bottom recommendation */}
                        <div>
                            <h3 className="text-xl font-black text-white mb-6 flex items-center gap-3">
                                <span className="w-1.5 h-6 bg-violet-600 rounded-full"></span>
                                You May Also Like
                            </h3>
                            <RelatedPosts currentMovieId={movie.id} type={movie.type} />
                        </div>

                        {/* Comment section */}
                        <div>
                            <h3 className="text-xl font-black text-white mb-6 flex items-center gap-3">
                                <span className="w-1.5 h-6 bg-violet-600 rounded-full"></span>
                                Discussion & Comments
                            </h3>
                            <CommentSection movieId={movie.id} />
                        </div>
                    </div>
                </div>

            </div>

            {/* Ad Verification Popup */}
            {showAdVerification && (
                <AdVerificationPopup
                    onVerified={handleVerificationComplete}
                    adUrl1={adSettings?.verificationAdUrl1 || adSettings?.directLinkUrl || 'https://nexiplay.live'}
                    adUrl2={adSettings?.verificationAdUrl2 || adSettings?.popunderUrl || undefined}
                    onClose={() => setShowAdVerification(false)}
                    contentType="stream"
                    contentId={movie.id}
                />
            )}

            {/* Fast Direct Download Modal */}
            {showVaultModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
                    <div className="relative w-full max-w-lg bg-[#0e0e12] border border-emerald-500/30 rounded-3xl p-6 sm:p-7 shadow-2xl shadow-emerald-950/50 space-y-5">
                        {/* Close button */}
                        <button
                            onClick={() => setShowVaultModal(false)}
                            className="absolute top-5 right-5 w-8 h-8 rounded-full bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white flex items-center justify-center text-sm transition-all"
                        >
                            ✕
                        </button>

                        {/* Modal Header */}
                        <div className="flex items-center gap-3">
                            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center text-2xl shadow-lg shadow-emerald-950/40">
                                ⚡
                            </div>
                            <div>
                                <h3 className="text-lg font-black text-white flex items-center gap-2">
                                    Fast Direct Download
                                    <span className="text-[10px] font-black bg-emerald-500/20 text-emerald-400 px-2 py-0.5 rounded border border-emerald-500/30">
                                        DIRECT MKV
                                    </span>
                                </h3>
                                <p className="text-xs text-gray-400">
                                    High-Speed Multi-threaded CDN • Direct MKV
                                </p>
                            </div>
                        </div>

                        {/* Target Media Info */}
                        <div className="p-3.5 bg-white/[0.03] border border-white/5 rounded-2xl flex items-center justify-between">
                            <div className="truncate mr-3">
                                <p className="text-xs font-bold text-white truncate">
                                    {movie.title}
                                </p>
                                {isSeriesOrAnime && (
                                    <p className="text-[11px] text-emerald-400 font-black mt-0.5">
                                        Season {currentSeasonNum} • Episode {currentEpisodeNum}
                                    </p>
                                )}
                            </div>
                            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider bg-white/5 px-2.5 py-1 rounded-lg shrink-0">
                                {movie.type}
                            </span>
                        </div>

                        {/* Error Notice */}
                        {vaultError && (
                            <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-xl text-xs text-red-300 flex items-center justify-between">
                                <span>⚠️ {vaultError}</span>
                                <button onClick={() => setVaultError(null)} className="text-xs ml-2 underline">Dismiss</button>
                            </div>
                        )}

                        {/* Quality Options Grid */}
                        <div className="space-y-2.5">
                            <label className="text-[11px] font-black uppercase tracking-wider text-gray-400">
                                Select Quality for Instant Direct Download:
                            </label>
                            <div className="grid grid-cols-2 gap-2.5">
                                {[
                                    { q: '1080p', label: '1080p Full HD', badge: 'Ultra HD', color: 'from-emerald-500 to-teal-600' },
                                    { q: '720p', label: '720p HD', badge: 'Recommended', color: 'from-cyan-500 to-blue-600' },
                                    { q: '480p', label: '480p Standard', badge: 'Standard', color: 'from-violet-500 to-purple-600' },
                                    { q: '360p', label: '360p Data Saver', badge: 'Data Saver', color: 'from-amber-500 to-orange-600' },
                                ].map(({ q, label, badge, color }) => {
                                    const isLoading = vaultLoadingQuality === q;
                                    const hasLink = !!vaultLinks[q];
                                    const isCopied = vaultCopiedQuality === q;

                                    return (
                                        <div
                                            key={q}
                                            className="p-3 bg-white/[0.02] border border-white/5 rounded-2xl hover:border-emerald-500/30 transition-all flex flex-col justify-between gap-2.5 group"
                                        >
                                            <div className="flex items-center justify-between">
                                                <span className="text-xs font-bold text-white group-hover:text-emerald-300 transition-colors">
                                                    {label}
                                                </span>
                                                <span className="text-[9px] font-black uppercase text-gray-400 bg-white/5 px-1.5 py-0.5 rounded">
                                                    {badge}
                                                </span>
                                            </div>

                                            <div className="flex items-center gap-1.5">
                                                <button
                                                    onClick={() => handleVaultDownload(q)}
                                                    disabled={isLoading}
                                                    className={`flex-1 py-2 px-3 rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 transition-all text-white bg-gradient-to-r ${color} hover:opacity-90 active:scale-95 disabled:opacity-50`}
                                                >
                                                    {isLoading ? (
                                                        <>
                                                            <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                                                            <span className="text-[11px]">Fetching...</span>
                                                        </>
                                                    ) : hasLink ? (
                                                        <>
                                                            <span>✓</span>
                                                            <span className="text-[11px]">Download Again</span>
                                                        </>
                                                    ) : (
                                                        <>
                                                            <span>⚡</span>
                                                            <span className="text-[11px]">Direct Download</span>
                                                        </>
                                                    )}
                                                </button>

                                                {hasLink && (
                                                    <button
                                                        onClick={() => {
                                                            navigator.clipboard.writeText(vaultLinks[q]);
                                                            setVaultCopiedQuality(q);
                                                            setTimeout(() => setVaultCopiedQuality(null), 2000);
                                                        }}
                                                        className="p-2 bg-white/5 hover:bg-white/10 rounded-xl text-xs text-gray-300 hover:text-white transition-all shrink-0"
                                                        title="Copy Direct MKV Link"
                                                    >
                                                        {isCopied ? '✓' : '📋'}
                                                    </button>
                                                )}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>

                        {/* Footer Tips */}
                        <div className="p-3 bg-white/[0.02] rounded-xl border border-white/5 text-[11px] text-gray-400 space-y-1">
                            <p className="flex items-center gap-1.5 text-gray-300 font-bold">
                                <span>💡</span> IDM & 1DM Downloader Supported
                            </p>
                            <p className="text-[10px] leading-relaxed">
                                Direct `.mkv` files can be played with VLC, MX Player, or downloaded with multi-threaded download managers.
                            </p>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );

    // Auto next / end of video handler
    function handleVideoEnded() {
        if (autoNext && isSeriesOrAnime) {
            goToNextEpisode();
        }
    }
}
