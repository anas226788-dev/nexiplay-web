import { Metadata } from 'next';
import Link from 'next/link';
import Image from 'next/image';
import { buildPageMetadata } from '@/lib/metadata';
import { supabaseNovels } from '@/lib/supabase-novels';

export const metadata: Metadata = buildPageMetadata({
    title: 'Nexiplay Novels - Read Free Novels Online',
    description: 'Read the latest and best novels for free on Nexiplay. Enjoy a seamless reading experience with our built-in reader.',
    path: '/novels',
});

export const revalidate = 60; // Cache for 1 minute

export default async function NovelsIndexPage() {
    const { data: novels, error } = await supabaseNovels
        .from('novels')
        .select('*')
        .order('created_at', { ascending: false });

    return (
        <div className="container mx-auto px-4 py-12 min-h-screen">
            <div className="mb-12 text-center">
                <h1 className="text-4xl md:text-5xl font-black text-white mb-4">
                    <span className="bg-gradient-to-r from-red-500 to-red-600 bg-clip-text text-transparent">Nexiplay</span> Novels
                </h1>
                <p className="text-gray-400 max-w-2xl mx-auto text-lg">
                    Dive into our collection of free novels. Experience seamless reading anywhere.
                </p>
            </div>

            {!novels || novels.length === 0 ? (
                <div className="text-center py-20 bg-dark-800/50 rounded-2xl border border-white/5">
                    <svg className="w-16 h-16 mx-auto text-gray-600 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6"></path></svg>
                    <h2 className="text-2xl font-bold text-gray-300 mb-2">No Novels Found</h2>
                    <p className="text-gray-500">Check back later for exciting new content.</p>
                </div>
            ) : (
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4 md:gap-6">
                    {novels.map((novel) => (
                        <Link href={`/novels/${novel.slug}`} key={novel.slug} className="group flex flex-col rounded-2xl overflow-hidden hover:-translate-y-1 transition-all">
                            <div className="relative aspect-[2/3] w-full overflow-hidden bg-dark-800 rounded-xl mb-3 shadow-lg">
                                <Image
                                    src={novel.cover_url || '/preview.jpg'}
                                    alt={novel.title}
                                    fill
                                    className="object-cover transition-transform duration-500 group-hover:scale-105"
                                />
                                {novel.status === 'completed' && (
                                    <div className="absolute top-2 right-2 bg-green-500/90 backdrop-blur text-white text-[10px] font-bold px-2 py-1 rounded uppercase tracking-wider">
                                        Completed
                                    </div>
                                )}
                            </div>
                            <h2 className="text-sm md:text-base font-bold text-white mb-1 line-clamp-2 group-hover:text-red-400 transition-colors">
                                {novel.title}
                            </h2>
                            <div className="flex flex-col gap-1 text-xs text-gray-400">
                                {novel.author && <span className="truncate">By {novel.author}</span>}
                                {novel.genre && <span className="text-red-500/80 font-medium truncate">{novel.genre}</span>}
                            </div>
                        </Link>
                    ))}
                </div>
            )}
        </div>
    );
}
