'use client';

import { useMemo, useState } from 'react';
import type { FormEvent } from 'react';
import MovieCard from '@/components/MovieCard';
import type { MoodProfile } from '@/app/(site)/mood/page';
import type { Movie } from '@/lib/types';

type MoodMovie = Movie & { genres: string[] };
type Format = 'all' | 'movie' | 'series' | 'anime';

const moodColors = [
    'from-amber-400/20 via-orange-500/10 to-transparent border-amber-400/30 text-amber-300',
    'from-violet-500/20 via-indigo-500/10 to-transparent border-violet-400/30 text-violet-300',
    'from-sky-400/20 via-blue-500/10 to-transparent border-sky-400/30 text-sky-300',
    'from-emerald-400/20 via-teal-500/10 to-transparent border-emerald-400/30 text-emerald-300',
];

const QUICK_EMOTIONS = [
    { label: '💔 Heartbroken & Healing', prompt: 'Mon kharap, breakup hoyeche, ektu comforting emotional story chai' },
    { label: '😂 Stress Relief & Laughs', prompt: 'Very stressed and tired, want to laugh out loud with family or friends' },
    { label: '⚡ High Hype & Action', prompt: 'Bored out of my mind, give me crazy hype thrilling action and adrenaline' },
    { label: '🛋️ Cozy & Comforting', prompt: 'Feeling lonely and quiet at night, want a wholesome warm anime or movie' },
    { label: '🌌 Mind-Bending Twists', prompt: 'Want a deep philosophical mystery with insane plot twists that will blow my mind' },
];

export default function MoodPicker({ profiles, movies }: { profiles: MoodProfile[]; movies: MoodMovie[] }) {
    const [activeMood, setActiveMood] = useState<string | null>(null);
    const [format, setFormat] = useState<Format>('all');
    const [surprise, setSurprise] = useState(false);
    const [askText, setAskText] = useState('');
    const [askLoading, setAskLoading] = useState(false);
    const [askError, setAskError] = useState('');
    const [askReply, setAskReply] = useState<{ message: string; ids: string[]; movies?: MoodMovie[] } | null>(null);

    const profile = profiles.find(item => item.id === activeMood) ?? null;

    async function submitAskNexiplay(promptToSubmit?: string) {
        const query = (promptToSubmit ?? askText).trim();
        if (!query || askLoading) return;

        setAskLoading(true);
        setAskError('');
        setAskReply(null);

        try {
            const response = await fetch('/api/vibe-manager', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    prompt: query,
                    profileId: activeMood || 'auto',
                    format
                })
            });

            const payload = await response.json();
            if (!response.ok) throw new Error(payload.error || 'Could not create a mix right now.');

            setAskReply({
                message: payload.message,
                ids: payload.ids ?? [],
                movies: payload.movies ?? []
            });
        } catch (error) {
            setAskError(error instanceof Error ? error.message : 'Could not create a mix right now.');
        } finally {
            setAskLoading(false);
        }
    }

    function handleFormSubmit(event: FormEvent<HTMLFormElement>) {
        event.preventDefault();
        submitAskNexiplay();
    }

    function handleQuickEmotion(prompt: string) {
        setAskText(prompt);
        submitAskNexiplay(prompt);
    }

    // Curated picks for active vibe, or fallback to top trending if no vibe selected
    const picks = useMemo(() => {
        const filtered = movies.filter(movie => format === 'all' || movie.type === format);

        if (!profile) {
            return filtered.slice(0, 12);
        }

        const ranked = filtered
            .map(movie => ({
                movie,
                match: movie.genres.reduce((score, genre) => score + (profile.genres.includes(genre) ? 1 : 0), 0),
            }))
            .filter(item => item.match > 0)
            .sort((a, b) => b.match - a.match || Date.parse(b.movie.created_at) - Date.parse(a.movie.created_at));

        if (surprise) {
            const seed = Math.floor(Date.now() / 60_000);
            ranked.sort((a, b) => ((a.movie.id.charCodeAt(0) + seed) % 17) - ((b.movie.id.charCodeAt(0) + seed) % 17));
        }

        return ranked.slice(0, 12).map(item => item.movie);
    }, [format, movies, profile, surprise]);

    return (
        <div className="container mx-auto min-h-[75vh] px-4 py-8 md:py-14 max-w-6xl space-y-10">
            {/* Header */}
            <header className="mx-auto max-w-3xl text-center space-y-3">
                <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-violet-500/15 text-violet-300 border border-violet-500/30 text-xs font-black uppercase tracking-widest">
                    <span className="w-2 h-2 rounded-full bg-violet-400 animate-pulse"></span>
                    <span>AI Vibe Check & Emotional Match</span>
                </div>
                <h1 className="text-3xl sm:text-5xl font-black text-white tracking-tight">
                    How Are You Feeling Today?
                </h1>
                <p className="text-sm sm:text-base text-gray-400 max-w-2xl mx-auto leading-relaxed">
                    Tell Nexiplay how you feel or pick a vibe below. Our AI understands your emotions and curates the perfect stories for your mood.
                </p>
            </header>

            {/* AI Emotional Discovery Hero Box (ALWAYS VISIBLE RIGHT FROM THE START) */}
            <section className="relative rounded-3xl bg-gradient-to-br from-[#161828]/95 via-[#0e101d] to-[#0A0B12] border border-violet-500/25 p-5 sm:p-7 backdrop-blur-2xl shadow-2xl shadow-violet-950/30 space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-white/[0.08] pb-3">
                    <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-xl bg-violet-600/25 text-violet-400 border border-violet-500/30 flex items-center justify-center shrink-0">
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
                            </svg>
                        </div>
                        <div>
                            <h2 className="text-sm sm:text-base font-extrabold text-white flex items-center gap-2">
                                <span>Ask Nexiplay AI</span>
                                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-violet-500/20 text-violet-300 border border-violet-500/30 uppercase tracking-wider">
                                    Emotional Engine
                                </span>
                            </h2>
                            <p className="text-xs text-gray-400">Understands how you feel in English, Bangla & Banglish</p>
                        </div>
                    </div>
                </div>

                <form onSubmit={handleFormSubmit} className="space-y-3">
                    <div className="relative flex flex-col sm:flex-row gap-2.5">
                        <input
                            id="vibe-prompt"
                            maxLength={240}
                            value={askText}
                            onChange={e => setAskText(e.target.value)}
                            placeholder="e.g. Mon kharap ektu comforting kisu chai / Heartbroken / Stressed out, need to laugh..."
                            className="min-w-0 flex-1 rounded-2xl border border-white/10 bg-black/40 px-4 py-3.5 text-sm sm:text-base text-white outline-none placeholder:text-gray-500 focus:border-violet-400 transition-all shadow-inner"
                        />
                        <button
                            type="submit"
                            disabled={askLoading || !askText.trim()}
                            className="px-6 py-3.5 rounded-2xl bg-gradient-to-r from-violet-600 via-purple-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white font-extrabold text-sm transition-all shadow-lg shadow-violet-600/30 hover:scale-[1.02] active:scale-[0.98] disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2 shrink-0 cursor-pointer"
                        >
                            {askLoading ? (
                                <>
                                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                                    <span>Matching Vibe...</span>
                                </>
                            ) : (
                                <>
                                    <span>✦ Find My Vibe</span>
                                </>
                            )}
                        </button>
                    </div>

                    {/* Quick Emotion Chips */}
                    <div className="space-y-1.5 pt-1">
                        <span className="text-[11px] font-bold text-gray-400 uppercase tracking-wider block">
                            Quick Mood Starters:
                        </span>
                        <div className="flex flex-wrap gap-2">
                            {QUICK_EMOTIONS.map(chip => (
                                <button
                                    type="button"
                                    key={chip.label}
                                    onClick={() => handleQuickEmotion(chip.prompt)}
                                    className="px-3 py-1.5 rounded-xl bg-white/[0.04] hover:bg-violet-600/20 text-gray-300 hover:text-white border border-white/10 hover:border-violet-500/40 text-xs font-semibold transition-all cursor-pointer"
                                >
                                    {chip.label}
                                </button>
                            ))}
                        </div>
                    </div>

                    {askError && (
                        <p role="alert" className="p-3 bg-red-500/10 border border-red-500/30 rounded-xl text-xs text-red-300">
                            {askError}
                        </p>
                    )}
                </form>

                {/* AI Empathetic Response & Results */}
                {askReply && (
                    <div className="mt-4 rounded-2xl border border-violet-500/30 bg-black/40 p-4 sm:p-6 space-y-4">
                        <div className="flex items-start gap-3 p-3.5 rounded-xl bg-violet-950/30 border border-violet-500/20">
                            <span className="text-xl">✨</span>
                            <div className="space-y-1">
                                <span className="text-[10px] font-black uppercase tracking-widest text-violet-400">
                                    Nexiplay Vibe Curator
                                </span>
                                <p className="text-sm font-medium leading-relaxed text-gray-100">
                                    {askReply.message}
                                </p>
                            </div>
                        </div>

                        {(() => {
                            const replyMovies: MoodMovie[] = (askReply.movies && askReply.movies.length > 0)
                                ? askReply.movies
                                : askReply.ids.map(id => movies.find(m => m.id === id)).filter((m): m is MoodMovie => Boolean(m));

                            if (!replyMovies.length) return null;

                            return (
                                <div className="space-y-3">
                                    <h3 className="text-xs font-bold uppercase tracking-wider text-gray-400">
                                        Handpicked Stories For Your Mood:
                                    </h3>
                                    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
                                        {replyMovies.map(movie => (
                                            <MovieCard key={movie.id} movie={movie} />
                                        ))}
                                    </div>
                                </div>
                            );
                        })()}
                    </div>
                )}
            </section>

            {/* Vibe Selection & Format Filter Controls */}
            <div className="space-y-4">
                <div className="flex items-center justify-between">
                    <span className="text-xs font-bold uppercase tracking-wider text-gray-400">
                        Or Explore By Classic Vibes:
                    </span>
                    {activeMood && (
                        <button
                            onClick={() => setActiveMood(null)}
                            className="text-xs text-violet-400 hover:underline cursor-pointer"
                        >
                            Reset Vibe
                        </button>
                    )}
                </div>

                {/* 4 Classic Vibe Cards */}
                <section aria-label="Choose a vibe" className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    {profiles.map((item, index) => {
                        const isSelected = activeMood === item.id;
                        return (
                            <button
                                key={item.id}
                                onClick={() => setActiveMood(isSelected ? null : item.id)}
                                aria-pressed={isSelected}
                                className={`
                                    group rounded-2xl border p-4 sm:p-5 text-left transition-all duration-300 hover:-translate-y-0.5 focus-visible:outline-none cursor-pointer
                                    bg-gradient-to-br ${moodColors[index % moodColors.length]}
                                    ${isSelected ? 'ring-2 ring-violet-400 shadow-[0_0_30px_rgba(139,92,246,0.35)] scale-[1.02]' : 'hover:border-white/30'}
                                `}
                            >
                                <span className="mb-4 block text-2xl" aria-hidden="true">
                                    {['☀️', '⚡', '🌙', '🍃'][index % 4]}
                                </span>
                                <span className="block font-black text-white text-base">{item.label}</span>
                                <span className="mt-1 block line-clamp-2 text-xs text-gray-300/80 leading-relaxed">
                                    {item.description}
                                </span>
                            </button>
                        );
                    })}
                </section>

                {/* Format Filter */}
                <section className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-2xl border border-white/10 bg-[#12131F]/80 p-3.5 sm:px-5 backdrop-blur-xl">
                    <span className="text-xs font-bold text-gray-300">Format:</span>
                    <div className="flex flex-wrap gap-2" role="group" aria-label="Filter by format">
                        {([['all', 'All Formats'], ['movie', 'Movies Only'], ['series', 'Series'], ['anime', 'Anime']] as const).map(([val, lbl]) => (
                            <button
                                key={val}
                                onClick={() => setFormat(val)}
                                className={`rounded-full px-3.5 py-1.5 text-xs font-bold transition-all cursor-pointer ${
                                    format === val
                                        ? 'bg-violet-600 text-white shadow-md shadow-violet-600/30'
                                        : 'bg-white/5 text-gray-400 hover:text-white border border-white/10'
                                }`}
                            >
                                {lbl}
                            </button>
                        ))}
                    </div>
                </section>
            </div>

            {/* Curated Results Grid */}
            <section className="space-y-4 pt-2">
                <div className="flex items-center justify-between border-b border-white/[0.08] pb-3">
                    <div>
                        <h2 className="text-xl sm:text-2xl font-black text-white">
                            {profile ? `Picks for ${profile.label}` : 'Trending Across All Vibes'}
                        </h2>
                        <p className="text-xs text-gray-400">
                            {profile ? profile.description : 'Explore top rated movies, series, and anime matching current vibes'}
                        </p>
                    </div>
                    {profile && (
                        <button
                            onClick={() => setSurprise(v => !v)}
                            className={`px-3 py-1.5 rounded-xl border text-xs font-bold transition-all cursor-pointer ${
                                surprise ? 'border-violet-500 bg-violet-600/20 text-white' : 'border-white/10 text-gray-300 hover:bg-white/5'
                            }`}
                        >
                            ✦ {surprise ? 'Surprise On' : 'Mix It Up'}
                        </button>
                    )}
                </div>

                {picks.length > 0 ? (
                    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
                        {picks.map(movie => (
                            <MovieCard key={movie.id} movie={movie} />
                        ))}
                    </div>
                ) : (
                    <div className="rounded-3xl border border-white/10 bg-white/[0.02] p-8 text-center space-y-2">
                        <p className="font-bold text-white">No titles found for this specific filter</p>
                        <p className="text-xs text-gray-400">Try switching format to &quot;All Formats&quot; or select another vibe.</p>
                    </div>
                )}
            </section>
        </div>
    );
}
