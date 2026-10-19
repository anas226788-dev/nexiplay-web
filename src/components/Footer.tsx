'use client';

import Link from 'next/link';
import Image from 'next/image';
import { useEffect, useState } from 'react';
import { SOCIAL_ICONS } from '@/config/socials';
import { getAppSettings, getTelegramSettings } from '@/lib/settingsCache';

interface SocialLinks {
    telegram: string | null;
    pinterest: string | null;
    twitter: string | null;
    reddit: string | null;
    tumblr: string | null;
    aboutMe: string | null;
    facebook: string | null;
    youtube: string | null;
    instagram: string | null;
    threads: string | null;
}

const EMPTY_SOCIAL_LINKS: SocialLinks = {
    telegram: null,
    pinterest: null,
    twitter: null,
    reddit: null,
    tumblr: null,
    aboutMe: null,
    facebook: null,
    youtube: null,
    instagram: null,
    threads: null,
};

export default function Footer() {
    const [socialLinks, setSocialLinks] = useState<SocialLinks>(EMPTY_SOCIAL_LINKS);

    useEffect(() => {
        let cancelled = false;

        const fetchSettings = async () => {
            const [appSettings, telegramSettings] = await Promise.all([
                getAppSettings(),
                getTelegramSettings(),
            ]);

            if (cancelled) return;

            setSocialLinks({
                telegram: telegramSettings?.is_active ? telegramSettings.telegram_url : null,
                pinterest: appSettings?.social_pinterest ?? null,
                twitter: appSettings?.social_twitter ?? null,
                reddit: appSettings?.social_reddit ?? null,
                tumblr: appSettings?.social_tumblr ?? null,
                aboutMe: appSettings?.social_aboutme ?? null,
                facebook: appSettings?.social_facebook ?? null,
                youtube: appSettings?.social_youtube ?? null,
                instagram: appSettings?.social_instagram ?? null,
                threads: appSettings?.social_threads ?? null,
            });
        };

        fetchSettings();
        return () => {
            cancelled = true;
        };
    }, []);

    const currentYear = new Date().getFullYear();

    const footerLinks = {
        browse: [
            { href: '/movies', label: 'Movies' },
            { href: '/series', label: 'Series' },
            { href: '/anime', label: 'Anime' },
            { href: '/mood', label: 'Vibe Check' },
            { href: '/novels', label: 'Novels' },
        ],
        genres: [
            { href: '/genre/action', label: 'Action' },
            { href: '/genre/comedy', label: 'Comedy' },
            { href: '/genre/drama', label: 'Drama' },
            { href: '/genre/horror', label: 'Horror' },
        ],
        legal: [
            { href: '/privacy-policy', label: 'Privacy Policy' },
            { href: '/terms', label: 'Terms of Service' },
            { href: '/dmca', label: 'DMCA' },
            { href: '/credits', label: 'Credits' },
            { href: '/contact', label: 'Contact' },
        ],
    };

    return (
        <footer className="relative mt-20 overflow-hidden border-t border-white/[0.07] bg-[radial-gradient(ellipse_at_18%_0%,rgba(146,115,245,0.11),transparent_38%),radial-gradient(ellipse_at_90%_100%,rgba(87,214,192,0.055),transparent_32%)]">
            <div className="container relative mx-auto px-4 pb-28 pt-12 md:pb-10 md:pt-14">
                <div className="grid grid-cols-2 gap-x-6 gap-y-10 md:grid-cols-[1.6fr_1fr_1fr_1fr] md:gap-10">
                    {/* Brand */}
                    <div className="col-span-2 md:col-span-1">
                        <Link href="/" className="mb-4 inline-flex items-center gap-3 rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#B09AFF]">
                            <Image src="/nexiplay-emblem.png" alt="" width={512} height={358} className="h-10 w-12 shrink-0 object-contain drop-shadow-[0_0_10px_rgba(146,115,245,0.35)]" />
                            <span className="text-lg font-extrabold tracking-tight text-white">NEXI<span className="text-[#B09AFF]">PLAY</span></span>
                        </Link>
                        <p className="max-w-xs text-sm leading-6 text-gray-400">
                            Your ultimate destination for downloading movies, series, and anime in high quality.
                        </p>
                    </div>

                    {/* Browse */}
                    <div>
                        <h4 className="mb-4 text-xs font-bold uppercase tracking-[0.16em] text-white">Browse</h4>
                        <ul className="space-y-3">
                            {footerLinks.browse.map((link) => (
                                <li key={link.href}>
                                    <Link
                                        href={link.href}
                                        className="text-sm text-gray-400 transition-colors duration-200 hover:text-[#B09AFF]"
                                    >
                                        {link.label}
                                    </Link>
                                </li>
                            ))}
                        </ul>
                    </div>

                    {/* Genres */}
                    <div>
                        <h4 className="mb-4 text-xs font-bold uppercase tracking-[0.16em] text-white">Genres</h4>
                        <ul className="space-y-3">
                            {footerLinks.genres.map((link) => (
                                <li key={link.href}>
                                    <Link
                                        href={link.href}
                                        className="text-sm text-gray-400 transition-colors duration-200 hover:text-[#B09AFF]"
                                    >
                                        {link.label}
                                    </Link>
                                </li>
                            ))}
                        </ul>
                    </div>

                    {/* Legal */}
                    <div>
                        <h4 className="mb-4 text-xs font-bold uppercase tracking-[0.16em] text-white">Legal</h4>
                        <ul className="space-y-3">
                            {footerLinks.legal.map((link) => (
                                <li key={link.href}>
                                    <Link
                                        href={link.href}
                                        className="text-sm text-gray-400 transition-colors duration-200 hover:text-[#B09AFF]"
                                    >
                                        {link.label}
                                    </Link>
                                </li>
                            ))}
                        </ul>
                    </div>
                </div>

                {/* Bottom Bar */}
                <div className="mt-10 flex flex-col items-center justify-between gap-5 border-t border-white/[0.08] pt-6 md:flex-row">
                    <p className="text-center text-xs text-gray-500 md:text-left md:text-sm">
                        © {currentYear} Nexiplay. All rights reserved.
                    </p>
                    <div className="flex flex-wrap items-center justify-center gap-2.5">
                        {/* Social Links */}
                        {Object.entries(SOCIAL_ICONS).map(([key, icon]) => {
                            const href = socialLinks[key as keyof typeof socialLinks];
                            if (!href) return null;

                            return (
                                <a
                                    key={key}
                                    href={href}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="group flex h-10 w-10 items-center justify-center rounded-xl border border-white/[0.08] bg-white/[0.025] text-gray-400 shadow-[0_0_9px_rgba(146,115,245,0.12)] transition-all duration-200 hover:-translate-y-0.5 hover:border-[#9273F5]/50 hover:bg-[#9273F5]/10 hover:text-white hover:shadow-[0_0_20px_rgba(146,115,245,0.42)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#B09AFF]"
                                    aria-label={icon.label}
                                    title={icon.label}
                                >
                                    <svg
                                        className="h-[18px] w-[18px] fill-current drop-shadow-[0_0_5px_rgba(176,154,255,0.42)] transition-all duration-200 group-hover:scale-110 group-hover:drop-shadow-[0_0_10px_rgba(176,154,255,0.95)]"
                                        viewBox={icon.viewBox}
                                    >
                                        <path d={icon.path} />
                                    </svg>
                                </a>
                            );
                        })}
                    </div>
                </div>
            </div>
        </footer>
    );
}
