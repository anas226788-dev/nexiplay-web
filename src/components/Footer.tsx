'use client';

import Link from 'next/link';
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
            { href: '/contact', label: 'Contact' },
        ],
    };

    return (
        <footer className="border-t border-white/5 mt-20">
            <div className="container mx-auto px-4 py-12 pb-28 md:pb-12">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
                    {/* Brand */}
                    <div className="col-span-2 md:col-span-1">
                        <Link href="/" className="flex items-center gap-2 mb-4">
                            <div className="w-10 h-10 rounded-lg gradient-accent flex items-center justify-center">
                                <svg
                                    className="w-6 h-6 text-white"
                                    fill="currentColor"
                                    viewBox="0 0 24 24"
                                >
                                    <path d="M4 4h4v4H4V4zm6 0h4v4h-4V4zm6 0h4v4h-4V4zM4 10h4v4H4v-4zm6 0h4v4h-4v-4zm6 0h4v4h-4v-4zM4 16h4v4H4v-4zm6 0h4v4h-4v-4zm6 0h4v4h-4v-4z" />
                                </svg>
                            </div>
                            <span className="text-xl font-bold">Nexiplay</span>
                        </Link>
                        <p className="text-gray-400 text-sm leading-relaxed">
                            Your ultimate destination for downloading movies, series, and anime in high quality.
                        </p>
                    </div>

                    {/* Browse */}
                    <div>
                        <h4 className="font-semibold text-white mb-4">Browse</h4>
                        <ul className="space-y-2">
                            {footerLinks.browse.map((link) => (
                                <li key={link.href}>
                                    <Link
                                        href={link.href}
                                        className="text-gray-400 hover:text-white text-sm transition-colors"
                                    >
                                        {link.label}
                                    </Link>
                                </li>
                            ))}
                        </ul>
                    </div>

                    {/* Genres */}
                    <div>
                        <h4 className="font-semibold text-white mb-4">Genres</h4>
                        <ul className="space-y-2">
                            {footerLinks.genres.map((link) => (
                                <li key={link.href}>
                                    <Link
                                        href={link.href}
                                        className="text-gray-400 hover:text-white text-sm transition-colors"
                                    >
                                        {link.label}
                                    </Link>
                                </li>
                            ))}
                        </ul>
                    </div>

                    {/* Legal */}
                    <div>
                        <h4 className="font-semibold text-white mb-4">Legal</h4>
                        <ul className="space-y-2">
                            {footerLinks.legal.map((link) => (
                                <li key={link.href}>
                                    <Link
                                        href={link.href}
                                        className="text-gray-400 hover:text-white text-sm transition-colors"
                                    >
                                        {link.label}
                                    </Link>
                                </li>
                            ))}
                        </ul>
                    </div>
                </div>

                {/* Bottom Bar */}
                <div className="border-t border-white/5 mt-10 pt-6 flex flex-col md:flex-row justify-between items-center gap-4">
                    <p className="text-gray-500 text-sm">
                        © {currentYear} Nexiplay. All rights reserved.
                    </p>
                    <div className="flex items-center gap-4">
                        {/* Social Links */}
                        {Object.entries(SOCIAL_ICONS).map(([key, icon]) => {
                            const href = socialLinks[key as keyof typeof socialLinks];
                            if (!href) return null;

                            return (
                                <a
                                    key={key}
                                    href={href}
                                    target="_blank"
                                    rel="noopener"
                                    className="text-gray-400 hover:text-white transition-colors group"
                                    aria-label={icon.label}
                                    title={icon.label}
                                >
                                    <svg
                                        className="w-5 h-5 fill-current group-hover:scale-110 transition-transform"
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
