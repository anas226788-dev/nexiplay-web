import { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { Movie, Category } from '@/lib/types';
import MovieGrid from '@/components/MovieGrid';
import Pagination from '@/components/Pagination';
import { buildPageMetadata } from '@/lib/metadata';

const ITEMS_PER_PAGE = 24;

interface GenrePageProps {
    params: Promise<{ slug: string }>;
    searchParams: Promise<{ page?: string }>;
}

async function getCategory(slug: string): Promise<Category | null> {
    const { data, error } = await supabase
        .from('categories')
        .select('id, name, slug')
        .eq('slug', slug)
        .single();

    if (error) {
        return null;
    }

    return data;
}

async function getMoviesByCategory(categoryId: string, page: number): Promise<{ movies: Movie[]; totalCount: number }> {
    const from = (page - 1) * ITEMS_PER_PAGE;
    const to = from + ITEMS_PER_PAGE - 1;

    // Get total count
    const { count } = await supabase
        .from('movie_categories')
        .select('id', { count: 'exact', head: true })
        .eq('category_id', categoryId);

    // Get paginated data
    const { data, error } = await supabase
        .from('movie_categories')
        .select(`
      movies (id, title, slug, type, poster_url, description, release_year, created_at, is_adult)
    `)
        .eq('category_id', categoryId)
        .range(from, to);

    if (error) {
        console.error('Error fetching movies by category:', error);
        return { movies: [], totalCount: 0 };
    }

    // Extract movies from the joined data
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const movies = (data || [])
        .map((item: any) => item.movies as Movie)
        .filter((movie): movie is Movie => movie !== null);

    return { movies, totalCount: count || 0 };
}

export async function generateMetadata({ params }: GenrePageProps): Promise<Metadata> {
    const { slug } = await params;
    const category = await getCategory(slug);

    if (!category) {
        return buildPageMetadata({
            title: 'Genre Not Found',
            description: 'The requested genre could not be found on Nexiplay.',
            path: `/genre/${slug}`,
        });
    }

    return buildPageMetadata({
        title: `${category.name} Genre`,
        description: `Browse and download ${category.name} movies, series, and anime in HD quality.`,
        path: `/genre/${slug}`,
    });
}

export default async function GenrePage({ params, searchParams }: GenrePageProps) {
    const { slug } = await params;
    const { page: pageParam } = await searchParams;
    const category = await getCategory(slug);

    if (!category) {
        notFound();
    }

    const currentPage = Math.max(1, parseInt(pageParam || '1', 10) || 1);
    const { movies, totalCount } = await getMoviesByCategory(category.id, currentPage);
    const totalPages = Math.ceil(totalCount / ITEMS_PER_PAGE);

    return (
        <div className="container mx-auto px-4 py-8">
            {/* Page Header */}
            <div className="mb-8">
                <nav className="text-sm text-gray-500 mb-4">
                    <a href="/" className="hover:text-white transition-colors">Home</a>
                    <span className="mx-2">/</span>
                    <span className="text-gray-300">Genre</span>
                    <span className="mx-2">/</span>
                    <span className="text-white">{category.name}</span>
                </nav>
                <h1 className="text-3xl md:text-4xl font-bold mb-2">{category.name}</h1>
                <p className="text-gray-400">
                    {totalCount} titles available in this genre
                </p>
            </div>

            {/* Movies Grid */}
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
                        <path d="M10 4H4c-1.1 0-1.99.9-1.99 2L2 18c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V8c0-1.1-.9-2-2-2h-8l-2-2z" />
                    </svg>
                    <h2 className="text-2xl font-bold text-gray-300 mb-2">No Content in This Genre</h2>
                    <p className="text-gray-500">
                        Content will appear here once added to this category.
                    </p>
                </div>
            )}
        </div>
    );
}
