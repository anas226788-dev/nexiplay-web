import { notFound } from 'next/navigation';
import { Metadata } from 'next';
import { supabaseNovels } from '@/lib/supabase-novels';
import { buildPageMetadata } from '@/lib/metadata';
import ReaderUI from '@/components/ReaderUI';
import NovelVerificationGuard from '@/components/NovelVerificationGuard';

export const revalidate = 0;

interface PageProps {
    params: Promise<{ slug: string; chapter_slug: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
    const { slug, chapter_slug } = await params;
    
    const { data: novel } = await supabaseNovels
        .from('novels')
        .select('*')
        .eq('slug', slug)
        .single();

    if (!novel) return buildPageMetadata({ title: 'Not Found' });

    const { data: chapters } = await supabaseNovels
        .from('novel_chapters')
        .select('title, slug')
        .eq('novel_id', novel.id);

    const chapter = chapters?.find(c => c.slug === chapter_slug);

    if (!chapter) return buildPageMetadata({ title: 'Chapter Not Found' });

    return buildPageMetadata({
        title: `${chapter.title} - ${novel.title}`,
        description: `Read ${chapter.title} of ${novel.title} online for free on Nexiplay.`,
        path: `/novels/${slug}/chapter/${chapter_slug}`,
        type: 'article',
        image: novel.cover_url,
    });
}

export default async function ChapterReaderPage({ params }: PageProps) {
    const { slug, chapter_slug } = await params;
    
    // Fetch Novel Metadata
    const { data: novel } = await supabaseNovels
        .from('novels')
        .select('*')
        .eq('slug', slug)
        .single();

    if (!novel) notFound();

    // Fetch Chapters from Supabase
    let chapters: any[] = [];
    const { data: chapterData } = await supabaseNovels
        .from('novel_chapters')
        .select('*')
        .eq('novel_id', novel.id)
        .order('chapter_number', { ascending: true });
        
    if (chapterData) chapters = chapterData;

    const chapterIndex = chapters.findIndex(c => c.slug === chapter_slug);
    
    if (chapterIndex === -1) notFound();

    const chapter = chapters[chapterIndex];
    const prevSlug = chapterIndex > 0 ? chapters[chapterIndex - 1].slug : null;
    const nextSlug = chapterIndex < chapters.length - 1 ? chapters[chapterIndex + 1].slug : null;

    return (
        <NovelVerificationGuard novelId={novel.id}>
            <ReaderUI 
                novel={novel}
                chapter={chapter}
                prevSlug={prevSlug}
                nextSlug={nextSlug}
                chapterIndex={chapterIndex}
            />
        </NovelVerificationGuard>
    );
}
