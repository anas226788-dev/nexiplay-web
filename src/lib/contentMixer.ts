import { Movie } from './types';

/**
 * Intelligent Content Interleaving & Rotation Utility
 * 
 * Ensures:
 * 1. Newly uploaded content from the database appears right at the top (row 1)
 *    even if it's not pinned by the admin.
 * 2. Pinned content is prominently highlighted with Gorgeous badges,
 *    but never chokes/monopolizes all 6 slots of the first row.
 * 3. Pinned and regular items are shuffled / rotated dynamically so every
 *    visit feels fresh and alive rather than frozen in a static order.
 * 4. TMDB items are only used as supplemental filler when local DB content is exhausted.
 */

interface InterleaveOptions {
    pinned: Movie[];
    regular: Movie[];
    fallback?: Movie[];
    limit?: number;
    pinnedSlots?: number[];
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
 * Interleaves pinned and newest regular database content for grid display.
 * 
 * Pinned slots: 0, 3, 7, 10, 13, 16...
 * Regular slots: 1, 2, 4, 5, 6, 8, 9, 11, 12, 14, 15...
 * 
 * Notice:
 * Row 1 (indices 0..5) gets:
 * - Slot 0: Pinned #1 (Featured/Gorgeous)
 * - Slot 1: Newest DB Upload #1 (Fresh from DB - New/Trending)
 * - Slot 2: Newest DB Upload #2 (Fresh from DB - New/Trending)
 * - Slot 3: Pinned #2 (Featured/Gorgeous)
 * - Slot 4: Newest DB Upload #3 (Fresh from DB - New/Trending)
 * - Slot 5: Newest DB Upload #4 (Fresh from DB - New/Trending)
 */
export function interleaveLatestContent({
    pinned,
    regular,
    fallback = [],
    limit = 24,
    pinnedSlots = [0, 3, 7, 10, 13, 16]
}: InterleaveOptions): Movie[] {
    // 1. Shuffle pinned items so different items cycle into the featured spots
    const shuffledPinned = shuffleArray(pinned);
    
    const result: Movie[] = [];
    const usedIds = new Set<string>();

    let pinIdx = 0;
    let regIdx = 0;
    let fallbackIdx = 0;

    const pinnedSlotSet = new Set(pinnedSlots);

    for (let slot = 0; slot < limit; slot++) {
        // Check if this slot should showcase a pinned/featured item
        if (pinnedSlotSet.has(slot) && pinIdx < shuffledPinned.length) {
            const item = shuffledPinned[pinIdx++];
            if (!usedIds.has(item.id)) {
                usedIds.add(item.id);
                result.push(item);
                continue;
            }
        }

        // Fill with next newest regular local upload
        if (regIdx < regular.length) {
            const item = regular[regIdx++];
            if (!usedIds.has(item.id)) {
                usedIds.add(item.id);
                result.push(item);
                continue;
            }
        }

        // If pinned items remain and regular items ran out, use remaining pinned
        if (pinIdx < shuffledPinned.length) {
            const item = shuffledPinned[pinIdx++];
            if (!usedIds.has(item.id)) {
                usedIds.add(item.id);
                result.push(item);
                continue;
            }
        }

        // Fill remaining slots with fallback items (e.g. TMDB trending)
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
