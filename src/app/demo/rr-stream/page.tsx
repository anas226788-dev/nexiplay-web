'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';

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

export default function RRStreamDemoPage() {
    const [slug, setSlug] = useState('solo-leveling');
    const [season, setSeason] = useState('1');
    const [episode, setEpisode] = useState('1');
    const [activeTab, setActiveTab] = useState<'iframe' | 'api' | 'guide'>('iframe');
    const [deviceView, setDeviceView] = useState<'desktop' | 'tablet' | 'mobile'>('desktop');

    // API state
    const [apiResponse, setApiResponse] = useState<ApiResponse | null>(null);
    const [loading, setLoading] = useState(false);
    const [responseTime, setResponseTime] = useState<number | null>(null);
    const [httpStatus, setHttpStatus] = useState<number | null>(null);
    const [copiedKey, setCopiedKey] = useState<string | null>(null);

    // Auto-detected sample anime from database
    const [animeSuggestions, setAnimeSuggestions] = useState<{ title: string; slug: string }[]>([]);

    useEffect(() => {
        const loadSuggestions = async () => {
            try {
                const { data } = await supabase
                    .from('movies')
                    .select('title, slug')
                    .eq('type', 'anime')
                    .limit(8);

                if (data && data.length > 0) {
                    setAnimeSuggestions(data);
                    if (!slug || slug === 'solo-leveling') {
                        setSlug(data[0].slug);
                    }
                }
            } catch {
                // Ignore fallback
            }
        };

        loadSuggestions();
    }, []);

    const runApiTest = async () => {
        if (!slug.trim()) return;
        setLoading(true);
        setApiResponse(null);
        const startTime = performance.now();

        try {
            const url = `/api/v1/anime/stream?slug=${encodeURIComponent(slug.trim())}&season=${season}&episode=${episode}`;
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

    // Auto-run when mounted or when slug/season/ep is changed and user clicks
    useEffect(() => {
        runApiTest();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const copyToClipboard = (text: string, key: string) => {
        navigator.clipboard.writeText(text);
        setCopiedKey(key);
        setTimeout(() => setCopiedKey(null), 2000);
    };

    const currentEmbedUrl = `/embed/rr?slug=${encodeURIComponent(slug.trim())}&season=${season}&episode=${episode}`;
    const iframeSnippet = `<iframe src="${typeof window !== 'undefined' ? window.location.origin : ''}${currentEmbedUrl}" width="100%" height="500px" frameborder="0" allowfullscreen allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"></iframe>`;

    return (
        <div className="min-h-screen bg-[#09090e] text-white pt-24 pb-20 px-4 md:px-8">
            <div className="max-w-6xl mx-auto space-y-8">
                {/* Header */}
                <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 border-b border-white/10 pb-6">
                    <div>
                        <div className="flex items-center gap-3 mb-2">
                            <span className="px-3 py-1 rounded-full text-[11px] font-black uppercase tracking-wider bg-red-600/20 text-red-400 border border-red-500/30">
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
                            Test the encrypted stream API and live Iframe embed player before deploying to your other websites or apps.
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
                        <h2 className="text-sm font-bold uppercase tracking-wider text-gray-400">
                            Configure Stream Target
                        </h2>
                        {animeSuggestions.length > 0 && (
                            <span className="text-xs text-gray-500">Quick Samples:</span>
                        )}
                    </div>

                    {/* Quick Suggestions Chips */}
                    {animeSuggestions.length > 0 && (
                        <div className="flex flex-wrap gap-2">
                            {animeSuggestions.map((item) => (
                                <button
                                    key={item.slug}
                                    onClick={() => {
                                        setSlug(item.slug);
                                        setSeason('1');
                                        setEpisode('1');
                                    }}
                                    className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                                        slug === item.slug
                                            ? 'bg-red-600 text-white font-bold shadow-md shadow-red-600/20'
                                            : 'bg-white/5 text-gray-300 hover:bg-white/10 border border-white/5'
                                    }`}
                                >
                                    {item.title}
                                </button>
                            ))}
                        </div>
                    )}

                    <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-end">
                        <div className="md:col-span-6 space-y-1.5">
                            <label className="text-xs font-bold text-gray-400">Anime Slug or UUID</label>
                            <input
                                type="text"
                                value={slug}
                                onChange={(e) => setSlug(e.target.value)}
                                placeholder="e.g. solo-leveling or naruto"
                                className="w-full px-4 py-3 rounded-xl bg-black/50 border border-white/10 text-sm font-mono text-white placeholder-gray-600 focus:outline-none focus:border-red-500/60"
                            />
                        </div>

                        <div className="md:col-span-2 space-y-1.5">
                            <label className="text-xs font-bold text-gray-400">Season</label>
                            <input
                                type="number"
                                min="1"
                                value={season}
                                onChange={(e) => setSeason(e.target.value)}
                                className="w-full px-4 py-3 rounded-xl bg-black/50 border border-white/10 text-sm font-mono text-white focus:outline-none focus:border-red-500/60 text-center"
                            />
                        </div>

                        <div className="md:col-span-2 space-y-1.5">
                            <label className="text-xs font-bold text-gray-400">Episode</label>
                            <input
                                type="number"
                                min="1"
                                value={episode}
                                onChange={(e) => setEpisode(e.target.value)}
                                className="w-full px-4 py-3 rounded-xl bg-black/50 border border-white/10 text-sm font-mono text-white focus:outline-none focus:border-red-500/60 text-center"
                            />
                        </div>

                        <div className="md:col-span-2">
                            <button
                                onClick={runApiTest}
                                disabled={loading}
                                className="w-full py-3 px-5 rounded-xl bg-gradient-to-r from-red-600 to-orange-600 hover:from-red-500 hover:to-orange-500 active:scale-[0.98] text-white text-sm font-black transition-all shadow-lg shadow-red-900/30 flex items-center justify-center gap-2 disabled:opacity-50"
                            >
                                {loading ? (
                                    <>
                                        <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                        <span>Testing...</span>
                                    </>
                                ) : (
                                    <>
                                        <span>▶</span>
                                        <span>Run Test</span>
                                    </>
                                )}
                            </button>
                        </div>
                    </div>
                </div>

                {/* Tabs switcher */}
                <div className="flex border-b border-white/10">
                    <button
                        onClick={() => setActiveTab('iframe')}
                        className={`px-6 py-3 text-sm font-bold transition-all relative ${
                            activeTab === 'iframe' ? 'text-white' : 'text-gray-400 hover:text-gray-200'
                        }`}
                    >
                        📺 Live Iframe Player
                        {activeTab === 'iframe' && (
                            <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-red-600 rounded-full" />
                        )}
                    </button>
                    <button
                        onClick={() => setActiveTab('api')}
                        className={`px-6 py-3 text-sm font-bold transition-all relative flex items-center gap-2 ${
                            activeTab === 'api' ? 'text-white' : 'text-gray-400 hover:text-gray-200'
                        }`}
                    >
                        🔐 Encrypted API Response
                        {httpStatus && (
                            <span
                                className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${
                                    httpStatus === 200
                                        ? 'bg-emerald-500/20 text-emerald-400'
                                        : 'bg-red-500/20 text-red-400'
                                }`}
                            >
                                {httpStatus}
                            </span>
                        )}
                        {activeTab === 'api' && (
                            <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-red-600 rounded-full" />
                        )}
                    </button>
                    <button
                        onClick={() => setActiveTab('guide')}
                        className={`px-6 py-3 text-sm font-bold transition-all relative ${
                            activeTab === 'guide' ? 'text-white' : 'text-gray-400 hover:text-gray-200'
                        }`}
                    >
                        📖 Integration Guide
                        {activeTab === 'guide' && (
                            <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-red-600 rounded-full" />
                        )}
                    </button>
                </div>

                {/* TAB 1: LIVE IFRAME EMBED */}
                {activeTab === 'iframe' && (
                    <div className="space-y-6">
                        {/* Device view switcher */}
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <span className="text-xs text-gray-400 font-bold">Simulate Device:</span>
                                <div className="flex bg-white/5 rounded-lg p-1 border border-white/5">
                                    <button
                                        onClick={() => setDeviceView('desktop')}
                                        className={`px-3 py-1 rounded text-xs font-bold transition-colors ${
                                            deviceView === 'desktop' ? 'bg-white/20 text-white' : 'text-gray-400'
                                        }`}
                                    >
                                        Desktop (100%)
                                    </button>
                                    <button
                                        onClick={() => setDeviceView('tablet')}
                                        className={`px-3 py-1 rounded text-xs font-bold transition-colors ${
                                            deviceView === 'tablet' ? 'bg-white/20 text-white' : 'text-gray-400'
                                        }`}
                                    >
                                        Tablet (768px)
                                    </button>
                                    <button
                                        onClick={() => setDeviceView('mobile')}
                                        className={`px-3 py-1 rounded text-xs font-bold transition-colors ${
                                            deviceView === 'mobile' ? 'bg-white/20 text-white' : 'text-gray-400'
                                        }`}
                                    >
                                        Mobile (400px)
                                    </button>
                                </div>
                            </div>

                            <a
                                href={currentEmbedUrl}
                                target="_blank"
                                rel="noreferrer"
                                className="text-xs font-bold text-red-400 hover:text-red-300 flex items-center gap-1.5"
                            >
                                Open in new window ↗
                            </a>
                        </div>

                        {/* Player Frame Container */}
                        <div className="flex justify-center">
                            <div
                                className={`w-full bg-black rounded-2xl overflow-hidden border border-white/10 shadow-2xl transition-all duration-300 aspect-video ${
                                    deviceView === 'mobile'
                                        ? 'max-w-sm'
                                        : deviceView === 'tablet'
                                        ? 'max-w-2xl'
                                        : 'max-w-full'
                                }`}
                            >
                                <iframe
                                    key={currentEmbedUrl}
                                    src={currentEmbedUrl}
                                    className="w-full h-full border-0"
                                    allowFullScreen
                                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                                />
                            </div>
                        </div>

                        {/* Iframe Code Box */}
                        <div className="p-5 rounded-2xl bg-[#111118] border border-white/10 space-y-3">
                            <div className="flex items-center justify-between">
                                <span className="text-xs font-bold text-gray-300">
                                    HTML Iframe Embed Code for your other websites:
                                </span>
                                <button
                                    onClick={() => copyToClipboard(iframeSnippet, 'iframe')}
                                    className="px-3 py-1.5 rounded-lg bg-red-600 hover:bg-red-500 text-xs font-bold text-white transition-colors"
                                >
                                    {copiedKey === 'iframe' ? '✓ Copied!' : 'Copy Code'}
                                </button>
                            </div>
                            <pre className="p-4 rounded-xl bg-black/60 border border-white/5 font-mono text-xs text-green-300 overflow-x-auto whitespace-pre-wrap break-all">
                                {iframeSnippet}
                            </pre>
                        </div>
                    </div>
                )}

                {/* TAB 2: ENCRYPTED API RESPONSE */}
                {activeTab === 'api' && (
                    <div className="space-y-6">
                        {/* API Stats Overview */}
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                            <div className="p-4 rounded-xl bg-[#111118] border border-white/10">
                                <span className="text-[11px] font-bold uppercase text-gray-500">Status</span>
                                <p className="text-lg font-black mt-1 text-emerald-400">
                                    {httpStatus ? `${httpStatus} OK` : 'Ready'}
                                </p>
                            </div>
                            <div className="p-4 rounded-xl bg-[#111118] border border-white/10">
                                <span className="text-[11px] font-bold uppercase text-gray-500">Latency</span>
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
                                <span className="text-[11px] font-bold uppercase text-gray-500">Encryption</span>
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
                                            🔒 Protected Token (Source is hidden)
                                        </span>
                                        <span className="text-[11px] text-gray-400">Valid for 2 Hours</span>
                                    </div>
                                    <button
                                        onClick={() => copyToClipboard(apiResponse.token!, 'token')}
                                        className="text-xs text-purple-300 hover:text-white font-bold underline"
                                    >
                                        {copiedKey === 'token' ? '✓ Copied Token' : 'Copy Token'}
                                    </button>
                                </div>
                                <p className="font-mono text-xs text-purple-200/80 break-all bg-black/50 p-3 rounded-lg border border-purple-500/20">
                                    {apiResponse.token}
                                </p>
                            </div>
                        )}

                        {/* Playback URL Direct link */}
                        {apiResponse?.playbackUrl && (
                            <div className="p-5 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-between gap-4">
                                <div className="truncate">
                                    <span className="text-xs font-bold text-gray-400 block mb-1">
                                        Direct Tunneled Playback URL (For Video Players / Hls.js / ExoPlayer):
                                    </span>
                                    <code className="text-xs text-blue-400 font-mono truncate block">
                                        {apiResponse.playbackUrl}
                                    </code>
                                </div>
                                <a
                                    href={apiResponse.playbackUrl}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="px-4 py-2 bg-blue-600 hover:bg-blue-500 rounded-xl text-xs font-bold whitespace-nowrap"
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
                                    onClick={() =>
                                        copyToClipboard(JSON.stringify(apiResponse, null, 2), 'json')
                                    }
                                    className="px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-xs font-bold text-white transition-colors"
                                >
                                    {copiedKey === 'json' ? '✓ Copied JSON!' : 'Copy JSON'}
                                </button>
                            </div>
                            <pre className="p-4 rounded-xl bg-black/60 border border-white/5 font-mono text-xs text-amber-200 overflow-x-auto whitespace-pre-wrap break-all max-h-96">
                                {apiResponse
                                    ? JSON.stringify(apiResponse, null, 2)
                                    : '// Click "Run Test" above to inspect response'}
                            </pre>
                        </div>
                    </div>
                )}

                {/* TAB 3: INTEGRATION GUIDE */}
                {activeTab === 'guide' && (
                    <div className="space-y-6">
                        <div className="p-6 rounded-2xl bg-[#111118] border border-white/10 space-y-6">
                            <div>
                                <h3 className="text-base font-bold text-white mb-2">1. Quick HTML Iframe (Zero Coding)</h3>
                                <p className="text-xs text-gray-400 mb-3">
                                    Paste this on WordPress, Blogger, or any custom website:
                                </p>
                                <pre className="p-4 rounded-xl bg-black/60 border border-white/5 font-mono text-xs text-green-300 overflow-x-auto">
{`<iframe 
  src="${typeof window !== 'undefined' ? window.location.origin : 'https://nexiplay.vercel.app'}/embed/rr?slug=naruto&season=1&episode=1" 
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
{`const res = await fetch('https://nexiplay.vercel.app/api/v1/anime/stream?slug=solo-leveling&season=1&episode=1');
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
                    </div>
                )}
            </div>
        </div>
    );
}
