'use client';

import { useId, useMemo } from 'react';

/**
 * Generates a unique ID for each ad container instance.
 * This solves the problem of multiple ad placements on the same page.
 * 
 * @param prefix - Optional prefix for the ID (e.g., 'banner', 'native')
 * @param placement - The placement name (e.g., 'home_top', 'sidebar')
 * @returns A unique string ID like "ad-banner-home_top-:r1:"
 */
export function useUniqueAdId(prefix: string = 'ad', placement: string = 'default'): string {
    // useId() generates a unique ID that's stable across server and client
    const reactId = useId();

    // Memoize to prevent unnecessary recalculations
    return useMemo(() => {
        // Clean the placement string for use in DOM ID
        const cleanPlacement = placement.replace(/[^a-zA-Z0-9_-]/g, '_');
        return `${prefix}-${cleanPlacement}-${reactId}`;
    }, [prefix, placement, reactId]);
}

/**
 * Generates a random suffix for cases where useId isn't appropriate
 * (e.g., script-injected containers)
 */
export function generateAdContainerId(prefix: string = 'ad', placement: string = 'default'): string {
    const randomSuffix = Math.random().toString(36).substring(2, 9);
    const timestamp = Date.now().toString(36);
    const cleanPlacement = placement.replace(/[^a-zA-Z0-9_-]/g, '_');
    return `${prefix}-${cleanPlacement}-${randomSuffix}-${timestamp}`;
}
