'use client';

import { useState, useEffect } from 'react';
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

export default function ReaderUI({ novel, chapter, prevSlug, nextSlug, chapterIndex }: ReaderUIProps) {
    const [fontSize, setFontSize] = useState<number>(18);
    const [isDarkMode, setIsDarkMode] = useState<boolean>(true);
    const [isSaving, setIsSaving] = useState(false);
    const [bookmarkSaved, setBookmarkSaved] = useState(false);
    
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
        // Auth is checked from MAIN database
        const { data: sessionData } = await supabase.auth.getSession();
        const user = sessionData?.session?.user;
        
        if (!user) {
            alert('Please login to save bookmarks.');
            setIsSaving(false);
            return;
        }

        try {
            // Bookmark is saved to NOVELS database
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
        <div className={`min-h-screen transition-colors duration-300 ${isDarkMode ? 'bg-dark-950 text-gray-300' : 'bg-gray-50 text-gray-800'}`}>
            {/* Top Toolbar */}
            <div className={`sticky top-16 md:top-20 z-40 px-4 py-3 border-b flex flex-wrap items-center justify-between gap-4 transition-colors ${
                isDarkMode ? 'bg-dark-950 border-white/10' : 'bg-white border-gray-200 shadow-sm'
            }`}>
                <div className="flex flex-col">
                    <Link href={`/novels/${novel.slug}`} className={`text-xs font-bold uppercase tracking-wider mb-0.5 hover:text-red-500 transition-colors ${isDarkMode ? 'text-gray-500' : 'text-gray-500'}`}>
                        ← Back to {novel.title}
                    </Link>
                    <h1 className={`text-sm md:text-base font-black truncate max-w-[200px] md:max-w-md ${isDarkMode ? 'text-white' : 'text-black'}`}>
                        {chapter.title}
                    </h1>
                </div>

                <div className="flex items-center gap-2">
                    <button 
                        onClick={() => setFontSize(s => Math.max(14, s - 2))}
                        className={`w-8 h-8 rounded flex items-center justify-center font-bold transition-colors ${isDarkMode ? 'bg-white/5 hover:bg-white/10 text-white' : 'bg-gray-100 hover:bg-gray-200 text-black'}`}
                    >
                        A-
                    </button>
                    <button 
                        onClick={() => setFontSize(s => Math.min(32, s + 2))}
                        className={`w-8 h-8 rounded flex items-center justify-center font-bold transition-colors ${isDarkMode ? 'bg-white/5 hover:bg-white/10 text-white' : 'bg-gray-100 hover:bg-gray-200 text-black'}`}
                    >
                        A+
                    </button>
                    <button 
                        onClick={() => setIsDarkMode(!isDarkMode)}
                        className={`w-8 h-8 rounded flex items-center justify-center transition-colors ${isDarkMode ? 'bg-white/5 hover:bg-white/10 text-yellow-400' : 'bg-gray-800 hover:bg-gray-900 text-white'}`}
                        title="Toggle Theme"
                    >
                        {isDarkMode ? '☀️' : '🌙'}
                    </button>
                    <button 
                        onClick={handleBookmark}
                        disabled={isSaving}
                        className={`px-3 h-8 rounded flex items-center justify-center font-bold text-xs uppercase tracking-wider transition-all ${
                            bookmarkSaved 
                                ? 'bg-green-500 text-white' 
                                : isDarkMode 
                                    ? 'bg-red-600 hover:bg-red-500 text-white' 
                                    : 'bg-red-600 hover:bg-red-700 text-white'
                        }`}
                    >
                        {bookmarkSaved ? 'Saved!' : 'Bookmark'}
                    </button>
                </div>
            </div>

            {/* Content Area */}
            <div className="container mx-auto px-4 py-8 md:py-16 max-w-3xl">
                <article 
                    className="prose max-w-none prose-img:rounded-xl prose-img:mx-auto prose-p:leading-relaxed"
                    style={{ fontSize: `${fontSize}px` }}
                    dangerouslySetInnerHTML={{ __html: chapter.content }}
                />

                {/* Bottom Navigation */}
                <div className={`mt-16 pt-8 border-t flex flex-col sm:flex-row items-center justify-between gap-4 ${isDarkMode ? 'border-white/10' : 'border-gray-200'}`}>
                    {prevSlug ? (
                        <Link 
                            href={`/novels/${novel.slug}/chapter/${prevSlug}`}
                            className={`w-full sm:w-auto px-6 py-3 rounded-xl font-bold flex items-center justify-center gap-2 transition-all ${
                                isDarkMode ? 'bg-white/5 hover:bg-white/10 text-white' : 'bg-gray-100 hover:bg-gray-200 text-black'
                            }`}
                        >
                            ← Previous Chapter
                        </Link>
                    ) : (
                        <div className={`w-full sm:w-auto px-6 py-3 rounded-xl font-bold text-center opacity-50 ${isDarkMode ? 'bg-white/5 text-gray-400' : 'bg-gray-100 text-gray-500'}`}>
                            First Chapter
                        </div>
                    )}
                    
                    <Link 
                        href={`/novels/${novel.slug}`}
                        className={`w-full sm:w-auto px-6 py-3 rounded-xl font-bold flex items-center justify-center transition-all ${
                            isDarkMode ? 'bg-dark-800 border border-white/10 hover:border-white/20 text-white' : 'bg-white border border-gray-200 hover:border-gray-300 text-black shadow-sm'
                        }`}
                    >
                        Index
                    </Link>

                    {nextSlug ? (
                        <Link 
                            href={`/novels/${novel.slug}/chapter/${nextSlug}`}
                            className="w-full sm:w-auto px-6 py-3 rounded-xl font-bold flex items-center justify-center gap-2 transition-all bg-red-600 hover:bg-red-500 text-white shadow-lg hover:shadow-red-900/40"
                        >
                            Next Chapter →
                        </Link>
                    ) : (
                        <div className={`w-full sm:w-auto px-6 py-3 rounded-xl font-bold text-center opacity-50 ${isDarkMode ? 'bg-white/5 text-gray-400' : 'bg-gray-100 text-gray-500'}`}>
                            Latest Chapter
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
