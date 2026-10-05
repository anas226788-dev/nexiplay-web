import { notFound } from 'next/navigation';
import { Metadata } from 'next';
import { supabaseNovels } from '@/lib/supabase-novels';
import { buildPageMetadata } from '@/lib/metadata';
import ReaderUI from '@/components/ReaderUI';
import NovelVerificationGuard from '@/components/NovelVerificationGuard';

export const revalidate = 0; // Dynamic rendering for fresh CDN fetch

interface PageProps {
    params: Promise<{ slug: string; chapter_slug: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
    const { slug, chapter_slug } = await params;
    const decodedSlug = decodeURIComponent(slug);
    const decodedChapterSlug = decodeURIComponent(chapter_slug);
    
    const { data: novel } = await supabaseNovels
        .from('novels')
        .select('id, title, slug, author, cover_url')
        .eq('slug', decodedSlug)
        .single();

    if (!novel) return buildPageMetadata({ title: 'Not Found' });

    const { data: chapters } = await supabaseNovels
        .from('novel_chapters')
        .select('title, slug')
        .eq('novel_id', novel.id);

    const chapter = chapters?.find(c => c.slug === decodedChapterSlug);

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
    const decodedSlug = decodeURIComponent(slug);
    const decodedChapterSlug = decodeURIComponent(chapter_slug);
    
    // Fetch Novel Metadata
    const { data: novel } = await supabaseNovels
        .from('novels')
        .select('*')
        .eq('slug', decodedSlug)
        .single();

    if (!novel) notFound();

    // Fetch Chapters list from Supabase (only lightweight metadata)
    let chapters: any[] = [];
    const { data: chapterData } = await supabaseNovels
        .from('novel_chapters')
        .select('id, novel_id, chapter_number, title, slug, created_at')
        .eq('novel_id', novel.id)
        .order('chapter_number', { ascending: true });
        
    if (chapterData) chapters = chapterData;

    const chapterIndex = chapters.findIndex(c => c.slug === decodedChapterSlug);
    
    if (chapterIndex === -1) notFound();

    const chapter = { ...chapters[chapterIndex], content: '' };

    // Fetch full chapter body from Cloudflare R2 CDN
    const r2Base = process.env.NEXT_PUBLIC_R2_PUBLIC_URL || 'https://pub-246be7bb40a14c07b8a8359e2bc8285d.r2.dev';
    const r2Url = `${r2Base}/chapters/${novel.id}/${chapter.chapter_number}.json`;

    try {
        const r2Res = await fetch(r2Url, { cache: 'no-store' });
        if (r2Res.ok) {
            const r2Data = await r2Res.json();
            chapter.content = r2Data.content || '';
        } else {
            console.error(`R2 CDN fetch returned HTTP ${r2Res.status} for ${r2Url}`);
        }
    } catch (e) {
        console.error('Error loading chapter from R2:', e);
    }

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
