/**
 * Safe HTML Sanitizer for user & database content.
 * Prevents Stored XSS, iframe injection, clickjacking, and arbitrary script execution.
 */
export function sanitizeHtml(dirtyHtml: string | null | undefined): string {
    if (!dirtyHtml || typeof dirtyHtml !== 'string') return '';

    let clean = dirtyHtml;

    // 1. Remove dangerous blocks and their contents entirely
    clean = clean.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '');
    clean = clean.replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, '');
    clean = clean.replace(/<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi, '');
    clean = clean.replace(/<object\b[^<]*(?:(?!<\/object>)<[^<]*)*<\/object>/gi, '');
    clean = clean.replace(/<embed\b[^<]*(?:(?!<\/embed>)<[^<]*)*<\/embed>/gi, '');
    clean = clean.replace(/<form\b[^<]*(?:(?!<\/form>)<[^<]*)*<\/form>/gi, '');

    // 2. Remove remaining single/unclosed dangerous tags
    clean = clean.replace(/<\/?(script|style|iframe|object|embed|form|input|button|svg|math|meta|link|base)\b[^>]*>/gi, '');

    // 3. Remove all event handlers (on* attributes like onclick, onerror, onload, etc.)
    clean = clean.replace(/\s+on[a-z]+\s*=\s*(?:'[^']*'|"[^"]*"|[^\s>]+)/gi, '');

    // 4. Remove dangerous pseudo-protocols in href or src (javascript:, vbscript:, data:)
    clean = clean.replace(/(href|src)\s*=\s*['"]\s*(?:javascript|vbscript|data):[^'"]*['"]/gi, '$1="#"');
    clean = clean.replace(/(href|src)\s*=\s*(?:javascript|vbscript|data):[^\s>]*/gi, '$1="#"');

    // 5. Ensure any links have rel="noopener noreferrer" and target="_blank"
    clean = clean.replace(/<a\b([^>]*)>/gi, (_, attrs) => {
        let cleanAttrs = attrs;
        if (!/rel=/i.test(cleanAttrs)) {
            cleanAttrs += ' rel="noopener noreferrer"';
        }
        if (!/target=/i.test(cleanAttrs)) {
            cleanAttrs += ' target="_blank"';
        }
        return `<a${cleanAttrs}>`;
    });

    return clean;
}
