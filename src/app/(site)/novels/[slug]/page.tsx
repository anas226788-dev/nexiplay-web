import { notFound } from 'next/navigation';
import { Metadata } from 'next';
import Image from 'next/image';
import Link from 'next/link';
import { supabaseNovels } from '@/lib/supabase-novels';
import { buildPageMetadata } from '@/lib/metadata';
import NovelVerificationGuard from '@/components/NovelVerificationGuard';
import ChaptersList from '@/components/ChaptersList';

export const revalidate = 0;

interface PageProps {
    params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
    const { slug } = await params;
    const decodedSlug = decodeURIComponent(slug);
    
    const { data: novel } = await supabaseNovels
        .from('novels')
        .select('*')
        .eq('slug', decodedSlug)
        .single();

    if (!novel) {
        return buildPageMetadata({
            title: 'Novel Not Found',
            description: 'The requested novel could not be found.',
        });
    }

    return buildPageMetadata({
        title: `${novel.title} - Read Free on Nexiplay`,
        description: novel.description || `Read ${novel.title} by ${novel.author || 'Unknown'} for free.`,
        path: `/novels/${slug}`,
        type: 'book',
        image: novel.cover_url,
    });
}

export default async function NovelDetailsPage({ params }: PageProps) {
    const { slug } = await params;
    const decodedSlug = decodeURIComponent(slug);
    
    // Fetch Novel Metadata from Supabase
    const { data: novel } = await supabaseNovels
        .from('novels')
        .select('*')
        .eq('slug', decodedSlug)
        .single();

    if (!novel) {
        notFound();
    }

    // Fetch Chapters list from Supabase (only lightweight metadata)
    let chapters: any[] = [];
    if (novel) {
        const { data: chapterData } = await supabaseNovels
            .from('novel_chapters')
            .select('title, slug, created_at, chapter_number')
            .eq('novel_id', novel.id)
            .order('chapter_number', { ascending: true });
            
        if (chapterData) chapters = chapterData;
    }

    return (
        <NovelVerificationGuard novelId={novel.id}>
        <div className="container mx-auto px-4 py-8 md:py-12 max-w-5xl min-h-screen">
            {/* Breadcrumb Navigation */}
            <nav className="flex flex-wrap items-center text-sm text-gray-400 mb-8 gap-2">
                <Link href="/" className="hover:text-red-500 transition-colors">Home</Link>
                <span>›</span>
                <Link href="/novels" className="hover:text-red-500 transition-colors">Novels</Link>
                <span>›</span>
                <span className="text-white truncate">{novel.title}</span>
            </nav>

            <div className="flex flex-col md:flex-row gap-8 lg:gap-12 mb-12">
                {/* Cover Image */}
                <div className="w-[200px] md:w-[280px] shrink-0 mx-auto md:mx-0">
                    <div className="relative aspect-[2/3] w-full rounded-2xl overflow-hidden shadow-2xl border border-white/10 bg-gradient-to-b from-[#181822] via-[#0f0f14] to-black flex items-center justify-center">
                        {novel.cover_url ? (
                            <Image
                                src={novel.cover_url}
                                alt={novel.title}
                                fill
                                className="object-cover"
                                priority
                            />
                        ) : (
                            <div className="w-full h-full flex flex-col items-center justify-between p-6 text-center select-none">
                                <div className="text-[11px] font-mono uppercase tracking-widest text-gray-500">
                                    NEXIPLAY NOVEL
                                </div>
                                <div className="flex flex-col items-center">
                                    <div className="w-16 h-16 rounded-2xl bg-white/[0.04] border border-white/10 flex items-center justify-center text-red-400 mb-3 shadow-inner">
                                        <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                                        </svg>
                                    </div>
                                    <span className="text-xs font-bold text-gray-300 line-clamp-3">
                                        {novel.title}
                                    </span>
                                </div>
                                <span className="text-[10px] uppercase tracking-wider text-gray-500 font-bold bg-white/[0.04] px-3 py-1 rounded-full border border-white/5">
                                    {novel.genre || 'Romantic'}
                                </span>
                            </div>
                        )}
                    </div>
                </div>

                {/* Novel Info */}
                <div className="flex-1 flex flex-col justify-center">
                    <div className="flex flex-wrap items-center gap-2 mb-3">
                        {novel.genre && (
                            <span className="px-3 py-1 bg-red-600/20 text-red-400 border border-red-500/20 rounded-full text-xs font-bold uppercase tracking-wider">
                                {novel.genre}
                            </span>
                        )}
                        {novel.status && (
                            <span className="px-3 py-1 bg-white/5 text-gray-400 border border-white/10 rounded-full text-xs font-bold uppercase tracking-wider">
                                {novel.status}
                            </span>
                        )}
                    </div>

                    <h1 className="text-3xl md:text-5xl font-black text-white mb-4 leading-tight">
                        {novel.title}
                    </h1>

                    {novel.author && (
                        <p className="text-base md:text-lg text-gray-300 font-medium mb-6">
                            Written by <span className="text-white font-bold">{novel.author}</span>
                        </p>
                    )}

                    <div className="glass p-6 rounded-2xl border border-white/5 shadow-xl mb-6">
                        <h3 className="text-lg font-bold text-white mb-2">Synopsis</h3>
                        <p className="text-gray-400 leading-relaxed text-sm md:text-base whitespace-pre-wrap">
                            {novel.description || 'No synopsis available.'}
                        </p>
                    </div>

                    {chapters.length > 0 ? (
                        <Link 
                            href={`/novels/${novel.slug}/chapter/${chapters[0].slug}`} 
                            className="inline-flex items-center justify-center gap-2 px-8 py-4 bg-red-600 hover:bg-red-700 text-white font-bold rounded-xl transition-all shadow-lg hover:shadow-red-900/40 w-full md:w-auto"
                        >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"></path></svg>
                            Start Reading
                        </Link>
                    ) : (
                        <div className="inline-block px-6 py-3 bg-dark-700 text-gray-400 rounded-xl font-bold border border-white/5">
                            No Chapters Available
                        </div>
                    )}
                </div>
            </div>

            {/* Chapters List with Search, Pagination & Sort */}
            <ChaptersList chapters={chapters} novelSlug={novel.slug} />

            {/* Structured Schema Data */}
            <script
                type="application/ld+json"
                dangerouslySetInnerHTML={{
                    __html: JSON.stringify({
                        '@context': 'https://schema.org',
                        '@type': 'Book',
                        'name': novel.title,
                        'author': {
                            '@type': 'Person',
                            'name': novel.author || 'Unknown'
                        },
                        'genre': novel.genre,
                        'description': novel.description,
                        'image': novel.cover_url,
                        'numberOfPages': chapters.length,
                        'url': `https://nexiplay.vercel.app/novels/${novel.slug}`
                    })
                }}
            />
        </div>
        </NovelVerificationGuard>
    );
}
