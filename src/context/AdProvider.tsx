'use client';

import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { useAdSettings, AdSettings, shouldShowAdsOnDevice } from '@/hooks/useAdSettings';
import { useIsMobile } from '@/hooks/useLazyLoad';

interface AdContextValue {
    /** Global ad settings */
    settings: AdSettings | null;
    /** Whether ads are currently enabled */
    isEnabled: boolean;
    /** Whether current device should show ads */
    showOnDevice: boolean;
    /** Current device type */
    isMobile: boolean;
    /** Loading state */
    isLoading: boolean;
    /** Force refresh settings */
    refreshSettings: () => Promise<void>;
    /** Check if ads should show on a specific page */
    shouldShowOnPage: (page: string) => boolean;
}

const AdContext = createContext<AdContextValue | undefined>(undefined);

interface AdProviderProps {
    children: ReactNode;
    /** Override enabled state (for testing) */
    forceEnabled?: boolean;
    /** Default page to check against */
    currentPage?: string;
}

/**
 * AdProvider Component
 * 
 * Provides global ad configuration and state to all child components.
 * Wrap your app (or layout) with this to enable the ad system.
 * 
 * @example
 * // In layout.tsx
 * export default function RootLayout({ children }) {
 *   return (
 *     <html>
 *       <body>
 *         <AdProvider>
 *           {children}
 *         </AdProvider>
 *       </body>
 *     </html>
 *   );
 * }
 */
export function AdProvider({
    children,
    forceEnabled,
    currentPage = 'all',
}: AdProviderProps) {
    const { settings, isLoading, refetch } = useAdSettings();
    const isMobile = useIsMobile();
    const [isReady, setIsReady] = useState(false);

    // Determine if ads should be enabled
    const isEnabled = forceEnabled ?? settings?.isEnabled ?? false;
    const showOnDevice = shouldShowAdsOnDevice(settings, isMobile);

    // Check if ads should show on a specific page
    const shouldShowOnPage = (page: string): boolean => {
        if (!settings?.isEnabled) return false;
        if (!showOnDevice) return false;

        const enabledPages = settings.enabledPages || ['all'];
        if (enabledPages.includes('all')) return true;

        return enabledPages.includes(page);
    };

    // Mark as ready after hydration
    useEffect(() => {
        setIsReady(true);
    }, []);

    const value: AdContextValue = {
        settings,
        isEnabled: isReady && isEnabled,
        showOnDevice: isReady && showOnDevice,
        isMobile,
        isLoading,
        refreshSettings: refetch,
        shouldShowOnPage,
    };

    return (
        <AdContext.Provider value={value}>
            {children}
        </AdContext.Provider>
    );
}

/**
 * Hook to access ad context
 * 
 * @example
 * const { isEnabled, isMobile, shouldShowOnPage } = useAds();
 * 
 * if (!shouldShowOnPage('home')) {
 *   return null;
 * }
 */
export function useAds(): AdContextValue {
    const context = useContext(AdContext);

    if (context === undefined) {
        // Return a fallback instead of throwing
        // This allows components to work even without provider
        return {
            settings: null,
            isEnabled: false,
            showOnDevice: false,
            isMobile: false,
            isLoading: true,
            refreshSettings: async () => { },
            shouldShowOnPage: () => false,
        };
    }

    return context;
}

/**
 * HOC to wrap a component and only render if ads are enabled
 */
export function withAdsEnabled<P extends object>(
    WrappedComponent: React.ComponentType<P>
): React.FC<P> {
    return function WithAdsEnabled(props: P) {
        const { isEnabled, isLoading } = useAds();

        if (isLoading || !isEnabled) {
            return null;
        }

        return <WrappedComponent {...props} />;
    };
}
