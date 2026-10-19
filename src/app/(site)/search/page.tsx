import { Metadata } from 'next';
import { supabase } from '@/lib/supabase';
import { Movie } from '@/lib/types';
import SearchBar from '@/components/SearchBar';
import MovieCard from '@/components/MovieCard';
import Link from 'next/link';
import { buildPageMetadata } from '@/lib/metadata';
import { searchTmdb, normalizeTitle, getExistingDatabaseCatalog } from '@/lib/tmdb';

interface SearchPageProps {
    searchParams: Promise<{ q?: string }>;
}

async function hybridSearch(query: string): Promise<Movie[]> {
    const cleanQuery = query?.trim();
    if (!cleanQuery || cleanQuery.length < 2) return [];

    try {
        // 1. Search local Supabase database first and fetch catalog index for deduplication
        const [localRes, dbCatalog, tmdbResults] = await Promise.all([
            supabase
                .from('movies')
                .select('id, title, slug, type, poster_url, description, release_year, is_adult, created_at, tmdb_id, admin_note')
                .ilike('title', `%${cleanQuery}%`)
                .order('created_at', { ascending: false })
                .limit(40),
            getExistingDatabaseCatalog(),
            searchTmdb(cleanQuery, 'multi', 1),
        ]);

        const localMatches = (localRes.data || []) as Movie[];

        // Build set of titles already returned from local search to guarantee zero duplicates
        const matchedLocalTmdbIds = new Set<string>();
        const matchedLocalTitles = new Set<string>();

        for (const m of localMatches) {
            if (m.tmdb_id) matchedLocalTmdbIds.add(String(m.tmdb_id));
            matchedLocalTitles.add(normalizeTitle(m.title));
            if (m.slug) matchedLocalTitles.add(normalizeTitle(m.slug.replace(/-/g, ' ')));
        }

        // 2. Strict Deduplication: filter out any TMDB title that exists in local search or database
        const freshTmdbResults = tmdbResults.filter(item => {
            const tmdbId = item.tmdb_id;
            const normTitle = normalizeTitle(item.title);

            // Filter if already returned from local search
            if (tmdbId && matchedLocalTmdbIds.has(tmdbId)) return false;
            if (matchedLocalTitles.has(normTitle)) return false;

            // Also filter if exists anywhere in local database (to avoid conflicts with custom overrides)
            if (tmdbId && dbCatalog.existingTmdbIds.has(tmdbId)) return false;
            if (dbCatalog.existingTitles.has(normTitle)) return false;

            return true;
        });

        // 3. Combine: Local DB custom movies first, followed by TMDB on-demand results
        return [...localMatches, ...freshTmdbResults];
    } catch (err) {
        console.error('[Search Page] Hybrid search error:', err);
        return [];
    }
}

export async function generateMetadata({ searchParams }: SearchPageProps): Promise<Metadata> {
    const { q } = await searchParams;
    return buildPageMetadata({
        title: q ? `Search: ${q}` : 'Search',
        description: q ? `Search results for "${q}" on Nexiplay.` : 'Search for movies, series, and anime on Nexiplay.',
        path: q ? `/search?q=${encodeURIComponent(q)}` : '/search',
    });
}

export default async function SearchPage({ searchParams }: SearchPageProps) {
    const { q: query } = await searchParams;
    const results = query ? await hybridSearch(query) : [];

    return (
        <div className="container mx-auto px-4 pt-20 md:pt-24 pb-12">
            {/* Search Bar */}
            <div className="max-w-2xl mx-auto mb-8">
                <SearchBar />
            </div>

            {/* Results */}
            {query ? (
                <>
                    <div className="mb-6">
                        <h1 className="text-2xl font-bold text-white">
                            Search results for &quot;{query}&quot;
                            <span className="text-gray-400 font-normal text-base ml-2">
                                ({results.length} found)
                            </span>
                        </h1>
                    </div>

                    {results.length > 0 ? (
                        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3 md:gap-4">
                            {results.map((movie) => (
                                <MovieCard key={movie.id} movie={movie} />
                            ))}
                        </div>
                    ) : (
                        <div className="text-center py-20">
                            <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-white/5 flex items-center justify-center">
                                <svg className="w-10 h-10 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                                </svg>
                            </div>
                            <h2 className="text-xl font-bold text-gray-300 mb-2">No results found</h2>
                            <p className="text-gray-500 mb-6 text-sm">
                                Try searching with different keywords or check spelling.
                            </p>
                            <Link href="/" className="inline-flex rounded-xl bg-violet-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-violet-500 transition">
                                Back to Home
                            </Link>
                        </div>
                    )}
                </>
            ) : (
                <div className="text-center py-20 text-gray-400 text-sm">
                    Enter a title above to discover movies, series, and anime.
                </div>
            )}
        </div>
    );
}
