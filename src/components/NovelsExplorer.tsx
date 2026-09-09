'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';
import Image from 'next/image';

interface Novel {
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
    initialNovels: Novel[];
}

export default function NovelsExplorer({ initialNovels }: NovelsExplorerProps) {
    const [searchQuery, setSearchQuery] = useState('');
    const [statusFilter, setStatusFilter] = useState<'all' | 'completed' | 'ongoing'>('all');

    const filteredNovels = useMemo(() => {
        const query = searchQuery.trim().toLowerCase();
        return initialNovels.filter((novel) => {
            // Status filter
            if (statusFilter !== 'all') {
                if ((novel.status || '').toLowerCase() !== statusFilter) {
                    return false;
                }
            }

            // Search query filter (matches title, author, genre, or slug)
            if (!query) return true;

            const matchTitle = (novel.title || '').toLowerCase().includes(query);
            const matchAuthor = (novel.author || '').toLowerCase().includes(query);
            const matchGenre = (novel.genre || '').toLowerCase().includes(query);
            const matchSlug = (novel.slug || '').toLowerCase().includes(query);

            return matchTitle || matchAuthor || matchGenre || matchSlug;
        });
    }, [initialNovels, searchQuery, statusFilter]);

    return (
        <div className="space-y-8">
            {/* Search & Filter Bar */}
            <div className="bg-dark-900/80 backdrop-blur-md border border-white/10 rounded-2xl p-4 md:p-5 shadow-xl">
                <div className="flex flex-col md:flex-row items-center gap-4">
                    {/* Search Input */}
                    <div className="relative w-full flex-1">
                        <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-gray-400">
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                            </svg>
                        </div>
                        <input
                            type="text"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            placeholder="Search novels by title, author, or genre..."
                            className="w-full pl-11 pr-10 py-3 bg-dark-800/80 border border-white/10 rounded-xl text-white placeholder-gray-500 text-sm md:text-base outline-none focus:border-red-500/80 focus:ring-1 focus:ring-red-500/50 transition-all"
                        />
                        {searchQuery && (
                            <button
                                onClick={() => setSearchQuery('')}
                                className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-gray-400 hover:text-white transition-colors"
                                title="Clear search"
                            >
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                                </svg>
                            </button>
                        )}
                    </div>

                    {/* Filter Tabs */}
                    <div className="flex items-center gap-2 w-full md:w-auto shrink-0 overflow-x-auto pb-1 md:pb-0">
                        <button
                            onClick={() => setStatusFilter('all')}
                            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
                                statusFilter === 'all'
                                    ? 'bg-red-600 text-white shadow-lg shadow-red-900/30'
                                    : 'bg-white/5 text-gray-400 hover:text-white hover:bg-white/10'
                            }`}
                        >
                            All ({initialNovels.length})
                        </button>
                        <button
                            onClick={() => setStatusFilter('completed')}
                            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
                                statusFilter === 'completed'
                                    ? 'bg-red-600 text-white shadow-lg shadow-red-900/30'
                                    : 'bg-white/5 text-gray-400 hover:text-white hover:bg-white/10'
                            }`}
                        >
                            Completed
                        </button>
                        <button
                            onClick={() => setStatusFilter('ongoing')}
                            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
                                statusFilter === 'ongoing'
                                    ? 'bg-red-600 text-white shadow-lg shadow-red-900/30'
                                    : 'bg-white/5 text-gray-400 hover:text-white hover:bg-white/10'
                            }`}
                        >
                            Ongoing
                        </button>
                    </div>
                </div>

                {/* Match Counter */}
                <div className="mt-3.5 pt-3 border-t border-white/5 flex items-center justify-between text-xs text-gray-400">
                    <span>
                        Showing <strong className="text-white font-bold">{filteredNovels.length}</strong> {filteredNovels.length === 1 ? 'novel' : 'novels'}
                        {searchQuery && (
                            <span> for &ldquo;<span className="text-red-400">{searchQuery}</span>&rdquo;</span>
                        )}
                    </span>
                    {searchQuery && (
                        <button
                            onClick={() => {
                                setSearchQuery('');
                                setStatusFilter('all');
                            }}
                            className="text-red-400 hover:underline hover:text-red-300 font-medium"
                        >
                            Reset filters
                        </button>
                    )}
                </div>
            </div>

            {/* Novels Grid */}
            {filteredNovels.length === 0 ? (
                <div className="text-center py-20 bg-dark-900/50 rounded-2xl border border-white/5 p-8">
                    <div className="w-16 h-16 rounded-2xl bg-white/5 mx-auto flex items-center justify-center text-gray-500 mb-4">
                        <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                        </svg>
                    </div>
                    <h2 className="text-xl md:text-2xl font-bold text-white mb-2">No Novels Found</h2>
                    <p className="text-gray-400 text-sm max-w-md mx-auto mb-6">
                        No novels matched your search &ldquo;{searchQuery}&rdquo;. Try checking the spelling or searching for another keyword.
                    </p>
                    <button
                        onClick={() => {
                            setSearchQuery('');
                            setStatusFilter('all');
                        }}
                        className="px-5 py-2.5 bg-red-600 hover:bg-red-700 text-white text-sm font-bold rounded-xl transition-all shadow-lg shadow-red-900/20"
                    >
                        View All Novels
                    </button>
                </div>
            ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4 md:gap-6">
                    {filteredNovels.map((novel) => (
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
                                    /* Sleek Dark / Black Cover Placeholder */
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
        </div>
    );
}
