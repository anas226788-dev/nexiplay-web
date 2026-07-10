'use client';

import { useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';

export default function UserAnalyticsTracker() {
    const pathname = usePathname();
    const { user, trackEvent } = useAuth();

    useEffect(() => {
        if (!user) return;
        trackEvent({
            event_type: 'page_view',
            metadata: {
                path: pathname,
                query: typeof window !== 'undefined' ? window.location.search : ''
            }
        });
    }, [pathname, trackEvent, user]);

    return null;
}
