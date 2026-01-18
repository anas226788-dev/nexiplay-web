import { MovieGridSkeleton } from '@/components/MovieGrid';

export default function Loading() {
    return (
        <div className="container mx-auto px-4 py-8 min-h-screen">
            <div className="animate-pulse mb-8">
                <div className="h-8 bg-dark-700/50 rounded w-48 mb-4"></div>
                <div className="h-4 bg-dark-700/50 rounded w-64"></div>
            </div>

            <div className="space-y-12">
                <div>
                    <div className="h-6 bg-dark-700/50 rounded w-32 mb-6"></div>
                    <MovieGridSkeleton count={6} />
                </div>

                <div>
                    <div className="h-6 bg-dark-700/50 rounded w-32 mb-6"></div>
                    <MovieGridSkeleton count={6} />
                </div>
            </div>
        </div>
    );
}
