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
                <svg className={`w-5 h-5 transition-transform duration-200 ${active ? 'scale-110' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={active ? 2.2 : 1.8} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                </svg>
            )
        },
        {
            label: 'Movies',
            href: '/movies',
            icon: (active: boolean) => (
                <svg className={`w-5 h-5 transition-transform duration-200 ${active ? 'scale-110' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={active ? 2.2 : 1.8} d="M7 4v16M17 4v16M3 8h4m10 0h4M3 12h18M3 16h4m10 0h4M4 20h16a1 1 0 001-1V5a1 1 0 00-1-1H4a1 1 0 00-1 1v14a1 1 0 001 1z" />
                </svg>
            )
        },
        {
            label: 'Anime',
            href: '/anime',
            icon: (active: boolean) => (
                <svg className={`w-5 h-5 transition-transform duration-200 ${active ? 'scale-110' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={active ? 2.2 : 1.8} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={active ? 2.2 : 1.8} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
            )
        },
        {
            label: 'Novels',
            href: '/novels',
            icon: (active: boolean) => (
                <svg className={`w-5 h-5 transition-transform duration-200 ${active ? 'scale-110' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={active ? 2.2 : 1.8} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                </svg>
            )
        },
        {
            label: 'Me',
            href: '/account',
            icon: (active: boolean) => (
                <svg className={`w-5 h-5 transition-transform duration-200 ${active ? 'scale-110' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={active ? 2.2 : 1.8} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
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
            className="fixed bottom-0 left-0 right-0 z-40 md:hidden bg-[#0e101c]/85 backdrop-blur-xl border-t border-white/10 px-2 pt-1.5 pb-[max(0.5rem,env(safe-area-inset-bottom))] shadow-[0_-8px_24px_rgba(0,0,0,0.55)] transition-all"
        >
            <div className="flex items-center justify-around max-w-md mx-auto">
                {navItems.map((item) => {
                    const active = isItemActive(item.href);
                    return (
                        <Link
                            key={item.href}
                            href={item.href}
                            className={`flex flex-col items-center justify-center py-1 px-3 rounded-2xl transition-all duration-200 min-w-[56px] relative group ${
                                active
                                    ? 'text-white'
                                    : 'text-[#A7AABD] hover:text-white'
                            }`}
                        >
                            {/* Clay active background pill */}
                            {active && (
                                <span className="absolute inset-x-1.5 inset-y-0.5 rounded-xl bg-gradient-to-r from-[#E51D48]/25 via-[#E51D48]/15 to-transparent border border-[#E51D48]/40 shadow-[0_0_12px_rgba(229,29,72,0.35)] -z-10" />
                            )}
                            <div className={`relative ${active ? 'text-[#E51D48]' : 'text-current'}`}>
                                {item.icon(active)}
                                {active && (
                                    <span className="absolute -bottom-0.5 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-[#E51D48] shadow-[0_0_6px_#E51D48]" />
                                )}
                            </div>
                            <span className={`text-[10px] mt-0.5 transition-colors ${active ? 'font-bold text-white' : 'font-medium text-[#A7AABD]'}`}>
                                {item.label}
                            </span>
                        </Link>
                    );
                })}
            </div>
        </nav>
    );
}
