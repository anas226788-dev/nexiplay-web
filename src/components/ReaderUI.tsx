'use client';

import { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import { supabaseNovels } from '@/lib/supabase-novels';
import { BlogPost } from '@/lib/blog';

interface ReaderUIProps {
    novel: any;
    chapter: BlogPost;
    prevSlug: string | null;
    nextSlug: string | null;
    chapterIndex: number;
}

/**
 * Intelligent Bengali Novel Content Formatter
 * Converts raw text with \n / \n\n or poorly-structured HTML into
 * beautiful, semantically spaced paragraphs with dialogue distinction.
 */
function formatNovelContent(raw: string | undefined | null): string {
    if (!raw || typeof raw !== 'string') return '';
    let text = raw.trim();

    // 1. If HTML tags exist, normalize and extract clean lines
    const hasHtml = /<[a-z][\s\S]*>/i.test(text);
    if (hasHtml) {
        text = text.replace(/&nbsp;/gi, ' ');
        text = text.replace(/<br\s*\/?>/gi, '\n');
        text = text.replace(/<\/(p|div|h[1-6]|li|section|article)>/gi, '\n\n');
        text = text.replace(/<[^>]+>/g, '');
    }

    // 2. Decode HTML entities
    text = text
        .replace(/&amp;/g, '&')
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/&quot;/g, '"')
        .replace(/&#39;/g, "'")
        .replace(/&mdash;/g, '—')
        .replace(/&ndash;/g, '–');

    // 3. Normalize all line breaks to \n
    text = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n');

    // 4. Split text into blocks by double or multiple newlines
    const blocks = text.split(/\n\s*\n+/);
    const paragraphs: string[] = [];

    for (let block of blocks) {
        block = block.trim();
        if (!block) continue;

        // Check if this block contains single newlines (e.g. dialogue or short lines)
        const lines = block.split(/\n+/).map(l => l.trim()).filter(Boolean);

        for (const line of lines) {
            // Escape any remaining HTML brackets to ensure pure safety
            const safeLine = line
                .replace(/&/g, '&amp;')
                .replace(/</g, '&lt;')
                .replace(/>/g, '&gt;');

            // Check if line is dialogue (starts with quotes, dashes, brackets, etc.)
            const isDialogue = /^([—\-\u2014\u2013"“'‘•*«❝„]|\[|\()/.test(line);
            const className = isDialogue 
                ? 'novel-para dialogue' 
                : 'novel-para';
            paragraphs.push(`<p class="${className}">${safeLine}</p>`);
        }
    }

    return paragraphs.join('\n');
}

export default function ReaderUI({ novel, chapter, prevSlug, nextSlug, chapterIndex }: ReaderUIProps) {
    const [fontSize, setFontSize] = useState<number>(19);
    const [isDarkMode, setIsDarkMode] = useState<boolean>(true);
    const [isSaving, setIsSaving] = useState(false);
    const [bookmarkSaved, setBookmarkSaved] = useState(false);
    const [readingProgress, setReadingProgress] = useState(0);

    // Format content into clean, spaced paragraphs
    const formattedHtml = useMemo(() => {
        return formatNovelContent(chapter.content);
    }, [chapter.content]);

    // Calculate approximate read time
    const readingTimeMinutes = useMemo(() => {
        const text = chapter.content || '';
        const wordCount = text.trim().split(/\s+/).filter(Boolean).length;
        return Math.max(1, Math.ceil(wordCount / 180));
    }, [chapter.content]);

    // Reading scroll progress
    useEffect(() => {
        const handleScroll = () => {
            const totalHeight = document.documentElement.scrollHeight - window.innerHeight;
            if (totalHeight > 0) {
                const currentProgress = (window.scrollY / totalHeight) * 100;
                setReadingProgress(Math.min(100, Math.max(0, currentProgress)));
            }
        };
        window.addEventListener('scroll', handleScroll, { passive: true });
        return () => window.removeEventListener('scroll', handleScroll);
    }, []);

    // Load preferences
    useEffect(() => {
        const savedSize = localStorage.getItem('reader_font_size');
        const savedMode = localStorage.getItem('reader_dark_mode');
        if (savedSize) setFontSize(Number(savedSize));
        if (savedMode) setIsDarkMode(savedMode === 'true');
    }, []);

    // Save preferences
    useEffect(() => {
        localStorage.setItem('reader_font_size', fontSize.toString());
        localStorage.setItem('reader_dark_mode', isDarkMode.toString());
    }, [fontSize, isDarkMode]);

    const handleBookmark = async () => {
        setIsSaving(true);
        const { data: sessionData } = await supabase.auth.getSession();
        const user = sessionData?.session?.user;
        
        if (!user) {
            alert('Please login to save bookmarks.');
            setIsSaving(false);
            return;
        }

        try {
            const { error } = await supabaseNovels
                .from('user_novel_progress')
                .upsert({ 
                    user_id: user.id, 
                    novel_id: novel.id, 
                    bookmarked_chapter: chapterIndex + 1,
                    last_chapter_read: chapterIndex + 1,
                    updated_at: new Date().toISOString()
                }, { onConflict: 'user_id,novel_id' });

            if (error) throw error;
            setBookmarkSaved(true);
            setTimeout(() => setBookmarkSaved(false), 2000);
        } catch (err) {
            console.error('Error saving bookmark:', err);
            alert('Failed to save bookmark.');
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <div className={`min-h-screen transition-colors duration-300 font-bengali ${isDarkMode ? 'bg-[#090a0f] text-gray-200' : 'bg-[#faf9f6] text-gray-900'}`}>
            {/* Scroll Reading Progress Bar */}
            <div className="fixed top-0 left-0 w-full h-[3px] z-50 bg-transparent">
                <div 
                    className="h-full bg-gradient-to-r from-red-600 via-rose-500 to-red-600 transition-all duration-150 ease-out shadow-[0_0_8px_rgba(229,9,20,0.8)]"
                    style={{ width: `${readingProgress}%` }}
                />
            </div>

            {/* Top Toolbar */}
            <header className={`sticky top-16 md:top-20 z-40 px-4 py-3 border-b flex flex-wrap items-center justify-between gap-4 transition-colors backdrop-blur-md ${
                isDarkMode ? 'bg-[#090a0f]/90 border-white/10' : 'bg-[#faf9f6]/95 border-gray-200 shadow-sm'
            }`}>
                <div className="flex flex-col min-w-0">
                    <Link 
                        href={`/novels/${novel.slug}`} 
                        className={`text-xs font-semibold uppercase tracking-wider mb-0.5 hover:text-red-500 transition-colors flex items-center gap-1 ${
                            isDarkMode ? 'text-gray-400' : 'text-gray-600'
                        }`}
                    >
                        <span>←</span>
                        <span className="truncate">{novel.title}</span>
                    </Link>
                    <h1 className={`text-sm md:text-base font-bold truncate max-w-[220px] sm:max-w-sm md:max-w-lg ${
                        isDarkMode ? 'text-white' : 'text-gray-950'
                    }`}>
                        {chapter.title}
                    </h1>
                </div>

                {/* Reader Controls */}
                <div className="flex items-center gap-2 shrink-0">
                    {/* Reading Time Badge */}
                    <span className={`hidden sm:inline-flex items-center text-[11px] font-medium px-2.5 py-1 rounded-full border ${
                        isDarkMode ? 'bg-white/5 border-white/10 text-gray-400' : 'bg-gray-100 border-gray-200 text-gray-600'
                    }`}>
                        📖 ~{readingTimeMinutes} মিনিট
                    </span>

                    {/* Font Size A- */}
                    <button 
                        onClick={() => setFontSize(s => Math.max(15, s - 1))}
                        className={`w-8 h-8 rounded-lg flex items-center justify-center font-bold text-xs transition-colors ${
                            isDarkMode ? 'bg-white/5 hover:bg-white/10 text-white' : 'bg-gray-200/70 hover:bg-gray-300 text-black'
                        }`}
                        title="ফন্ট সাইজ ছোট করুন"
                    >
                        A-
                    </button>

                    {/* Current Font Size Indicator */}
                    <span className="text-[11px] font-mono text-gray-500 select-none hidden md:inline">
                        {fontSize}px
                    </span>

                    {/* Font Size A+ */}
                    <button 
                        onClick={() => setFontSize(s => Math.min(32, s + 1))}
                        className={`w-8 h-8 rounded-lg flex items-center justify-center font-bold text-xs transition-colors ${
                            isDarkMode ? 'bg-white/5 hover:bg-white/10 text-white' : 'bg-gray-200/70 hover:bg-gray-300 text-black'
                        }`}
                        title="ফন্ট সাইজ বড় করুন"
                    >
                        A+
                    </button>

                    {/* Dark/Light Toggle */}
                    <button 
                        onClick={() => setIsDarkMode(!isDarkMode)}
                        className={`w-8 h-8 rounded-lg flex items-center justify-center transition-colors ${
                            isDarkMode ? 'bg-white/5 hover:bg-white/10 text-yellow-400' : 'bg-gray-200/70 hover:bg-gray-300 text-gray-800'
                        }`}
                        title="থিম পরিবর্তন করুন"
                    >
                        {isDarkMode ? '☀️' : '🌙'}
                    </button>

                    {/* Bookmark Button */}
                    <button 
                        onClick={handleBookmark}
                        disabled={isSaving}
                        className={`px-3.5 h-8 rounded-lg flex items-center justify-center font-bold text-xs tracking-wider transition-all shadow-sm ${
                            bookmarkSaved 
                                ? 'bg-emerald-600 text-white' 
                                : 'bg-red-600 hover:bg-red-500 text-white'
                        }`}
                    >
                        {bookmarkSaved ? 'সেভড!' : 'বুকমার্ক'}
                    </button>
                </div>
            </header>

            {/* Main Reading Canvas */}
            <main className="container mx-auto px-4 py-8 md:py-14 max-w-3xl">
                {/* Chapter Header Inside Content */}
                <div className="mb-10 text-center pb-8 border-b border-white/5">
                    <span className="inline-block text-[11px] font-bold uppercase tracking-widest text-red-500 mb-2">
                        পর্ব {chapterIndex + 1}
                    </span>
                    <h2 className={`text-xl sm:text-2xl md:text-3xl font-black mb-3 leading-snug ${
                        isDarkMode ? 'text-white' : 'text-gray-950'
                    }`}>
                        {chapter.title}
                    </h2>
                    <p className={`text-xs ${isDarkMode ? 'text-gray-500' : 'text-gray-500'}`}>
                        {novel.title} • লেখক: {novel.author || 'Golponir'}
                    </p>
                </div>

                {/* Chapter Paragraphs Area */}
                {chapter.content ? (
                    <article 
                        className={`novel-reader-article ${isDarkMode ? 'reader-dark' : 'reader-light'}`}
                        style={{ fontSize: `${fontSize}px` }}
                        dangerouslySetInnerHTML={{ __html: formattedHtml }}
                    />
                ) : (
                    <div className="text-center py-16 bg-white/[0.02] rounded-2xl border border-white/5 p-8">
                        <div className="w-12 h-12 rounded-full bg-white/5 flex items-center justify-center text-gray-400 mx-auto mb-3">
                            <svg className="w-6 h-6 animate-pulse text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                            </svg>
                        </div>
                        <h3 className="text-lg font-bold text-white mb-1">অধ্যায় লোড হচ্ছে...</h3>
                        <p className="text-gray-400 text-sm max-w-sm mx-auto mb-4">
                            Cloudflare CDN থেকে অধ্যায়ের লেখা ফেচ করা হচ্ছে। লেখা না আসলে রিলোড করুন।
                        </p>
                        <button
                            onClick={() => window.location.reload()}
                            className="px-5 py-2.5 bg-red-600 hover:bg-red-500 text-white font-bold rounded-xl text-xs transition-colors shadow-lg shadow-red-900/30"
                        >
                            পুনরায় লোড করুন
                        </button>
                    </div>
                )}

                {/* Bottom Chapter Navigation Bar */}
                <nav aria-label="Chapter Navigation" className={`mt-16 pt-8 border-t flex flex-col sm:flex-row items-center justify-between gap-4 ${
                    isDarkMode ? 'border-white/10' : 'border-gray-200'
                }`}>
                    {prevSlug ? (
                        <Link 
                            href={`/novels/${novel.slug}/chapter/${prevSlug}`}
                            className={`w-full sm:w-auto px-6 py-3 rounded-xl font-bold flex items-center justify-center gap-2 transition-all text-sm ${
                                isDarkMode ? 'bg-white/5 hover:bg-white/10 text-white' : 'bg-gray-200/70 hover:bg-gray-300 text-black'
                            }`}
                        >
                            <span>←</span> আগের পর্ব
                        </Link>
                    ) : (
                        <div className={`w-full sm:w-auto px-6 py-3 rounded-xl font-bold text-center text-sm opacity-40 select-none ${
                            isDarkMode ? 'bg-white/5 text-gray-500' : 'bg-gray-200/40 text-gray-400'
                        }`}>
                            প্রথম পর্ব
                        </div>
                    )}
                    
                    <Link 
                        href={`/novels/${novel.slug}`} 
                        className={`w-full sm:w-auto px-6 py-3 rounded-xl font-bold flex items-center justify-center transition-all text-sm ${
                            isDarkMode 
                                ? 'bg-white/[0.04] border border-white/10 hover:border-white/20 text-white' 
                                : 'bg-white border border-gray-300 hover:border-gray-400 text-black shadow-sm'
                        }`}
                    >
                        সূচিপত্র (Chapters)
                    </Link>

                    {nextSlug ? (
                        <Link 
                            href={`/novels/${novel.slug}/chapter/${nextSlug}`}
                            className="w-full sm:w-auto px-6 py-3 rounded-xl font-bold flex items-center justify-center gap-2 transition-all text-sm bg-red-600 hover:bg-red-500 text-white shadow-lg shadow-red-900/30 hover:shadow-red-900/50"
                        >
                            পরের পর্ব <span>→</span>
                        </Link>
                    ) : (
                        <div className={`w-full sm:w-auto px-6 py-3 rounded-xl font-bold text-center text-sm opacity-40 select-none ${
                            isDarkMode ? 'bg-white/5 text-gray-500' : 'bg-gray-200/40 text-gray-400'
                        }`}>
                            সর্বশেষ পর্ব
                        </div>
                    )}
                </nav>
            </main>
        </div>
    );
}
