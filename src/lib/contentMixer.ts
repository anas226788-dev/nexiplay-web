import { Movie } from './types';

/**
 * Intelligent Content Interleaving & Rotation Utility
 * 
 * Ensures:
 * 1. Newly uploaded content from the database appears right at the top (row 1)
 *    even if it's not pinned by the admin.
 * 2. Pinned content is prominently highlighted with Gorgeous badges,
 *    cycling dynamically so the same cards don't stay in the exact same positions.
 * 3. Daily fresh TMDB / IMDb releases are interleaved directly into designated slots
 *    (e.g., slots 2, 7, 13, 19) so the website automatically features today's newest
 *    global releases with instant embed streaming.
 * 4. Local DB content and TMDB content coexist seamlessly.
 */

interface InterleaveOptions {
    pinned: Movie[];
    regular: Movie[];
    fallback?: Movie[];
    limit?: number;
    pinnedSlots?: number[];
    freshSlots?: number[];
}

/**
 * Fisher-Yates array shuffle (in-place or cloned)
 */
export function shuffleArray<T>(array: T[]): T[] {
    const cloned = [...array];
    for (let i = cloned.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [cloned[i], cloned[j]] = [cloned[j], cloned[i]];
    }
    return cloned;
}

/**
 * Interleaves pinned, newest regular database content, and daily TMDB trending releases.
 */
export function interleaveLatestContent({
    pinned,
    regular,
    fallback = [],
    limit = 24,
    pinnedSlots = [0, 4, 10, 16],
    freshSlots = [2, 7, 13, 19]
}: InterleaveOptions): Movie[] {
    const shuffledPinned = shuffleArray(pinned);
    
    const result: Movie[] = [];
    const usedIds = new Set<string>();

    let pinIdx = 0;
    let regIdx = 0;
    let fallbackIdx = 0;

    const pinnedSlotSet = new Set(pinnedSlots);
    const freshSlotSet = new Set(freshSlots);

    for (let slot = 0; slot < limit; slot++) {
        // 1. Featured / Pinned Slot
        if (pinnedSlotSet.has(slot) && pinIdx < shuffledPinned.length) {
            const item = shuffledPinned[pinIdx++];
            if (!usedIds.has(item.id)) {
                usedIds.add(item.id);
                result.push(item);
                continue;
            }
        }

        // 2. Fresh Daily TMDB / IMDb Trending Slot (Live streamable via embeds!)
        if (freshSlotSet.has(slot) && fallbackIdx < fallback.length) {
            const item = fallback[fallbackIdx++];
            if (!usedIds.has(item.id)) {
                usedIds.add(item.id);
                result.push({
                    ...item,
                    trending_badge: true
                });
                continue;
            }
        }

        // 3. Next newest regular local upload
        if (regIdx < regular.length) {
            const item = regular[regIdx++];
            if (!usedIds.has(item.id)) {
                usedIds.add(item.id);
                result.push(item);
                continue;
            }
        }

        // 4. If pinned items remain and regular items ran out, use remaining pinned
        if (pinIdx < shuffledPinned.length) {
            const item = shuffledPinned[pinIdx++];
            if (!usedIds.has(item.id)) {
                usedIds.add(item.id);
                result.push(item);
                continue;
            }
        }

        // 5. Fill remaining slots with fallback items (e.g. TMDB trending)
        if (fallbackIdx < fallback.length) {
            const item = fallback[fallbackIdx++];
            if (!usedIds.has(item.id)) {
                usedIds.add(item.id);
                result.push(item);
                continue;
            }
        }
    }

    // Safety fallback: if we still have room, add any unused regular or fallback items
    if (result.length < limit) {
        for (const item of [...regular, ...shuffledPinned, ...fallback]) {
            if (result.length >= limit) break;
            if (!usedIds.has(item.id)) {
                usedIds.add(item.id);
                result.push(item);
            }
        }
    }

    return result.slice(0, limit);
}

/**
 * Mixes category carousels (Movies, Series, Anime):
 * Takes up to 2 pinned items (randomized/rotated) and 4 newest regular items.
 * Guaranteed to display fresh additions in the 6-card row.
 */
export function interleaveCategoryRow(pinned: Movie[], regular: Movie[], limit: number = 6): Movie[] {
    const shuffledPinned = shuffleArray(pinned);
    const featuredPinned = shuffledPinned.slice(0, 2);
    const freshRegular = regular.slice(0, limit - featuredPinned.length);

    const result: Movie[] = [];
    const usedIds = new Set<string>();

    const addIfUnique = (m?: Movie) => {
        if (m && !usedIds.has(m.id)) {
            usedIds.add(m.id);
            result.push(m);
        }
    };

    // Slot 0: Pinned (if any)
    if (featuredPinned[0]) addIfUnique(featuredPinned[0]);
    // Slots 1 & 2: Newest Regular
    if (freshRegular[0]) addIfUnique(freshRegular[0]);
    if (freshRegular[1]) addIfUnique(freshRegular[1]);
    // Slot 3: Second Pinned (if any)
    if (featuredPinned[1]) addIfUnique(featuredPinned[1]);
    // Slots 4+: Remaining Newest Regular
    for (let i = 2; i < freshRegular.length; i++) {
        addIfUnique(freshRegular[i]);
    }

    // If still under limit, fill from remaining regular or pinned
    for (const item of [...freshRegular, ...regular, ...shuffledPinned]) {
        if (result.length >= limit) break;
        addIfUnique(item);
    }

    return result.slice(0, limit);
}
