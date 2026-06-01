import Link from 'next/link';
import Image from 'next/image';
import { Upcoming } from '@/lib/types';

interface UpcomingSectionProps {
    items: Upcoming[];
}

export default function UpcomingSection({ items }: UpcomingSectionProps) {
    if (!items || items.length === 0) return null;

    const StatusBadge = ({ status }: { status: string }) => {
        switch (status) {
            case 'confirmed': return <span className="px-2 py-0.5 mt-2 inline-block bg-green-500/90 text-white text-[10px] font-bold rounded shadow-lg tracking-wider uppercase">CONFIRMED</span>;
            case 'delayed': return <span className="px-2 py-0.5 mt-2 inline-block bg-red-500/90 text-white text-[10px] font-bold rounded shadow-lg tracking-wider uppercase">DELAYED</span>;
            default: return <span className="px-2 py-0.5 mt-2 inline-block bg-blue-600/90 text-white text-[10px] font-bold rounded shadow-lg tracking-wider uppercase">COMING SOON</span>;
        }
    };

    return (
        <section className="mb-12">
            <div className="flex items-center justify-between mb-6 px-4 md:px-0">
                <h2 className="section-title">Upcoming Releases</h2>
            </div>
            
            <div className="flex overflow-x-auto gap-4 scrollbar-hide snap-x px-4 -mx-4 md:mx-0 md:px-0 md:grid md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 md:overflow-visible pb-4">
                {items.map((item, index) => (
                    <Link
                        key={item.id}
                        href={`/${item.type}/${item.slug}`}
                        className="min-w-[160px] md:min-w-0 md:w-auto snap-center group perspective-1000 active:scale-95 transition-transform duration-100 cursor-pointer block"
                    >
                        <div className="relative aspect-[2/3] rounded-xl overflow-hidden glass-panel movie-card-3d" suppressHydrationWarning>
                            {/* Poster Image */}
                            {item.poster_url ? (
                                <Image
                                    src={item.poster_url}
                                    alt={item.title}
                                    fill
                                    className="object-cover transition-transform duration-500 group-hover:scale-110"
                                    sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 20vw"
                                />
                            ) : (
                                <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-dark-600 to-dark-800">
                                    <svg className="w-16 h-16 text-gray-600" fill="currentColor" viewBox="0 0 24 24">
                                        <path d="M18 4l2 4h-3l-2-4h-2l2 4h-3l-2-4H8l2 4H7L5 4H4c-1.1 0-1.99.9-1.99 2L2 18c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V4h-4z" />
                                    </svg>
                                </div>
                            )}

                            {/* Overlay with Glassmorphism */}
                            <div className="absolute inset-0 bg-gradient-to-t from-black via-black/40 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-end">
                                <div className="p-4 w-full transform translate-y-4 group-hover:translate-y-0 transition-transform duration-300">
                                    <div className="flex items-center gap-2 mb-2">
                                        <span className="px-2 py-0.5 text-xs font-bold rounded bg-yellow-600 shadow-lg uppercase tracking-wider text-white">
                                            {item.type}
                                        </span>
                                    </div>

                                    {item.trailer_url && (
                                        <div className="flex items-center gap-2 text-sm font-bold text-white">
                                            <div className="w-8 h-8 rounded-full bg-white text-black flex items-center justify-center">
                                                <svg className="w-4 h-4 translate-x-0.5" fill="currentColor" viewBox="0 0 24 24">
                                                    <path d="M8 5v14l11-7z" />
                                                </svg>
                                            </div>
                                            <span>Trailer</span>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* Title and Badge */}
                        <div className="mt-3 px-1">
                            <h3 className="font-medium text-sm md:text-base text-gray-100 line-clamp-2 group-hover:text-red-400 transition-colors">
                                {item.title}
                            </h3>
                            <p className="text-xs text-gray-400 mt-1 font-medium">
                                {new Date(item.release_date).toLocaleDateString('en-US', {
                                    month: 'short',
                                    day: 'numeric',
                                    year: 'numeric'
                                })}
                            </p>
                            <StatusBadge status={item.status} />
                        </div>
                    </Link>
                ))}
            </div>
        </section>
    );
}
