'use client';

import { useEffect, useRef, useState, RefObject } from 'react';

interface UseLazyLoadOptions {
    /** Threshold for intersection (0-1). Default: 0.1 (10% visible) */
    threshold?: number;
    /** Root margin for earlier/later triggering. Default: '100px' */
    rootMargin?: string;
    /** If true, stays loaded once triggered. Default: true */
    freezeOnceVisible?: boolean;
}

interface UseLazyLoadReturn {
    /** Ref to attach to the element you want to observe */
    ref: RefObject<HTMLDivElement | null>;
    /** Whether the element is currently in view */
    isInView: boolean;
    /** Whether the element has ever been in view */
    hasBeenInView: boolean;
}

/**
 * Hook for lazy loading ad components using Intersection Observer.
 * Only loads ad scripts when the container comes into (or near) view.
 * 
 * @example
 * const { ref, hasBeenInView } = useLazyLoad({ rootMargin: '200px' });
 * 
 * return (
 *   <div ref={ref}>
 *     {hasBeenInView && <AdScript />}
 *   </div>
 * );
 */
export function useLazyLoad(options: UseLazyLoadOptions = {}): UseLazyLoadReturn {
    const {
        threshold = 0.1,
        rootMargin = '100px',
        freezeOnceVisible = true,
    } = options;

    const ref = useRef<HTMLDivElement>(null);
    const [isInView, setIsInView] = useState(false);
    const [hasBeenInView, setHasBeenInView] = useState(false);

    useEffect(() => {
        const element = ref.current;
        if (!element) return;

        // Skip if already triggered and frozen
        if (freezeOnceVisible && hasBeenInView) return;

        // Check for Intersection Observer support
        if (!('IntersectionObserver' in window)) {
            // Fallback: load immediately
            setIsInView(true);
            setHasBeenInView(true);
            return;
        }

        const observer = new IntersectionObserver(
            (entries) => {
                entries.forEach((entry) => {
                    const visible = entry.isIntersecting;
                    setIsInView(visible);

                    if (visible) {
                        setHasBeenInView(true);

                        // Unobserve if we only need to trigger once
                        if (freezeOnceVisible) {
                            observer.unobserve(element);
                        }
                    }
                });
            },
            {
                threshold,
                rootMargin,
            }
        );

        observer.observe(element);

        return () => {
            observer.unobserve(element);
        };
    }, [threshold, rootMargin, freezeOnceVisible, hasBeenInView]);

    return { ref, isInView, hasBeenInView };
}

/**
 * Simple hook to check if we're on the client side
 */
export function useIsClient(): boolean {
    const [isClient, setIsClient] = useState(false);

    useEffect(() => {
        setIsClient(true);
    }, []);

    return isClient;
}

/**
 * Hook to detect if the current device is mobile
 */
export function useIsMobile(): boolean {
    const [isMobile, setIsMobile] = useState(false);

    useEffect(() => {
        const checkMobile = () => {
            setIsMobile(window.innerWidth <= 768);
        };

        checkMobile();
        window.addEventListener('resize', checkMobile);

        return () => window.removeEventListener('resize', checkMobile);
    }, []);

    return isMobile;
}
