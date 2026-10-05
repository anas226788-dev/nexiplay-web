'use client';

import { useState, useTransition } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter, useSearchParams } from 'next/navigation';

export interface Novel {
    id: string;
    title: string;
    slug: string;
    author: string | null;
    genre: string | null;
    cover_url: string | null;
    description: string | null;
    status: string | null;
    created_at?: string;
}

interface NovelsExplorerProps {
    novels: Novel[];
    totalNovels: number;
    currentPage: number;
    totalPages: number;
    pageSize: number;
    initialQuery?: string;
    initialStatus?: string;
}

export default function NovelsExplorer({
    novels,
    totalNovels,
    currentPage,
    totalPages,
    pageSize,
    initialQuery = '',
    initialStatus = 'all',
}: NovelsExplorerProps) {
    const router = useRouter();
    const searchParams = useSearchParams();
    const [isPending, startTransition] = useTransition();

    const [searchInput, setSearchInput] = useState(initialQuery);
    const [jumpInput, setJumpInput] = useState('');

    const navigateWithParams = (newPage: number, newQuery?: string, newStatus?: string) => {
        const params = new URLSearchParams(searchParams.toString());
        params.set('page', newPage.toString());

        const q = newQuery !== undefined ? newQuery : initialQuery;
        if (q && q.trim()) {
            params.set('q', q.trim());
        } else {
            params.delete('q');
        }

        const s = newStatus !== undefined ? newStatus : initialStatus;
        if (s && s !== 'all') {
            params.set('status', s);
        } else {
            params.delete('status');
        }

        startTransition(() => {
            router.push(`/novels?${params.toString()}`);
            if (typeof window !== 'undefined') {
                window.scrollTo({ top: 0, behavior: 'smooth' });
            }
        });
    };

    const handleSearchSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        navigateWithParams(1, searchInput, initialStatus);
    };

    const handleClearSearch = () => {
        setSearchInput('');
        navigateWithParams(1, '', initialStatus);
    };

    const handleStatusChange = (status: string) => {
        navigateWithParams(1, initialQuery, status);
    };

    const handleJumpSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        const pageNum = parseInt(jumpInput, 10);
        if (!isNaN(pageNum) && pageNum >= 1 && pageNum <= totalPages) {
            navigateWithParams(pageNum);
            setJumpInput('');
        }
    };

    // Calculate smart page number array with ellipsis
    const getPageNumbers = () => {
        const pages: (number | string)[] = [];
        const delta = 2; // numbers to show around current page

        const left = Math.max(2, currentPage - delta);
        const right = Math.min(totalPages - 1, currentPage + delta);

        pages.push(1);

        if (left > 2) {
            pages.push('...');
        }

        for (let i = left; i <= right; i++) {
            pages.push(i);
        }

        if (right < totalPages - 1) {
            pages.push('...');
        }

        if (totalPages > 1) {
            pages.push(totalPages);
        }

        return pages;
    };

    const fromIndex = totalNovels > 0 ? (currentPage - 1) * pageSize + 1 : 0;
    const toIndex = Math.min(currentPage * pageSize, totalNovels);

    return (
        <div className="space-y-8">
            {/* Search & Filter Bar */}
            <div className="bg-dark-900/80 backdrop-blur-md border border-white/10 rounded-2xl p-4 md:p-5 shadow-xl">
                <form onSubmit={handleSearchSubmit} className="flex flex-col md:flex-row items-center gap-4">
                    {/* Search Input */}
                    <div className="relative w-full flex-1">
                        <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-gray-400">
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                            </svg>
                        </div>
                        <input
                            type="text"
                            value={searchInput}
                            onChange={(e) => setSearchInput(e.target.value)}
                            placeholder="Search novels by title, author, or genre... (Press Enter)"
                            className="w-full pl-11 pr-24 py-3 bg-dark-800/80 border border-white/10 rounded-xl text-white placeholder-gray-500 text-sm md:text-base outline-none focus:border-red-500/80 focus:ring-1 focus:ring-red-500/50 transition-all"
                        />
                        <div className="absolute inset-y-0 right-0 flex items-center pr-2 gap-1">
                            {searchInput && (
                                <button
                                    type="button"
                                    onClick={handleClearSearch}
                                    className="p-1.5 text-gray-400 hover:text-white transition-colors"
                                    title="Clear search"
                                >
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                                    </svg>
                                </button>
                            )}
                            <button
                                type="submit"
                                className="px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white rounded-lg text-xs font-bold transition-colors"
                            >
                                Search
                            </button>
                        </div>
                    </div>

                    {/* Filter Tabs */}
                    <div className="flex items-center gap-2 w-full md:w-auto shrink-0 overflow-x-auto pb-1 md:pb-0">
                        <button
                            type="button"
                            onClick={() => handleStatusChange('all')}
                            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
                                initialStatus === 'all'
                                    ? 'bg-red-600 text-white shadow-lg shadow-red-900/30'
                                    : 'bg-white/5 text-gray-400 hover:text-white hover:bg-white/10'
                            }`}
                        >
                            All
                        </button>
                        <button
                            type="button"
                            onClick={() => handleStatusChange('completed')}
                            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
                                initialStatus === 'completed'
                                    ? 'bg-red-600 text-white shadow-lg shadow-red-900/30'
                                    : 'bg-white/5 text-gray-400 hover:text-white hover:bg-white/10'
                            }`}
                        >
                            Completed
                        </button>
                        <button
                            type="button"
                            onClick={() => handleStatusChange('ongoing')}
                            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
                                initialStatus === 'ongoing'
                                    ? 'bg-red-600 text-white shadow-lg shadow-red-900/30'
                                    : 'bg-white/5 text-gray-400 hover:text-white hover:bg-white/10'
                            }`}
                        >
                            Ongoing
                        </button>
                    </div>
                </form>

                {/* Match & Page Counter */}
                <div className="mt-3.5 pt-3 border-t border-white/5 flex flex-wrap items-center justify-between gap-2 text-xs text-gray-400">
                    <span>
                        Showing <strong className="text-white font-bold">{fromIndex}–{toIndex}</strong> of <strong className="text-white font-bold">{totalNovels}</strong> novels
                        {initialQuery && (
                            <span> for &ldquo;<span className="text-red-400">{initialQuery}</span>&rdquo;</span>
                        )}
                        {totalPages > 1 && (
                            <span className="ml-2 text-gray-500 font-mono">
                                (Page {currentPage} of {totalPages})
                            </span>
                        )}
                    </span>
                    {(initialQuery || initialStatus !== 'all') && (
                        <button
                            type="button"
                            onClick={() => {
                                setSearchInput('');
                                navigateWithParams(1, '', 'all');
                            }}
                            className="text-red-400 hover:underline hover:text-red-300 font-medium"
                        >
                            Reset filters
                        </button>
                    )}
                </div>
            </div>

            {/* Loading Indicator during Page Transition */}
            {isPending && (
                <div className="flex items-center justify-center gap-2 py-4 text-xs font-bold text-red-400">
                    <div className="w-3.5 h-3.5 border-2 border-red-500 border-t-transparent rounded-full animate-spin"></div>
                    Loading Page {currentPage}...
                </div>
            )}

            {/* Novels Grid */}
            {novels.length === 0 ? (
                <div className="text-center py-20 bg-dark-900/50 rounded-2xl border border-white/5 p-8">
                    <div className="w-16 h-16 rounded-2xl bg-white/5 mx-auto flex items-center justify-center text-gray-500 mb-4">
                        <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                        </svg>
                    </div>
                    <h2 className="text-xl md:text-2xl font-bold text-white mb-2">No Novels Found</h2>
                    <p className="text-gray-400 text-sm max-w-md mx-auto mb-6">
                        {initialQuery
                            ? `No novels matched your search "${initialQuery}". Try checking the spelling or searching another title.`
                            : 'No novels are available in this category yet.'}
                    </p>
                    <button
                        type="button"
                        onClick={() => {
                            setSearchInput('');
                            navigateWithParams(1, '', 'all');
                        }}
                        className="px-5 py-2.5 bg-red-600 hover:bg-red-700 text-white text-sm font-bold rounded-xl transition-all shadow-lg shadow-red-900/20"
                    >
                        View All Novels
                    </button>
                </div>
            ) : (
                <div className={`grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4 md:gap-6 transition-opacity duration-200 ${isPending ? 'opacity-50' : 'opacity-100'}`}>
                    {novels.map((novel) => (
                        <Link
                            href={`/novels/${novel.slug}`}
                            key={novel.id || novel.slug}
                            className="group flex flex-col rounded-2xl overflow-hidden hover:-translate-y-1.5 transition-all duration-300"
                        >
                            {/* Card Cover */}
                            <div className="relative aspect-[2/3] w-full overflow-hidden rounded-xl mb-3 shadow-lg border border-white/5 bg-gradient-to-b from-[#15151c] to-[#0a0a0e] group-hover:border-red-500/40 transition-colors">
                                {novel.cover_url ? (
                                    <Image
                                        src={novel.cover_url}
                                        alt={novel.title}
                                        fill
                                        sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 20vw"
                                        className="object-cover transition-transform duration-500 group-hover:scale-105"
                                    />
                                ) : (
                                    <div className="w-full h-full flex flex-col items-center justify-between p-4 text-center select-none bg-gradient-to-b from-[#1a1a24] via-[#101017] to-[#0a0a0d]">
                                        <div className="w-full flex items-center justify-between opacity-50 text-[10px] font-mono uppercase tracking-wider text-gray-400">
                                            <span>NEXIPLAY</span>
                                            <span>NOVEL</span>
                                        </div>

                                        <div className="flex flex-col items-center justify-center my-auto py-4">
                                            <div className="w-12 h-12 rounded-2xl bg-white/[0.04] border border-white/10 flex items-center justify-center text-red-400/80 mb-2 group-hover:scale-110 group-hover:text-red-400 group-hover:border-red-500/30 transition-all shadow-inner">
                                                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                                                </svg>
                                            </div>
                                            <span className="text-[11px] font-bold text-gray-300 line-clamp-2 px-1">
                                                {novel.title}
                                            </span>
                                        </div>

                                        <div className="w-full flex items-center justify-center">
                                            <span className="text-[9px] uppercase tracking-wider text-gray-500 font-bold bg-white/[0.03] px-2 py-0.5 rounded-full border border-white/5">
                                                {novel.genre || 'Romantic'}
                                            </span>
                                        </div>
                                    </div>
                                )}

                                {/* Status Badge */}
                                {novel.status === 'completed' && (
                                    <div className="absolute top-2 right-2 bg-emerald-600/90 backdrop-blur text-white text-[9px] font-bold px-2 py-0.5 rounded uppercase tracking-wider shadow-md">
                                        Completed
                                    </div>
                                )}
                            </div>

                            {/* Card Info */}
                            <h2 className="text-sm font-bold text-white mb-1 line-clamp-2 group-hover:text-red-400 transition-colors">
                                {novel.title}
                            </h2>
                            <div className="flex flex-col gap-0.5 text-xs text-gray-400">
                                {novel.author && <span className="truncate text-gray-400">By {novel.author}</span>}
                                {novel.genre && <span className="text-red-500/80 font-medium truncate text-[11px]">{novel.genre}</span>}
                            </div>
                        </Link>
                    ))}
                </div>
            )}

            {/* Pagination Controls */}
            {totalPages > 1 && (
                <div className="mt-12 pt-8 border-t border-white/10 flex flex-col items-center gap-6">
                    {/* Navigation Buttons */}
                    <div className="flex flex-wrap items-center justify-center gap-2">
                        {/* First Button */}
                        <button
                            type="button"
                            onClick={() => navigateWithParams(1)}
                            disabled={currentPage === 1 || isPending}
                            className="px-3.5 py-2 rounded-xl text-xs font-bold border border-white/10 bg-dark-800 text-gray-400 hover:text-white hover:bg-white/10 hover:border-white/20 disabled:opacity-40 disabled:pointer-events-none transition-all"
                            title="Go to First Page"
                        >
                            « First
                        </button>

                        {/* Prev Button */}
                        <button
                            type="button"
                            onClick={() => navigateWithParams(currentPage - 1)}
                            disabled={currentPage === 1 || isPending}
                            className="px-3.5 py-2 rounded-xl text-xs font-bold border border-white/10 bg-dark-800 text-gray-400 hover:text-white hover:bg-white/10 hover:border-white/20 disabled:opacity-40 disabled:pointer-events-none transition-all"
                        >
                            ‹ Prev
                        </button>

                        {/* Numbered Buttons */}
                        <div className="flex items-center gap-1.5">
                            {getPageNumbers().map((p, idx) => {
                                if (p === '...') {
                                    return (
                                        <span key={`ellipsis-${idx}`} className="px-2 text-gray-500 font-bold select-none">
                                            …
                                        </span>
                                    );
                                }
                                const pageNum = p as number;
                                const isActive = pageNum === currentPage;
                                return (
                                    <button
                                        key={pageNum}
                                        type="button"
                                        onClick={() => navigateWithParams(pageNum)}
                                        disabled={isActive || isPending}
                                        className={`w-9 h-9 rounded-xl text-xs font-bold transition-all flex items-center justify-center ${
                                            isActive
                                                ? 'bg-red-600 text-white font-black shadow-lg shadow-red-900/40 border border-red-500 scale-105'
                                                : 'border border-white/10 bg-dark-800 text-gray-300 hover:text-white hover:bg-white/10 hover:border-white/20'
                                        }`}
                                    >
                                        {pageNum}
                                    </button>
                                );
                            })}
                        </div>

                        {/* Next Button */}
                        <button
                            type="button"
                            onClick={() => navigateWithParams(currentPage + 1)}
                            disabled={currentPage === totalPages || isPending}
                            className="px-3.5 py-2 rounded-xl text-xs font-bold border border-white/10 bg-dark-800 text-gray-400 hover:text-white hover:bg-white/10 hover:border-white/20 disabled:opacity-40 disabled:pointer-events-none transition-all"
                        >
                            Next ›
                        </button>

                        {/* Last Button */}
                        <button
                            type="button"
                            onClick={() => navigateWithParams(totalPages)}
                            disabled={currentPage === totalPages || isPending}
                            className="px-3.5 py-2 rounded-xl text-xs font-bold border border-white/10 bg-dark-800 text-gray-400 hover:text-white hover:bg-white/10 hover:border-white/20 disabled:opacity-40 disabled:pointer-events-none transition-all"
                            title="Go to Last Page"
                        >
                            Last »
                        </button>
                    </div>

                    {/* Quick Jump Input */}
                    <form onSubmit={handleJumpSubmit} className="flex items-center gap-2 text-xs text-gray-400">
                        <span>Jump to page:</span>
                        <input
                            type="number"
                            min={1}
                            max={totalPages}
                            value={jumpInput}
                            onChange={(e) => setJumpInput(e.target.value)}
                            placeholder={`${currentPage}`}
                            className="w-14 px-2 py-1 text-center bg-dark-800 border border-white/10 rounded-lg text-white outline-none focus:border-red-500/80 font-bold"
                        />
                        <button
                            type="submit"
                            className="px-2.5 py-1 bg-white/5 hover:bg-white/10 text-gray-300 hover:text-white font-bold rounded-lg border border-white/10 transition-colors"
                        >
                            Go
                        </button>
                    </form>
                </div>
            )}
        </div>
    );
}
