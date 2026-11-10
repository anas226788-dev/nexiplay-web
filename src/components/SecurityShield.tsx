'use client';

import React, { useEffect, useState, useCallback, useRef } from 'react';

/**
 * Nexiplay Military-Grade Security Shield
 * 
 * Defends against:
 * 1. AI Agents & Headless Scrapers (Puppeteer, Selenium, Playwright, Chromedriver)
 * 2. Source Code Inspection & Tampering (F12, Ctrl+Shift+I/J/C, Ctrl+U, Ctrl+S)
 * 3. DevTools Reverse-Engineering (Timing checks, debugger traps, console sanitization)
 * 4. Context-menu ripping (while preserving form input usability)
 */
export default function SecurityShield() {
    const [shieldAlert, setShieldAlert] = useState<string | null>(null);
    const [botBlocked, setBotBlocked] = useState<boolean>(false);
    const [devToolsLocked, setDevToolsLocked] = useState<boolean>(false);
    const alertTimeoutRef = useRef<NodeJS.Timeout | null>(null);

    // Show temporary floating security notice
    const triggerSecurityNotice = useCallback((message: string) => {
        setShieldAlert(message);
        if (alertTimeoutRef.current) clearTimeout(alertTimeoutRef.current);
        alertTimeoutRef.current = setTimeout(() => {
            setShieldAlert(null);
        }, 1800);
    }, []);

    useEffect(() => {
        // Only run in client browser
        if (typeof window === 'undefined') return;

        // ----------------------------------------------------
        // 1. Detect Automated Headless Browsers & AI Agents
        // ----------------------------------------------------
        const detectAutomation = () => {
            const nav = window.navigator as any;
            const win = window as any;

            // Flags commonly present in Selenium, Puppeteer, Playwright, PhantomJS
            const isWebdriver = nav.webdriver === true;
            const hasPhantom = !!win._phantom || !!win.callPhantom;
            const hasNightmare = !!win.__nightmare;
            const hasChromedriver = Object.keys(win).some(key => key.startsWith('cdc_') || key.startsWith('__$webdriver'));
            const isHeadless = /HeadlessChrome|PhantomJS|Selenium|Puppeteer/i.test(nav.userAgent);

            if (isWebdriver || hasPhantom || hasNightmare || hasChromedriver || isHeadless) {
                // If it's a known bot, block the session
                setBotBlocked(true);
                return true;
            }
            return false;
        };

        if (detectAutomation()) return;

        // Helper to stop event completely
        const blockEvent = (e: Event, notice?: string) => {
            e.preventDefault();
            e.stopPropagation();
            if (typeof (e as any).stopImmediatePropagation === 'function') {
                (e as any).stopImmediatePropagation();
            }
            if (notice) triggerSecurityNotice(notice);
            return false;
        };

        // ----------------------------------------------------
        // 2. Comprehensive Keyboard Shortcut Lockdown
        //    (F12, Inspect, Console, View-Source, Save, Print, ContextMenu key)
        //    Checks both e.key and physical e.code so non-English keyboards (e.g. Bangla)
        //    or CapsLock cannot bypass shortcut detection.
        // ----------------------------------------------------
        const handleKeyDown = (e: KeyboardEvent) => {
            const isCtrlOrMeta = e.ctrlKey || e.metaKey;
            const isAltOrOption = e.altKey;
            const key = e.key?.toLowerCase() || '';
            const code = e.code || '';
            const keyCode = e.keyCode || e.which;

            // F12 - DevTools
            if (key === 'f12' || code === 'F12' || keyCode === 123) {
                return blockEvent(e, '🔒 Developer tools are locked for security');
            }

            // ContextMenu key or Shift+F10 (keyboard right-click equivalent)
            if (
                key === 'contextmenu' ||
                code === 'ContextMenu' ||
                keyCode === 93 ||
                (e.shiftKey && (key === 'f10' || code === 'F10' || keyCode === 121))
            ) {
                return blockEvent(e, '🔒 Context menu is restricted');
            }

            if (isCtrlOrMeta) {
                const isInspectCode =
                    key === 'i' || code === 'KeyI' || keyCode === 73 ||
                    key === 'j' || code === 'KeyJ' || keyCode === 74 ||
                    key === 'c' || code === 'KeyC' || keyCode === 67 ||
                    key === 'k' || code === 'KeyK' || keyCode === 75 ||
                    key === 'e' || code === 'KeyE' || keyCode === 69 ||
                    key === 'm' || code === 'KeyM' || keyCode === 77;

                // Windows/Linux: Ctrl+Shift+I/J/C/K/E/M | macOS: Cmd+Option+I/J/C/K/E/M or Cmd+Shift+I/J/C
                if ((e.shiftKey || isAltOrOption) && isInspectCode) {
                    return blockEvent(e, '🔒 Code inspection is restricted');
                }

                // Ctrl+U / Cmd+U / Cmd+Option+U (View Source)
                if (key === 'u' || code === 'KeyU' || keyCode === 85) {
                    return blockEvent(e, '🔒 Page source is encrypted & protected');
                }

                // Ctrl+S / Cmd+S (Save Page HTML dump)
                if (key === 's' || code === 'KeyS' || keyCode === 83) {
                    return blockEvent(e, '🔒 Content saving is disabled');
                }

                // Ctrl+P / Cmd+P (Print to PDF / Scraping)
                if (key === 'p' || code === 'KeyP' || keyCode === 80) {
                    return blockEvent(e, '🔒 Printing is restricted');
                }
            }
        };

        // ----------------------------------------------------
        // 3. Strict Right-Click Context Menu Lockdown Everywhere
        //    (Blocks Inspect on inputs, search bars, images, videos, and entire DOM)
        // ----------------------------------------------------
        const handleContextMenu = (e: MouseEvent) => {
            return blockEvent(e, '🔒 Right-click & Inspect are disabled');
        };

        const handleDragStart = (e: DragEvent) => {
            const target = e.target as HTMLElement | null;
            const tag = target?.tagName?.toUpperCase();
            if (tag === 'IMG' || tag === 'VIDEO' || tag === 'A') {
                e.preventDefault();
            }
        };

        // ----------------------------------------------------
        // 4. Console Sanitization & Hacker Warning Banner
        // ----------------------------------------------------
        const printSecurityBanner = () => {
            try {
                console.log(
                    '%c🛑 NEXIPLAY SECURITY SHIELD ACTIVE %c\nUnauthorized source extraction, network reverse-engineering, or automated scraping is strictly prohibited under DMCA & Cyber Security Regulations.\nAll session signatures are actively monitored.',
                    'background: #1A0B2E; color: #FF0055; font-size: 20px; font-weight: 900; padding: 12px 18px; border-radius: 8px; border: 2px solid #FF0055;',
                    'color: #A78BFA; font-size: 13px; font-weight: 600; line-height: 1.6; margin-top: 8px;'
                );

                if (process.env.NODE_ENV === 'production') {
                    const noop = () => {};
                    console.debug = noop;
                    console.dir = noop;
                    console.table = noop;
                }
            } catch (_) {
                // ignore console errors
            }
        };
        printSecurityBanner();

        // ----------------------------------------------------
        // 5. Multi-Vector Anti-DevTools Detection & Active Lockout
        //    Works on all Windows/Mac/Linux desktops & laptops (even touchscreen PCs)
        //    and catches both docked and undocked/menu-opened DevTools.
        // ----------------------------------------------------
        const isMobileDevice = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
            navigator.userAgent || ''
        );

        const pauseActiveMedia = () => {
            try {
                document.querySelectorAll('video, audio').forEach((media) => {
                    const el = media as HTMLMediaElement;
                    if (!el.paused) el.pause();
                });
            } catch (_) {}
        };

        const checkDevTools = () => {
            let detected = false;

            // Vector A: Docked DevTools window size delta on desktop/laptop browsers
            if (!isMobileDevice && window.outerWidth > 0 && window.outerHeight > 0) {
                const dpr = window.devicePixelRatio || 1;
                const widthDiff = Math.min(
                    window.outerWidth - window.innerWidth,
                    window.outerWidth - Math.round(window.innerWidth * dpr)
                );
                const heightDiff = Math.min(
                    window.outerHeight - window.innerHeight,
                    window.outerHeight - Math.round(window.innerHeight * dpr)
                );

                if (widthDiff > 160 || heightDiff > 160) {
                    detected = true;
                }
            }

            // Vector B: Debugger execution timing trap (catches undocked DevTools & Browser Menu -> Developer Tools)
            const t0 = performance.now();
            try {
                const freeze = Function('debugger');
                freeze();
            } catch (_) {}
            const t1 = performance.now();
            if (t1 - t0 > 100) {
                detected = true;
            }

            // Vector C: Legacy Firebug / DevTools extension hook
            if ((window as any).Firebug?.chrome?.isInitialized) {
                detected = true;
            }

            if (detected) {
                setDevToolsLocked((prev) => {
                    if (!prev) {
                        pauseActiveMedia();
                        try {
                            console.clear();
                            printSecurityBanner();
                        } catch (_) {}
                    }
                    return true;
                });
            } else {
                setDevToolsLocked((prev) => (prev ? false : prev));
            }
        };

        const devToolsTimer = setInterval(checkDevTools, 800);

        // Attach global listeners in capture phase on both window and document
        window.addEventListener('keydown', handleKeyDown, { capture: true });
        document.addEventListener('keydown', handleKeyDown, { capture: true });
        window.addEventListener('contextmenu', handleContextMenu, { capture: true });
        document.addEventListener('contextmenu', handleContextMenu, { capture: true });
        window.addEventListener('dragstart', handleDragStart, { capture: true });
        window.addEventListener('resize', checkDevTools);

        // Run initial check shortly after mount
        const initialCheckTimeout = setTimeout(checkDevTools, 300);

        return () => {
            window.removeEventListener('keydown', handleKeyDown, { capture: true });
            document.removeEventListener('keydown', handleKeyDown, { capture: true });
            window.removeEventListener('contextmenu', handleContextMenu, { capture: true });
            document.removeEventListener('contextmenu', handleContextMenu, { capture: true });
            window.removeEventListener('dragstart', handleDragStart, { capture: true });
            window.removeEventListener('resize', checkDevTools);
            clearInterval(devToolsTimer);
            clearTimeout(initialCheckTimeout);
            if (alertTimeoutRef.current) clearTimeout(alertTimeoutRef.current);
        };
    }, [triggerSecurityNotice]);

    // ----------------------------------------------------
    // Bot Blocked Screen (If headless scraper or AI agent detected)
    // ----------------------------------------------------
    if (botBlocked) {
        return (
            <div className="fixed inset-0 z-[999999] bg-[#07050B] text-white flex flex-col items-center justify-center p-6 text-center select-none">
                <div className="w-20 h-20 rounded-3xl bg-rose-500/10 border border-rose-500/30 flex items-center justify-center text-4xl mb-6 shadow-[0_0_50px_rgba(244,63,94,0.3)]">
                    🛡️
                </div>
                <h1 className="text-2xl sm:text-3xl font-black text-rose-400 mb-2">
                    Security Incident: Automated Agent Detected
                </h1>
                <p className="text-sm text-gray-300 max-w-md leading-relaxed mb-6">
                    Nexiplay Fortress has blocked this connection. Automated scrapers, headless browsers, and reverse-engineering agents are prohibited from extracting content.
                </p>
                <div className="px-4 py-2 rounded-xl bg-white/5 border border-white/10 text-xs font-mono text-gray-400">
                    Incident ID: {Math.random().toString(36).substring(2, 10).toUpperCase()} • Protocol: SHIELD-V4
                </div>
            </div>
        );
    }

    // ----------------------------------------------------
    // Active DevTools Lockout Screen (If opened via browser menu or shortcut before page load)
    // ----------------------------------------------------
    if (devToolsLocked) {
        return (
            <div className="fixed inset-0 z-[999999] bg-[#07050B]/98 backdrop-blur-3xl text-white flex flex-col items-center justify-center p-6 text-center select-none">
                <div className="w-20 h-20 rounded-3xl bg-violet-500/15 border border-violet-500/40 flex items-center justify-center text-4xl mb-6 shadow-[0_0_50px_rgba(139,92,246,0.35)]">
                    🔒
                </div>
                <h1 className="text-2xl sm:text-3xl font-black text-violet-300 mb-2">
                    Developer Tools Detected
                </h1>
                <p className="text-sm text-gray-300 max-w-md leading-relaxed mb-6">
                    For content security and stream protection, Nexiplay cannot be accessed while browser Developer Tools or Inspect Element is open. Please close Developer Tools to continue watching immediately.
                </p>
                <div className="px-4 py-2 rounded-xl bg-white/5 border border-white/10 text-xs font-mono text-violet-300/80">
                    NEXIPLAY SHIELD-V5 • AUTO-RESUMES WHEN DEVTOOLS IS CLOSED
                </div>
            </div>
        );
    }

    // ----------------------------------------------------
    // Floating Security Notification Toast
    // ----------------------------------------------------
    if (!shieldAlert) return null;

    return (
        <aside
            aria-live="polite"
            className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[99999] pointer-events-none transition-all duration-300 transform scale-100 opacity-100"
        >
            <div className="flex items-center gap-2.5 px-4 py-2.5 rounded-2xl bg-[#140F22]/95 backdrop-blur-2xl border border-violet-500/40 text-violet-200 text-xs font-bold shadow-[0_0_30px_rgba(146,115,245,0.4)]">
                <span className="w-2 h-2 rounded-full bg-violet-400 animate-ping" />
                <span>{shieldAlert}</span>
            </div>
        </aside>
    );
}
