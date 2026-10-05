import Parser from 'rss-parser';

export interface BlogPost {
    title: string;
    slug: string;
    link: string;
    pubDate: string;
    content: string;
    contentSnippet: string;
    thumbnail: string;
}

const parser = new Parser({
    customFields: {
        item: [
            ['media:content', 'mediaContent'],
            ['media:thumbnail', 'mediaThumbnail'],
            ['content:encoded', 'contentEncoded']
        ]
    }
});

// Configure this in your .env.local to point to your Blogger/WordPress RSS feed
const RSS_URL = process.env.NEXT_PUBLIC_BLOG_RSS_URL || 'https://www.animenewsnetwork.com/news/rss.xml';

export async function getBlogPosts(label?: string): Promise<BlogPost[]> {
    try {
        const feed = await parser.parseURL(RSS_URL);
        
        let items = feed.items;
        
        // If a label is provided and the feed supports categories, filter by label
        if (label) {
            items = items.filter(item => {
                const categories = item.categories || [];
                return categories.some((c: string) => c.toLowerCase() === label.toLowerCase());
            });
        }
        
        return items.map(item => {
            let thumbnail = '/preview.jpg'; // default Nexiplay preview image
            
            // Extract from standard media namespaces
            if (item.mediaThumbnail && item.mediaThumbnail['$'] && item.mediaThumbnail['$'].url) {
                thumbnail = item.mediaThumbnail['$'].url;
            } else if (item.mediaContent && item.mediaContent['$'] && item.mediaContent['$'].url) {
                thumbnail = item.mediaContent['$'].url;
            } else {
                // Regex fallback to extract the first image from HTML content
                const contentStr = item.contentEncoded || item.content || '';
                const imgMatch = contentStr.match(/<img[^>]+src=["']([^"']+)["']/i);
                if (imgMatch && imgMatch[1]) {
                    thumbnail = imgMatch[1];
                }
            }

            // Create a URL-safe slug from the title
            const slug = (item.title || '')
                .toLowerCase()
                .replace(/[^a-z0-9]+/g, '-')
                .replace(/(^-|-$)+/g, '');

            return {
                title: item.title || 'Untitled',
                slug,
                link: item.link || '',
                pubDate: item.pubDate || new Date().toISOString(),
                content: item.contentEncoded || item.content || '',
                contentSnippet: item.contentSnippet || '',
                thumbnail
            };
        });
    } catch (error) {
        console.error('Error fetching RSS:', error);
        return [];
    }
}

export async function getBlogPostBySlug(slug: string, label?: string): Promise<BlogPost | null> {
    const posts = await getBlogPosts(label);
    return posts.find(p => p.slug === slug) || null;
}
