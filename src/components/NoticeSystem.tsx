'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { usePathname } from 'next/navigation';
import { Notice } from '@/lib/types';

export default function NoticeSystem() {
    const [notices, setNotices] = useState<Notice[]>([]);
    const pathname = usePathname();
    const [closedNotices, setClosedNotices] = useState<string[]>([]);

    useEffect(() => {
        async function fetchNotices() {
            const { data } = await supabase
                .from('notices')
                .select('*')
                .eq('is_active', true);

            if (data) setNotices(data);
        }

        fetchNotices();
    }, []);

    const isMatch = (notice: Notice) => {
        if (closedNotices.includes(notice.id)) return false;

        switch (notice.pages) {
            case 'all': return true;
            case 'home': return pathname === '/';
            case 'movie': return pathname?.startsWith('/movie') || pathname?.startsWith('/series') || pathname?.startsWith('/anime');
            default: return false;
        }
    };

    const handleClose = (id: string) => {
        setClosedNotices(prev => [...prev, id]);
    };

    // Render Logic
    const topBarNotices = notices.filter(n => n.type === 'top_bar' && isMatch(n));
    const popupNotices = notices.filter(n => n.type === 'popup' && isMatch(n));
    const inlineNotices = notices.filter(n => n.type === 'inline' && isMatch(n));

    // Helper to check if string is a tailwind class
    const isTailwind = (str: string) => str?.startsWith('bg-') || str?.startsWith('text-');

    return (
        <>
            {/* Top Bars - Fixed at Top (Overlays Header) */}
            <div className="flex flex-col w-full z-[100] fixed top-0 left-0">
                {topBarNotices.map(notice => (
                    <div
                        key={notice.id}
                        className={`px-4 py-3 text-center text-sm font-bold flex items-center justify-center relative shadow-xl ${isTailwind(notice.bg_color) ? notice.bg_color : ''} ${isTailwind(notice.text_color) ? notice.text_color : ''}`}
                        style={{
                            backgroundColor: !isTailwind(notice.bg_color) ? notice.bg_color : undefined,
                            color: !isTailwind(notice.text_color) ? notice.text_color : undefined
                        }}
                    >
                        <span dangerouslySetInnerHTML={{ __html: notice.content }} />
                        <button
                            onClick={() => handleClose(notice.id)}
                            className="absolute right-4 p-1 hover:bg-black/10 rounded transition-colors"
                        >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                        </button>
                    </div>
                ))}
            </div>

            {/* Inline Notices - Pushed below Header */}
            {inlineNotices.length > 0 && (
                <div className="relative z-40 container mx-auto px-4 mt-24 mb-6 space-y-4">
                    {inlineNotices.map(notice => (
                        <div
                            key={notice.id}
                            className={`px-6 py-4 rounded-xl shadow-lg border border-white/10 flex items-center justify-between relative font-bold ${isTailwind(notice.bg_color) ? notice.bg_color : ''} ${isTailwind(notice.text_color) ? notice.text_color : ''}`}
                            style={{
                                backgroundColor: !isTailwind(notice.bg_color) ? notice.bg_color : undefined,
                                color: !isTailwind(notice.text_color) ? notice.text_color : undefined
                            }}
                        >
                            <div dangerouslySetInnerHTML={{ __html: notice.content }} />
                            <button
                                onClick={() => handleClose(notice.id)}
                                className="p-2 hover:bg-black/10 rounded-lg transition-colors ml-4"
                            >
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                </svg>
                            </button>
                        </div>
                    ))}
                </div>
            )}

            {/* Popups */}
            {popupNotices.length > 0 && (
                <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-fadeIn">
                    <div
                        className={`max-w-lg w-full rounded-2xl p-6 shadow-2xl border border-white/10 relative transform animate-slideUp font-bold ${isTailwind(popupNotices[0].bg_color) ? popupNotices[0].bg_color : ''}`}
                        style={{
                            backgroundColor: !isTailwind(popupNotices[0].bg_color) ? popupNotices[0].bg_color : undefined
                        }}
                    >
                        <button
                            onClick={() => handleClose(popupNotices[0].id)}
                            className={`absolute top-2 right-2 p-2 bg-black/20 hover:bg-black/40 rounded-full transition-colors ${isTailwind(popupNotices[0].text_color) ? popupNotices[0].text_color : ''}`}
                            style={{ color: !isTailwind(popupNotices[0].text_color) ? popupNotices[0].text_color : undefined }}
                        >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                        </button>

                        <div
                            className={`text-lg font-bold text-center ${isTailwind(popupNotices[0].text_color) ? popupNotices[0].text_color : ''}`}
                            style={{ color: !isTailwind(popupNotices[0].text_color) ? popupNotices[0].text_color : undefined }}
                            dangerouslySetInnerHTML={{ __html: popupNotices[0].content }}
                        />
                    </div>
                </div>
            )}
        </>
    );
}
