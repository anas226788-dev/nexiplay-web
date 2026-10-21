'use client';

import Link from 'next/link';
import Image from 'next/image';
import { usePathname, useRouter } from 'next/navigation';
import { useState, useRef, useEffect } from 'react';
import { SOCIAL_ICONS } from '@/config/socials';
import { getTelegramSettings } from '@/lib/settingsCache';
import { useAuth } from '@/context/AuthContext';

export default function Header() {
    const pathname = usePathname();
    const router = useRouter();
    const [isSearchOpen, setIsSearchOpen] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [telegramUrl, setTelegramUrl] = useState<string | null>(null);
    const searchInputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        fetchTelegramSettings();
    }, []);

    async function fetchTelegramSettings() {
        try {
            const data = await getTelegramSettings();

            if (data?.is_active && data?.telegram_url) {
                setTelegramUrl(data.telegram_url);
            }
        } catch (error) {
            console.error('Failed to fetch telegram settings', error);
        }
    }

    const navLinks = [
        { href: '/', label: 'Home' },
        { href: '/movies', label: 'Movies' },
        { href: '/series', label: 'Series' },
        { href: '/anime', label: 'Anime' },
        { href: '/live-tv', label: '📺 Live TV' },
        { href: '/games', label: '🎮 Games' },
        { href: '/mood', label: 'Vibe Check' },
        { href: '/novels', label: 'Novels' },
    ];

    const isActive = (href: string) => {
        if (href === '/') return pathname === '/';
        return pathname.startsWith(href);
    };

    // Use Effects for Focus and Click Outside/Escape
    useEffect(() => {
        if (isSearchOpen && searchInputRef.current) {
            setTimeout(() => {
                searchInputRef.current?.focus();
            }, 100); // Slight delay for animation
        }
    }, [isSearchOpen]);

    // Handle Search Submit
    const handleSearch = () => {
        if (searchQuery.trim()) {
            router.push(`/search?q=${encodeURIComponent(searchQuery)}`);
            setIsSearchOpen(false);
            setSearchQuery('');
        }
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter') handleSearch();
        if (e.key === 'Escape') setIsSearchOpen(false);
    };

    return (
        <>
            <header className="fixed top-0 left-0 right-0 z-50 transition-all duration-300 np-glass border-b border-white/10">
                <div className="container mx-auto px-4">
                    <div className="flex items-center justify-between h-16 md:h-20 relative z-20 bg-transparent">
                        {/* Logo with Glow */}
                        <Link href="/" className="flex items-center gap-3 group relative z-20">
                            <div className="absolute inset-0 bg-[#9273F5]/25 blur-xl opacity-0 group-hover:opacity-100 transition-opacity duration-500 rounded-full" />
                            <Image src="/nexiplay-emblem.png" alt="Nexiplay emblem" width={512} height={358} priority className="relative h-10 w-12 shrink-0 object-contain drop-shadow-[0_0_12px_rgba(146,115,245,0.45)] transition-transform duration-300 group-hover:scale-105" />
                            <span className="text-xl md:text-2xl font-black tracking-tight text-[#F4F0FA] group-hover:text-[#9273F5] transition-colors">
                                NEXI<span className="text-[#9273F5]">PLAY</span>
                            </span>
                        </Link>

                        {/* Desktop Navigation */}
                        <nav className="hidden md:flex items-center bg-[#17141F]/80 p-1.5 rounded-full border border-white/10 shadow-np-inset relative z-20">
                            {navLinks.map((link) => {
                                const active = isActive(link.href);
                                return (
                                    <Link
                                        key={link.href}
                                        href={link.href}
                                        prefetch={true}
                                        className={`px-5 py-2 rounded-full text-sm font-semibold transition-all duration-200 relative ${active
                                            ? 'text-white bg-gradient-to-r from-[#9273F5] to-[#5C46B2] shadow-[0_4px_16px_rgba(146,115,245,0.45)]'
                                            : 'text-[#ADA6B9] hover:text-white hover:bg-white/5'
                                            }`}
                                    >
                                        {link.label}
                                    </Link>
                                );
                            })}
                        </nav>

                        {/* Search & Mobile Menu */}
                        <div className="flex items-center gap-3 relative z-20">
                            {/* Desktop Telegram Button */}
                            {telegramUrl && (
                                <a
                                    href={telegramUrl}
                                    target="_blank"
                                    rel="noopener"
                                    aria-label="Telegram"
                                    className="hidden md:flex items-center gap-2 px-4 py-2 bg-[#229ED9]/15 hover:bg-[#229ED9]/25 text-[#229ED9] rounded-full transition-all border border-[#229ED9]/30 hover:border-[#229ED9]/50 shadow-[0_0_12px_rgba(34,158,217,0.25)] active:scale-95 group flex-shrink-0"
                                >
                                    <svg className="w-4 h-4 fill-current group-hover:scale-110 transition-transform" viewBox={SOCIAL_ICONS.telegram.viewBox}>
                                        <path d={SOCIAL_ICONS.telegram.path} />
                                    </svg>
                                    <span className="text-sm font-bold tracking-tight">
                                        Join Telegram
                                    </span>
                                </a>
                            )}
                            {/* Interactive Search Button */}
                            <button
                                onClick={() => setIsSearchOpen(!isSearchOpen)}
                                className={`w-10 h-10 rounded-full flex items-center justify-center transition-all duration-200 ${isSearchOpen
                                    ? 'bg-[#9273F5] text-white rotate-90 shadow-[0_4px_16px_rgba(146,115,245,0.55)]'
                                    : 'text-[#ADA6B9] hover:text-white hover:bg-white/10'
                                    }`}
                            >
                                {isSearchOpen ? (
                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                    </svg>
                                ) : (
                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                                    </svg>
                                )}
                            </button>

                            <UserProfileMenu />
                            <MobileMenu navLinks={navLinks} isActive={isActive} telegramUrl={telegramUrl} />
                        </div>
                    </div>
                </div>

                {/* SLIDE DOWN SEARCH BAR */}
                <div
                    className={`absolute top-full left-0 w-full np-glass border-b border-white/10 shadow-2xl transition-all duration-300 origin-top overflow-hidden ${isSearchOpen ? 'opacity-100 translate-y-0 max-h-32' : 'opacity-0 -translate-y-4 max-h-0'
                        }`}
                >
                    <div className="container mx-auto px-4 py-6">
                        <div className="max-w-3xl mx-auto relative group">
                            <div className="relative flex items-center bg-[#0F111C] border border-white/10 rounded-2xl overflow-hidden focus-within:border-[#9273F5] focus-within:ring-2 focus-within:ring-[#9273F5]/25 transition-all shadow-np-inset">
                                <span className="pl-4 text-[#ADA6B9]">
                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                                    </svg>
                                </span>
                                <input
                                    ref={searchInputRef}
                                    type="text"
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    onKeyDown={handleKeyDown}
                                    placeholder="Search movies, anime, or series..."
                                    className="w-full bg-transparent border-none px-4 py-3.5 text-white placeholder-[#ADA6B9]/70 focus:outline-none focus:ring-0"
                                />
                                {searchQuery && (
                                    <button
                                        onClick={() => setSearchQuery('')}
                                        className="pr-4 text-gray-500 hover:text-white transition-colors"
                                    >
                                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                        </svg>
                                    </button>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            </header>

            {/* Click Overlay to Close */}
            {isSearchOpen && (
                <div
                    className="fixed inset-0 z-40 bg-black/20 backdrop-blur-[1px]"
                    onClick={() => setIsSearchOpen(false)}
                />
            )}
        </>

    );
}

function MobileMenu({
    navLinks,
    isActive,
    telegramUrl
}: {
    navLinks: { href: string; label: string }[];
    isActive: (href: string) => boolean;
    telegramUrl: string | null;
}) {
    const [isOpen, setIsOpen] = useState(false);
    const menuRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    return (
        <div className="md:hidden relative" ref={menuRef}>
            <button 
                onClick={() => setIsOpen(!isOpen)}
                className="p-2 rounded-lg hover:bg-white/5 transition-colors"
                aria-label="Toggle Menu"
            >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={isOpen ? "M6 18L18 6M6 6l12 12" : "M4 6h16M4 12h16M4 18h16"} />
                </svg>
            </button>

            {/* Dropdown */}
            <div className={`absolute right-0 top-full mt-2 w-52 py-2 bg-[#0D0B12]/95 backdrop-blur-2xl rounded-2xl border border-white/15 shadow-2xl transition-all duration-200 z-50 ${isOpen ? 'opacity-100 visible translate-y-0' : 'opacity-0 invisible -translate-y-2'}`}>
                {navLinks.map((link) => (
                    <Link
                        key={link.href}
                        href={link.href}
                        onClick={() => setIsOpen(false)}
                        className={`block px-4 py-2.5 text-sm hover:bg-white/5 transition-colors ${isActive(link.href) ? 'text-[#9273F5] font-bold' : 'text-gray-300'
                            }`}
                    >
                        {link.label}
                    </Link>
                ))}

                {telegramUrl && (
                    <div className="pt-2 mt-1 border-t border-white/10 px-2">
                        <a
                            href={telegramUrl}
                            target="_blank"
                            rel="noopener"
                            onClick={() => setIsOpen(false)}
                            className="flex items-center gap-2 px-3 py-2 text-xs font-bold text-[#229ED9] bg-[#229ED9]/10 hover:bg-[#229ED9]/20 rounded-xl transition-colors border border-[#229ED9]/25"
                        >
                            <svg className="w-4 h-4 fill-current" viewBox={SOCIAL_ICONS.telegram.viewBox}>
                                <path d={SOCIAL_ICONS.telegram.path} />
                            </svg>
                            <span>Join Telegram</span>
                        </a>
                    </div>
                )}
            </div>
        </div>
    );
}

function UserProfileMenu() {
    const { user, signOut } = useAuth();
    const [isOpen, setIsOpen] = useState(false);
    const menuRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    if (!user) {
        return (
            <>
                {/* Desktop Login Button */}
                <Link
                    href="/login"
                    className="hidden md:flex items-center gap-2 px-4 py-2 bg-violet-600 hover:bg-violet-500 text-white rounded-full transition-colors font-bold text-sm"
                >
                    Login
                </Link>
                {/* Mobile Login Icon */}
                <Link
                    href="/login"
                    className="md:hidden w-10 h-10 rounded-full bg-gradient-to-br from-gray-700 to-gray-900 border border-white/10 flex items-center justify-center text-white overflow-hidden hover:border-red-500 transition-colors"
                    aria-label="Login"
                >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                    </svg>
                </Link>
            </>
        );
    }

    return (
        <div className="relative z-50" ref={menuRef}>
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="w-10 h-10 rounded-full bg-gradient-to-br from-gray-700 to-gray-900 border border-white/10 flex items-center justify-center text-white overflow-hidden hover:border-red-500 transition-colors"
                aria-label="User Menu"
            >
                {user.user_metadata?.avatar_url || user.user_metadata?.picture ? (
                    <img src={user.user_metadata?.avatar_url || user.user_metadata?.picture} alt="Profile" className="w-full h-full object-cover" />
                ) : (
                    <span className="font-bold text-lg">{user.email?.charAt(0).toUpperCase() || 'U'}</span>
                )}
            </button>

            {/* Dropdown */}
            <div className={`absolute right-0 top-full mt-2 w-56 py-2 bg-dark-900/95 backdrop-blur-xl rounded-xl border border-white/10 shadow-2xl transition-all duration-200 ${isOpen ? 'opacity-100 visible translate-y-0' : 'opacity-0 invisible -translate-y-2'}`}>
                <div className="px-4 py-2 border-b border-white/10 mb-2">
                    <p className="text-sm font-bold text-white truncate">
                        {user.user_metadata?.display_name || user.user_metadata?.full_name || user.user_metadata?.name || user.email?.split('@')[0] || 'User'}
                    </p>
                    <p className="text-xs text-gray-400 truncate">{user.email}</p>
                </div>
                
                <Link
                    href="/account"
                    onClick={() => setIsOpen(false)}
                    className="flex items-center gap-3 px-4 py-2 hover:bg-white/5 transition-colors text-gray-300 hover:text-white"
                >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                    </svg>
                    My Account
                </Link>
                
                <button
                    onClick={() => {
                        setIsOpen(false);
                        signOut();
                    }}
                    className="w-full flex items-center gap-3 px-4 py-2 hover:bg-violet-500/10 hover:text-violet-300 transition-colors text-gray-300 mt-1"
                >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                    </svg>
                    Sign Out
                </button>
            </div>
        </div>
    );
}
