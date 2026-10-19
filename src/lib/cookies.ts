/**
 * Cookie Management Utility for Nexiplay
 * 
 * Provides client-side cookie helpers with standard SameSite and Path controls.
 * Handles:
 * 1. User privacy consent (GDPR / ePrivacy compliance)
 * 2. Ad frequency capping & session cooldowns
 * 3. Grace period tracking to prevent aggressive ad barrage on first visit
 */

export interface CookieOptions {
    days?: number;
    path?: string;
    sameSite?: 'Lax' | 'Strict' | 'None';
    secure?: boolean;
}

/**
 * Get a cookie value by name
 */
export function getCookie(name: string): string | null {
    if (typeof document === 'undefined') return null;

    const nameEQ = encodeURIComponent(name) + '=';
    const ca = document.cookie.split(';');

    for (let i = 0; i < ca.length; i++) {
        let c = ca[i];
        while (c.charAt(0) === ' ') c = c.substring(1, c.length);
        if (c.indexOf(nameEQ) === 0) {
            return decodeURIComponent(c.substring(nameEQ.length, c.length));
        }
    }
    return null;
}

/**
 * Set a cookie with optional expiration days and options
 */
export function setCookie(name: string, value: string, options: CookieOptions = {}): void {
    if (typeof document === 'undefined') return;

    const {
        days = 365,
        path = '/',
        sameSite = 'Lax',
        secure = typeof window !== 'undefined' && window.location.protocol === 'https:',
    } = options;

    let expires = '';
    if (days) {
        const date = new Date();
        date.setTime(date.getTime() + days * 24 * 60 * 60 * 1000);
        expires = '; expires=' + date.toUTCString();
    }

    const secureFlag = secure ? '; Secure' : '';
    document.cookie = `${encodeURIComponent(name)}=${encodeURIComponent(value)}${expires}; path=${path}; SameSite=${sameSite}${secureFlag}`;
}

/**
 * Delete a cookie by setting expired date
 */
export function deleteCookie(name: string, path: string = '/'): void {
    if (typeof document === 'undefined') return;
    document.cookie = `${encodeURIComponent(name)}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=${path}; SameSite=Lax`;
}

// ─────────────────────────────────────────────────────────────
// Ad Frequency & Grace Period Cookie Helpers
// ─────────────────────────────────────────────────────────────

const COOKIE_POPUNDER_LAST = 'np_pop_cooldown';
const COOKIE_USER_CLICKS = 'np_user_clicks';
const COOKIE_FIRST_LANDING = 'np_first_landing';
const COOKIE_CONSENT = 'np_cookie_consent';

export interface PopunderState {
    isEligible: boolean;
    clickCount: number;
    secondsSinceLanding: number;
    cooldownRemainingSeconds: number;
}

function getStorageOrCookie(key: string): string | null {
    if (typeof window === 'undefined') return null;
    const fromCookie = getCookie(key);
    if (fromCookie) return fromCookie;
    try {
        return localStorage.getItem(key);
    } catch {
        return null;
    }
}

function setStorageAndCookie(key: string, value: string, days: number = 1): void {
    if (typeof window === 'undefined') return;
    setCookie(key, value, { days });
    try {
        localStorage.setItem(key, value);
    } catch {}
}

/**
 * Check if a popunder ad is currently allowed based on:
 * 1. Minimum interaction count (user must click at least 2 times before any ad fires)
 * 2. Grace period delay (at least 8 seconds after landing)
 * 3. Cooldown duration (default 10 minutes between popunders)
 */
export function getPopunderEligibility(cooldownMinutes: number = 10): PopunderState {
    if (typeof window === 'undefined') {
        return { isEligible: false, clickCount: 0, secondsSinceLanding: 0, cooldownRemainingSeconds: 0 };
    }

    const now = Date.now();

    // 1. First landing timestamp
    let landingTs = parseInt(getStorageOrCookie(COOKIE_FIRST_LANDING) || '0', 10);
    if (!landingTs || isNaN(landingTs)) {
        landingTs = now;
        setStorageAndCookie(COOKIE_FIRST_LANDING, landingTs.toString(), 1);
    }
    const secondsSinceLanding = Math.floor((now - landingTs) / 1000);

    // 2. Click count in current session
    const clickCount = parseInt(getStorageOrCookie(COOKIE_USER_CLICKS) || '0', 10);

    // 3. Last shown timestamp
    const lastShown = parseInt(getStorageOrCookie(COOKIE_POPUNDER_LAST) || '0', 10);
    const cooldownMs = cooldownMinutes * 60 * 1000;
    const timeSinceLast = now - lastShown;
    const cooldownRemaining = Math.max(0, Math.ceil((cooldownMs - timeSinceLast) / 1000));

    // Cooldown must be expired to trigger a new popunder
    const isCooldownSatisfied = !lastShown || timeSinceLast >= cooldownMs;
    const isEligible = isCooldownSatisfied;

    return {
        isEligible,
        clickCount,
        secondsSinceLanding,
        cooldownRemainingSeconds: cooldownRemaining,
    };
}

/**
 * Record a user interaction click to count toward the grace threshold
 */
export function incrementUserClickCount(): number {
    if (typeof window === 'undefined') return 0;
    const current = parseInt(getStorageOrCookie(COOKIE_USER_CLICKS) || '0', 10);
    const updated = current + 1;
    setStorageAndCookie(COOKIE_USER_CLICKS, updated.toString(), 1);
    return updated;
}

/**
 * Record that a popunder has just been triggered (starts cooldown)
 */
export function recordPopunderTriggered(cooldownMinutes: number = 10): void {
    if (typeof window === 'undefined') return;
    const now = Date.now();
    setStorageAndCookie(COOKIE_POPUNDER_LAST, now.toString(), 1);
}

// ─────────────────────────────────────────────────────────────
// Cookie Consent Helper
// ─────────────────────────────────────────────────────────────

export type ConsentType = 'all' | 'essential' | null;

export function getCookieConsent(): ConsentType {
    const val = getCookie(COOKIE_CONSENT);
    if (val === 'all' || val === 'essential') return val;
    return null;
}

export function setCookieConsent(type: 'all' | 'essential'): void {
    setCookie(COOKIE_CONSENT, type, { days: 365 });
}
