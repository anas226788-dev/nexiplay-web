'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';

export interface ChapterItem {
    id?: string;
    title: string;
    slug: string;
    created_at: string;
    chapter_number: number;
}

interface ChaptersListProps {
    chapters: ChapterItem[];
    novelSlug: string;
}

const CHAPTERS_PER_PAGE = 30; // 30 chapters per page for fast rendering & easy browsing

export default function ChaptersList({ chapters, novelSlug }: ChaptersListProps) {
    const [searchQuery, setSearchQuery] = useState('');
    const [currentPage, setCurrentPage] = useState(1);
    const [isAscending, setIsAscending] = useState(true);

    // Filter & Sort
    const filteredChapters = useMemo(() => {
        let list = [...chapters];

        // Sort
        list.sort((a, b) => {
            const numA = a.chapter_number ?? 0;
            const numB = b.chapter_number ?? 0;
            return isAscending ? numA - numB : numB - numA;
        });

        // Search
        if (searchQuery.trim()) {
            const q = searchQuery.trim().toLowerCase();
            list = list.filter(ch =>
                ch.title.toLowerCase().includes(q) ||
                ch.slug.toLowerCase().includes(q) ||
                (ch.chapter_number !== undefined && ch.chapter_number.toString().includes(q))
            );
        }

        return list;
    }, [chapters, searchQuery, isAscending]);

    const totalPages = Math.max(1, Math.ceil(filteredChapters.length / CHAPTERS_PER_PAGE));
    const activePage = Math.min(currentPage, totalPages);

    const paginatedChapters = useMemo(() => {
        const from = (activePage - 1) * CHAPTERS_PER_PAGE;
        return filteredChapters.slice(from, from + CHAPTERS_PER_PAGE);
    }, [filteredChapters, activePage]);

    return (
        <div className="bg-dark-900 border border-white/5 rounded-3xl overflow-hidden shadow-2xl">
            {/* Header & Controls */}
            <div className="p-6 md:p-8 border-b border-white/5 flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white/[0.02]">
                <div className="flex items-center gap-3">
                    <span className="w-1.5 h-8 bg-red-600 rounded-full inline-block"></span>
                    <h2 className="text-2xl font-black text-white">
                        Chapters ({chapters.length})
                    </h2>
                </div>

                <div className="flex flex-wrap items-center gap-3">
                    {/* Search Chapter */}
                    <div className="relative">
                        <input
                            type="text"
                            value={searchQuery}
                            onChange={(e) => {
                                setSearchQuery(e.target.value);
                                setCurrentPage(1);
                            }}
                            placeholder="Find chapter..."
                            className="w-44 sm:w-56 pl-9 pr-3 py-1.5 bg-dark-800 border border-white/10 rounded-xl text-xs text-white placeholder-gray-500 outline-none focus:border-red-500/80 transition-colors"
                        />
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-500">
                            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                            </svg>
                        </div>
                        {searchQuery && (
                            <button
                                onClick={() => {
                                    setSearchQuery('');
                                    setCurrentPage(1);
                                }}
                                className="absolute inset-y-0 right-0 pr-2.5 flex items-center text-gray-400 hover:text-white"
                            >
                                ×
                            </button>
                        )}
                    </div>

                    {/* Order Sort Toggle */}
                    <button
                        onClick={() => {
                            setIsAscending(!isAscending);
                            setCurrentPage(1);
                        }}
                        className="px-3 py-1.5 rounded-xl text-xs font-bold border border-white/10 bg-dark-800 text-gray-300 hover:text-white hover:bg-white/5 transition-all flex items-center gap-1.5"
                        title="Sort chapter order"
                    >
                        <span>{isAscending ? '1 → Last' : 'Last → 1'}</span>
                        <svg className={`w-3.5 h-3.5 transition-transform ${isAscending ? '' : 'rotate-180'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 4h13M3 8h9m-9 4h6m4 0l4-4m0 0l4 4m-4-4v12" />
                        </svg>
                    </button>
                </div>
            </div>

            {/* Chapters Grid */}
            <div className="p-6 md:p-8">
                {paginatedChapters.length === 0 ? (
                    <div className="text-center py-12">
                        <p className="text-gray-500 text-sm">
                            {searchQuery ? `No chapters matching "${searchQuery}"` : 'No chapters available yet.'}
                        </p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 md:gap-4">
                        {paginatedChapters.map((chapter) => (
                            <Link 
                                href={`/novels/${novelSlug}/chapter/${chapter.slug}`} 
                                key={chapter.slug}
                                className="flex items-center gap-4 p-4 rounded-xl bg-white/[0.02] hover:bg-white/[0.06] border border-transparent hover:border-red-500/30 transition-all group"
                            >
                                <div className="w-10 h-10 rounded-lg bg-dark-800 text-gray-400 font-black flex items-center justify-center text-sm border border-white/5 group-hover:text-red-400 group-hover:border-red-500/30 transition-colors shrink-0">
                                    {chapter.chapter_number}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <h4 className="text-white font-bold text-sm truncate group-hover:text-red-400 transition-colors">
                                        {chapter.title}
                                    </h4>
                                    <span className="text-xs text-gray-500 mt-0.5 block">
                                        {chapter.created_at ? new Date(chapter.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : 'Chapter'}
                                    </span>
                                </div>
                            </Link>
                        ))}
                    </div>
                )}

                {/* Chapter Pagination Bar */}
                {totalPages > 1 && (
                    <div className="mt-8 pt-6 border-t border-white/5 flex flex-wrap items-center justify-between gap-4">
                        <span className="text-xs text-gray-400">
                            Showing {(activePage - 1) * CHAPTERS_PER_PAGE + 1}–{Math.min(activePage * CHAPTERS_PER_PAGE, filteredChapters.length)} of {filteredChapters.length} chapters
                        </span>

                        <div className="flex items-center gap-1.5">
                            <button
                                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                                disabled={activePage === 1}
                                className="px-3 py-1.5 rounded-lg text-xs font-bold border border-white/10 bg-dark-800 text-gray-400 hover:text-white disabled:opacity-30 disabled:pointer-events-none transition-all"
                            >
                                ‹ Prev
                            </button>

                            <div className="flex items-center gap-1">
                                {Array.from({ length: totalPages }).map((_, i) => {
                                    const pageNum = i + 1;
                                    // only show within window of active
                                    if (
                                        pageNum === 1 ||
                                        pageNum === totalPages ||
                                        Math.abs(pageNum - activePage) <= 1
                                    ) {
                                        const isActive = pageNum === activePage;
                                        return (
                                            <button
                                                key={pageNum}
                                                onClick={() => setCurrentPage(pageNum)}
                                                className={`w-8 h-8 rounded-lg text-xs font-bold transition-all ${
                                                    isActive
                                                        ? 'bg-red-600 text-white font-black shadow-md shadow-red-900/40'
                                                        : 'border border-white/10 bg-dark-800 text-gray-400 hover:text-white'
                                                }`}
                                            >
                                                {pageNum}
                                            </button>
                                        );
                                    } else if (
                                        pageNum === 2 && activePage > 3 ||
                                        pageNum === totalPages - 1 && activePage < totalPages - 2
                                    ) {
                                        return <span key={`ellipsis-${pageNum}`} className="px-1 text-gray-600">…</span>;
                                    }
                                    return null;
                                })}
                            </div>

                            <button
                                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                                disabled={activePage === totalPages}
                                className="px-3 py-1.5 rounded-lg text-xs font-bold border border-white/10 bg-dark-800 text-gray-400 hover:text-white disabled:opacity-30 disabled:pointer-events-none transition-all"
                            >
                                Next ›
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
