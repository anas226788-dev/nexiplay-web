import { NextRequest } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { searchTmdb } from '@/lib/tmdb';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

const GROQ_API_URL = 'https://api.groq.com/openai/v1/chat/completions';

export interface VisualOption {
    id: string;
    title: string;
    type: 'movie' | 'series' | 'anime' | 'novel';
    release_year: number | string | null;
    poster_url: string | null;
    overview?: string | null;
    slug: string;
    available: boolean;
    watch_url: string;
    tmdb_id?: number | string | null;
    source: 'local' | 'tmdb' | 'novel';
}

interface AIResponse {
    content: string;
    agent: string;
}

interface IntentResult {
    intent: 'search' | 'chat';
    title: string | null;
    confidence: number;
}

const SYSTEM_PROMPT = `You are Nexiplay AI assistant (NexiBot), a smart, friendly, and entertaining companion for Nexiplay (Movies, Series, Anime & Novels platform).

CRITICAL RULE #1 — LANGUAGE MATCHING:
- You MUST ALWAYS reply in the EXACT SAME language the user is writing in.
- If user writes in Bangla (বাংলা), reply in natural, friendly Bangla.
- If user writes in Banglish (Bangla in English alphabet like "kemon acho", "bhai ekta movie bolo"), reply in Banglish.
- If user writes in English, reply in English.
- If user writes in Hindi, reply in Hindi.
- NEVER force English if the user didn't write in English!

CRITICAL RULE #2 — NATURAL CONVERSATION:
- You are a real conversational companion, NOT just a search bot!
- If someone says "hi", "hello", "kemon acho", "tumi ke", "ki koro", chat with them warmly, naturally, and politely!
- If someone asks for recommendations (e.g., "suggest some horror movies", "valo anime bolo"), recommend 3-4 top titles enthusiastically with brief exciting descriptions and tell them they can search any of them to watch!
- If someone asks how to download or use the website, guide them clearly and simply.
- Keep responses engaging, modern, concise, and helpful with fitting emojis.`;

const INTENT_PROMPT = `You are an intent classifier for Nexiplay (Movie, Series, Anime, and Novel platform).
Analyze the user's message and return ONLY a JSON object:
{
  "intent": "chat" | "search",
  "title": string | null
}

Rules:
1. "chat" (General Conversation):
   - Greetings: "hi", "hello", "kemon acho", "assalamualaikum", "yo", "sup"
   - Small talk: "tumi ke", "who are you", "what is your name", "ki koro"
   - Recommendation requests: "suggest some horror movies", "valo anime bolo", "kichu comedy movie daw", "best sci-fi"
   - Questions about downloading/site: "download kivabe korbo", "is it free", "help chai"
   -> In ALL these cases, intent MUST be "chat" and title MUST be null!

2. "search" (Specific Content Request):
   - User names a specific movie, series, anime, or novel by name to find, watch, or download.
   - Examples: "Naruto ase?", "Spider-Man download chai", "Housefull 5", "Attack on Titan season 4", "Dune 2", "Inception"
   - Preserve all sequel/season numbers in the title.
   -> In these cases, intent MUST be "search" and title MUST be the extracted title!`;

// ============================================================
// SUPABASE CLIENTS
// ============================================================
function getSupabase() {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    if (!url || !key) return null;
    return createClient(url, key, {
        auth: { persistSession: false, autoRefreshToken: false },
    });
}

function getSupabaseNovels() {
    const url = process.env.NEXT_PUBLIC_SUPABASE_NOVELS_URL || 'https://lnpkqcvqsppaiafjtzpt.supabase.co';
    const key = process.env.NEXT_PUBLIC_SUPABASE_NOVELS_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxucGtxY3Zxc3BwYWlhZmp0enB0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzU3MjE0NjEsImV4cCI6MjA5MTI5NzQ2MX0.KjxXOCBnS5vQ7bt8_7tFIAC3dnbN7KCZjmF9qFI-YmE';
    return createClient(url, key, {
        auth: { persistSession: false, autoRefreshToken: false },
    });
}

// ============================================================
// AI CALL PROVIDERS (Gemini -> OpenRouter -> Groq -> Local NLP)
// ============================================================

/**
 * 1. Google Gemini Official API
 */
async function callGemini(
    messages: { role: string; content: string }[],
    maxTokens = 800,
    temperature = 0.7
): Promise<AIResponse | null> {
    const geminiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_AI_API_KEY;
    if (!geminiKey) return null;

    try {
        const systemMsg = messages.find(m => m.role === 'system');
        const chatMsgs = messages.filter(m => m.role !== 'system');

        const contents = chatMsgs.map(m => ({
            role: m.role === 'assistant' ? 'model' : 'user',
            parts: [{ text: m.content }]
        }));

        if (contents.length === 0 && systemMsg) {
            contents.push({ role: 'user', parts: [{ text: systemMsg.content }] });
        }

        const payload: any = {
            contents,
            generationConfig: {
                temperature,
                maxOutputTokens: maxTokens,
            }
        };

        if (systemMsg) {
            payload.systemInstruction = {
                parts: [{ text: systemMsg.content }]
            };
        }

        const model = 'gemini-1.5-flash';
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 9000);

        const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${geminiKey}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
            signal: controller.signal
        });
        clearTimeout(timeoutId);

        if (res.ok) {
            const data = await res.json();
            const text = data?.candidates?.[0]?.content?.parts?.[0]?.text?.trim();
            if (text) {
                console.log('[Chat API] ✅ Gemini API success');
                return { content: text, agent: 'gemini-1.5-flash' };
            }
        }
    } catch (err: any) {
        console.warn('[Chat API] Gemini API call error:', err.message);
    }
    return null;
}

/**
 * 2. OpenRouter API
 */
async function callOpenRouter(
    messages: { role: string; content: string }[],
    models: string[],
    maxTokens = 800,
    temperature = 0.7
): Promise<AIResponse | null> {
    const openRouterKey = process.env.OPENROUTER_API_KEY;
    if (!openRouterKey || models.length === 0) return null;

    for (const model of models) {
        try {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 8000);

            const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
                method: 'POST',
                headers: {
                    Authorization: `Bearer ${openRouterKey}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    model,
                    messages,
                    temperature,
                    max_tokens: maxTokens,
                }),
                signal: controller.signal,
            });
            clearTimeout(timeoutId);

            if (res.ok) {
                const data = await res.json();
                const content = data?.choices?.[0]?.message?.content?.trim();
                if (content) {
                    const shortName = model.split('/').pop()?.replace(/:free$/i, '') || model;
                    console.log(`[Chat API] ✅ OpenRouter (${model}) success`);
                    return { content, agent: shortName };
                }
            }
        } catch {
            // continue to next model
        }
    }
    return null;
}

/**
 * 3. Groq API
 */
async function callGroq(
    messages: { role: string; content: string }[],
    maxTokens = 800,
    temperature = 0.7
): Promise<AIResponse | null> {
    const groqKey = process.env.GROQ_API_KEY;
    if (!groqKey) return null;

    try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 7000);

        const res = await fetch(GROQ_API_URL, {
            method: 'POST',
            headers: {
                Authorization: `Bearer ${groqKey}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                model: 'llama-3.3-70b-versatile',
                messages,
                temperature,
                max_tokens: maxTokens,
            }),
            signal: controller.signal,
        });
        clearTimeout(timeoutId);

        if (res.ok) {
            const data = await res.json();
            const content = data?.choices?.[0]?.message?.content?.trim();
            if (content) {
                console.log('[Chat API] ✅ Groq success');
                return { content, agent: 'llama-3.3-70b' };
            }
        }
    } catch {}
    return null;
}

/**
 * Unified Multi-Provider AI Caller
 */
async function fetchAI(
    messages: { role: string; content: string }[],
    maxTokens = 800,
    temperature = 0.7,
    openRouterModels: string[] = []
): Promise<AIResponse> {
    // 1. Gemini
    const geminiRes = await callGemini(messages, maxTokens, temperature);
    if (geminiRes) return geminiRes;

    // 2. OpenRouter
    const openRouterRes = await callOpenRouter(messages, openRouterModels, maxTokens, temperature);
    if (openRouterRes) return openRouterRes;

    // 3. Groq
    const groqRes = await callGroq(messages, maxTokens, temperature);
    if (groqRes) return groqRes;

    // 4. Smart Local Conversational NLP Engine
    const lastUserMessage = [...messages].reverse().find(m => m.role === 'user')?.content || '';
    return generateSmartNLPResponse(lastUserMessage);
}

// ============================================================
// INTENT DETECTION WITH SMART FALLBACK
// ============================================================
async function detectIntentWithAI(message: string, openRouterModels: string[] = []): Promise<IntentResult> {
    const hasKeys = process.env.GEMINI_API_KEY || process.env.OPENROUTER_API_KEY || process.env.GROQ_API_KEY;

    if (hasKeys) {
        try {
            const aiResponse = await fetchAI(
                [
                    { role: 'system', content: INTENT_PROMPT },
                    { role: 'user', content: message }
                ],
                120,
                0.1,
                openRouterModels
            );

            const jsonMatch = aiResponse.content.match(/\{[\s\S]*?\}/);
            if (jsonMatch) {
                const parsed = JSON.parse(jsonMatch[0]);
                return {
                    intent: parsed.intent === 'search' ? 'search' : 'chat',
                    title: parsed.title || null,
                    confidence: 0.9,
                };
            }
        } catch (err) {
            console.warn('[Chat API] AI intent classification fallback:', err);
        }
    }

    return fallbackIntentDetection(message);
}

function fallbackIntentDetection(message: string): IntentResult {
    const lower = message.toLowerCase().trim();

    // 1. Casual Greetings & Social Small Talk -> ALWAYS CHAT
    const casualPatterns = [
        /^(hi|hello|hey|hola|salam|assalamualaikum|namaste|yo|sup|kemon|halo|hai|hoi)[!?.,\s]*$/i,
        /^(kemon acho|ki khobor|bhai kemon|tumi kemon|how are you|what's up|whats up|how r u)/i,
        /^(tumi ke|who are you|tomar nam ki|what is your name|apni ke)/i,
        /^(tumi ki koro|what do you do|help me|sahajjo|help chai)/i,
        /^(thanks|thank you|dhonnobad|shukriya|bye|goodbye|see you|tc)/i,
        /^(ok|okay|accha|haccha|thik ase|achha|hmm|hmmm|haan|yes|no|na|ha|good|nice|valo)/i,
        /^(ki obstha|kire|bolo|shuno|hello bro|hi bro|hey bro)/i
    ];
    if (casualPatterns.some(p => p.test(lower))) {
        return { intent: 'chat', title: null, confidence: 0.98 };
    }

    // 2. Recommendations & Discovery -> ALWAYS CHAT
    const recommendationPatterns = [
        /(recommend|suggest|suggestion|val[ao]|best|top|kichu|kisu|list)\s+(movie|anime|series|drama|natok|uponnash|novel|film)/i,
        /(movie|anime|series|novel|uponnash)\s+(recommend|suggest|bol[ao]|daw|dao|dekhaw)/i,
        /(horror|action|romance|comedy|thriller|sci-fi|adventure|drama)\s+(movie|anime|series|novel)/i,
        /(ki ki|ki|kon kon)\s+(movie|anime|series|novel|natok)\s+(ase|dekhbo|dekha jay)/i
    ];
    if (recommendationPatterns.some(p => p.test(lower))) {
        return { intent: 'chat', title: null, confidence: 0.95 };
    }

    // 3. Website Help / How-To -> ALWAYS CHAT
    const siteHelpPatterns = [
        /(kivabe|how to)\s+(download|watch|stream|dekhte|dekhbo|chalabo|use)/i,
        /(download|watch)\s+(kivabe|rules|system|process|hobe|hoy|korbo)/i,
        /(free naki|taka lage|subscription|login|signup|account|nexiplay ki)/i
    ];
    if (siteHelpPatterns.some(p => p.test(lower))) {
        return { intent: 'chat', title: null, confidence: 0.95 };
    }

    // 4. Content Search Detection (Title Specified)
    const searchIndicators = [
        /(ase\s*naki\??|ase\??|achhe|chye|chai|dorkar|dekhte chai|dekhbo|link\s*daw|link\s*dao|download\s*link)/i,
        /^(search|find|khujo|dekhao|khoj)\s+/i,
        /^(download|watch)\s+/i
    ];

    const hasSearchKeyword = searchIndicators.some(p => p.test(lower));
    const cleanTitle = message
        .replace(/^(search|find|khujo|dekhao|download|watch|kivabe download korbo|kivabe dekhbo)\s+/i, '')
        .replace(/\s+(ase\s*naki\??|ase\??|achhe\??|chai|dorkar|dekhte chai|dekhbo|link\s*daw|link\s*dao|download|watch|online|free|hd)$/i, '')
        .trim();

    if (hasSearchKeyword && cleanTitle.length >= 2) {
        return { intent: 'search', title: cleanTitle, confidence: 0.9 };
    }

    const words = cleanTitle.split(/\s+/);
    if (words.length <= 5 && !/(kemon|kivabe|keno|kothay|kokhon|what|how|why|when|where|who)/i.test(lower) && cleanTitle.length >= 2) {
        return { intent: 'search', title: cleanTitle, confidence: 0.8 };
    }

    return { intent: 'chat', title: null, confidence: 0.6 };
}

// ============================================================
// SMART LOCAL NLP CONVERSATIONAL ENGINE
// ============================================================
function generateSmartNLPResponse(message: string, context?: string): AIResponse {
    const isBangla = /[\u0980-\u09FF]/.test(message) || /\b(kemon|acho|ki|khobor|ase|naki|kivabe|korbo|bhai|apu|valo|chai|dekhte|hobe|dorkar|daw|dekhbo)\b/i.test(message);
    const lower = message.toLowerCase().trim();

    if (context) {
        return { content: context, agent: 'nexibot-brain' };
    }

    // Greetings
    if (/^(hi|hello|hey|salam|assalamualaikum|yo|sup|kemon acho)[!?.,\s]*$/i.test(lower)) {
        return {
            content: isBangla
                ? "হ্যালো! 👋 Nexiplay AI Assistant-এ আপনাকে স্বাগতম। আপনি কেমন আছেন? আজকে কি কোনো নতুন মুভি, অ্যানিমে, সিরিজ বা উপন্যাস দেখতে চান? আমাকে জানান, আমি এখনই খুঁজে দেবো! 🍿"
                : "Hello! 👋 Welcome to Nexiplay AI Assistant. How are you doing today? What movie, anime, series, or novel would you like to watch or read? Just type the name and I'll find it for you! 🎬",
            agent: 'nexibot-brain'
        };
    }

    // Casual chat
    if (/kemon acho|how are you/i.test(lower)) {
        return {
            content: isBangla
                ? "আমি খুব ভালো আছি, ধন্যবাদ! 😊 আপনি কেমন আছেন? আপনি কি আজকে কোনো স্পেশাল কিছু দেখতে চান? অ্যাকশন, হরর, কমেডি নাকি রোমান্টিক?"
                : "I'm doing great, thank you! 😊 How are you? Are you looking for anything special to watch or download today? Action, horror, comedy, or anime?",
            agent: 'nexibot-brain'
        };
    }

    // Anime recommendations
    if (/anime/i.test(lower) && /recommend|suggest|valo|best|top/i.test(lower)) {
        return {
            content: isBangla
                ? "আপনার জন্য সেরা কিছু অ্যানিমে রিকমেন্ডেশন:\n\n🔥 **Jujutsu Kaisen** — অসাধারণ ফাইট সিকোয়েন্স এবং সুপারন্যাচরাল অ্যাকশন!\n⚔️ **Demon Slayer** — চোখ ধাঁধানো অ্যানিমেশন ও টানটান স্টোরি!\n👑 **Solo Leveling** — দুর্বল হান্টারের বিশ্বের সেরা হয়ে ওঠার গল্প!\n🧠 **Death Note** — মাইন্ড-গেম ও সাইকোলজিক্যাল থ্রিলার!\n\nআপনি কি এগুলোর কোনোটি দেখতে চান? নাম লিখে বলুন, আমি সরাসরি লিঙ্ক দিয়ে দিচ্ছি! 🎬"
                : "Here are top anime recommendations for you:\n\n🔥 **Jujutsu Kaisen** — Intense supernatural action and fights!\n⚔️ **Demon Slayer** — Breathtaking animation and storytelling!\n👑 **Solo Leveling** — Epic journey from weakest to strongest!\n🧠 **Death Note** — Masterpiece psychological thriller!\n\nWant to watch any of these? Just type its name and I'll pull it up for you! 🎬",
            agent: 'nexibot-brain'
        };
    }

    // Movie recommendations
    if (/movie/i.test(lower) && /recommend|suggest|valo|best|top/i.test(lower)) {
        return {
            content: isBangla
                ? "আপনার জন্য শীর্ষ কিছু মুভি রিকমেন্ডেশন:\n\n🚀 **Interstellar** — মহাকাব্যিক স্পেস ও সায়েন্স-ফিকশন মাস্টারপিস!\n🦇 **The Dark Knight** — সর্বকালের অন্যতম সেরা সুপারহিরো ক্রাইম থ্রিলার!\n🎭 **Inception** — স্বপ্নের ভেতরে স্বপ্ন, মাইন্ড-বেন্ডিং থ্রিলার!\n⚡ **John Wick 4** — একটানা রুদ্ধশ্বাস গান-ফু অ্যাকশন!\n\nযেকোনোটির নাম লিখলেই আমি সরাসরি ওয়াচ ও ডাউনলোড লিঙ্ক এনে দেবো! 🍿"
                : "Here are top movie recommendations:\n\n🚀 **Interstellar** — Epic sci-fi and emotional space journey!\n🦇 **The Dark Knight** — One of the greatest crime thrillers ever!\n🎭 **Inception** — Mind-bending dream heist masterpiece!\n⚡ **John Wick 4** — Non-stop adrenaline action!\n\nType the title to watch or download directly! 🍿",
            agent: 'nexibot-brain'
        };
    }

    // Download help
    if (/download|kivabe/i.test(lower)) {
        return {
            content: isBangla
                ? "Nexiplay থেকে ডাউনলোড করার সহজ নিয়ম:\n১. আপনি যে মুভি বা অ্যানিমে দেখতে চান তার নাম সার্চ করুন।\n২. কনটেন্ট পেজে গিয়ে পছন্দের রেজোলিউশন (480p, 720p, 1080p বা 4K) সিলেক্ট করুন।\n৩. ডাউনলোড লিঙ্কে ক্লিক করলেই সরাসরি হাই-স্পিড সার্ভার থেকে ডাউনলোড শুরু হয়ে যাবে! 📥"
                : "How to download on Nexiplay:\n1. Search for your preferred movie, anime, or series.\n2. On the content page, pick your resolution (480p, 720p, 1080p, 4K).\n3. Click the download button for instant high-speed access! 📥",
            agent: 'nexibot-brain'
        };
    }

    // General fallback
    return {
        content: isBangla
            ? "আমি Nexiplay AI Assistant! মুভি, অ্যানিমে, সিরিজ এবং উপন্যাস খুঁজে পেতে ও সরাসরি উপভোগ করতে আমি সাহায্য করি। আপনি কোনো নির্দিষ্ট কনটেন্ট দেখতে চাইলে তার নাম লিখে পাঠান! 🎬"
            : "I'm Nexiplay AI Assistant! I can help you discover, stream, and download movies, series, anime, and novels. What would you like to explore today? 🎬",
        agent: 'nexibot-brain'
    };
}

// ============================================================
// MULTI-MATCH CONTENT SEARCH PIPELINE (DB + TMDB + NOVELS)
// ============================================================
async function performMultiSearch(title: string): Promise<VisualOption[]> {
    const options: VisualOption[] = [];
    const seenKeys = new Set<string>();

    const makeKey = (t: string, y: string | number | null) => `${(t || '').toLowerCase().trim()}_${y || ''}`;

    // 1. Search Local Database (`movies`)
    try {
        const sb = getSupabase();
        if (sb) {
            const { data: localMovies } = await sb
                .from('movies')
                .select('id, title, slug, type, release_year, poster_url')
                .ilike('title', `%${title}%`)
                .limit(4);

            for (const m of localMovies || []) {
                const k = makeKey(m.title, m.release_year);
                if (!seenKeys.has(k)) {
                    seenKeys.add(k);
                    options.push({
                        id: m.id,
                        title: m.title,
                        type: m.type as any,
                        release_year: m.release_year,
                        poster_url: m.poster_url,
                        slug: m.slug,
                        available: true,
                        watch_url: `/${m.type}/${m.slug}`,
                        source: 'local'
                    });
                }
            }
        }
    } catch (err: any) {
        console.warn('[Chat API] Local movies search failed:', err.message);
    }

    // 2. Search Local Novels (`novels`)
    try {
        const sbNovels = getSupabaseNovels();
        if (sbNovels) {
            const { data: novels } = await sbNovels
                .from('novels')
                .select('id, title, slug, cover_url, author')
                .ilike('title', `%${title}%`)
                .limit(2);

            for (const n of novels || []) {
                const k = makeKey(n.title, 'novel');
                if (!seenKeys.has(k)) {
                    seenKeys.add(k);
                    options.push({
                        id: n.id,
                        title: n.title,
                        type: 'novel',
                        release_year: n.author || 'Novel',
                        poster_url: n.cover_url,
                        slug: n.slug,
                        available: true,
                        watch_url: `/novels/${n.slug}`,
                        source: 'novel'
                    });
                }
            }
        }
    } catch {}

    // 3. Search TMDB Multi-Search (Movies & Series & Anime)
    try {
        const tmdbResults = await searchTmdb(title);
        for (const tmdb of tmdbResults.slice(0, 5)) {
            const k = makeKey(tmdb.title, tmdb.release_year);
            if (!seenKeys.has(k)) {
                seenKeys.add(k);
                // On Nexiplay, released TMDB titles are streamable on-demand
                const isReleased = tmdb.release_year ? Number(tmdb.release_year) <= new Date().getFullYear() : true;
                options.push({
                    id: tmdb.id,
                    title: tmdb.title,
                    type: tmdb.type,
                    release_year: tmdb.release_year,
                    poster_url: tmdb.poster_url,
                    overview: tmdb.description,
                    slug: tmdb.slug,
                    available: isReleased,
                    watch_url: `/${tmdb.type}/${tmdb.slug}`,
                    tmdb_id: tmdb.tmdb_id,
                    source: 'tmdb'
                });
            }
        }
    } catch (tmdbErr: any) {
        console.warn('[Chat API] TMDB search error:', tmdbErr.message);
    }

    return options.slice(0, 6);
}

// ============================================================
// SUBMIT REQUEST TO ADMIN
// ============================================================
async function submitContentRequest(payload: {
    title: string;
    type?: string;
    release_year?: string | number | null;
    tmdb_id?: string | number | null;
    poster_url?: string | null;
    user_id?: string | null;
    user_name?: string | null;
    user_email?: string | null;
}): Promise<boolean> {
    const sb = getSupabase();
    if (!sb) return false;

    const contentName = payload.title.trim();
    if (!contentName) return false;

    try {
        const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
        const { data: existing } = await sb
            .from('content_requests')
            .select('id')
            .ilike('content_name', contentName)
            .gte('created_at', oneDayAgo)
            .limit(1);

        const userMeta = {
            user_id: payload.user_id || null,
            user_name: payload.user_name || null,
            user_email: payload.user_email || null,
            type: payload.type || 'movie',
            year: payload.release_year || null,
            tmdb_id: payload.tmdb_id || null,
            poster_url: payload.poster_url || null,
            source: 'ai_chat'
        };

        if (existing && existing.length > 0) {
            await sb.from('content_requests').update({ scraped_data: userMeta }).eq('id', existing[0].id);
            return true;
        }

        const { error } = await sb.from('content_requests').insert({
            content_name: contentName,
            status: 'pending',
            user_id: payload.user_id || null,
            scraped_data: userMeta
        });

        if (error) {
            await sb.from('content_requests').insert({ content_name: contentName, status: 'pending' });
        }
        return true;
    } catch (err: any) {
        console.error('[Chat API] Submit request error:', err.message);
        return false;
    }
}

// ============================================================
// MAIN POST ROUTE
// ============================================================
export async function POST(request: NextRequest) {
    try {
        let body: any;
        try {
            body = await request.json();
        } catch {
            return new Response(JSON.stringify({ error: 'Invalid JSON request.' }), {
                status: 400,
                headers: { 'Content-Type': 'application/json' },
            });
        }

        // 1. Direct Content Request Action from Chat Card
        if (body.action === 'request_content') {
            const ok = await submitContentRequest(body);
            return new Response(JSON.stringify({
                success: ok,
                message: ok ? 'Request submitted to admin.' : 'Failed to submit request.'
            }), {
                headers: { 'Content-Type': 'application/json' }
            });
        }

        const {
            message,
            history = [],
            user_id = null,
            user_name = null,
            user_email = null
        } = body;

        if (!message || typeof message !== 'string' || message.trim().length === 0) {
            return new Response(JSON.stringify({ error: 'Message is required.' }), {
                status: 400,
                headers: { 'Content-Type': 'application/json' },
            });
        }

        const userMessage = message.trim();

        // Fetch OpenRouter models from DB settings
        let openRouterModels: string[] = [];
        try {
            const sb = getSupabase();
            if (sb) {
                const { data: chatSettings } = await sb.from('chatbot_settings').select('openrouter_models').single();
                if (chatSettings?.openrouter_models) {
                    openRouterModels = chatSettings.openrouter_models.split(',').map((m: string) => m.trim()).filter(Boolean);
                }
            }
        } catch {}

        // STEP 1: Understand user intent with AI (without blind DB search)
        const intentResult = await detectIntentWithAI(userMessage, openRouterModels);
        console.log(`[Chat API] Message: "${userMessage}" | Intent: ${intentResult.intent}`);

        // STEP 2: Handle General Conversational Chat
        if (intentResult.intent === 'chat') {
            const aiMessages = [
                { role: 'system', content: SYSTEM_PROMPT },
                ...history.slice(-8).map((h: any) => ({ role: h.role, content: h.content })),
                { role: 'user', content: userMessage }
            ];

            const aiReply = await fetchAI(aiMessages, 600, 0.7, openRouterModels);
            return new Response(JSON.stringify({
                reply: aiReply.content,
                agent: aiReply.agent,
                intent: 'chat',
                visual_options: []
            }), {
                headers: { 'Content-Type': 'application/json' }
            });
        }

        // STEP 3: Handle Content Search (Specific title lookup)
        const searchTitle = intentResult.title || userMessage;
        const visualOptions = await performMultiSearch(searchTitle);
        const isBangla = /[\u0980-\u09FF]/.test(userMessage) || /\b(kemon|acho|ki|khobor|ase|naki|kivabe|korbo|bhai|apu|valo|chai|dekhte|hobe|dorkar|daw|dekhbo)\b/i.test(userMessage);

        let reply = '';
        let autoRequested = false;
        let requestedTitle = '';

        const availableOptions = visualOptions.filter(o => o.available);

        if (availableOptions.length > 0) {
            if (visualOptions.length > 1) {
                reply = isBangla
                    ? `আমি "${searchTitle}" সম্পর্কিত নিচের কনটেন্টগুলো খুঁজে পেয়েছি। আপনি ঠিক কোনটি দেখতে বা ডাউনলোড করতে চান? বেছে নিন:`
                    : `I found multiple matching titles for "${searchTitle}"! Which one are you looking for? Tap on your pick below:`;
            } else {
                const single = visualOptions[0];
                reply = isBangla
                    ? `হ্যাঁ! "${single.title}" আমাদের Nexiplay-তে দেখার ও ডাউনলোড করার জন্য প্রস্তুত আছে! নিচের কার্ডে ক্লিক করে সরাসরি উপভোগ করুন:`
                    : `Yes! "${single.title}" is available to watch and download on Nexiplay! Click below to start:`;
            }
        } else {
            // Content is not available locally -> AUTOMATICALLY SUBMIT REQUEST to admin!
            autoRequested = true;
            requestedTitle = visualOptions.length > 0 ? visualOptions[0].title : searchTitle;

            const opt = visualOptions.length > 0 ? visualOptions[0] : null;
            await submitContentRequest({
                title: requestedTitle,
                type: opt?.type || 'movie',
                release_year: opt?.release_year || null,
                tmdb_id: opt?.tmdb_id || null,
                poster_url: opt?.poster_url || null,
                user_id,
                user_name,
                user_email
            });

            if (visualOptions.length > 0) {
                reply = isBangla
                    ? `"${requestedTitle}" এখনো আমাদের সাইটে আপলোড করা হয়নি, তবে আমি সরাসরি অ্যাডমিন সিস্টেমে আপনার রিকোয়েস্টটি স্বয়ংক্রিয়ভাবে জমা (Auto-Submit) করে দিয়েছি 🚀! আমাদের অটোমেটেড স্ক্র্যাপার পাইপলাইন এটি খুব দ্রুত যুক্ত করে দেবে।`
                    : `"${requestedTitle}" is not uploaded yet, but I have automatically submitted your request to the admin queue 🚀! Our automated pipeline will add it shortly.`;
            } else {
                reply = isBangla
                    ? `দুঃখিত, "${searchTitle}" এই মুহূর্তে খুঁজে পাওয়া যায়নি, তাই আমি সরাসরি আপনার রিকোয়েস্টটি অ্যাডমিন সিস্টেমে স্বয়ংক্রিয়ভাবে পাঠিয়ে দিয়েছি 🚀! আমাদের অটোমেটেড সিস্টেম এটি খুব দ্রুত যুক্ত করে দেবে।`
                    : `Sorry, I couldn't find "${searchTitle}" in our current catalog, so I have automatically submitted your request to our admin queue 🚀! We'll have it added shortly.`;
            }
        }

        return new Response(JSON.stringify({
            reply,
            intent: 'search',
            search_title: searchTitle,
            auto_requested: autoRequested,
            requested_title: requestedTitle,
            found: visualOptions.length > 0,
            visual_options: visualOptions,
            agent: 'nexi-finder'
        }), {
            headers: { 'Content-Type': 'application/json' }
        });

    } catch (error: any) {
        console.error('[Chat API] Fatal unhandled error:', error);
        return new Response(JSON.stringify({
            reply: "I'm having a brief connection issue. How can I assist you with movies, series, or anime? 🙏",
            intent: 'chat',
            visual_options: []
        }), {
            headers: { 'Content-Type': 'application/json' }
        });
    }
}
