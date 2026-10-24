/**
 * Centralized Verification System for Nexiplay Web
 * Handles download, stream, and novel verification with consistent storage and cooldown logic.
 */

export const DOWNLOAD_VERIFICATION_KEY = 'nexiplay_download_verification';
export const STREAM_VERIFICATION_KEY = 'nexiplay_verification_records';

export interface VerificationRecord {
    verifiedAt: number;
    timestamp?: number;
    contentType?: string;
}

/**
 * Check if the given content is currently verified.
 * - Movies: 24-hour cooldown
 * - Series / Anime: 25-minute cooldown
 * - Novel: 24-hour cooldown
 */
export function checkDownloadVerified(contentId?: string | number | null, contentType: string = 'movie'): boolean {
    if (typeof window === 'undefined') return false;
    try {
        const raw = localStorage.getItem(DOWNLOAD_VERIFICATION_KEY);
        if (!raw) return false;
        const records = JSON.parse(raw);

        const idStr = contentId ? String(contentId).trim() : '';
        // Check exact id, type_id, or global fallback
        const record: VerificationRecord | undefined = 
            (idStr ? records[idStr] : null) ||
            (idStr ? records[`${contentType}_${idStr}`] : null) ||
            records['global_download'];

        if (!record) return false;

        const verifiedAt = record.verifiedAt || record.timestamp;
        if (!verifiedAt || typeof verifiedAt !== 'number') return false;

        const now = Date.now();
        const isMovieOrNovel = contentType === 'movie' || contentType === 'novel';
        const cooldownMs = isMovieOrNovel ? 24 * 60 * 60 * 1000 : 25 * 60 * 1000;

        return now - verifiedAt < cooldownMs;
    } catch {
        return false;
    }
}

/**
 * Save verification completion to localStorage.
 * Writes to multiple key formats to guarantee all consumers find it.
 */
export function saveDownloadVerification(contentId?: string | number | null, contentType: string = 'movie'): void {
    if (typeof window === 'undefined') return;
    try {
        const raw = localStorage.getItem(DOWNLOAD_VERIFICATION_KEY) || '{}';
        const records = JSON.parse(raw);
        const now = Date.now();
        const idStr = contentId ? String(contentId).trim() : 'global_download';

        const record: VerificationRecord = {
            verifiedAt: now,
            timestamp: now,
            contentType,
        };

        records[idStr] = record;
        if (idStr !== 'global_download') {
            records[`${contentType}_${idStr}`] = record;
        }
        records['global_download'] = record; // Always update recent global download verification

        localStorage.setItem(DOWNLOAD_VERIFICATION_KEY, JSON.stringify(records));
    } catch (e) {
        console.error('[Verification] Failed to save download verification:', e);
    }
}

/**
 * Check if the current URL has an active True Tab-Under verification state.
 * Returns the state if active, or null. Cleans up URL search parameters silently.
 */
export function consumePendingVerificationFromUrl(currentContentId?: string | number | null): {
    step: 2;
    downloadUrl: string | null;
} | null {
    if (typeof window === 'undefined') return null;
    try {
        const params = new URLSearchParams(window.location.search);
        const step = params.get('np_verify_step');
        if (step !== '2') return null;

        const cid = params.get('np_verify_cid');
        if (cid && currentContentId && String(cid) !== String(currentContentId)) {
            return null;
        }

        const rawDl = params.get('np_verify_dl');
        const downloadUrl = rawDl ? decodeURIComponent(rawDl) : null;

        // Clean up URL query parameters silently without a page reload
        const cleanUrl = new URL(window.location.href);
        cleanUrl.searchParams.delete('np_verify_step');
        cleanUrl.searchParams.delete('np_verify_cid');
        cleanUrl.searchParams.delete('np_verify_type');
        cleanUrl.searchParams.delete('np_verify_dl');
        window.history.replaceState({}, '', cleanUrl.toString());

        return {
            step: 2,
            downloadUrl,
        };
    } catch {
        return null;
    }
}

