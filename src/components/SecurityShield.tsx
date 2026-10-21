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

        // ----------------------------------------------------
        // 2. Keyboard Shortcut Lockdown (F12, Inspect, View-Source, Save)
        // ----------------------------------------------------
        const handleKeyDown = (e: KeyboardEvent) => {
            const isCtrlOrMeta = e.ctrlKey || e.metaKey;
            const key = e.key?.toLowerCase();
            const keyCode = e.keyCode || e.which;

            // F12 - DevTools
            if (key === 'f12' || keyCode === 123) {
                e.preventDefault();
                e.stopPropagation();
                triggerSecurityNotice('🔒 Developer tools are locked for security');
                return false;
            }

            if (isCtrlOrMeta) {
                // Ctrl+Shift+I (Inspect), Ctrl+Shift+J (Console), Ctrl+Shift+C (Element Selector), Ctrl+Shift+K (Firefox)
                if (e.shiftKey && (key === 'i' || key === 'j' || key === 'c' || key === 'k')) {
                    e.preventDefault();
                    e.stopPropagation();
                    triggerSecurityNotice('🔒 Code inspection is restricted');
                    return false;
                }

                // Ctrl+U (View Source)
                if (key === 'u' || keyCode === 85) {
                    e.preventDefault();
                    e.stopPropagation();
                    triggerSecurityNotice('🔒 Page source is encrypted & protected');
                    return false;
                }

                // Ctrl+S (Save Page HTML dump)
                if (key === 's' || keyCode === 83) {
                    e.preventDefault();
                    e.stopPropagation();
                    triggerSecurityNotice('🔒 Content saving is disabled');
                    return false;
                }

                // Ctrl+P (Print to PDF / Scraping)
                if (key === 'p' || keyCode === 80) {
                    e.preventDefault();
                    e.stopPropagation();
                    triggerSecurityNotice('🔒 Printing is restricted');
                    return false;
                }
            }
        };

        // ----------------------------------------------------
        // 3. Right-Click Context Menu Protection (Allow inside inputs)
        // ----------------------------------------------------
        const handleContextMenu = (e: MouseEvent) => {
            const target = e.target as HTMLElement | null;
            if (target) {
                const tagName = target.tagName?.toUpperCase();
                const isInput = tagName === 'INPUT' || tagName === 'TEXTAREA' || target.isContentEditable;
                // Allow right click if user is pasting into a search bar or text input
                if (isInput) return;
            }

            e.preventDefault();
            triggerSecurityNotice('🔒 Right-click inspection is protected');
        };

        // ----------------------------------------------------
        // 4. Console Sanitization & Hacker Warning Banner
        // ----------------------------------------------------
        try {
            console.log(
                '%c🛑 NEXIPLAY SECURITY SHIELD ACTIVE %c\nUnauthorized source extraction, network reverse-engineering, or automated scraping is strictly prohibited under DMCA & Cyber Security Regulations.\nAll session signatures are actively monitored.',
                'background: #1A0B2E; color: #FF0055; font-size: 20px; font-weight: 900; padding: 12px 18px; border-radius: 8px; border: 2px solid #FF0055;',
                'color: #A78BFA; font-size: 13px; font-weight: 600; line-height: 1.6; margin-top: 8px;'
            );

            // In production, silence verbose logging to prevent leaking internal variables or tokens
            if (process.env.NODE_ENV === 'production') {
                const noop = () => {};
                console.debug = noop;
                console.dir = noop;
                console.table = noop;
            }
        } catch (_) {
            // ignore console errors
        }

        // ----------------------------------------------------
        // 5. Anti-DevTools Debugger Trap (Desktop Only)
        // ----------------------------------------------------
        const isMobileOrTouch = window.innerWidth <= 1024 || 'ontouchstart' in window || (navigator.maxTouchPoints && navigator.maxTouchPoints > 0);
        let devToolsOpen = false;
        let devToolsTimer: any = null;

        if (!isMobileOrTouch) {
            const checkDevTools = () => {
                const widthThreshold = window.outerWidth - window.innerWidth > 160;
                const heightThreshold = window.outerHeight - window.innerHeight > 160;

                if (widthThreshold || heightThreshold) {
                    if (!devToolsOpen) {
                        devToolsOpen = true;
                        try {
                            const freeze = Function('debugger');
                            freeze();
                        } catch (_) {}
                    }
                } else {
                    devToolsOpen = false;
                }
            };
            devToolsTimer = setInterval(checkDevTools, 4000);
        }

        // Attach global listeners with capture phase for maximum authority
        window.addEventListener('keydown', handleKeyDown, true);
        window.addEventListener('contextmenu', handleContextMenu, true);

        return () => {
            window.removeEventListener('keydown', handleKeyDown, true);
            window.removeEventListener('contextmenu', handleContextMenu, true);
            clearInterval(devToolsTimer);
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
