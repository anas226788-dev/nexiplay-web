'use client';

import { useEffect, useState } from 'react';

const OFFICIAL_CORE_KEY = 'nxp_live_nexiplay_official_core_prod';

export default function DesiDubEmbedPlayerPage() {
    const [streamUrl, setStreamUrl] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);
    const [notFound, setNotFound] = useState(false);
    const [error, setError] = useState('');
    const [title, setTitle] = useState('');

    const loadStream = () => {
        setLoading(true);
        setNotFound(false);
        setError('');

        const params = new URLSearchParams(window.location.search);
        const slug = params.get('slug') || '';
        const id = params.get('id') || '';
        const titleParam = params.get('title') || '';
        const season = params.get('season') || '1';
        const episode = params.get('episode') || params.get('ep') || '1';
        const server = params.get('server') || 'desidub';
        const apiKey = params.get('apiKey') || params.get('key') || OFFICIAL_CORE_KEY;

        if (!slug && !id && !titleParam) {
            setError('Missing anime title, slug, or id.');
            setLoading(false);
            return;
        }

        const query = new URLSearchParams({
            season,
            episode,
            server,
            apiKey
        });
        if (id) query.set('id', id);
        if (slug) query.set('slug', slug);
        if (titleParam) query.set('title', titleParam);

        fetch(`/api/v1/anime/desidub-stream?${query.toString()}`)
            .then(async res => {
                const data = await res.json();
                if (res.ok && data.success && (data.playbackUrl || data.embedUrl)) {
                    setTitle(data.title || titleParam || slug);
                    setStreamUrl(data.playbackUrl || data.embedUrl);
                } else if (res.status === 404 || data.notFound) {
                    setNotFound(true);
                    setError(data.error || 'Anime / Episode not found on this server.');
                } else {
                    setError(data.error || 'Failed to connect to Nexi Deshi Server.');
                }
            })
            .catch(err => {
                setError(err.message || 'Network error while loading Nexi Deshi Stream.');
            })
            .finally(() => {
                setLoading(false);
            });
    };

    useEffect(() => {
        loadStream();
    }, []);

    return (
        <div className="relative w-full h-full min-h-screen bg-black text-white flex flex-col items-center justify-center p-4 overflow-hidden select-none font-sans">
            {loading && (
                <div className="flex flex-col items-center justify-center space-y-4 animate-fadeIn">
                    <div className="relative w-16 h-16">
                        <div className="absolute inset-0 rounded-full border-4 border-emerald-500/20 animate-ping"></div>
                        <div className="w-16 h-16 rounded-full border-4 border-emerald-500 border-t-transparent animate-spin"></div>
                    </div>
                    <div className="text-center">
                        <h2 className="text-lg font-bold text-emerald-400 tracking-wide">Nexi Deshi Server</h2>
                        <p className="text-xs text-gray-400 mt-1 animate-pulse">Searching & Connecting to Hindi/Deshi Dub Stream...</p>
                    </div>
                </div>
            )}

            {!loading && notFound && (
                <div className="max-w-md w-full bg-zinc-900/90 border border-zinc-800 rounded-2xl p-6 text-center shadow-2xl backdrop-blur-md">
                    <div className="w-16 h-16 mx-auto mb-4 bg-red-500/10 rounded-full flex items-center justify-center border border-red-500/30">
                        <svg className="w-8 h-8 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                        </svg>
                    </div>
                    <h3 className="text-lg font-bold text-white mb-2">Anime Not Found on This Server</h3>
                    <p className="text-sm text-gray-400 mb-6 leading-relaxed">
                        {title ? `"${title}"` : 'This content'} is currently not available in Hindi / Deshi Dub on Nexi Deshi Server.
                    </p>
                    <div className="bg-zinc-800/60 rounded-xl p-3 mb-6 text-xs text-emerald-400 flex items-center justify-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping"></span>
                        Available on: <strong>Server Nexiplay</strong>
                    </div>
                    <button
                        onClick={() => {
                            if (window.parent && window.parent !== window) {
                                window.parent.postMessage({ type: 'SWITCH_SERVER', serverId: 'custom' }, '*');
                            }
                        }}
                        className="w-full py-3 px-4 bg-emerald-500 hover:bg-emerald-600 text-black font-bold rounded-xl transition duration-200 shadow-lg shadow-emerald-500/20 cursor-pointer"
                    >
                        Switch to Server Nexiplay
                    </button>
                </div>
            )}

            {!loading && error && !notFound && (
                <div className="max-w-md w-full bg-zinc-900/90 border border-zinc-800 rounded-2xl p-6 text-center">
                    <h3 className="text-base font-bold text-amber-400 mb-2">Stream Unavailable</h3>
                    <p className="text-xs text-gray-400 mb-4">{error}</p>
                    <button
                        onClick={() => loadStream()}
                        className="px-5 py-2 bg-zinc-800 hover:bg-zinc-700 text-white text-xs font-semibold rounded-lg transition"
                    >
                        Try Again
                    </button>
                </div>
            )}

            {!loading && streamUrl && (
                <iframe
                    src={streamUrl}
                    className="w-full h-full border-0 absolute inset-0"
                    allowFullScreen
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                />
            )}
        </div>
    );
}
