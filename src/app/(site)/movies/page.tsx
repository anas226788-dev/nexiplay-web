import { Metadata } from 'next';
import MovieGrid from '@/components/MovieGrid';
import Pagination from '@/components/Pagination';
import { buildPageMetadata } from '@/lib/metadata';
import { supabase } from '@/lib/supabase';
import { Movie } from '@/lib/types';
import { fetchTmdbMovies, getExistingDatabaseCatalog, normalizeTitle } from '@/lib/tmdb';

const ITEMS_PER_PAGE = 24;

export const metadata: Metadata = buildPageMetadata({
    title: 'Movies',
    description: 'Browse and stream the latest movies in HD quality. Infinite catalog on Nexiplay.',
    path: '/movies',
});

// ISR: Cache on Vercel Global Edge CDN for 5 minutes (300s)
export const revalidate = 300;

interface MoviesPageProps {
    searchParams: Promise<{ page?: string }>;
}

async function getMovies(page: number): Promise<{ movies: Movie[]; totalCount: number }> {
    const from = (page - 1) * ITEMS_PER_PAGE;
    const to = from + ITEMS_PER_PAGE - 1;
    const fields = 'id, title, slug, type, poster_url, description, release_year, created_at, trending_badge, is_adult, admin_note, tmdb_id';

    // 1. Fetch local database movies & the existing catalog index for deduplication
    const [paginatedRes, pinnedRes, dbCatalog] = await Promise.all([
        supabase
            .from('movies')
            .select(fields, { count: 'exact' })
            .eq('type', 'movie')
            .order('created_at', { ascending: false })
            .range(from, to),
        page === 1
            ? supabase.from('movies').select(fields).eq('type', 'movie').eq('admin_note', 'pinned').order('created_at', { ascending: false })
            : Promise.resolve({ data: [] }),
        getExistingDatabaseCatalog(),
    ]);

    const localCount = paginatedRes.count || 0;
    const localData = (paginatedRes.data || []) as Movie[];

    let localPageMovies: Movie[] = [];
    if (page === 1) {
        const pinned: Movie[] = (pinnedRes.data || []).map((m: any) => ({ ...m, is_pinned: true }));
        const pinnedIds = new Set(pinned.map(m => m.id));
        const regular = localData.filter(m => !pinnedIds.has(m.id)).map(m => ({ ...m, is_pinned: m.admin_note === 'pinned' }));
        localPageMovies = [...pinned, ...regular];
    } else {
        localPageMovies = localData.map(m => ({ ...m, is_pinned: m.admin_note === 'pinned' }));
    }

    const finalMovies: Movie[] = [...localPageMovies];

    // 2. If this page has room or local DB movies are exhausted, fill from TMDB on-demand
    const needed = ITEMS_PER_PAGE - finalMovies.length;
    if (needed > 0) {
        const localPages = Math.max(1, Math.ceil(localCount / ITEMS_PER_PAGE));
        const tmdbPage = Math.max(1, page - localPages + 1);

        try {
            const { results: tmdbResults } = await fetchTmdbMovies(tmdbPage);
            // Strict Deduplication: filter out any title that exists in Supabase
            const freshTmdbMovies = tmdbResults.filter(item => {
                if (item.tmdb_id && dbCatalog.existingTmdbIds.has(item.tmdb_id)) return false;
                if (dbCatalog.existingTitles.has(normalizeTitle(item.title))) return false;
                return true;
            });

            finalMovies.push(...freshTmdbMovies.slice(0, needed));
        } catch (tmdbErr) {
            console.warn('[Movies Page] TMDB fill failed:', tmdbErr);
        }
    }

    // Total count reflects local DB items + infinite TMDB universe (500 pages * 24 = 12,000)
    const totalCount = localCount + 12000;

    return { movies: finalMovies, totalCount };
}

export default async function MoviesPage({ searchParams }: MoviesPageProps) {
    const { page: pageParam } = await searchParams;
    const currentPage = Math.max(1, parseInt(pageParam || '1', 10) || 1);
    const { movies, totalCount } = await getMovies(currentPage);
    const totalPages = Math.ceil(totalCount / ITEMS_PER_PAGE);

    return (
        <div className="container mx-auto px-4 pt-20 md:pt-24 pb-12">
            <div className="mb-8">
                <h1 className="text-3xl md:text-4xl font-bold mb-2 text-white">Movies</h1>
                <p className="text-gray-400 text-sm">
                    Browse thousands of movies in HD quality · Watch online &amp; download
                </p>
            </div>

            {movies.length > 0 ? (
                <>
                    <MovieGrid movies={movies} />
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
                        <path d="M18 4l2 4h-3l-2-4h-2l2 4h-3l-2-4H8l2 4H7L5 4H4c-1.1 0-1.99.9-1.99 2L2 18c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V4h-4z" />
                    </svg>
                    <h2 className="text-2xl font-bold text-gray-300 mb-2">No Movies Found</h2>
                    <p className="text-gray-500">Movies will appear here once loaded.</p>
                </div>
            )}
        </div>
    );
}
