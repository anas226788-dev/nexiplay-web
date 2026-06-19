'use client';

import { useCallback, useEffect, useState } from 'react';

type GateState = 'checking' | 'allowed' | 'blocked';

const BAIT_CLASSES = [
    'ad',
    'ads',
    'adsbox',
    'ad-banner',
    'ad-container',
    'ad_unit',
    'advertisement',
    'banner_ads',
    'google-ad',
    'pub_300x250',
    'sponsor',
    'textads'
].join(' ');

const SCRIPT_TIMEOUT_MS = 1800;
const RECHECK_INTERVAL_MS = 15000;

function wait(ms: number) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

async function isBaitElementBlocked(): Promise<boolean> {
    const bait = document.createElement('div');
    bait.className = BAIT_CLASSES;
    bait.setAttribute('aria-hidden', 'true');
    bait.style.cssText = [
        'position:absolute',
        'left:-10000px',
        'top:-10000px',
        'width:1px',
        'height:1px',
        'pointer-events:none'
    ].join(';');

    document.body.appendChild(bait);
    await wait(120);

    const style = window.getComputedStyle(bait);
    const blocked =
        style.display === 'none' ||
        style.visibility === 'hidden' ||
        bait.offsetHeight === 0 ||
        bait.offsetWidth === 0 ||
        !document.body.contains(bait);

    bait.remove();
    return blocked;
}

function isProbeScriptBlocked(): Promise<boolean> {
    return new Promise(resolve => {
        const script = document.createElement('script');
        let settled = false;
        let timeoutId: number | undefined;

        const finish = (blocked: boolean) => {
            if (settled) return;
            settled = true;
            if (timeoutId) window.clearTimeout(timeoutId);
            script.remove();
            resolve(blocked);
        };

        (window as any).__nexiplayAdProbe = false;

        script.async = true;
        script.src = `/ads.js?adsbygoogle=${Date.now()}`;
        script.onload = () => {
            window.setTimeout(() => {
                finish((window as any).__nexiplayAdProbe !== true);
            }, 50);
        };
        script.onerror = () => finish(true);

        timeoutId = window.setTimeout(() => finish(true), SCRIPT_TIMEOUT_MS);
        document.head.appendChild(script);
    });
}

async function detectAdBlocker(): Promise<boolean> {
    const [baitBlocked, scriptBlocked] = await Promise.all([
        isBaitElementBlocked(),
        isProbeScriptBlocked()
    ]);

    return baitBlocked || scriptBlocked;
}

export default function AntiAdBlockGate() {
    const [gateState, setGateState] = useState<GateState>('checking');
    const [isCheckingAgain, setIsCheckingAgain] = useState(false);

    const runCheck = useCallback(async (manual = false) => {
        if (manual) setIsCheckingAgain(true);

        try {
            const blocked = await detectAdBlocker();
            setGateState(blocked ? 'blocked' : 'allowed');
        } catch {
            setGateState('allowed');
        } finally {
            if (manual) setIsCheckingAgain(false);
        }
    }, []);

    useEffect(() => {
        let cancelled = false;

        const guardedRun = async () => {
            if (!cancelled) await runCheck();
        };

        guardedRun();
        const intervalId = window.setInterval(guardedRun, RECHECK_INTERVAL_MS);
        window.addEventListener('focus', guardedRun);

        return () => {
            cancelled = true;
            window.clearInterval(intervalId);
            window.removeEventListener('focus', guardedRun);
        };
    }, [runCheck]);

    useEffect(() => {
        if (gateState !== 'blocked') return;

        const previousBodyOverflow = document.body.style.overflow;
        const previousHtmlOverflow = document.documentElement.style.overflow;
        document.body.style.overflow = 'hidden';
        document.documentElement.style.overflow = 'hidden';

        return () => {
            document.body.style.overflow = previousBodyOverflow;
            document.documentElement.style.overflow = previousHtmlOverflow;
        };
    }, [gateState]);

    if (gateState !== 'blocked') return null;

    return (
        <div
            className="fixed inset-0 z-[2147483647] flex items-center justify-center bg-black/95 px-4 py-6 text-white backdrop-blur-md"
            role="alertdialog"
            aria-modal="true"
            aria-labelledby="anti-adblock-title"
        >
            <div className="w-full max-w-md rounded-2xl border border-red-500/30 bg-[#0b0b0f] p-6 text-center shadow-[0_0_45px_rgba(229,9,20,0.25)]">
                <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full border border-red-500/40 bg-red-500/10 text-2xl font-black text-red-400">
                    !
                </div>
                <h2 id="anti-adblock-title" className="mb-3 text-2xl font-black tracking-tight">
                    Ad-Blocker Detected
                </h2>
                <p className="mb-5 text-sm leading-6 text-gray-300">
                    Nexiplay needs ads to keep the site running. Please disable your ad blocker for this website, then refresh access.
                </p>
                <button
                    type="button"
                    onClick={() => runCheck(true)}
                    disabled={isCheckingAgain}
                    className="w-full rounded-xl bg-red-600 px-5 py-3 text-sm font-black text-white transition hover:bg-red-500 disabled:cursor-wait disabled:opacity-70"
                >
                    {isCheckingAgain ? 'Checking...' : 'I Disabled Ad-Blocker'}
                </button>
                <p className="mt-4 text-xs leading-5 text-gray-500">
                    If it still appears, allow popups/scripts for this site and try again.
                </p>
            </div>
        </div>
    );
}
