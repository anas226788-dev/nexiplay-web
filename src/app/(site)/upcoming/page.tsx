import { Metadata } from 'next';
import Link from 'next/link';
import Image from 'next/image';
import { supabase } from '@/lib/supabase';
import { Upcoming } from '@/lib/types';
import { TypeTabs } from '@/components/CategoryMenu';
import { buildPageMetadata } from '@/lib/metadata';

export const metadata: Metadata = buildPageMetadata({
    title: 'Upcoming Releases',
    description: 'Check out upcoming movies, series, and anime coming soon to Nexiplay. Stay updated with release dates and trailers.',
    path: '/upcoming',
});

// ISR: Revalidate every 15 minutes
export const revalidate = 720;

async function getUpcoming(): Promise<Upcoming[]> {
    const { data, error } = await supabase
        .from('upcoming')
        .select('*')
        .order('release_date', { ascending: true });

    if (error) {
        console.error('Error fetching upcoming:', error);
        return [];
    }

    return data || [];
}

function StatusBadge({ status }: { status: string }) {
    switch (status) {
        case 'confirmed':
            return <span className="px-2.5 py-1 inline-block bg-green-500/90 text-white text-[10px] font-bold rounded-md shadow-lg tracking-wider uppercase">✅ CONFIRMED</span>;
        case 'delayed':
            return <span className="px-2.5 py-1 inline-block bg-red-500/90 text-white text-[10px] font-bold rounded-md shadow-lg tracking-wider uppercase">⏳ DELAYED</span>;
        default:
            return <span className="px-2.5 py-1 inline-block bg-blue-600/90 text-white text-[10px] font-bold rounded-md shadow-lg tracking-wider uppercase">🔜 COMING SOON</span>;
    }
}

export default async function UpcomingPage() {
    const upcoming = await getUpcoming();

    return (
        <div className="container mx-auto px-4 py-8">
            {/* Type Tabs */}
            <div className="flex justify-center mb-8">
                <TypeTabs activeType="upcoming" />
            </div>

            {/* Page Header */}
            <div className="mb-8 text-center">
                <h1 className="text-3xl md:text-4xl font-bold mb-2">
                    <span className="bg-gradient-to-r from-red-500 to-orange-500 bg-clip-text text-transparent">
                        🔥 Upcoming Releases
                    </span>
                </h1>
                <p className="text-gray-400">
                    {upcoming.length} upcoming titles coming to Nexiplay
                </p>
            </div>

            {/* Upcoming Grid */}
            {upcoming.length > 0 ? (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4 md:gap-5">
                    {upcoming.map((item, index) => (
                        <Link
                            key={item.id}
                            href={`/${item.type}/${item.slug}`}
                            className="group animate-fade-in"
                            style={{ animationDelay: `${index * 40}ms` }}
                        >
                            <div className="relative aspect-[2/3] rounded-xl overflow-hidden glass-panel">
                                {/* Poster */}
                                {item.poster_url ? (
                                    <Image
                                        src={item.poster_url}
                                        alt={item.title}
                                        fill
                                        sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 16vw"
                                        className="object-cover transition-transform duration-500 group-hover:scale-110"
                                        priority={index < 6}
                                    />
                                ) : (
                                    <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-dark-600 to-dark-800">
                                        <svg className="w-12 h-12 text-gray-600" fill="currentColor" viewBox="0 0 24 24">
                                            <path d="M18 4l2 4h-3l-2-4h-2l2 4h-3l-2-4H8l2 4H7L5 4H4c-1.1 0-1.99.9-1.99 2L2 18c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V4h-4z" />
                                        </svg>
                                    </div>
                                )}

                                {/* Hover Overlay */}
                                <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                                    <div className="absolute bottom-0 left-0 right-0 p-3">
                                        <div className="flex items-center justify-center gap-2 text-xs font-medium">
                                            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                                                <path d="M8 5v14l11-7z" />
                                            </svg>
                                            View Details
                                        </div>
                                    </div>
                                </div>

                                {/* Type Badge */}
                                <div className="absolute top-2 left-2">
                                    <span className="px-2 py-0.5 text-[10px] font-bold rounded bg-yellow-600/90 backdrop-blur-sm uppercase text-white shadow-lg">
                                        {item.type}
                                    </span>
                                </div>

                                {/* Upcoming Badge */}
                                <div className="absolute top-2 right-2">
                                    <span className="px-2 py-0.5 text-[10px] font-bold rounded bg-orange-500/90 backdrop-blur-sm uppercase text-white shadow-lg animate-pulse">
                                        SOON
                                    </span>
                                </div>

                                {/* Trailer badge if available */}
                                {item.trailer_url && (
                                    <div className="absolute bottom-2 right-2">
                                        <span className="px-2 py-0.5 text-[10px] font-bold rounded bg-red-600/90 backdrop-blur-sm uppercase text-white shadow-lg flex items-center gap-1">
                                            <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 24 24">
                                                <path d="M8 5v14l11-7z" />
                                            </svg>
                                            Trailer
                                        </span>
                                    </div>
                                )}
                            </div>

                            {/* Title & Info */}
                            <div className="mt-2 px-0.5">
                                <h3 className="font-medium text-sm text-gray-200 line-clamp-2 group-hover:text-red-400 transition-colors leading-tight">
                                    {item.title}
                                </h3>
                                <p className="text-[11px] text-gray-400 mt-1 font-medium">
                                    📅 {new Date(item.release_date).toLocaleDateString('en-US', {
                                        month: 'short',
                                        day: 'numeric',
                                        year: 'numeric'
                                    })}
                                </p>
                                <div className="mt-1.5">
                                    <StatusBadge status={item.status} />
                                </div>
                            </div>
                        </Link>
                    ))}
                </div>
            ) : (
                <div className="text-center py-20">
                    <div className="w-24 h-24 mx-auto mb-6 rounded-full bg-dark-700 flex items-center justify-center">
                        <svg className="w-12 h-12 text-gray-600" fill="currentColor" viewBox="0 0 24 24">
                            <path d="M11.99 2C6.47 2 2 6.48 2 12s4.47 10 9.99 10C17.52 22 22 17.52 22 12S17.52 2 11.99 2zM12 20c-4.42 0-8-3.58-8-8s3.58-8 8-8 8 3.58 8 8-3.58 8-8 8zm.5-13H11v6l5.25 3.15.75-1.23-4.5-2.67z" />
                        </svg>
                    </div>
                    <h2 className="text-2xl font-bold text-gray-300 mb-3">No Upcoming Releases</h2>
                    <p className="text-gray-500 max-w-md mx-auto">
                        Stay tuned! Upcoming movies, series, and anime will appear here once announced.
                    </p>
                </div>
            )}
        </div>
    );
}
