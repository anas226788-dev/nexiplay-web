'use client';

import dynamic from 'next/dynamic';

// Lazy load AdSpot (Client Component Only)
// This wrapper is needed because we can't use ssr: false in Server Components directly
const AdSpot = dynamic(() => import('@/components/AdSpot'), {
    ssr: false,
    loading: () => <div className="h-[90px] w-full bg-transparent" />
});

interface ClientAdSpotProps {
    placement: 'home_top' | 'home_bottom' | 'movie_sidebar' | 'popup_global' | 'download_bottom' | 'episode_list';
    className?: string;
}

export default function ClientAdSpot(props: ClientAdSpotProps) {
    return <AdSpot {...props} />;
}
