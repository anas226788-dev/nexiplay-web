'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation'; // Added useRouter
import { useState, useRef, useEffect } from 'react'; // Added Hooks

export default function Header() {
    const pathname = usePathname();
    const router = useRouter();
    const [isSearchOpen, setIsSearchOpen] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const searchInputRef = useRef<HTMLInputElement>(null);

    const navLinks = [
        { href: '/', label: 'Home' },
        { href: '/movies', label: 'Movies' },
        { href: '/series', label: 'Series' },
        { href: '/anime', label: 'Anime' },
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
            <header className="glass fixed top-0 left-0 right-0 z-50 transition-all duration-300 backdrop-blur-xl bg-black/40 border-b border-white/5">
                <div className="container mx-auto px-4">
                    <div className="flex items-center justify-between h-16 md:h-20 relative z-20 bg-transparent">
                        {/* Logo with Glow */}
                        <Link href="/" className="flex items-center gap-3 group relative z-20">
                            <div className="absolute inset-0 bg-red-600/20 blur-xl opacity-0 group-hover:opacity-100 transition-opacity duration-500 rounded-full" />
                            <div className="relative w-10 h-10 rounded-xl bg-gradient-to-br from-dark-800 to-black border border-white/10 flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform duration-300">
                                <span className="text-red-600 font-bold text-xl">N</span>
                            </div>
                            <span className="text-xl md:text-2xl font-black tracking-tight text-white group-hover:text-red-500 transition-colors">
                                NEXI<span className="text-red-600">PLAY</span>
                            </span>
                        </Link>

                        {/* Desktop Navigation */}
                        <nav className="hidden md:flex items-center bg-black/20 p-1.5 rounded-full border border-white/5 backdrop-blur-md relative z-20">
                            {navLinks.map((link) => {
                                const active = isActive(link.href);
                                return (
                                    <Link
                                        key={link.href}
                                        href={link.href}
                                        className={`px-6 py-2 rounded-full text-sm font-medium transition-all duration-300 relative ${active
                                            ? 'text-white bg-white/10 shadow-lg'
                                            : 'text-gray-400 hover:text-white hover:bg-white/5'
                                            }`}
                                    >
                                        {link.label}
                                        {active && (
                                            <span className="absolute inset-0 rounded-full ring-1 ring-white/10 animate-pulse-glow" />
                                        )}
                                    </Link>
                                );
                            })}
                        </nav>

                        {/* Search & Mobile Menu */}
                        <div className="flex items-center gap-3 relative z-20">
                            {/* Interactive Search Button */}
                            <button
                                onClick={() => setIsSearchOpen(!isSearchOpen)}
                                className={`w-10 h-10 rounded-full flex items-center justify-center transition-all duration-300 ${isSearchOpen
                                    ? 'bg-red-600 text-white rotate-90'
                                    : 'text-gray-400 hover:text-white hover:bg-white/10'
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

                            <MobileMenu navLinks={navLinks} isActive={isActive} />
                        </div>
                    </div>
                </div>

                {/* SLIDE DOWN SEARCH BAR */}
                <div
                    className={`absolute top-full left-0 w-full bg-dark-900/95 backdrop-blur-xl border-b border-white/10 shadow-2xl transition-all duration-300 origin-top overflow-hidden ${isSearchOpen ? 'opacity-100 translate-y-0 max-h-32' : 'opacity-0 -translate-y-4 max-h-0'
                        }`}
                >
                    <div className="container mx-auto px-4 py-6">
                        <div className="max-w-3xl mx-auto relative group">
                            <div className="absolute inset-0 bg-red-600/10 rounded-2xl blur opacity-0 group-focus-within:opacity-100 transition-opacity duration-500" />
                            <div className="relative flex items-center bg-black/40 border border-white/10 rounded-2xl overflow-hidden focus-within:border-red-500/50 focus-within:ring-1 focus-within:ring-red-500/20 transition-all shadow-inner">
                                <span className="pl-4 text-gray-500">
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
                                    placeholder="Search movies, series, or anime..."
                                    className="w-full bg-transparent border-none px-4 py-3.5 text-white placeholder-gray-500 focus:outline-none focus:ring-0"
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
    isActive
}: {
    navLinks: { href: string; label: string }[];
    isActive: (href: string) => boolean;
}) {
    return (
        <div className="md:hidden relative group">
            <button className="p-2 rounded-lg hover:bg-white/5 transition-colors">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                </svg>
            </button>

            {/* Dropdown */}
            <div className="absolute right-0 top-full mt-2 w-48 py-2 glass rounded-xl border border-white/10 opacity-0 invisible group-focus-within:opacity-100 group-focus-within:visible transition-all duration-200">
                {navLinks.map((link) => (
                    <Link
                        key={link.href}
                        href={link.href}
                        className={`block px-4 py-2 hover:bg-white/5 transition-colors ${isActive(link.href) ? 'text-red-500' : 'text-gray-300'
                            }`}
                    >
                        {link.label}
                    </Link>
                ))}
            </div>
        </div>
    );
}
