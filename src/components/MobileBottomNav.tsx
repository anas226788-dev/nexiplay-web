'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

export default function MobileBottomNav() {
    const pathname = usePathname();

    // Do not show on fullscreen embed routes
    if (pathname?.startsWith('/embed')) return null;

    const navItems = [
        {
            label: 'Home',
            href: '/',
            icon: (active: boolean) => (
                <svg className={`w-[19px] h-[19px] transition-transform duration-200 ${active ? 'scale-105' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={active ? 2.2 : 1.7} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                </svg>
            )
        },
        {
            label: 'Movies',
            href: '/movies',
            icon: (active: boolean) => (
                <svg className={`w-[19px] h-[19px] transition-transform duration-200 ${active ? 'scale-105' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={active ? 2.2 : 1.7} d="M7 4v16M17 4v16M3 8h4m10 0h4M3 12h18M3 16h4m10 0h4M4 20h16a1 1 0 001-1V5a1 1 0 00-1-1H4a1 1 0 00-1 1v14a1 1 0 001 1z" />
                </svg>
            )
        },
        {
            label: 'Anime',
            href: '/anime',
            icon: (active: boolean) => (
                <svg className={`w-[19px] h-[19px] transition-transform duration-200 ${active ? 'scale-105' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={active ? 2.2 : 1.7} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={active ? 2.2 : 1.7} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
            )
        },
        {
            label: 'Series',
            href: '/series',
            icon: (active: boolean) => (
                <svg className={`w-[19px] h-[19px] transition-transform duration-200 ${active ? 'scale-105' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={active ? 2.2 : 1.7} d="M4 6h16M4 10h16M4 14h16M4 18h16" />
                </svg>
            )
        },
        {
            label: 'Vibe',
            href: '/mood',
            icon: (active: boolean) => (
                <svg className={`w-[19px] h-[19px] transition-transform duration-200 ${active ? 'scale-105' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={active ? 2.2 : 1.7} d="M12 3l1.9 5.8L20 11l-6.1 2.2L12 19l-1.9-5.8L4 11l6.1-2.2L12 3zm7 12 .9 2.1L22 18l-2.1.9L19 21l-.9-2.1L16 18l2.1-.9L19 15z" />
                </svg>
            )
        },
        {
            label: 'Novels',
            href: '/novels',
            icon: (active: boolean) => (
                <svg className={`w-[19px] h-[19px] transition-transform duration-200 ${active ? 'scale-105' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={active ? 2.2 : 1.7} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                </svg>
            )
        },
        {
            label: 'Me',
            href: '/account',
            icon: (active: boolean) => (
                <svg className={`w-[19px] h-[19px] transition-transform duration-200 ${active ? 'scale-105' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={active ? 2.2 : 1.7} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
            )
        }
    ];

    const isItemActive = (href: string) => {
        if (href === '/') return pathname === '/';
        return pathname?.startsWith(href);
    };

    return (
        <nav
            aria-label="Mobile Navigation"
            className="fixed bottom-3.5 left-3.5 right-3.5 sm:left-1/2 sm:-translate-x-1/2 sm:max-w-md z-50 md:hidden"
        >
            <div className="np-glass relative rounded-2xl p-1.5 shadow-[0_12px_36px_rgba(0,0,0,0.45)]">

                <div className="flex items-center justify-between gap-1">
                    {navItems.map((item) => {
                        const active = isItemActive(item.href);
                        return (
                            <Link
                                key={item.href}
                                href={item.href}
                                prefetch={true}
                                className={`flex flex-col items-center justify-center py-2 px-1 rounded-xl transition-all duration-300 flex-1 relative group active:scale-95 ${
                                    active
                                        ? 'text-white'
                                        : 'text-[#ADA6B9] hover:text-white hover:bg-white/[0.04]'
                                }`}
                            >
                                {active && (
                                    <div className="absolute inset-0 rounded-xl bg-[#9273F5]/15 border border-[#9273F5]/25 pointer-events-none" />
                                )}

                                <div className={`relative flex items-center justify-center transition-all duration-200 ${active ? 'scale-105 text-[#B09AFF]' : 'text-current'}`}>
                                    {item.icon(active)}
                                </div>
                                <span className={`text-[10px] tracking-tight leading-none mt-1 transition-colors ${active ? 'font-semibold text-white' : 'font-medium text-[#ADA6B9]'}`}>
                                    {item.label}
                                </span>

                                {active && (
                                    <span className="w-1 h-1 rounded-full bg-[#57D6C0] mt-1" />
                                )}
                            </Link>
                        );
                    })}
                </div>
            </div>
        </nav>
    );
}
