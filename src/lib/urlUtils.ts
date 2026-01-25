import { Movie } from '@/lib/types';

/**
 * Standardizes Content URL Generation
 * Enforces singular path segments as per routing requirement:
 * - movie -> /movie/{slug}
 * - series -> /series/{slug}
 * - anime -> /anime/{slug}
 */
export function getContentUrl(movie: { type: string; slug: string; release_year?: number }): string {
    // Map plural 'movies' to singular 'movie'
    const typeSegment = movie.type === 'movies' ? 'movie' : movie.type;

    // Use raw slug (db slug) - do not append year manually unless logic requires it
    return `/${typeSegment}/${movie.slug}`;
}
