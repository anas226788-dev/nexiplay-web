import Link from 'next/link';
import { Category } from '@/lib/types';

interface CategoryMenuProps {
    categories: Category[];
    activeSlug?: string;
}

export default function CategoryMenu({ categories, activeSlug }: CategoryMenuProps) {
    const allCategories = [
        { id: 'all', name: 'All', slug: '' },
        ...categories,
    ];

    return (
        <div className="overflow-x-auto scrollbar-hide">
            <div className="flex items-center gap-2 pb-2">
                {allCategories.map((category) => {
                    const isActive = activeSlug === category.slug || (!activeSlug && category.slug === '');
                    const href = category.slug ? `/genre/${category.slug}` : '/';

                    return (
                        <Link
                            key={category.id}
                            href={href}
                            className={`np-chip ${isActive ? 'is-active' : ''}`}
                        >
                            {category.name}
                        </Link>
                    );
                })}
            </div>
        </div>
    );
}

// Quick type filter tabs
interface TypeTabsProps {
    activeType?: 'all' | 'movie' | 'series' | 'anime' | 'upcoming' | 'novels';
}

export function TypeTabs({ activeType = 'all' }: TypeTabsProps) {
    const types = [
        { key: 'all', label: 'All', href: '/' },
        { key: 'movie', label: 'Movies', href: '/movies' },
        { key: 'series', label: 'Series', href: '/series' },
        { key: 'anime', label: 'Anime', href: '/anime' },
        { key: 'novels', label: 'Novels', href: '/novels' },
        { key: 'live-tv', label: 'Live TV', href: '/live-tv' },
        { key: 'upcoming', label: 'Upcoming', href: '/upcoming' },
    ];

    return (
        <div className="w-full flex md:justify-center overflow-hidden">
            <div className="overflow-x-auto scrollbar-hide py-2 px-1 w-full max-w-full">
                <div className="flex items-center gap-1.5 p-1.5 np-glass-solid rounded-2xl w-max mx-auto md:mx-0">
                    {types.map((type) => (
                        <Link
                            key={type.key}
                            href={type.href}
                            className={`np-chip ${activeType === type.key ? 'is-active' : ''}`}
                        >
                            {type.label}
                        </Link>
                    ))}
                </div>
            </div>
        </div>
    );
}
