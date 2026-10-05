import { Metadata } from 'next';
import { buildPageMetadata } from '@/lib/metadata';
import { supabaseNovels } from '@/lib/supabase-novels';
import NovelsExplorer from '@/components/NovelsExplorer';

export const metadata: Metadata = buildPageMetadata({
    title: 'Nexiplay Novels - Read Free Novels Online',
    description: 'Read the latest and best novels for free on Nexiplay. Enjoy a seamless reading experience with our built-in reader.',
    path: '/novels',
});

export const revalidate = 0; // Dynamic server-rendered for snappy pagination & low DB load

interface PageProps {
    searchParams: Promise<{
        page?: string;
        q?: string;
        status?: string;
    }>;
}

const PAGE_SIZE = 24; // 24 items per page (optimal for 2, 3, 4, 6 col responsive grid)

export default async function NovelsIndexPage({ searchParams }: PageProps) {
    const params = await searchParams;
    const currentPage = Math.max(1, parseInt(params.page || '1', 10) || 1);
    const searchQuery = (params.q || '').trim();
    const statusFilter = (params.status || 'all').toLowerCase();

    const from = (currentPage - 1) * PAGE_SIZE;
    const to = from + PAGE_SIZE - 1;

    // Build optimized lightweight query fetching ONLY the required page
    let query = supabaseNovels
        .from('novels')
        .select('id, title, slug, author, genre, cover_url, description, status, created_at', { count: 'exact' });

    if (statusFilter && statusFilter !== 'all') {
        query = query.eq('status', statusFilter);
    }

    if (searchQuery) {
        query = query.or(`title.ilike.%${searchQuery}%,author.ilike.%${searchQuery}%,genre.ilike.%${searchQuery}%,slug.ilike.%${searchQuery}%`);
    }

    const { data: novels, count, error } = await query
        .order('created_at', { ascending: false })
        .range(from, to);

    if (error) {
        console.error('Error fetching novels:', error);
    }

    const totalNovels = count || 0;
    const totalPages = Math.max(1, Math.ceil(totalNovels / PAGE_SIZE));

    return (
        <div className="container mx-auto px-4 py-8 md:py-12 min-h-screen">
            <div className="mb-8 md:mb-10 text-center">
                <h1 className="text-3xl md:text-5xl font-black text-white mb-3">
                    <span className="bg-gradient-to-r from-red-500 to-red-600 bg-clip-text text-transparent">Nexiplay</span> Novels
                </h1>
                <p className="text-gray-400 max-w-2xl mx-auto text-sm md:text-base">
                    Dive into our collection of free romantic novels. Search, browse, and experience seamless reading anywhere.
                </p>
            </div>

            <NovelsExplorer
                novels={novels || []}
                totalNovels={totalNovels}
                currentPage={currentPage}
                totalPages={totalPages}
                pageSize={PAGE_SIZE}
                initialQuery={searchQuery}
                initialStatus={statusFilter}
            />
        </div>
    );
}
