import { Metadata } from 'next';
import Link from 'next/link';
import Image from 'next/image';
import { buildPageMetadata } from '@/lib/metadata';
import { getBlogPosts } from '@/lib/blog';

export const metadata: Metadata = buildPageMetadata({
    title: 'Nexiplay Blog - Latest Anime & Movie News',
    description: 'Read the latest updates, reviews, and news about your favorite Anime, Movies, and Series on the Nexiplay Blog.',
    path: '/blog',
});

export const revalidate = 3600; // Cache for 1 hour

export default async function BlogIndexPage() {
    const posts = await getBlogPosts();

    return (
        <div className="container mx-auto px-4 py-12 min-h-screen">
            <div className="mb-12 text-center">
                <h1 className="text-4xl md:text-5xl font-black text-white mb-4">
                    <span className="bg-gradient-to-r from-red-500 to-red-600 bg-clip-text text-transparent">Nexiplay</span> Blog
                </h1>
                <p className="text-gray-400 max-w-2xl mx-auto text-lg">
                    Dive into the latest news, updates, and deep dives into the world of Anime, Movies, and Series.
                </p>
            </div>

            {posts.length === 0 ? (
                <div className="text-center py-20 bg-dark-800/50 rounded-2xl border border-white/5">
                    <svg className="w-16 h-16 mx-auto text-gray-600 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h10a2 2 0 012 2v1m2 13a2 2 0 01-2-2V7m2 13a2 2 0 002-2V9.5L18.5 7H20z"></path></svg>
                    <h2 className="text-2xl font-bold text-gray-300 mb-2">No Posts Found</h2>
                    <p className="text-gray-500">Check back later for exciting new content.</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                    {posts.map((post) => (
                        <Link href={`/blog/${post.slug}`} key={post.slug} className="group flex flex-col glass rounded-2xl border border-white/5 overflow-hidden hover:border-red-500/30 transition-all hover:-translate-y-1 hover:shadow-xl hover:shadow-red-900/20">
                            <div className="relative aspect-video w-full overflow-hidden bg-dark-800">
                                <Image
                                    src={post.thumbnail}
                                    alt={post.title}
                                    fill
                                    className="object-cover transition-transform duration-500 group-hover:scale-105"
                                />
                            </div>
                            <div className="p-6 flex flex-col flex-1">
                                <time className="text-xs text-red-500 font-bold tracking-wider mb-3 uppercase">
                                    {new Date(post.pubDate).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
                                </time>
                                <h2 className="text-xl font-bold text-white mb-3 line-clamp-2 group-hover:text-red-400 transition-colors">
                                    {post.title}
                                </h2>
                                <p className="text-gray-400 text-sm line-clamp-3 mb-6 flex-1">
                                    {post.contentSnippet}
                                </p>
                                <span className="inline-flex items-center text-red-500 font-bold text-sm tracking-wide">
                                    Read Article
                                    <svg className="w-4 h-4 ml-1 group-hover:translate-x-1 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
                                    </svg>
                                </span>
                            </div>
                        </Link>
                    ))}
                </div>
            )}
        </div>
    );
}
