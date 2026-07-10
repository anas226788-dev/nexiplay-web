import { notFound } from 'next/navigation';
import { Metadata } from 'next';
import Image from 'next/image';
import Link from 'next/link';
import { supabaseNovels } from '@/lib/supabase-novels';
import { buildPageMetadata } from '@/lib/metadata';

export const revalidate = 0;

interface PageProps {
    params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
    const { slug } = await params;
    
    const { data: novel } = await supabaseNovels
        .from('novels')
        .select('*')
        .eq('slug', slug)
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

import NovelVerificationGuard from '@/components/NovelVerificationGuard';

export default async function NovelDetailsPage({ params }: PageProps) {
    const { slug } = await params;
    
    // Fetch Novel Metadata from Supabase
    const { data: novel } = await supabaseNovels
        .from('novels')
        .select('*')
        .eq('slug', slug)
        .single();

    if (!novel) {
        notFound();
    }

    // Fetch Chapters from Supabase
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
                    <div className="relative aspect-[2/3] w-full rounded-2xl overflow-hidden shadow-2xl border border-white/10 bg-dark-800">
                        <Image
                            src={novel.cover_url || '/preview.jpg'}
                            alt={novel.title}
                            fill
                            className="object-cover"
                            priority
                        />
                        {novel.status === 'completed' && (
                            <div className="absolute top-3 right-3 bg-green-500/90 backdrop-blur text-white text-xs font-bold px-3 py-1.5 rounded uppercase tracking-wider shadow-lg">
                                Completed
                            </div>
                        )}
                    </div>
                </div>

                {/* Info */}
                <div className="flex-1 flex flex-col justify-center text-center md:text-left">
                    <h1 className="text-3xl md:text-5xl font-black text-white mb-4 leading-tight">
                        {novel.title}
                    </h1>
                    
                    <div className="flex flex-wrap items-center justify-center md:justify-start gap-4 mb-6">
                        {novel.author && (
                            <div className="flex items-center gap-2 text-gray-300">
                                <svg className="w-5 h-5 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"></path></svg>
                                <span className="font-medium">{novel.author}</span>
                            </div>
                        )}
                        {novel.genre && (
                            <div className="flex items-center gap-2 text-gray-300">
                                <svg className="w-5 h-5 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z"></path></svg>
                                <span className="font-medium">{novel.genre}</span>
                            </div>
                        )}
                    </div>

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

            {/* Chapters List */}
            <div className="bg-dark-900 border border-white/5 rounded-3xl overflow-hidden shadow-2xl">
                <div className="p-6 md:p-8 border-b border-white/5 flex items-center justify-between bg-white/[0.02]">
                    <div className="flex items-center gap-3">
                        <span className="w-1.5 h-8 bg-red-600 rounded-full inline-block"></span>
                        <h2 className="text-2xl font-black text-white">Chapters ({chapters.length})</h2>
                    </div>
                </div>

                <div className="p-6 md:p-8">
                    {chapters.length === 0 ? (
                        <div className="text-center py-10">
                            <p className="text-gray-500">Chapters will be listed here once they are published.</p>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 md:gap-4">
                            {chapters.map((chapter, index) => (
                                <Link 
                                    href={`/novels/${novel.slug}/chapter/${chapter.slug}`} 
                                    key={chapter.slug}
                                    className="flex items-center gap-4 p-4 rounded-xl bg-white/[0.02] hover:bg-white/[0.05] border border-transparent hover:border-red-500/30 transition-all group"
                                >
                                    <div className="w-10 h-10 rounded-lg bg-dark-800 text-gray-500 font-black flex items-center justify-center text-sm border border-white/5 group-hover:text-red-400 group-hover:border-red-500/30 transition-colors shrink-0">
                                        {index + 1}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <h4 className="text-white font-bold text-sm truncate group-hover:text-red-400 transition-colors">
                                            {chapter.title}
                                        </h4>
                                        <span className="text-xs text-gray-500 mt-1 block">
                                            {new Date(chapter.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                                        </span>
                                    </div>
                                </Link>
                            ))}
                        </div>
                    )}
                </div>
            </div>

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
