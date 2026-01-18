import { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { Movie, Category } from '@/lib/types';
import MovieGrid from '@/components/MovieGrid';

interface GenrePageProps {
    params: Promise<{ slug: string }>;
}

async function getCategory(slug: string): Promise<Category | null> {
    const { data, error } = await supabase
        .from('categories')
        .select('*')
        .eq('slug', slug)
        .single();

    if (error) {
        return null;
    }

    return data;
}

async function getMoviesByCategory(categoryId: string): Promise<Movie[]> {
    const { data, error } = await supabase
        .from('movie_categories')
        .select(`
      movies (*)
    `)
        .eq('category_id', categoryId);

    if (error) {
        console.error('Error fetching movies by category:', error);
        return [];
    }

    // Extract movies from the joined data
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return (data || [])
        .map((item: any) => item.movies as Movie)
        .filter((movie): movie is Movie => movie !== null);
}

export async function generateMetadata({ params }: GenrePageProps): Promise<Metadata> {
    const { slug } = await params;
    const category = await getCategory(slug);

    if (!category) {
        return {
            title: 'Genre Not Found - Nexiplay',
        };
    }

    return {
        title: `${category.name} - Nexiplay`,
        description: `Browse and download ${category.name} movies, series, and anime in HD quality.`,
    };
}

export default async function GenrePage({ params }: GenrePageProps) {
    const { slug } = await params;
    const category = await getCategory(slug);

    if (!category) {
        notFound();
    }

    const movies = await getMoviesByCategory(category.id);

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
                    {movies.length} titles available in this genre
                </p>
            </div>

            {/* Movies Grid */}
            {movies.length > 0 ? (
                <MovieGrid movies={movies} />
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
