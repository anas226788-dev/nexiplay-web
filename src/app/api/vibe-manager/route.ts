import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { fetchTmdbByMoodGenres, searchTmdb, getExistingDatabaseCatalog, normalizeTitle } from '@/lib/tmdb';

export const dynamic = 'force-dynamic';

async function getAvailableOpenRouterModels() {
    const envModels = (process.env.OPENROUTER_FREE_MODELS || process.env.OPENROUTER_MODELS || '')
        .split(',')
        .map(v => v.trim())
        .filter(Boolean);
    if (envModels.length) return envModels;

    try {
        const { data } = await supabase.from('chatbot_settings').select('openrouter_models').single();
        if (typeof data?.openrouter_models === 'string') {
            return data.openrouter_models.split(',').map((v: string) => v.trim()).filter(Boolean);
        }
    } catch { /* fallback */ }

    return ['google/gemini-2.5-flash', 'meta-llama/llama-3.3-70b-instruct', 'google/gemma-4-31b-it:free'];
}

type ChatMsg = { role: 'system' | 'user'; content: string };
type CatalogTitle = { id: string; title: string; type: string; release_year: number | null; description: string | null; poster_url: string | null; slug: string; genres: string[] };

interface EmotionProfileData {
    id: string;
    label: string;
    genres: string[];
    tmdbKeywords: string[];
    replyEn: string;
    replyBn: string;
}

const EMOTIONAL_MAP: Record<string, EmotionProfileData> = {
    heartbreak: {
        id: 'thoughtful',
        label: 'Heartbreak & Healing',
        genres: ['drama', 'romance', 'animation'],
        tmdbKeywords: ['healing', 'heartbreak', 'emotional romance', 'melodrama'],
        replyEn: "I understand how heavy things feel right now. A deeply heartfelt, emotional story can bring comfort and catharsis. Here is a thoughtful mix handpicked for you.",
        replyBn: "মন যখন ভারী থাকে, তখন এমন কিছু গল্প দরকার যা ভেতরটা ছুঁয়ে যায় এবং কিছুটা স্বস্তি দেয়। তোমার অনুভূতির সাথে মিলে এমন কিছু গল্প বেছে নিয়েছি।"
    },
    cozy: {
        id: 'cozy',
        label: 'Cozy & Comforting',
        genres: ['animation', 'family', 'comedy', 'drama'],
        tmdbKeywords: ['wholesome', 'friendship', 'feel good anime', 'slice of life'],
        replyEn: "You are never truly alone when lost in a warm, heartwarming world. Here are comforting stories filled with companionship and warmth.",
        replyBn: "একাকীত্ব বা ক্লান্তি দূর করার জন্য এক কাপ গরম চা আর কিছু মন ভালো করা ভালোবাসার গল্পই যথেষ্ট। এই গল্পগুলো তোমাকে উষ্ণতা ও সঙ্গ দেবে।"
    },
    stress: {
        id: 'feel-good',
        label: 'Stress Relief & Laughs',
        genres: ['comedy', 'family', 'animation'],
        tmdbKeywords: ['comedy', 'laugh out loud', 'hilarious', 'breezy'],
        replyEn: "Time to take a deep breath and unwind. Here are lighthearted, laugh-out-loud picks to melt all the stress away.",
        replyBn: "দিনের সমস্ত চাপ ও ক্লান্তি ভুলে প্রাণ খুলে হাসার সময় এখন! তোমার স্ট্রেস দূর করতে এই হাসির ও হালকা মেজাজের গল্পগুলো পারফেক্ট।"
    },
    hype: {
        id: 'adventure',
        label: 'High-Octane Hype',
        genres: ['action', 'adventure', 'fantasy', 'sci-fi'],
        tmdbKeywords: ['action thriller', 'superhero', 'epic adventure', 'intense'],
        replyEn: "Say goodbye to boredom! Here are pulse-pounding, high-energy picks guaranteed to keep you on the edge of your seat from minute one.",
        replyBn: "একঘেয়েমি দূর করতে দারুণ থ্রিল আর হাই-ভোল্টেজ রোমাঞ্চের চেয়ে ভালো কিছু নেই! উপভোগ করো এই ধামাকাদার গল্পগুলো।"
    },
    mystery: {
        id: 'thoughtful',
        label: 'Mind-Bending & Introspective',
        genres: ['mystery', 'science-fiction', 'drama', 'thriller'],
        tmdbKeywords: ['plot twist', 'psychological thriller', 'mystery', 'sci-fi'],
        replyEn: "Here are clever, mind-bending stories rich in intrigue and unforgettable plot twists to provoke your mind.",
        replyBn: "রহস্য আর দারুণ সব প্লট টুইস্টে ভরা গল্প যা তোমাকে পুরো সময় চিন্তা করতে বাধ্য করবে। এই গভীর গল্পগুলো তোমার জন্যই।"
    }
};

function analyzeEmotion(prompt: string, profileId?: string): { profile: EmotionProfileData; isBangla: boolean } {
    const text = prompt.toLowerCase();
    const isBangla = /[\u0980-\u09FF]/.test(prompt) || /\b(mon|kharap|kosto|kanna|kadte|bhalo|valo|pera|haste|ekla|ekaki|chai|lagche|lagtese|koro|amar|tomar|kanna)\b/i.test(prompt);

    if (/\b(sad|cry|crying|heartbreak|heartbroken|breakup|pain|hurting|grief|tearjerker|loss|mourn|depressed|mon kharap|kosto|kanna|kadte|dukkho)\b/i.test(text)) {
        return { profile: EMOTIONAL_MAP.heartbreak, isBangla };
    }
    if (/\b(lonely|alone|empty|isolated|warmth|comfort|cozy|hug|wholesome|ekla|ekaki|eka)\b/i.test(text)) {
        return { profile: EMOTIONAL_MAP.cozy, isBangla };
    }
    if (/\b(stress|anxious|anxiety|burnout|tired|exhausted|laugh|chill|funny|comedy|relax|unwind|pera|haste|clant)\b/i.test(text)) {
        return { profile: EMOTIONAL_MAP.stress, isBangla };
    }
    if (/\b(bored|boring|hype|thrill|action|adrenaline|insane|badass|epic|maramari|bore|chomok)\b/i.test(text)) {
        return { profile: EMOTIONAL_MAP.hype, isBangla };
    }
    if (/\b(mind bending|deep|twist|mystery|puzzle|sci-fi|philosophy|think|dark)\b/i.test(text)) {
        return { profile: EMOTIONAL_MAP.mystery, isBangla };
    }

    if (profileId && profileId !== 'auto') {
        if (profileId === 'feel-good') return { profile: EMOTIONAL_MAP.stress, isBangla };
        if (profileId === 'adventure') return { profile: EMOTIONAL_MAP.hype, isBangla };
        if (profileId === 'thoughtful') return { profile: EMOTIONAL_MAP.mystery, isBangla };
        if (profileId === 'cozy') return { profile: EMOTIONAL_MAP.cozy, isBangla };
    }

    return { profile: EMOTIONAL_MAP.stress, isBangla };
}

async function postChat(url: string, headers: Record<string, string>, body: Record<string, unknown>) {
    const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...headers },
        body: JSON.stringify(body),
        signal: AbortSignal.timeout(9000),
        cache: 'no-store'
    });
    if (!response.ok) throw new Error(`Model request failed (${response.status})`);
    const data = await response.json();
    const content = data?.choices?.[0]?.message?.content;
    if (typeof content !== 'string' || !content.trim()) throw new Error('Empty model response');
    return content.trim();
}

async function generate(prompt: string, emotion: EmotionProfileData, isBangla: boolean, candidates: CatalogTitle[]) {
    const compactTitles = candidates.map(({ id, title, type, release_year, description, genres }) => ({
        id,
        title,
        type,
        year: release_year,
        genres,
        synopsis: description?.slice(0, 160) ?? ''
    }));

    const messages: ChatMsg[] = [
        {
            role: 'system',
            content: `You are Nexiplay Vibe Manager, an emotionally empathetic cinema and anime recommender.
You deeply understand human emotions, psychological states (sadness, heartbreak, burnout, loneliness, excitement, nostalgia), and cultural nuances (including Bengali/Banglish phrases like "mon kharap", "pera lagche", "kanna korte chai").

Rules:
1. First, craft an empathetic, warm, friendly 1-sentence response directly acknowledging their feeling ${isBangla ? 'in Bengali/Bangla' : 'in English'}.
2. Then, pick 3 to 6 candidate IDs from the supplied catalog whose emotional arc and narrative tone best fit their feeling.
3. Return ONLY valid JSON: {"message": "one empathetic friendly sentence", "ids": ["catalog-id", ...]}. Never invent IDs.`
        },
        {
            role: 'user',
            content: JSON.stringify({
                detectedEmotion: emotion.label,
                userPrompt: prompt,
                catalog: compactTitles
            })
        },
    ];

    const apiKey = process.env.OPENROUTER_API_KEY?.trim();
    const models = await getAvailableOpenRouterModels();
    if (apiKey && models.length) {
        for (const model of models.slice(0, 6)) {
            try {
                return await postChat('https://openrouter.ai/api/v1/chat/completions', {
                    Authorization: `Bearer ${apiKey}`
                }, {
                    model,
                    messages,
                    max_tokens: 350,
                    temperature: 0.5
                });
            } catch (error) {
                console.warn('[Vibe Manager] OpenRouter model failed, trying next:', error instanceof Error ? error.message : 'unknown');
            }
        }
    }

    const groqKey = process.env.GROQ_API_KEY?.trim();
    if (groqKey) {
        try {
            return await postChat('https://api.groq.com/openai/v1/chat/completions', {
                Authorization: `Bearer ${groqKey}`
            }, {
                model: 'llama-3.3-70b-versatile',
                messages,
                max_tokens: 350,
                temperature: 0.5
            });
        } catch (error) {
            console.warn('[Vibe Manager] Groq fallback failed:', error instanceof Error ? error.message : 'unknown');
        }
    }

    return null;
}

function emotionalFallback(prompt: string, emotion: EmotionProfileData, isBangla: boolean, candidates: CatalogTitle[]) {
    const rawTerms = `${prompt} ${emotion.genres.join(' ')} ${emotion.tmdbKeywords.join(' ')}`.toLowerCase();
    const terms = rawTerms.split(/[^a-z0-9]+/).filter(t => t.length > 2);

    const ranked = candidates.map(item => {
        let score = 0;
        const itemGenres = item.genres.map(g => g.toLowerCase());
        for (const g of emotion.genres) {
            if (itemGenres.includes(g)) score += 4;
        }

        const text = `${item.title} ${item.description || ''}`.toLowerCase();
        for (const term of terms) {
            if (text.includes(term)) score += 2;
        }

        return { item, score };
    }).sort((a, b) => b.score - a.score || (b.item.release_year ?? 0) - (a.item.release_year ?? 0));

    return {
        message: isBangla ? emotion.replyBn : emotion.replyEn,
        ids: ranked.slice(0, 6).map(({ item }) => item.id)
    };
}

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const prompt = typeof body?.prompt === 'string' ? body.prompt.trim().slice(0, 240) : '';
        const profileId = typeof body?.profileId === 'string' ? body.profileId.trim() : 'auto';
        const format = typeof body?.format === 'string' ? body.format : 'all';

        if (!prompt && (!profileId || profileId === 'auto')) {
            return NextResponse.json({ error: 'Please describe how you are feeling or what you want to watch.' }, { status: 400 });
        }

        // Detect emotional profile and language
        const { profile: emotion, isBangla } = analyzeEmotion(prompt, profileId);

        // Fetch DB categories, catalog index for deduplication, and TMDB vibe titles in parallel
        const [categoriesRes, dbCatalog, tmdbMoodTitles] = await Promise.all([
            supabase.from('categories').select('id, slug').in('slug', emotion.genres),
            getExistingDatabaseCatalog(),
            fetchTmdbByMoodGenres(emotion.genres, format as any, 1),
        ]);

        const categories = categoriesRes.data ?? [];
        const categoryIds = categories.map((item: { id: string }) => item.id);
        const { data: relations } = categoryIds.length
            ? await supabase.from('movie_categories').select('movie_id, category_id').in('category_id', categoryIds)
            : { data: [] };

        const genreByMovie = new Map<string, string[]>();
        const slugByCategory = new Map(categories.map((item: { id: string; slug: string }) => [item.id, item.slug]));
        for (const relation of relations ?? []) {
            const row = relation as { movie_id: string; category_id: string };
            const slug = slugByCategory.get(row.category_id);
            if (slug) genreByMovie.set(row.movie_id, [...(genreByMovie.get(row.movie_id) ?? []), slug]);
        }

        let query = supabase.from('movies').select('id, title, type, release_year, description, poster_url, slug').eq('is_adult', false).order('created_at', { ascending: false }).limit(120);
        if (format !== 'all') query = query.eq('type', format);
        const { data: rows, error } = await query;
        if (error) throw error;

        // Search TMDB for prompt or emotion keywords
        let promptTmdbTitles: any[] = [];
        const searchQuery = prompt.length >= 3 && !/^(something|good|any|movie|anime|series)\b/i.test(prompt)
            ? prompt
            : emotion.tmdbKeywords[0];

        try {
            promptTmdbTitles = await searchTmdb(searchQuery);
        } catch { /* ignore */ }

        // Map local candidates
        const localCandidates: CatalogTitle[] = (rows ?? []).map(row => ({
            ...row,
            genres: genreByMovie.get(row.id) ?? []
        })).filter(row => row.genres.some(genre => emotion.genres.includes(genre))).slice(0, 80);

        const candidateMovieMap = new Map<string, any>();
        const seenIds = new Set<string>();
        const seenTitles = new Set<string>();

        for (const c of localCandidates) {
            seenIds.add(c.id);
            seenTitles.add(normalizeTitle(c.title));
            candidateMovieMap.set(c.id, c);
        }

        // Merge TMDB titles with deduplication
        const rawTmdbList = [...promptTmdbTitles, ...tmdbMoodTitles];
        const tmdbCandidates: CatalogTitle[] = [];

        for (const item of rawTmdbList) {
            if (format !== 'all' && item.type !== format) continue;
            const norm = normalizeTitle(item.title);
            const rawTmdbId = item.tmdb_id || item.id.replace(/^tmdb-/, '');

            if (seenIds.has(item.id)) continue;
            if (rawTmdbId && dbCatalog.existingTmdbIds.has(rawTmdbId)) continue;
            if (seenTitles.has(norm) || dbCatalog.existingTitles.has(norm)) continue;

            seenIds.add(item.id);
            seenTitles.add(norm);

            const candidateItem: CatalogTitle = {
                id: item.id,
                title: item.title,
                type: item.type,
                release_year: item.release_year,
                description: item.description,
                poster_url: item.poster_url,
                slug: item.slug,
                genres: (item as any).genres || emotion.genres,
            };
            tmdbCandidates.push(candidateItem);
            candidateMovieMap.set(item.id, item);
        }

        const candidates: CatalogTitle[] = [...localCandidates, ...tmdbCandidates].slice(0, 100);

        if (!candidates.length) {
            return NextResponse.json({
                message: isBangla
                    ? 'এই অনুভূতির জন্য এখনো ক্যাটালগে সরাসরি ম্যাচিং টাইটেল পাওয়া যায়নি। অন্য কোনো মুড বা ফরম্যাট ট্রাই করে দেখতে পারো।'
                    : 'I couldn’t find an exact match in the catalog yet. Try another emotion or format.',
                ids: [],
                movies: []
            });
        }

        let result: { message: string; ids: string[] } | null = null;
        try {
            const raw = await generate(prompt || emotion.label, emotion, isBangla, candidates);
            if (raw) {
                const parsed = JSON.parse(raw.replace(/^```(?:json)?\s*|\s*```$/g, ''));
                if (parsed && typeof parsed.message === 'string' && Array.isArray(parsed.ids)) {
                    const validIds = new Set(candidates.map(item => item.id));
                    result = {
                        message: parsed.message.slice(0, 260),
                        ids: parsed.ids.filter((id: unknown): id is string => typeof id === 'string' && validIds.has(id)).slice(0, 6)
                    };
                }
            }
        } catch (error) {
            console.warn('[Vibe Manager] Fallback to emotional engine after model issue:', error instanceof Error ? error.message : 'unknown');
        }

        result ??= emotionalFallback(prompt, emotion, isBangla, candidates);

        const selectedMovies = (result.ids || [])
            .map(id => candidateMovieMap.get(id))
            .filter(Boolean);

        return NextResponse.json({
            ...result,
            movies: selectedMovies,
        }, { headers: { 'Cache-Control': 'no-store' } });
    } catch (error) {
        console.error('[Vibe Manager] Recommendation failed:', error);
        return NextResponse.json({ error: 'The mix is unavailable right now. Please try again.' }, { status: 503 });
    }
}
