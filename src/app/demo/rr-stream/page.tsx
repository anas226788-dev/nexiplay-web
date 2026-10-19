'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';

interface ApiResponse {
    success: boolean;
    title?: string;
    type?: string;
    slug?: string;
    season?: number;
    episode?: number;
    server?: string;
    format?: string;
    expiresInSeconds?: number;
    token?: string;
    playbackUrl?: string;
    embedUrl?: string;
    iframeCode?: string;
    error?: string;
}

// Verified anime from database configured with RR Nexiplay server
const VERIFIED_RR_ANIME = [
    { title: 'Hana-Kimi', slug: 'hana-kimi-2026' },
    { title: 'Blue Box', slug: 'blue-box-2026' },
    { title: "Hell's Paradise", slug: 'hell-s-paradise-2026' },
    { title: 'Oshi No Ko', slug: 'oshi-no-ko-2026' },
    { title: 'Bleach TYBW', slug: 'bleach-thousand-year-blood-war-2026' },
    { title: 'Buddy Daddies', slug: 'buddy-daddies-2026' },
    { title: 'Grand Blue Dreaming', slug: 'grand-blue-dreaming-2026' },
    { title: 'Marriage Toxin', slug: 'marriage-toxin-2026' }
];

export default function RRStreamDemoPage() {
    const [slug, setSlug] = useState('hana-kimi-2026');
    const [season, setSeason] = useState('1');
    const [episode, setEpisode] = useState('1');
    const [deviceView, setDeviceView] = useState<'desktop' | 'tablet' | 'mobile'>('desktop');
    const [bottomTab, setBottomTab] = useState<'api' | 'guide'>('api');
    const [mounted, setMounted] = useState(false);
    const [origin, setOrigin] = useState('');

    // API state
    const [apiKeyInput, setApiKeyInput] = useState('');
    const [apiResponse, setApiResponse] = useState<ApiResponse | null>(null);
    const [loading, setLoading] = useState(false);
    const [responseTime, setResponseTime] = useState<number | null>(null);
    const [httpStatus, setHttpStatus] = useState<number | null>(null);
    const [copiedKey, setCopiedKey] = useState<string | null>(null);

    useEffect(() => {
        setMounted(true);
        if (typeof window !== 'undefined') {
            setOrigin(window.location.origin);
        }
    }, []);

    const runApiTest = async (targetSlug = slug, targetSeason = season, targetEp = episode) => {
        if (!targetSlug.trim()) return;
        setLoading(true);
        const startTime = performance.now();

        try {
            const keyParam = apiKeyInput.trim() ? `&apiKey=${encodeURIComponent(apiKeyInput.trim())}` : '';
            const url = `/api/v1/anime/stream?slug=${encodeURIComponent(targetSlug.trim())}&season=${targetSeason}&episode=${targetEp}${keyParam}`;
            const res = await fetch(url);
            const data: ApiResponse = await res.json();
            const duration = Math.round(performance.now() - startTime);

            setHttpStatus(res.status);
            setResponseTime(duration);
            setApiResponse(data);
        } catch (err: any) {
            setHttpStatus(500);
            setResponseTime(Math.round(performance.now() - startTime));
            setApiResponse({
                success: false,
                error: err.message || 'Network request failed'
            });
        } finally {
            setLoading(false);
        }
    };

    // Auto-run when mounted
    useEffect(() => {
        runApiTest('hana-kimi-2026', '1', '1');
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const handleSelectSample = (sampleSlug: string) => {
        setSlug(sampleSlug);
        setSeason('1');
        setEpisode('1');
        runApiTest(sampleSlug, '1', '1');
    };

    const copyToClipboard = (text: string, key: string) => {
        if (typeof navigator !== 'undefined' && navigator.clipboard) {
            navigator.clipboard.writeText(text);
            setCopiedKey(key);
            setTimeout(() => setCopiedKey(null), 2000);
        }
    };

    const keyParam = apiKeyInput.trim() ? `&apiKey=${encodeURIComponent(apiKeyInput.trim())}` : '';
    const currentEmbedUrl = `/embed/rr?slug=${encodeURIComponent(slug.trim())}&season=${season}&episode=${episode}${keyParam}`;
    const effectiveOrigin = mounted && origin ? origin : 'http://localhost:3000';
    const iframeSnippet = `<iframe src="${effectiveOrigin}${currentEmbedUrl}" width="100%" height="500px" frameborder="0" allowfullscreen allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"></iframe>`;

    return (
        <div className="min-h-screen bg-[#09090e] text-white pt-24 pb-20 px-4 md:px-8">
            <div className="max-w-6xl mx-auto space-y-8">
                {/* Header */}
                <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 border-b border-white/10 pb-6">
                    <div>
                        <div className="flex items-center gap-3 mb-2">
                            <span className="px-3 py-1 rounded-full text-[11px] font-black uppercase tracking-wider bg-violet-600/20 text-violet-300 border border-red-500/30">
                                Protected Stream API
                            </span>
                            <span className="flex items-center gap-1.5 text-xs text-emerald-400 font-semibold bg-emerald-500/10 px-2.5 py-0.5 rounded-full border border-emerald-500/20">
                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                                RR Nexiplay Server Active
                            </span>
                        </div>
                        <h1 className="text-3xl md:text-4xl font-black tracking-tight text-white">
                            RR Anime Stream Playground & Tester
                        </h1>
                        <p className="text-sm text-gray-400 mt-1 max-w-2xl">
                            Live Iframe Player & Encrypted API Token Tester. Test your anime stream and embed player before using it on other websites.
                        </p>
                    </div>

                    <Link
                        href="/"
                        className="px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-bold text-gray-300 transition-colors flex items-center gap-2"
                    >
                        <span>←</span> Back to Nexiplay
                    </Link>
                </div>

                {/* Input & Parameters Bar */}
                <div className="p-6 rounded-2xl bg-[#111118] border border-white/10 shadow-2xl space-y-4">
                    <div className="flex items-center justify-between">
                        <h2 className="text-sm font-bold uppercase tracking-wider text-gray-400 flex items-center gap-2">
                            <span>⚙️</span> Configure Stream Target
                        </h2>
                        <span className="text-xs text-gray-400 font-medium">Quick RR Samples:</span>
                    </div>

                    {/* Quick Suggestions Chips (Only verified RR animes) */}
                    <div className="flex flex-wrap gap-2">
                        {VERIFIED_RR_ANIME.map((item) => (
                            <button
                                key={item.slug}
                                type="button"
                                onClick={() => handleSelectSample(item.slug)}
                                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                                    slug === item.slug
                                        ? 'bg-gradient-to-r from-violet-600 to-violet-700 text-white font-bold shadow-md shadow-red-600/30 scale-105'
                                        : 'bg-white/5 text-gray-300 hover:bg-white/10 border border-white/5'
                                }`}
                            >
                                {item.title}
                            </button>
                        ))}
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-end pt-2">
                        <div className="md:col-span-4 space-y-1.5">
                            <label className="text-xs font-bold text-gray-400">Anime Slug or UUID</label>
                            <input
                                type="text"
                                value={slug}
                                onChange={(e) => setSlug(e.target.value)}
                                placeholder="e.g. hana-kimi-2026 or blue-box-2026"
                                className="w-full px-4 py-3 rounded-xl bg-black/50 border border-white/10 text-sm font-mono text-white placeholder-gray-600 focus:outline-none focus:border-violet-400/60"
                            />
                        </div>

                        <div className="md:col-span-3 space-y-1.5">
                            <label className="text-xs font-bold text-gray-400">API Key (Optional / টেস্ট)</label>
                            <input
                                type="text"
                                value={apiKeyInput}
                                onChange={(e) => setApiKeyInput(e.target.value)}
                                placeholder="nxp_test_... (ফাঁকা রাখলে ফ্রি ডেমো)"
                                className="w-full px-3 py-3 rounded-xl bg-black/50 border border-white/10 text-xs font-mono text-white placeholder-gray-600 focus:outline-none focus:border-violet-400/60"
                            />
                        </div>

                        <div className="md:col-span-1 space-y-1.5">
                            <label className="text-xs font-bold text-gray-400">Season</label>
                            <input
                                type="number"
                                min="1"
                                value={season}
                                onChange={(e) => setSeason(e.target.value)}
                                className="w-full px-2 py-3 rounded-xl bg-black/50 border border-white/10 text-sm font-mono text-white focus:outline-none focus:border-violet-400/60 text-center"
                            />
                        </div>

                        <div className="md:col-span-2 space-y-1.5">
                            <label className="text-xs font-bold text-gray-400">Episode</label>
                            <input
                                type="number"
                                min="1"
                                value={episode}
                                onChange={(e) => setEpisode(e.target.value)}
                                className="w-full px-2 py-3 rounded-xl bg-black/50 border border-white/10 text-sm font-mono text-white focus:outline-none focus:border-violet-400/60 text-center"
                            />
                        </div>

                        <div className="md:col-span-2">
                            <button
                                type="button"
                                onClick={() => runApiTest()}
                                disabled={loading}
                                className="w-full py-3 px-5 rounded-xl bg-gradient-to-r from-violet-600 to-violet-700 hover:from-violet-500 hover:to-violet-600 active:scale-[0.98] text-white text-sm font-black transition-all shadow-lg shadow-violet-950/30 flex items-center justify-center gap-2 disabled:opacity-50"
                            >
                                {loading ? (
                                    <>
                                        <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                        <span>Loading...</span>
                                    </>
                                ) : (
                                    <>
                                        <span>▶</span>
                                        <span>Play & Test</span>
                                    </>
                                )}
                            </button>
                        </div>
                    </div>
                </div>

                {/* ============================================================== */}
                {/* 1. LIVE IFRAME VIDEO PLAYER (PROMINENT CENTERPIECE) */}
                {/* ============================================================== */}
                <div className="p-6 rounded-3xl bg-[#111118] border border-white/10 shadow-2xl space-y-5">
                    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-white/5 pb-4">
                        <div className="flex items-center gap-3">
                            <span className="text-xl">📺</span>
                            <div>
                                <h2 className="text-base font-black text-white flex items-center gap-2">
                                    <span>Live Video Player Preview</span>
                                    {apiResponse?.success && (
                                        <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                                            ● Live HLS Stream Ready
                                        </span>
                                    )}
                                </h2>
                                <p className="text-xs text-gray-400">
                                    {apiResponse?.title ? `Playing: ${apiResponse.title} (S${season} E${episode})` : `Target: ${slug} (Season ${season}, Episode ${episode})`}
                                </p>
                            </div>
                        </div>

                        {/* Device view switcher & Open in new tab */}
                        <div className="flex items-center gap-3 w-full sm:w-auto justify-between sm:justify-end">
                            <div className="flex bg-white/5 rounded-xl p-1 border border-white/5">
                                <button
                                    type="button"
                                    onClick={() => setDeviceView('desktop')}
                                    className={`px-3 py-1 rounded-lg text-xs font-bold transition-colors ${
                                        deviceView === 'desktop' ? 'bg-violet-600 text-white' : 'text-gray-400 hover:text-white'
                                    }`}
                                >
                                    Desktop
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setDeviceView('tablet')}
                                    className={`px-3 py-1 rounded-lg text-xs font-bold transition-colors ${
                                        deviceView === 'tablet' ? 'bg-violet-600 text-white' : 'text-gray-400 hover:text-white'
                                    }`}
                                >
                                    Tablet
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setDeviceView('mobile')}
                                    className={`px-3 py-1 rounded-lg text-xs font-bold transition-colors ${
                                        deviceView === 'mobile' ? 'bg-violet-600 text-white' : 'text-gray-400 hover:text-white'
                                    }`}
                                >
                                    Mobile
                                </button>
                            </div>

                            <a
                                href={currentEmbedUrl}
                                target="_blank"
                                rel="noreferrer"
                                className="px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-xs font-bold text-violet-300 hover:text-violet-200 border border-white/5 flex items-center gap-1 transition-all"
                            >
                                <span>Fullscreen</span>
                                <span>↗</span>
                            </a>
                        </div>
                    </div>

                    {/* Responsive Video Frame */}
                    <div className="flex justify-center bg-black/80 rounded-2xl p-2 sm:p-4 border border-white/5">
                        <div
                            className={`w-full bg-black rounded-xl overflow-hidden border border-white/10 shadow-2xl transition-all duration-300 aspect-video ${
                                deviceView === 'mobile'
                                    ? 'max-w-sm'
                                    : deviceView === 'tablet'
                                    ? 'max-w-2xl'
                                    : 'max-w-full'
                            }`}
                        >
                            <iframe
                                key={`${slug}-${season}-${episode}`}
                                src={currentEmbedUrl}
                                className="w-full h-full border-0 bg-black"
                                allowFullScreen
                                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; fullscreen"
                            />
                        </div>
                    </div>

                    {/* Quick Iframe Snippet Copy Bar */}
                    <div className="p-4 rounded-xl bg-black/60 border border-white/5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                        <div className="flex-1 truncate">
                            <span className="text-[11px] font-bold text-gray-400 block mb-0.5">
                                📋 HTML Iframe Embed Code (For Blogger, WordPress, or external websites):
                            </span>
                            <code className="text-xs font-mono text-green-300 truncate block" suppressHydrationWarning>
                                {mounted ? iframeSnippet : ''}
                            </code>
                        </div>
                        <button
                            type="button"
                            onClick={() => copyToClipboard(iframeSnippet, 'iframe')}
                            className="px-4 py-2 rounded-lg bg-violet-600 hover:bg-violet-500 text-xs font-bold text-white transition-colors whitespace-nowrap self-end sm:self-auto shadow-md shadow-violet-950/30"
                        >
                            {copiedKey === 'iframe' ? '✓ Copied Code!' : 'Copy Iframe Code'}
                        </button>
                    </div>
                </div>

                {/* ============================================================== */}
                {/* 2. DEVELOPER & ENCRYPTION INSPECTOR SECTION */}
                {/* ============================================================== */}
                <div className="space-y-4">
                    <div className="flex border-b border-white/10">
                        <button
                            type="button"
                            onClick={() => setBottomTab('api')}
                            className={`px-6 py-3 text-sm font-bold transition-all relative flex items-center gap-2 ${
                                bottomTab === 'api' ? 'text-white' : 'text-gray-400 hover:text-gray-200'
                            }`}
                        >
                            <span>🔐 Encrypted Token & API Inspector</span>
                            {httpStatus && (
                                <span
                                    className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${
                                        httpStatus === 200
                                            ? 'bg-emerald-500/20 text-emerald-400'
                                            : 'bg-red-500/20 text-violet-300'
                                    }`}
                                >
                                    {httpStatus} OK
                                </span>
                            )}
                            {bottomTab === 'api' && (
                                <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-violet-600 rounded-full" />
                            )}
                        </button>

                        <button
                            type="button"
                            onClick={() => setBottomTab('guide')}
                            className={`px-6 py-3 text-sm font-bold transition-all relative flex items-center gap-2 ${
                                bottomTab === 'guide' ? 'text-white' : 'text-gray-400 hover:text-gray-200'
                            }`}
                        >
                            <span>📖 Developer Integration Guide</span>
                            {bottomTab === 'guide' && (
                                <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-violet-600 rounded-full" />
                            )}
                        </button>
                    </div>

                    {/* TAB: API INSPECTOR */}
                    {bottomTab === 'api' && (
                        <div className="space-y-4">
                            {/* Stats Cards */}
                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                                <div className="p-4 rounded-xl bg-[#111118] border border-white/10">
                                    <span className="text-[11px] font-bold uppercase text-gray-500">Status</span>
                                    <p className="text-lg font-black mt-1 text-emerald-400">
                                        {httpStatus ? `${httpStatus} OK` : 'Ready'}
                                    </p>
                                </div>
                                <div className="p-4 rounded-xl bg-[#111118] border border-white/10">
                                    <span className="text-[11px] font-bold uppercase text-gray-500">API Latency</span>
                                    <p className="text-lg font-black mt-1 text-white">
                                        {responseTime !== null ? `${responseTime} ms` : '-'}
                                    </p>
                                </div>
                                <div className="p-4 rounded-xl bg-[#111118] border border-white/10">
                                    <span className="text-[11px] font-bold uppercase text-gray-500">Server</span>
                                    <p className="text-lg font-black mt-1 text-orange-400 truncate">
                                        {apiResponse?.server || 'RR Nexiplay Server'}
                                    </p>
                                </div>
                                <div className="p-4 rounded-xl bg-[#111118] border border-white/10">
                                    <span className="text-[11px] font-bold uppercase text-gray-500">Security Encryption</span>
                                    <p className="text-lg font-black mt-1 text-purple-400">
                                        AES-256-CBC
                                    </p>
                                </div>
                            </div>

                            {/* Encrypted Token Highlight Card */}
                            {apiResponse?.token && (
                                <div className="p-5 rounded-2xl bg-gradient-to-r from-purple-950/40 to-black border border-purple-500/30 space-y-2">
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-2">
                                            <span className="text-purple-400 font-bold text-xs uppercase tracking-wider">
                                                🔒 Protected Token (Source Stream URL is 100% Encrypted)
                                            </span>
                                            <span className="text-[11px] text-gray-400">Valid for 2 Hours</span>
                                        </div>
                                        <button
                                            type="button"
                                            onClick={() => copyToClipboard(apiResponse.token!, 'token')}
                                            className="text-xs text-purple-300 hover:text-white font-bold underline"
                                        >
                                            {copiedKey === 'token' ? '✓ Copied Token' : 'Copy Token'}
                                        </button>
                                    </div>
                                    <p className="font-mono text-xs text-purple-200/80 break-all bg-black/50 p-3 rounded-lg border border-purple-500/20 max-h-24 overflow-y-auto">
                                        {apiResponse.token}
                                    </p>
                                </div>
                            )}

                            {/* Tunneled Playback URL */}
                            {apiResponse?.playbackUrl && (
                                <div className="p-5 rounded-2xl bg-white/5 border border-white/10 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                                    <div className="truncate w-full sm:w-auto flex-1">
                                        <span className="text-xs font-bold text-gray-400 block mb-1">
                                            Direct Tunneled Playback Stream URL (For Hls.js, ExoPlayer, VLC):
                                        </span>
                                        <code className="text-xs text-blue-400 font-mono truncate block">
                                            {apiResponse.playbackUrl}
                                        </code>
                                    </div>
                                    <a
                                        href={apiResponse.playbackUrl}
                                        target="_blank"
                                        rel="noreferrer"
                                        className="px-4 py-2 bg-blue-600 hover:bg-blue-500 rounded-xl text-xs font-bold whitespace-nowrap transition-colors"
                                    >
                                        Open Stream ↗
                                    </a>
                                </div>
                            )}

                            {/* Full JSON Response */}
                            <div className="p-5 rounded-2xl bg-[#111118] border border-white/10 space-y-3">
                                <div className="flex items-center justify-between">
                                    <span className="text-xs font-bold text-gray-400 font-mono">
                                        GET /api/v1/anime/stream?slug={slug}&season={season}&episode={episode}
                                    </span>
                                    <button
                                        type="button"
                                        onClick={() =>
                                            copyToClipboard(JSON.stringify(apiResponse, null, 2), 'json')
                                        }
                                        className="px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-xs font-bold text-white transition-colors"
                                    >
                                        {copiedKey === 'json' ? '✓ Copied JSON!' : 'Copy JSON'}
                                    </button>
                                </div>
                                <pre className="p-4 rounded-xl bg-black/60 border border-white/5 font-mono text-xs text-amber-200 overflow-x-auto whitespace-pre-wrap break-all max-h-72">
                                    {apiResponse
                                        ? JSON.stringify(apiResponse, null, 2)
                                        : '// Loading response...'}
                                </pre>
                            </div>
                        </div>
                    )}

                    {/* TAB: GUIDE */}
                    {bottomTab === 'guide' && (
                        <div className="p-6 rounded-2xl bg-[#111118] border border-white/10 space-y-6">
                            {/* Download PDF Guide Banner */}
                            <div className="p-4 rounded-xl bg-gradient-to-r from-red-950/40 via-red-900/20 to-black border border-red-500/30 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                                <div>
                                    <h4 className="text-sm font-bold text-white flex items-center gap-2">
                                        <span>📄</span> Official Developer Integration Guide (PDF)
                                    </h4>
                                    <p className="text-xs text-gray-400 mt-0.5">
                                        Complete API specification, HLS architecture, zero-leak model & universal player code examples.
                                    </p>
                                </div>
                                <a
                                    href="/docs/Nexiplay_Anime_Stream_API_Developer_Guide.pdf"
                                    download="Nexiplay_Anime_Stream_API_Developer_Guide.pdf"
                                    className="px-4 py-2 rounded-xl bg-gradient-to-r from-violet-600 to-violet-700 hover:from-violet-500 hover:to-violet-600 text-white text-xs font-black transition-all shadow-md shadow-violet-950/40 flex items-center gap-2 whitespace-nowrap"
                                >
                                    <span>⬇</span> Download PDF Guide
                                </a>
                            </div>

                            <div>
                                <h3 className="text-base font-bold text-white mb-2">1. Quick HTML Iframe (Zero Coding)</h3>
                                <p className="text-xs text-gray-400 mb-3">
                                    Paste this on WordPress, Blogger, or any custom website:
                                </p>
                                <pre className="p-4 rounded-xl bg-black/60 border border-white/5 font-mono text-xs text-green-300 overflow-x-auto" suppressHydrationWarning>
{`<iframe 
  src="${mounted && origin ? origin : 'https://nexiplay.vercel.app'}/embed/rr?slug=hana-kimi-2026&season=1&episode=1" 
  width="100%" 
  height="500px" 
  frameborder="0" 
  allowfullscreen>
</iframe>`}
                                </pre>
                            </div>

                            <div className="border-t border-white/5 pt-6">
                                <h3 className="text-base font-bold text-white mb-2">2. JavaScript / Node.js API Call</h3>
                                <p className="text-xs text-gray-400 mb-3">
                                    Fetch stream metadata and playback URLs programmatically:
                                </p>
                                <pre className="p-4 rounded-xl bg-black/60 border border-white/5 font-mono text-xs text-blue-300 overflow-x-auto">
{`const res = await fetch('https://nexiplay.vercel.app/api/v1/anime/stream?slug=hana-kimi-2026&season=1&episode=1');
const data = await res.json();

if (data.success) {
  console.log("Token:", data.token);
  console.log("Playback URL:", data.playbackUrl);
  // Pass data.playbackUrl to video player (video.js, hls.js, plyr)
}`}
                                </pre>
                            </div>

                            <div className="border-t border-white/5 pt-6">
                                <h3 className="text-base font-bold text-white mb-2">3. React / Next.js Component</h3>
                                <pre className="p-4 rounded-xl bg-black/60 border border-white/5 font-mono text-xs text-purple-300 overflow-x-auto">
{`export function AnimePlayer({ slug, season = 1, episode = 1 }) {
  return (
    <div className="w-full aspect-video rounded-xl overflow-hidden">
      <iframe
        src={\`https://nexiplay.vercel.app/embed/rr?slug=\${slug}&season=\${season}&episode=\${episode}\`}
        className="w-full h-full border-0"
        allowFullScreen
      />
    </div>
  );
}`}
                                </pre>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
