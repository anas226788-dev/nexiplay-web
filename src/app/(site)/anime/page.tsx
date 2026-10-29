import { Metadata } from 'next';
import MovieGrid from '@/components/MovieGrid';
import Pagination from '@/components/Pagination';
import { buildPageMetadata } from '@/lib/metadata';
import { supabase } from '@/lib/supabase';
import { Movie } from '@/lib/types';
import { fetchTmdbAnime, getExistingDatabaseCatalog, normalizeTitle } from '@/lib/tmdb';
import { interleaveLatestContent } from '@/lib/contentMixer';

const ITEMS_PER_PAGE = 24;

export const metadata: Metadata = buildPageMetadata({
    title: 'Anime',
    description: 'Browse and stream the latest anime series & movies in HD quality. Free anime on Nexiplay.',
    path: '/anime',
});

// ISR: Cache on Vercel Global Edge CDN for 5 minutes (300s)
export const revalidate = 300;

interface AnimePageProps {
    searchParams: Promise<{ page?: string }>;
}

async function getAnime(page: number): Promise<{ anime: Movie[]; totalCount: number }> {
    const from = (page - 1) * ITEMS_PER_PAGE;
    const to = from + ITEMS_PER_PAGE - 1;
    const fields = 'id, title, slug, type, poster_url, description, release_year, created_at, trending_badge, is_adult, admin_note, tmdb_id';

    // 1. Fetch local database anime & the existing catalog index for deduplication
    const [paginatedRes, pinnedRes, dbCatalog] = await Promise.all([
        supabase
            .from('movies')
            .select(fields, { count: 'exact' })
            .eq('type', 'anime')
            .order('created_at', { ascending: false })
            .range(from, to),
        page === 1
            ? supabase.from('movies').select(fields).eq('type', 'anime').eq('admin_note', 'pinned').order('created_at', { ascending: false })
            : Promise.resolve({ data: [] }),
        getExistingDatabaseCatalog(),
    ]);

    const localCount = paginatedRes.count || 0;
    const localData = (paginatedRes.data || []) as Movie[];

    let localPageAnime: Movie[] = [];
    if (page === 1) {
        const pinned: Movie[] = (pinnedRes.data || []).map((m: any) => ({ ...m, is_pinned: true }));
        const pinnedIds = new Set(pinned.map(m => m.id));
        const regular = localData.filter(m => !pinnedIds.has(m.id)).map(m => ({ ...m, is_pinned: m.admin_note === 'pinned' }));
        localPageAnime = interleaveLatestContent({
            pinned,
            regular,
            limit: ITEMS_PER_PAGE
        });
    } else {
        localPageAnime = localData.map(m => ({ ...m, is_pinned: m.admin_note === 'pinned' }));
    }

    const finalAnime: Movie[] = [...localPageAnime];

    // 2. If this page has room or local DB anime are exhausted, fill from TMDB on-demand
    const needed = ITEMS_PER_PAGE - finalAnime.length;
    if (needed > 0) {
        const localPages = Math.max(1, Math.ceil(localCount / ITEMS_PER_PAGE));
        const tmdbPage = Math.max(1, page - localPages + 1);

        try {
            const { results: tmdbResults } = await fetchTmdbAnime(tmdbPage);
            // Strict Deduplication: filter out any anime that already exists in Supabase
            const freshTmdbAnime = tmdbResults.filter(item => {
                if (item.tmdb_id && dbCatalog.existingTmdbIds.has(item.tmdb_id)) return false;
                if (dbCatalog.existingTitles.has(normalizeTitle(item.title))) return false;
                return true;
            });

            finalAnime.push(...freshTmdbAnime.slice(0, needed));
        } catch (tmdbErr) {
            console.warn('[Anime Page] TMDB fill failed:', tmdbErr);
        }
    }

    // Total count reflects local DB items + infinite TMDB anime universe (500 pages * 24 = 12,000)
    const totalCount = localCount + 12000;

    return { anime: finalAnime, totalCount };
}

export default async function AnimePage({ searchParams }: AnimePageProps) {
    const { page: pageParam } = await searchParams;
    const currentPage = Math.max(1, parseInt(pageParam || '1', 10) || 1);
    const { anime, totalCount } = await getAnime(currentPage);
    const totalPages = Math.ceil(totalCount / ITEMS_PER_PAGE);

    return (
        <div className="container mx-auto px-4 pt-20 md:pt-24 pb-12">
            <div className="mb-8">
                <h1 className="text-3xl md:text-4xl font-bold mb-2 text-white">Anime</h1>
                <p className="text-gray-400 text-sm">
                    Browse thousands of anime series &amp; movies in HD quality · Subbed &amp; dubbed
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
                        <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-6h2v6zm0-8h-2V7h2v2z" />
                    </svg>
                    <h2 className="text-2xl font-bold text-gray-300 mb-2">No Anime Found</h2>
                    <p className="text-gray-500">Anime will appear here once loaded.</p>
                </div>
            )}
        </div>
    );
}
