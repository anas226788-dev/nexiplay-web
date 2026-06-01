import { notFound } from 'next/navigation';
import { Metadata } from 'next';
import Image from 'next/image';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import { getBlogPostBySlug, getBlogPosts } from '@/lib/blog';
import { buildPageMetadata } from '@/lib/metadata';
import MovieCard from '@/components/MovieCard';

// Revalidate every hour
export const revalidate = 3600;

interface PageProps {
    params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
    const { slug } = await params;
    const post = await getBlogPostBySlug(slug);

    if (!post) {
        return buildPageMetadata({
            title: 'Post Not Found',
            description: 'The requested blog post could not be found.',
        });
    }

    return buildPageMetadata({
        title: post.title,
        description: post.contentSnippet || `Read more about ${post.title} on Nexiplay's external news aggregator.`,
        path: `/blog/${slug}`,
        type: 'article',
        image: post.thumbnail,
    });
}

// Ensure static params for fast ISR
export async function generateStaticParams() {
    const posts = await getBlogPosts();
    return posts.map(post => ({ slug: post.slug }));
}

function CtaBanner({ link, title }: { link: string; title: string }) {
    return (
        <div className="my-10 p-6 sm:p-8 bg-gradient-to-r from-red-900/20 to-dark-800 border border-red-500/30 rounded-2xl flex flex-col md:flex-row items-center justify-between gap-6 shadow-xl shadow-red-900/10">
            <div className="flex-1 text-center md:text-left">
                <span className="inline-block px-3 py-1 bg-red-600/20 text-red-500 text-xs font-bold rounded-full mb-3 border border-red-500/20">
                    NEXIPLAY EXCLUSIVE
                </span>
                <h3 className="text-xl md:text-2xl font-black text-white mb-2 leading-tight">
                    🎬 Watch or Download this content on NexiPlay
                </h3>
                <p className="text-gray-400 text-sm">
                    Enjoy {title} in pristine HD quality, completely free.
                </p>
            </div>
            <Link 
                href={link} 
                className="w-full md:w-auto shrink-0 px-8 py-4 bg-red-600 hover:bg-red-700 text-white font-bold rounded-xl transition-all shadow-lg hover:shadow-red-900/40 flex items-center justify-center gap-2"
            >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"></path>
                </svg>
                Download in HD
            </Link>
        </div>
    );
}

export default async function BlogPostPage({ params }: PageProps) {
    const { slug } = await params;
    const post = await getBlogPostBySlug(slug);

    if (!post) {
        notFound();
    }

    // Smart Match Logic
    // Try to match the blog title directly into our Supabase Movies DB
    let targetLink = '';
    
    // Aggressively clean up the title to extract only the core Movie/Anime name
    let cleanTitle = post.title
        // Remove common blog keywords, resolutions, bracketed info, and suffix branding
        .replace(/(download|free|watch|online|all episodes|in hindi|in english|subbed|dubbed|\d{3,4}p|4k|hd|bluray|review|news|update|episode \d+|season \d+|\|.*|-.*|\(.*?\))/ig, '')
        // Clean up any extra spaces
        .replace(/\s+/g, ' ')
        .trim();

    // If cleaning made it empty, fallback to the first 2 words of the original title
    if (!cleanTitle) {
        cleanTitle = post.title.split(' ').slice(0, 3).join(' ').replace(/[^a-zA-Z0-9 ]/g, '');
    }

    let { data: matchObj } = await supabase
        .from('movies')
        .select(`id, title, slug, type, poster_url`)
        .ilike('title', `%${cleanTitle}%`)
        .limit(1)
        .maybeSingle();

    if (matchObj) {
        targetLink = `/${matchObj.type}/${matchObj.slug}`;
    } else {
        // Fallback 1: Extract Nexiplay URL directly from the Blog Content text/html
        const contentLinkMatch = post.content.match(/(?:https?:\/\/(?:nexiplay\.vercel\.app|localhost:\d+|127\.0\.0\.1:\d+))\/((?:anime|movies|series)\/[a-zA-Z0-9-]+)/i);
        
        if (contentLinkMatch && contentLinkMatch[1]) {
            targetLink = `/${contentLinkMatch[1]}`;
        } else {
            // Fallback 2: General Search Query
            targetLink = `/search?q=${encodeURIComponent(cleanTitle || post.title)}`;
        }
    }

    // Injecting the Multiple CTAs seamlessly into the HTML Content
    const paragraphs = post.content.split(/<\/p>/i);
    const totalLines = paragraphs.length;
    
    let renderedContent = [];

    // The content placement logic ensures CTAs aren't spammed randomly
    if (totalLines > 2) {
        const p1 = paragraphs.slice(0, 1).join('</p>') + '</p>';
        const middleIndex = Math.floor(totalLines / 2);
        const pMid = paragraphs.slice(1, middleIndex).join('</p>') + (middleIndex > 1 ? '</p>' : '');
        const pEnd = paragraphs.slice(middleIndex).join('</p>') + '</p>';

        renderedContent.push(
            <div key="c1" className="prose prose-invert max-w-none text-gray-300 prose-img:rounded-xl" dangerouslySetInnerHTML={{ __html: p1 }} />,
            <CtaBanner key="cta1" link={targetLink} title={post.title} />,
            <div key="c2" className="prose prose-invert max-w-none text-gray-300 prose-img:rounded-xl" dangerouslySetInnerHTML={{ __html: pMid }} />,
            <CtaBanner key="cta2" link={targetLink} title={post.title} />,
            <div key="c3" className="prose prose-invert max-w-none text-gray-300 prose-img:rounded-xl" dangerouslySetInnerHTML={{ __html: pEnd }} />
        );
    } else {
        // If content is very small, just render it all then the CTA
        renderedContent.push(
            <div key="call" className="prose prose-invert max-w-none text-gray-300 prose-img:rounded-xl" dangerouslySetInnerHTML={{ __html: post.content }} />,
            <CtaBanner key="cta-all" link={targetLink} title={post.title} />
        );
    }

    // Related Content (Traffic Funnel hook)
    let relatedMovies = [];
    if (matchObj) {
        // Fetch items from the same type
        const { data } = await supabase
            .from('movies')
            .select(`id, title, slug, type, poster_url, release_year, created_at, trending_badge, is_adult`)
            .eq('type', matchObj.type)
            .neq('id', matchObj.id)
            .order('trending_rank', { ascending: true })
            .limit(4);
        relatedMovies = data || [];
    } else {
        const { data } = await supabase
            .from('movies')
            .select(`id, title, slug, type, poster_url, release_year, created_at, trending_badge, is_adult`)
            .eq('is_trending', true)
            .limit(4);
        relatedMovies = data || [];
    }

    return (
        <div className="container mx-auto px-4 py-8 md:py-12 max-w-4xl min-h-screen">
            {/* Header */}
            <header className="mb-10 text-center md:text-left">
                <nav className="flex items-center justify-center md:justify-start text-sm text-gray-400 mb-6">
                    <Link href="/" className="hover:text-red-500 transition-colors">Home</Link>
                    <span className="mx-2">›</span>
                    <Link href="/blog" className="hover:text-red-500 transition-colors">Blog</Link>
                    <span className="mx-2">›</span>
                    <span className="text-white truncate max-w-[200px] md:max-w-md">{post.title}</span>
                </nav>

                <h1 className="text-3xl md:text-5xl font-black text-white leading-tight mb-4">
                    {post.title}
                </h1>

                <time className="text-red-500 font-bold uppercase tracking-wider text-sm flex items-center justify-center md:justify-start gap-2">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"></path></svg>
                    {new Date(post.pubDate).toLocaleDateString('en-US', { day: 'numeric', month: 'long', year: 'numeric' })}
                </time>
            </header>

            {/* Thumbnail */}
            <div className="relative w-full aspect-video md:aspect-[21/9] rounded-2xl overflow-hidden mb-12 shadow-2xl border border-white/5 bg-dark-800">
                <Image
                    src={post.thumbnail}
                    alt={post.title}
                    fill
                    className="object-cover"
                    priority
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent"></div>
            </div>

            {/* Blog Post Content Area with Smart CTAs */}
            <article className="glass p-6 md:p-12 rounded-3xl border border-white/5 shadow-2xl mb-16 relative overflow-hidden">
                {/* Decorative Elements */}
                <div className="absolute top-0 right-0 w-64 h-64 bg-red-600/10 rounded-full blur-3xl -mr-32 -mt-32 pointer-events-none"></div>
                <div className="absolute bottom-0 left-0 w-64 h-64 bg-red-600/5 rounded-full blur-3xl -ml-32 -mb-32 pointer-events-none"></div>
                
                <div className="relative z-10 w-full flex flex-col gap-6 blog-content-wrapper">
                    {renderedContent}
                </div>
            </article>

            {/* Structured Schema Data */}
            <script
                type="application/ld+json"
                dangerouslySetInnerHTML={{
                    __html: JSON.stringify({
                        '@context': 'https://schema.org',
                        '@type': 'BlogPosting',
                        'mainEntityOfPage': {
                            '@type': 'WebPage',
                            '@id': `https://nexiplay.vercel.app/blog/${post.slug}`
                        },
                        'headline': post.title,
                        'image': [post.thumbnail],
                        'datePublished': post.pubDate,
                        'dateModified': post.pubDate,
                        'author': {
                            '@type': 'Organization',
                            'name': 'Nexiplay'
                        },
                        'publisher': {
                            '@type': 'Organization',
                            'name': 'Nexiplay',
                            'logo': {
                                '@type': 'ImageObject',
                                'url': 'https://nexiplay.vercel.app/icon.png'
                            }
                        }
                    })
                }}
            />

            {/* Related Content Funnel */}
            {relatedMovies.length > 0 && (
                <div className="mt-16 bg-dark-900 border-t border-white/5 pt-16">
                    <div className="flex items-center gap-3 mb-8">
                        <span className="w-1.5 h-8 bg-red-600 rounded-full inline-block"></span>
                        <h3 className="text-2xl font-black text-white">Related Content on Nexiplay</h3>
                    </div>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                        {relatedMovies.map(movie => (
                            <MovieCard key={movie.id} movie={movie as any} />
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}
