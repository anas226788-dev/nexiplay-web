import { Metadata } from 'next';
import MovieGrid from '@/components/MovieGrid';
import Pagination from '@/components/Pagination';
import { buildPageMetadata } from '@/lib/metadata';
import { supabase } from '@/lib/supabase';
import { Movie } from '@/lib/types';
import { fetchTmdbSeries, getExistingDatabaseCatalog, normalizeTitle } from '@/lib/tmdb';
import { interleaveLatestContent } from '@/lib/contentMixer';

const ITEMS_PER_PAGE = 24;

export const metadata: Metadata = buildPageMetadata({
    title: 'Series',
    description: 'Browse and stream the latest TV series in HD quality. Infinite catalog on Nexiplay.',
    path: '/series',
});

// ISR: Cache on Vercel Global Edge CDN for 5 minutes (300s)
export const revalidate = 300;

interface SeriesPageProps {
    searchParams: Promise<{ page?: string }>;
}

async function getSeries(page: number): Promise<{ series: Movie[]; totalCount: number }> {
    const from = (page - 1) * ITEMS_PER_PAGE;
    const to = from + ITEMS_PER_PAGE - 1;
    const fields = 'id, title, slug, type, poster_url, description, release_year, created_at, trending_badge, is_adult, admin_note, tmdb_id';

    // 1. Fetch local database series & the existing catalog index for deduplication
    const [paginatedRes, pinnedRes, dbCatalog] = await Promise.all([
        supabase
            .from('movies')
            .select(fields, { count: 'exact' })
            .eq('type', 'series')
            .order('created_at', { ascending: false })
            .range(from, to),
        page === 1
            ? supabase.from('movies').select(fields).eq('type', 'series').eq('admin_note', 'pinned').order('created_at', { ascending: false })
            : Promise.resolve({ data: [] }),
        getExistingDatabaseCatalog(),
    ]);

    const localCount = paginatedRes.count || 0;
    const localData = (paginatedRes.data || []) as Movie[];

    let localPageSeries: Movie[] = [];
    if (page === 1) {
        const pinned: Movie[] = (pinnedRes.data || []).map((m: any) => ({ ...m, is_pinned: true }));
        const pinnedIds = new Set(pinned.map(m => m.id));
        const regular = localData.filter(m => !pinnedIds.has(m.id)).map(m => ({ ...m, is_pinned: m.admin_note === 'pinned' }));
        localPageSeries = interleaveLatestContent({
            pinned,
            regular,
            limit: ITEMS_PER_PAGE
        });
    } else {
        localPageSeries = localData.map(m => ({ ...m, is_pinned: m.admin_note === 'pinned' }));
    }

    const finalSeries: Movie[] = [...localPageSeries];

    // 2. If this page has room or local DB series are exhausted, fill from TMDB on-demand
    const needed = ITEMS_PER_PAGE - finalSeries.length;
    if (needed > 0) {
        const localPages = Math.max(1, Math.ceil(localCount / ITEMS_PER_PAGE));
        const tmdbPage = Math.max(1, page - localPages + 1);

        try {
            const { results: tmdbResults } = await fetchTmdbSeries(tmdbPage);
            // Strict Deduplication: filter out any title that exists in Supabase
            const freshTmdbSeries = tmdbResults.filter(item => {
                if (item.tmdb_id && dbCatalog.existingTmdbIds.has(item.tmdb_id)) return false;
                if (dbCatalog.existingTitles.has(normalizeTitle(item.title))) return false;
                return true;
            });

            finalSeries.push(...freshTmdbSeries.slice(0, needed));
        } catch (tmdbErr) {
            console.warn('[Series Page] TMDB fill failed:', tmdbErr);
        }
    }

    // Total count reflects local DB items + infinite TMDB universe (500 pages * 24 = 12,000)
    const totalCount = localCount + 12000;

    return { series: finalSeries, totalCount };
}

export default async function SeriesPage({ searchParams }: SeriesPageProps) {
    const { page: pageParam } = await searchParams;
    const currentPage = Math.max(1, parseInt(pageParam || '1', 10) || 1);
    const { series, totalCount } = await getSeries(currentPage);
    const totalPages = Math.ceil(totalCount / ITEMS_PER_PAGE);

    return (
        <div className="container mx-auto px-4 pt-20 md:pt-24 pb-12">
            <div className="mb-8">
                <h1 className="text-3xl md:text-4xl font-bold mb-2 text-white">TV Series</h1>
                <p className="text-gray-400 text-sm">
                    Browse thousands of TV shows &amp; series in HD quality · Watch online &amp; stream
                </p>
            </div>

            {series.length > 0 ? (
                <>
                    <MovieGrid movies={series} />
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
                        <path d="M21 3H3c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h5v2h8v-2h5c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm0 14H3V5h18v12z" />
                    </svg>
                    <h2 className="text-2xl font-bold text-gray-300 mb-2">No Series Found</h2>
                    <p className="text-gray-500">Series will appear here once loaded.</p>
                </div>
            )}
        </div>
    );
}
