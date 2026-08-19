import { Metadata } from 'next';
import MovieGrid from '@/components/MovieGrid';
import Pagination from '@/components/Pagination';
import { buildPageMetadata } from '@/lib/metadata';
import { supabase } from '@/lib/supabase';
import { Movie } from '@/lib/types';

const ITEMS_PER_PAGE = 24;

export const metadata: Metadata = buildPageMetadata({
    title: 'Anime',
    description: 'Browse and download the latest anime in HD quality. Free anime downloads available.',
    path: '/anime',
});

export const revalidate = 720;

interface AnimePageProps {
    searchParams: Promise<{ page?: string }>;
}

async function getAnime(page: number): Promise<{ anime: Movie[]; totalCount: number }> {
    const from = (page - 1) * ITEMS_PER_PAGE;
    const to = from + ITEMS_PER_PAGE - 1;
    const fields = 'id, title, slug, type, poster_url, description, release_year, created_at, trending_badge, is_adult, admin_note';

    // Get total count
    const { count } = await supabase
        .from('movies')
        .select('id', { count: 'exact', head: true })
        .eq('type', 'anime');

    // Get paginated data + pinned items on page 1
    const [paginatedRes, pinnedRes] = await Promise.all([
        supabase
            .from('movies')
            .select(fields)
            .eq('type', 'anime')
            .order('created_at', { ascending: false })
            .range(from, to),
        page === 1
            ? supabase.from('movies').select(fields).eq('type', 'anime').eq('admin_note', 'pinned').order('created_at', { ascending: false })
            : Promise.resolve({ data: [] })
    ]);

    if (paginatedRes.error) {
        console.error('Error fetching anime:', paginatedRes.error);
        return { anime: [], totalCount: 0 };
    }

    const pinned: Movie[] = (pinnedRes.data || []).map((m: any) => ({ ...m, is_pinned: true }));
    const pinnedIds = new Set(pinned.map(m => m.id));
    const regular: Movie[] = (paginatedRes.data || []).filter((m: any) => !pinnedIds.has(m.id)).map((m: any) => ({ ...m, is_pinned: m.admin_note === 'pinned' }));
    const finalAnime: Movie[] = page === 1 ? [...pinned, ...regular] : (paginatedRes.data || []).map((m: any) => ({ ...m, is_pinned: m.admin_note === 'pinned' }));

    return { anime: finalAnime, totalCount: count || 0 };
}

export default async function AnimePage({ searchParams }: AnimePageProps) {
    const { page: pageParam } = await searchParams;
    const currentPage = Math.max(1, parseInt(pageParam || '1', 10) || 1);
    const { anime, totalCount } = await getAnime(currentPage);
    const totalPages = Math.ceil(totalCount / ITEMS_PER_PAGE);

    return (
        <div className="container mx-auto px-4 py-8">
            <div className="mb-8">
                <h1 className="text-3xl md:text-4xl font-bold mb-2">Anime</h1>
                <p className="text-gray-400">
                    Browse our collection of {totalCount} anime available for download
                </p>
            </div>

            {anime.length > 0 ? (
                <>
                    <MovieGrid movies={anime} />
                    <Pagination
                        currentPage={currentPage}
                        totalPages={totalPages}
                        totalItems={totalCount}
                        itemsPerPage={ITEMS_PER_PAGE}
                    />
                </>
            ) : (
                <div className="text-center py-20">
                    <svg className="w-20 h-20 mx-auto text-gray-600 mb-6" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z" />
                    </svg>
                    <h2 className="text-2xl font-bold text-gray-300 mb-2">No Anime Found</h2>
                    <p className="text-gray-500">Anime will appear here once added to the database.</p>
                </div>
            )}
        </div>
    );
}
