export const PLAYER_IFRAME_ALLOW =
    'autoplay; encrypted-media; fullscreen; picture-in-picture; orientation-lock; screen-wake-lock; web-share';

export const FULLSCREEN_IFRAME_ATTRS = {
    allow: PLAYER_IFRAME_ALLOW,
    allowFullScreen: true,
    webkitallowfullscreen: 'true',
    mozallowfullscreen: 'true'
} as const;

export const AD_BLOCK_SANDBOX =
    'allow-scripts allow-same-origin allow-forms allow-presentation allow-pointer-lock allow-orientation-lock allow-modals';

export const ANTI_SANDBOX_HOSTS = [
    'dood',
    'playmogo',
    'ds2play'
];

export function isAntiSandboxUrl(url?: string | null, serverId?: string | null): boolean {
    const lowerUrl = (url || '').toLowerCase();
    // The same-origin Voe proxy sanitizes the provider document before it is
    // served. Voe's player refuses to run in a sandboxed frame, so this known
    // proxy route must be exempt from the popup-blocking sandbox.
    if (lowerUrl.startsWith('/api/player/voe?')) return true;
    if (lowerUrl.startsWith('/api/player/')) return false;
    const lowerId = (serverId || '').toLowerCase();
    return ANTI_SANDBOX_HOSTS.some(h => lowerUrl.includes(h) || lowerId.includes(h));
}

type FullscreenTarget = HTMLElement & {
    webkitRequestFullscreen?: () => Promise<void> | void;
    msRequestFullscreen?: () => Promise<void> | void;
};

export function canRequestPlayerFullscreen() {
    if (typeof document === 'undefined') return false;

    const target = document.documentElement as FullscreenTarget;
    return !!(
        target.requestFullscreen ||
        target.webkitRequestFullscreen ||
        target.msRequestFullscreen
    );
}

async function tryRequestFullscreen(target: FullscreenTarget | null): Promise<boolean> {
    if (!target) return false;

    const requestFullscreen =
        target.requestFullscreen ||
        target.webkitRequestFullscreen ||
        target.msRequestFullscreen;

    if (!requestFullscreen) return false;

    try {
        await Promise.resolve(requestFullscreen.call(target));
        return true;
    } catch {
        return false;
    }
}

export async function requestPlayerFullscreen(
    primaryTarget: HTMLElement | null,
    fallbackTarget?: HTMLElement | null
) {
    if (typeof document === 'undefined') return;

    const activeFullscreenElement =
        document.fullscreenElement ||
        (document as any).webkitFullscreenElement ||
        (document as any).msFullscreenElement;

    if (activeFullscreenElement) return;

    const enteredFullscreen =
        await tryRequestFullscreen(primaryTarget as FullscreenTarget | null) ||
        await tryRequestFullscreen(fallbackTarget as FullscreenTarget | null);

    if (!enteredFullscreen) return;

    try {
        await (screen.orientation as any)?.lock?.('landscape');
    } catch {
        // Some mobile browsers only allow orientation lock after native fullscreen.
    }
}
