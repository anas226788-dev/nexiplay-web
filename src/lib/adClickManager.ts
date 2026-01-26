import { AppRouterInstance } from "next/dist/shared/lib/app-router-context.shared-runtime";

/**
 * Manages Background Ad Clicks (Popunders)
 * 
 * Logic:
 * 1. Check Session Storage for click count
 * 2. If below frequency cap:
 *    - Open Ad in new tab
 *    - Increment count
 * 3. ALWAYS navigate user to target path
 */

const SESSION_KEY = 'nexi_ad_clicks';

export const handleAdClick = (
    e: React.MouseEvent,
    targetPath: string,
    router: AppRouterInstance,
    adUrl?: string,
    frequencyCap: number = 1
) => {
    // 1. Prevent default Link behavior (we handle navigation)
    e.preventDefault();

    // 2. Safety Check
    if (!adUrl) {
        router.push(targetPath);
        return;
    }

    try {
        // 3. Check Frequency
        const currentClicks = parseInt(sessionStorage.getItem(SESSION_KEY) || '0');

        if (currentClicks < frequencyCap) {
            // 4. Trigger Ad (Background Tab Attempt)
            // window.open with specific features tries to force background tab in some browsers,
            // but modern browsers often strictly foreground new tabs.
            // approach: Open Ad in NEW tab, keep User in CURRENT tab (navigation happens in current).
            const adWindow = window.open(adUrl, '_blank', 'noopener,noreferrer');
            if (adWindow) {
                // Focus back to current window not strictly possible programmatically in all browsers,
                // but standard behavior for _blank is new tab gets focus.
                // We rely on the user seeing the new tab is an Ad and closing it/ignoring it, 
                // while the main tab navigates to content.
            }

            // 5. Increment Counter
            sessionStorage.setItem(SESSION_KEY, (currentClicks + 1).toString());
        }
    } catch (error) {
        console.error("Ad Click Handler Error:", error);
    } finally {
        // 6. Navigation (Critical: Must always happen)
        router.push(targetPath);
    }
};
