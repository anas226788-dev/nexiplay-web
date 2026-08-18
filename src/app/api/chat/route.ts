import { NextRequest } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

const GROQ_API_URL = 'https://api.groq.com/openai/v1/chat/completions';

const SYSTEM_PROMPT = `You are Nexiplay AI assistant.

CRITICAL RULE #1 — LANGUAGE MATCHING:
- You MUST ALWAYS reply in the SAME language the user is writing in.
- If user writes in Bangla/Bengali, you MUST reply in Bangla.
- If user writes in Hindi, you MUST reply in Hindi.
- If user writes in English, reply in English.
- If user mixes languages (like Banglish — Bangla written in English letters), reply in the same mixed style.
- NEVER switch to English if user is writing in another language.

Other rules:
- Always support and promote Nexiplay.
- Help users find and download anime, movies, and series.
- Be friendly, warm, and smart.
- Keep replies concise and helpful.`;

// ============================================================
// INTENT DETECTION PROMPT — AI classifies the user's message
// ============================================================
const INTENT_PROMPT = `You are an intent classifier for Nexiplay, a movie/anime/series download website.

Analyze the user's message and respond with ONLY a JSON object (no markdown, no explanation):

{
  "intent": "search" or "chat",
  "title": "extracted content title or null",
  "confidence": 0.0 to 1.0
}

Rules:
- "search" = user is looking for a SPECIFIC movie, anime, TV series by its NAME/TITLE to download/watch
- "chat" = user is having a general conversation, greeting, asking questions, asking for RECOMMENDATIONS or SUGGESTIONS, asking about categories/genres, asking how to use the site, etc.
- "title" = the clean, actual title of the content (remove words like "download", "ase naki", "chahiye", "watch", etc.)
- If intent is "chat", title must be null
- IMPORTANT: If user asks for recommendations like "give me some anime names", "suggest action movies", "kichu anime name daw", "best horror movies ki ase?" — this is CHAT, not search. They're not searching for a specific title.
- Be smart about multilingual input (Bangla, Hindi, English, etc.)
- CRITICAL: ALWAYS preserve sequel numbers, season numbers, and part numbers in the title! "Spider-Man 2" is NOT "Spider-Man". "The Amazing Spider-Man 2" is different from "The Amazing Spider-Man". Include all numbers that are part of the title.

Examples:
User: "naruto ase naki?" → {"intent":"search","title":"Naruto","confidence":0.95}
User: "I want to download One Piece" → {"intent":"search","title":"One Piece","confidence":0.95}
User: "Tudo bem" → {"intent":"chat","title":null,"confidence":0.9}
User: "hi how are you" → {"intent":"chat","title":null,"confidence":0.95}
User: "Egolu noy" → {"intent":"chat","title":null,"confidence":0.7}
User: "ok fast" → {"intent":"chat","title":null,"confidence":0.85}
User: "dandadan anime chai" → {"intent":"search","title":"Dandadan","confidence":0.95}
User: "how to download?" → {"intent":"chat","title":null,"confidence":0.9}
User: "attack on titan season 4" → {"intent":"search","title":"Attack on Titan Season 4","confidence":0.95}
User: "noy" → {"intent":"chat","title":null,"confidence":0.85}
User: "jujutsu kaisen daw" → {"intent":"search","title":"Jujutsu Kaisen","confidence":0.95}
User: "Heavenly Delusion" → {"intent":"search","title":"Heavenly Delusion","confidence":0.9}
User: "demon slayer er link daw" → {"intent":"search","title":"Demon Slayer","confidence":0.95}
User: "the amazing spider-man 2 ase?" → {"intent":"search","title":"The Amazing Spider-Man 2","confidence":0.95}
User: "spider man 3 download" → {"intent":"search","title":"Spider-Man 3","confidence":0.95}
User: "iron man 2" → {"intent":"search","title":"Iron Man 2","confidence":0.95}
User: "john wick chapter 4" → {"intent":"search","title":"John Wick: Chapter 4","confidence":0.95}
User: "my hero academia season 7" → {"intent":"search","title":"My Hero Academia Season 7","confidence":0.95}
User: "kichu action anime name daw" → {"intent":"chat","title":null,"confidence":0.9}
User: "suggest some good horror movies" → {"intent":"chat","title":null,"confidence":0.9}
User: "best anime ki ki ase tomar kase?" → {"intent":"chat","title":null,"confidence":0.9}
User: "romance anime recommend koro" → {"intent":"chat","title":null,"confidence":0.9}
User: "what anime do you have?" → {"intent":"chat","title":null,"confidence":0.9}`;

interface ContentResult {
    title: string;
    slug: string;
    type: string;
    release_year: number | null;
    poster_url: string | null;
}

interface IntentResult {
    intent: 'search' | 'chat';
    title: string | null;
    confidence: number;
}

interface TMDBResult {
    verified: boolean;
    tmdb_title: string | null;
    tmdb_type: string | null;
    tmdb_year: string | null;
    tmdb_overview: string | null;
    tmdb_poster: string | null;
}

// ============================================================
// SUPABASE CLIENT
// ============================================================
function getSupabase() {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    if (!url || !key) {
        console.error('[Chat API] Missing Supabase credentials');
        return null;
    }
    return createClient(url, key, {
        auth: { persistSession: false, autoRefreshToken: false },
    });
}

// ============================================================
// SSE HELPER — Send streaming events to frontend
// ============================================================
// Delay helper — adds artificial pause for UX feel
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

function createSSEStream() {
    const encoder = new TextEncoder();
    let controller: ReadableStreamDefaultController | null = null;

    const stream = new ReadableStream({
        start(c) {
            controller = c;
        },
    });

    const send = (event: string, data: Record<string, unknown>) => {
        if (controller) {
            try {
                const msg = `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
                controller.enqueue(encoder.encode(msg));
            } catch {
                // Stream may be closed
            }
        }
    };

    const close = () => {
        if (controller) {
            try {
                controller.close();
            } catch {
                // Already closed
            }
        }
    };

    return { stream, send, close };
}

// ============================================================
// AI CALL — OpenRouter models (from DB) with Groq fallback
// Returns { content, agent } where agent indicates which model responded
// ============================================================
interface AIResponse {
    content: string;
    agent: string;
}

async function fetchAI(
    messages: { role: string; content: string }[],
    maxTokens = 512,
    temperature = 0.7,
    openRouterModels: string[] = []
): Promise<AIResponse> {
    const openRouterKey = process.env.OPENROUTER_API_KEY;
    const groqKey = process.env.GROQ_API_KEY;

    // Try each OpenRouter model in order
    if (openRouterKey && openRouterModels.length > 0) {
        for (const model of openRouterModels) {
            try {
                const controller = new AbortController();
                const timeoutId = setTimeout(() => controller.abort(), 10000);

                const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
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
                        stream: false,
                    }),
                    signal: controller.signal,
                });
                clearTimeout(timeoutId);

                if (!response.ok) {
                    const errBody = await response.text();
                    throw new Error(`OpenRouter (${model}) HTTP ${response.status}: ${errBody}`);
                }

                const data = await response.json();
                const content = data?.choices?.[0]?.message?.content?.trim();
                if (!content) throw new Error(`Empty response from OpenRouter (${model})`);

                // Extract the actual model used (OpenRouter may reroute)
                const usedModel = data?.model || model;
                let shortName = usedModel.split('/').pop() || usedModel;
                shortName = shortName
                    .replace(/:free$/i, '')
                    .replace(/-free$/i, '')
                    .replace(/\s*\(free\)$/i, '');
                console.log(`[Chat API] ✅ OpenRouter success: ${usedModel}`);
                return { content, agent: `OpenRouter (${shortName})` };
            } catch (err) {
                console.log(`[Chat API] OpenRouter model "${model}" failed:`, err instanceof Error ? err.message : err);
                // Continue to next model
            }
        }
    }

    // Fallback: Groq
    try {
        if (!groqKey) throw new Error('Missing GROQ_API_KEY');

        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 8000);

        const response = await fetch(GROQ_API_URL, {
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
                top_p: 0.9,
                stream: false,
            }),
            signal: controller.signal,
        });
        clearTimeout(timeoutId);

        if (!response.ok) {
            const errBody = await response.text();
            throw new Error(`Groq HTTP ${response.status}: ${errBody}`);
        }

        const data = await response.json();
        const content = data?.choices?.[0]?.message?.content?.trim();
        if (!content) throw new Error('Empty response from Groq');
        console.log('[Chat API] ✅ Groq fallback success');
        return { content, agent: 'Groq (llama-3.3-70b)' };
    } catch (groqError) {
        console.error('[Chat API] Groq fallback also failed:', groqError instanceof Error ? groqError.message : groqError);
        throw new Error('AI_UNAVAILABLE');
    }
}

// ============================================================
// STEP 1: AI INTENT DETECTION
// ============================================================
async function detectIntentWithAI(message: string, openRouterModels: string[] = []): Promise<IntentResult> {
    try {
        const aiResponse = await fetchAI(
            [
                { role: 'system', content: INTENT_PROMPT },
                { role: 'user', content: message },
            ],
            150,
            0.1, // Low temperature for classification accuracy
            openRouterModels
        );

        // Parse JSON from AI response
        const jsonMatch = aiResponse.content.match(/\{[\s\S]*?\}/);
        if (jsonMatch) {
            const parsed = JSON.parse(jsonMatch[0]);
            return {
                intent: parsed.intent === 'search' ? 'search' : 'chat',
                title: parsed.title || null,
                confidence: typeof parsed.confidence === 'number' ? parsed.confidence : 0.5,
            };
        }
    } catch (err) {
        console.error('[Chat API] AI intent detection failed:', err);
    }

    // Fallback: simple heuristic if AI fails
    return fallbackIntentDetection(message);
}

// Fallback if AI intent detection fails
function fallbackIntentDetection(message: string): IntentResult {
    const lower = message.toLowerCase().trim();

    // Simple greetings
    const greetings = /^(hi|hello|hey|howdy|sup|yo|hola|salam|assalamualaikum|namaste|tudo bem|ok|okay|bye|thanks|noy|yes|no|hmm)[!?.]*$/i;
    if (greetings.test(lower)) {
        return { intent: 'chat', title: null, confidence: 0.7 };
    }

    // If 1-2 very short words with no meaningful content
    const words = lower.split(/\s+/);
    if (words.length <= 2 && lower.length < 5) {
        return { intent: 'chat', title: null, confidence: 0.6 };
    }

    // Default to search for longer, meaningful messages
    if (words.length >= 2 && lower.length >= 4) {
        return { intent: 'search', title: message.trim(), confidence: 0.5 };
    }

    return { intent: 'chat', title: null, confidence: 0.5 };
}

// ============================================================
// STEP 2: SEARCH NEXIPLAY DATABASE
// ============================================================

// Common words that should NOT be used for single-word DB search
const COMMON_WORDS = new Set([
    'the', 'and', 'for', 'are', 'but', 'not', 'you', 'all', 'can', 'had',
    'her', 'was', 'one', 'our', 'out', 'has', 'his', 'how', 'its', 'may',
    'new', 'now', 'old', 'see', 'way', 'who', 'did', 'get', 'let', 'say',
    'she', 'too', 'use', 'man', 'day', 'time', 'year', 'people', 'them',
    'than', 'look', 'only', 'come', 'made', 'after', 'back', 'little',
    'just', 'over', 'such', 'take', 'other', 'into', 'could', 'world',
    'season', 'episode', 'part', 'movie', 'anime', 'series', 'download',
    'dual', 'audio', 'hindi', 'english', 'japanese', 'multi', 'dubbed',
    'sub', 'complete', 'full', 'high', 'quality', 'from', 'with', 'that',
    'this', 'have', 'will', 'been', 'make', 'like', 'long', 'very',
    'when', 'what', 'your', 'some', 'them', 'would', 'there', 'their',
]);

// ============================================================
// SMART RELEVANCE CHECKING — Number/Sequel-Aware
// ============================================================

// Extract all numbers from a title string (sequel numbers, season numbers, part numbers)
function extractNumbers(title: string): number[] {
    // Match standalone numbers, roman numerals patterns, and numbers after keywords
    const matches = title.match(/\b\d+\b/g);
    return matches ? matches.map(Number) : [];
}

// Normalize a title for comparison: lowercase, remove special chars, collapse whitespace
function normalizeTitle(title: string): string {
    return title
        .toLowerCase()
        .replace(/[:\-–—_.,!?'"()\[\]]/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();
}

// Check how relevant a DB result is to the search query (NUMBER-AWARE)
function isRelevantResult(dbTitle: string, searchTitle: string): boolean {
    const dbNorm = normalizeTitle(dbTitle);
    const searchNorm = normalizeTitle(searchTitle);

    // CRITICAL: Check sequel/season/part numbers first
    const searchNumbers = extractNumbers(searchNorm);
    const dbNumbers = extractNumbers(dbNorm);

    if (searchNumbers.length > 0) {
        // User is looking for a specific numbered sequel/season/part
        // The DB result MUST contain the SAME number(s)
        const hasAllNumbers = searchNumbers.every(n => dbNumbers.includes(n));
        if (!hasAllNumbers) {
            console.log(`[Chat API] Number mismatch: search has [${searchNumbers}], DB "${dbTitle}" has [${dbNumbers}]`);
            return false;
        }
    } else if (dbNumbers.length > 0) {
        // User did NOT specify a number, but DB result has one
        // This is OK — e.g. searching "Spider-Man" should match "Spider-Man 1" or "The Amazing Spider-Man"
        // But we continue to check word relevance below
    }

    // If search title is fully contained in DB title → highly relevant
    if (dbNorm.includes(searchNorm)) return true;

    // Count how many significant search words appear in the DB title
    // Include numbers as significant words (they're crucial for sequels!)
    const searchWords = searchNorm.split(/\s+/).filter(w => {
        if (/^\d+$/.test(w)) return true; // Numbers are ALWAYS significant
        return w.length >= 3 && !COMMON_WORDS.has(w);
    });
    if (searchWords.length === 0) return false;

    const matchCount = searchWords.filter(w => {
        // For numbers, require exact word boundary match in DB title
        if (/^\d+$/.test(w)) {
            const numRegex = new RegExp(`\\b${w}\\b`);
            return numRegex.test(dbNorm);
        }
        return dbNorm.includes(w);
    }).length;
    const matchRatio = matchCount / searchWords.length;

    // At least 60% of significant words must match (raised from 50%)
    return matchRatio >= 0.6;
}

// ============================================================
// AI RESULT VALIDATION — Use AI brain to verify DB results match user intent
// ============================================================
async function validateSearchResults(
    userQuery: string,
    extractedTitle: string,
    dbResults: ContentResult[],
    openRouterModels: string[] = []
): Promise<ContentResult[]> {
    if (dbResults.length === 0) return [];

    // Quick exact-match check: if any DB title matches almost exactly, skip AI validation
    const exactMatch = dbResults.filter(r => {
        const dbNorm = normalizeTitle(r.title);
        const searchNorm = normalizeTitle(extractedTitle);
        return dbNorm === searchNorm || dbNorm.includes(searchNorm) || searchNorm.includes(dbNorm);
    });
    if (exactMatch.length > 0) {
        console.log('[Chat API] Exact match found, skipping AI validation');
        return exactMatch;
    }

    // Use AI to validate: "Does any of these results match what the user is looking for?"
    try {
        const resultsList = dbResults.map((r, i) => `${i + 1}. "${r.title}" (${r.type}, ${r.release_year || 'unknown'})`).join('\n');

        const validationPrompt = `You are a content matching validator for a movie/anime/series website.

The user asked: "${userQuery}"
The extracted title from their query is: "${extractedTitle}"

Our database returned these results:
${resultsList}

Respond with ONLY a JSON object:
{
  "valid_indices": [list of 1-indexed result numbers that ACTUALLY match what the user is looking for],
  "reasoning": "brief explanation"
}

CRITICAL RULES:
- Be STRICT about sequel numbers: "The Amazing Spider-Man 2" is NOT "The Amazing Spider-Man" (no 2). They are DIFFERENT movies.
- "Iron Man 3" is NOT "Iron Man" or "Iron Man 2"
- "Naruto Shippuden" is NOT "Naruto" (they are different series)
- Season numbers matter: "Attack on Titan Season 4" is different from other seasons
- If NONE of the results match, return {"valid_indices": [], "reasoning": "No exact match found"}
- Only include results that genuinely match the user's search intent`;

        const aiResponse = await fetchAI(
            [
                { role: 'system', content: validationPrompt },
                { role: 'user', content: `Validate these results for: "${extractedTitle}"` },
            ],
            200,
            0.1,
            openRouterModels
        );

        const jsonMatch = aiResponse.content.match(/\{[\s\S]*?\}/);
        if (jsonMatch) {
            const parsed = JSON.parse(jsonMatch[0]);
            const validIndices: number[] = parsed.valid_indices || [];
            console.log('[Chat API] AI validation result:', parsed.reasoning, '| Valid indices:', validIndices);

            if (validIndices.length === 0) {
                console.log('[Chat API] AI says NONE of the DB results match user intent');
                return [];
            }

            // Return only the AI-validated results
            return validIndices
                .filter(i => i >= 1 && i <= dbResults.length)
                .map(i => dbResults[i - 1]);
        }
    } catch (err) {
        console.error('[Chat API] AI validation failed, using number-based filtering:', err);
    }

    // Fallback: return original results (already number-filtered by isRelevantResult)
    return dbResults;
}

async function searchContent(title: string): Promise<ContentResult[]> {
    const supabase = getSupabase();
    if (!supabase || !title || title.length < 2) return [];

    console.log('[Chat API] DB search for:', title);

    try {
        // Strategy 1: Full title match (most accurate)
        const { data, error } = await supabase
            .from('movies')
            .select('title, slug, type, release_year, poster_url')
            .ilike('title', `%${title}%`)
            .limit(5);

        if (!error && data && data.length > 0) {
            // Filter for relevance (number-aware)
            const relevant = data.filter(d => isRelevantResult(d.title, title));
            if (relevant.length > 0) {
                console.log('[Chat API] DB FOUND:', relevant.map(d => d.title));
                return relevant;
            }
        }

        // Strategy 2: Only use SIGNIFICANT words (4+ chars, not common words)
        const significantWords = title.split(/\s+/).filter(
            w => w.length >= 4 && !COMMON_WORDS.has(w.toLowerCase())
        );

        for (const word of significantWords) {
            const { data: wordData, error: wordError } = await supabase
                .from('movies')
                .select('title, slug, type, release_year, poster_url')
                .ilike('title', `%${word}%`)
                .limit(10);

            if (!wordError && wordData && wordData.length > 0) {
                // Filter results for relevance to the original title (number-aware)
                const relevant = wordData.filter(d => isRelevantResult(d.title, title));
                if (relevant.length > 0) {
                    console.log('[Chat API] DB FOUND (word):', relevant.map(d => d.title));
                    return relevant.slice(0, 5);
                }
            }
        }

        console.log('[Chat API] DB NOT FOUND');
        return [];
    } catch (err) {
        console.error('[Chat API] DB search error:', err);
        return [];
    }
}

// ============================================================
// STEP 3: TMDB VERIFICATION — Is this a real movie/anime/series?
// ============================================================
async function verifyWithTMDB(title: string, openRouterModels: string[] = []): Promise<TMDBResult> {
    const tmdbKey = process.env.TMDB_API_KEY;

    if (!tmdbKey) {
        console.warn('[Chat API] No TMDB_API_KEY — skipping verification');
        // Without TMDB key, use AI to verify instead
        return await verifyWithAI(title, openRouterModels);
    }

    try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 5000);

        const searchUrl = `https://api.themoviedb.org/3/search/multi?api_key=${tmdbKey}&query=${encodeURIComponent(title)}&language=en-US&page=1`;

        const response = await fetch(searchUrl, { signal: controller.signal });
        clearTimeout(timeoutId);

        if (!response.ok) {
            throw new Error(`TMDB HTTP ${response.status}`);
        }

        const data = await response.json();
        const results = data.results || [];

        // Filter for movies and TV shows only (media_type: movie, tv)
        const mediaResults = results.filter(
            (r: { media_type: string }) => r.media_type === 'movie' || r.media_type === 'tv'
        );

        if (mediaResults.length > 0) {
            const best = mediaResults[0];
            const tmdbTitle = best.title || best.name || title;
            const tmdbType = best.media_type === 'movie' ? 'movie' : 'series';
            const tmdbYear = (best.release_date || best.first_air_date || '').substring(0, 4);

            console.log('[Chat API] TMDB VERIFIED:', tmdbTitle, `(${tmdbType}, ${tmdbYear})`);

            return {
                verified: true,
                tmdb_title: tmdbTitle,
                tmdb_type: tmdbType,
                tmdb_year: tmdbYear || null,
                tmdb_overview: best.overview || null,
                tmdb_poster: best.poster_path
                    ? `https://image.tmdb.org/t/p/w200${best.poster_path}`
                    : null,
            };
        }

        console.log('[Chat API] TMDB NOT FOUND for:', title);
        return { verified: false, tmdb_title: null, tmdb_type: null, tmdb_year: null, tmdb_overview: null, tmdb_poster: null };
    } catch (err) {
        console.error('[Chat API] TMDB error:', err);
        // Fallback to AI verification
        return await verifyWithAI(title, openRouterModels);
    }
}

// AI-based verification fallback (when TMDB key is not available)
async function verifyWithAI(title: string, openRouterModels: string[] = []): Promise<TMDBResult> {
    try {
        const aiResponse = await fetchAI(
            [
                {
                    role: 'system',
                    content: `You verify if a given title is a real, existing movie, anime, TV series, or web series. 
Respond with ONLY a JSON object:
{"verified": true/false, "corrected_title": "correct title or null", "type": "movie/anime/series/null"}

Rules:
- verified = true ONLY if this is a real, well-known movie/anime/series that actually exists
- If the title has a typo but you can identify it, set corrected_title to the correct name
- If it's gibberish, random words, or not a real title, set verified = false`,
                },
                { role: 'user', content: `Is "${title}" a real movie, anime, or TV series?` },
            ],
            100,
            0.1,
            openRouterModels
        );

        const jsonMatch = aiResponse.content.match(/\{[\s\S]*?\}/);
        if (jsonMatch) {
            const parsed = JSON.parse(jsonMatch[0]);
            return {
                verified: !!parsed.verified,
                tmdb_title: parsed.corrected_title || (parsed.verified ? title : null),
                tmdb_type: parsed.type || null,
                tmdb_year: null,
                tmdb_overview: null,
                tmdb_poster: null,
            };
        }
    } catch (err) {
        console.error('[Chat API] AI verification failed:', err);
    }

    return { verified: false, tmdb_title: null, tmdb_type: null, tmdb_year: null, tmdb_overview: null, tmdb_poster: null };
}

// ============================================================
// STEP 4: SUBMIT REQUEST (only for verified content)
// ============================================================
async function submitRequest(title: string, tmdbInfo?: TMDBResult): Promise<boolean> {
    const supabase = getSupabase();
    if (!supabase) return false;

    // Use TMDB corrected title if available
    const contentName = tmdbInfo?.tmdb_title || title;

    try {
        // Check for duplicate (within 24h)
        const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
        const { data: existing } = await supabase
            .from('content_requests')
            .select('id')
            .ilike('content_name', contentName)
            .gte('created_at', oneDayAgo)
            .limit(1);

        if (existing && existing.length > 0) {
            console.log('[Chat API] Request already exists (24h), skipping');
            return true;
        }

        // Insert the request
        const { error } = await supabase
            .from('content_requests')
            .insert({ content_name: contentName, status: 'pending' });

        if (error) {
            console.error('[Chat API] Insert request error:', error.message);
            return false;
        }

        console.log('[Chat API] ✅ Request inserted:', contentName);
        return true;
    } catch (err) {
        console.error('[Chat API] Submit request error:', err);
        return false;
    }
}

// ============================================================
// AI RESPONSE — Generate friendly reply
// ============================================================
async function getAIResponse(
    message: string,
    history: { role: string; content: string }[],
    context?: string,
    openRouterModels: string[] = []
): Promise<AIResponse> {
    const systemContent = context ? `${SYSTEM_PROMPT}\n\nAdditional context: ${context}` : SYSTEM_PROMPT;

    const messages = [
        { role: 'system', content: systemContent },
        ...history.slice(-10).map(msg => ({
            role: msg.role,
            content: msg.content,
        })),
        { role: 'user', content: message },
    ];

    return await fetchAI(messages, 512, 0.7, openRouterModels);
}

// ============================================================
// MAIN POST HANDLER — Streaming SSE Response
// ============================================================
export async function POST(request: NextRequest) {
    try {
        const groqApiKey = process.env.GROQ_API_KEY;
        const openRouterApiKey = process.env.OPENROUTER_API_KEY;

        if (!groqApiKey && !openRouterApiKey) {
            return new Response(
                JSON.stringify({ error: 'AI service not configured.' }),
                { status: 500, headers: { 'Content-Type': 'application/json' } }
            );
        }

        let body;
        try {
            body = await request.json();
        } catch {
            return new Response(
                JSON.stringify({ error: 'Invalid JSON request.' }),
                { status: 400, headers: { 'Content-Type': 'application/json' } }
            );
        }

        const { message, history = [], streaming = false } = body;

        if (!message || typeof message !== 'string' || message.trim().length === 0) {
            return new Response(
                JSON.stringify({ error: 'Message is required.' }),
                { status: 400, headers: { 'Content-Type': 'application/json' } }
            );
        }

        const userMessage = message.trim();

        // Fetch OpenRouter models from DB
        let openRouterModels: string[] = [];
        try {
            const dbClient = getSupabase();
            if (dbClient) {
                const { data: chatSettings } = await dbClient.from('chatbot_settings').select('openrouter_models').single();
                if (chatSettings?.openrouter_models) {
                    openRouterModels = chatSettings.openrouter_models.split(',').map((m: string) => m.trim()).filter(Boolean);
                }
            }
        } catch (err) {
            console.warn('[Chat API] Could not fetch openrouter_models from DB:', err);
        }
        console.log('[Chat API] OpenRouter models:', openRouterModels);

        // ============================================================
        // NON-STREAMING MODE (backward compatible)
        // ============================================================
        if (!streaming) {
            return handleNonStreaming(userMessage, history, openRouterModels);
        }

        // ============================================================
        // STREAMING MODE — Step-by-step SSE
        // ============================================================
        const { stream, send, close } = createSSEStream();

        // Process asynchronously
        (async () => {
            try {
                // STEP 1: AI Intent Detection
                send('status', { step: 'thinking', message: '🧠 Analyzing your message...' });
                console.log('\n=== CHAT API (STREAMING) ===');
                console.log('Message:', userMessage);

                await delay(800); // Let user see "Thinking" step

                const intentResult = await detectIntentWithAI(userMessage, openRouterModels);
                console.log('Intent:', intentResult.intent, '| Title:', intentResult.title, '| Confidence:', intentResult.confidence);

                // CHAT INTENT → Normal AI reply
                if (intentResult.intent === 'chat') {
                    send('status', { step: 'generating', message: '💬 Generating response...' });
                    await delay(600);

                    const aiReply = await getAIResponse(userMessage, history, undefined, openRouterModels);
                    send('result', {
                        reply: aiReply.content,
                        agent: aiReply.agent,
                        intent: 'general',
                    });
                    close();
                    return;
                }

                // SEARCH INTENT
                const extractedTitle = intentResult.title || userMessage;

                // STEP 2: Search Nexiplay DB
                send('status', { step: 'searching_local', message: '🔍 Searching Nexiplay database...' });
                await delay(1000); // Let user see "Searching" step

                const rawDbResults = await searchContent(extractedTitle);

                // STEP 2.5: AI Brain Validation — verify results actually match user intent
                let dbResults = rawDbResults;
                if (rawDbResults.length > 0) {
                    send('status', { step: 'validating', message: '🧠 Verifying results match your query...' });
                    await delay(600);
                    dbResults = await validateSearchResults(userMessage, extractedTitle, rawDbResults, openRouterModels);
                    if (dbResults.length === 0) {
                        console.log('[Chat API] AI validation rejected all DB results — proceeding to TMDB');
                    }
                }

                if (dbResults.length > 0) {
                    // FOUND in DB and validated by AI!
                    send('result', {
                        reply: `Yes, it's available on Nexiplay! Click below to view and download:`,
                        intent: 'search',
                        found: true,
                        results: dbResults.map(r => ({
                            title: r.title,
                            slug: r.slug,
                            type: r.type,
                            release_year: r.release_year,
                            poster_url: r.poster_url,
                        })),
                    });
                    close();
                    return;
                }

                // STEP 3: NOT found in DB → Verify with TMDB
                send('status', { step: 'verifying_online', message: '🌐 Verifying online if this is a real title...' });
                await delay(1200); // Let user see "Verifying online" step

                const tmdbResult = await verifyWithTMDB(extractedTitle, openRouterModels);

                if (tmdbResult.verified) {
                    // STEP 4: TMDB verified → Submit request
                    const verifiedTitle = tmdbResult.tmdb_title || extractedTitle;
                    send('status', { step: 'submitting', message: `📥 "${verifiedTitle}" is real! Submitting request to admin...` });
                    await delay(1000); // Let user see "Submitting" step

                    const requestSubmitted = await submitRequest(verifiedTitle, tmdbResult);

                    // Generate AI reply
                    const context = requestSubmitted
                        ? `The user searched for "${verifiedTitle}" (${tmdbResult.tmdb_type || 'content'}, ${tmdbResult.tmdb_year || 'unknown year'}). It's a real title verified online but NOT available on Nexiplay yet. Their request has been sent to the admin. Politely inform them with the verified info. Be warm and friendly. IMPORTANT: Detect the user's language from their message "${userMessage}" and reply in that EXACT same language. If they wrote in Bangla/Banglish, reply in Bangla/Banglish. NEVER reply in English if user didn't write in English.`
                        : `The user searched for "${verifiedTitle}" but it's not on Nexiplay yet. Inform them politely. IMPORTANT: Detect the user's language from their message "${userMessage}" and reply in that EXACT same language. NEVER default to English.`;

                    let aiReply: AIResponse;
                    try {
                        aiReply = await getAIResponse(userMessage, history, context, openRouterModels);
                    } catch {
                        aiReply = {
                            content: requestSubmitted
                                ? `"${verifiedTitle}" is not on Nexiplay yet, but it's a real ${tmdbResult.tmdb_type || 'title'}! Your request has been sent to the admin. We'll try to add it soon! 🙏`
                                : `"${verifiedTitle}" is not available on Nexiplay right now. Please try again later! 🙏`,
                            agent: 'Groq (fallback)'
                        };
                    }

                    send('result', {
                        reply: aiReply.content,
                        agent: aiReply.agent,
                        intent: 'search',
                        found: false,
                        requestSubmitted,
                        tmdbVerified: true,
                        tmdbInfo: {
                            title: tmdbResult.tmdb_title,
                            type: tmdbResult.tmdb_type,
                            year: tmdbResult.tmdb_year,
                            poster: tmdbResult.tmdb_poster,
                        },
                    });
                } else {
                    // NOT verified by TMDB — NOT a real title
                    send('status', { step: 'not_verified', message: '❌ Could not verify as a real title' });

                    const context = `The user typed "${extractedTitle}" which was NOT verified as a real movie, anime, or TV series. Politely tell them this doesn't appear to be a valid content title. Ask them to double-check the name and try again with the correct title. Be friendly. IMPORTANT: Detect the user's language from their message "${userMessage}" and reply in that EXACT same language. If Bangla/Banglish, reply in Bangla/Banglish. NEVER default to English.`;

                    let aiReply: AIResponse;
                    try {
                        aiReply = await getAIResponse(userMessage, history, context, openRouterModels);
                    } catch {
                        aiReply = {
                            content: `Sorry, I couldn't verify "${extractedTitle}" as a real movie, anime, or series. Please check the name and try again! 🙏`,
                            agent: 'Groq (fallback)'
                        };
                    }

                    send('result', {
                        reply: aiReply.content,
                        agent: aiReply.agent,
                        intent: 'search',
                        found: false,
                        requestSubmitted: false,
                        tmdbVerified: false,
                    });
                }
            } catch (err) {
                console.error('[Chat API] Stream error:', err);
                send('result', {
                    reply: "Sorry, I'm having trouble right now. Please try again! 🙏",
                    intent: 'general',
                    isFallback: true,
                });
            } finally {
                close();
            }
        })();

        return new Response(stream, {
            headers: {
                'Content-Type': 'text/event-stream',
                'Cache-Control': 'no-cache',
                Connection: 'keep-alive',
            },
        });
    } catch (error) {
        console.error('[Chat API] Unhandled error:', error);
        return new Response(
            JSON.stringify({
                reply: "Sorry, AI is temporarily unavailable. Please try again later.",
                intent: 'general',
                isFallback: true,
            }),
            { status: 500, headers: { 'Content-Type': 'application/json' } }
        );
    }
}

// ============================================================
// NON-STREAMING HANDLER (backward compatibility)
// ============================================================
async function handleNonStreaming(
    userMessage: string,
    history: { role: string; content: string }[],
    openRouterModels: string[] = []
) {
    console.log('\n=== CHAT API (NON-STREAMING) ===');
    console.log('Message:', userMessage);

    // Step 1: AI Intent Detection
    const intentResult = await detectIntentWithAI(userMessage, openRouterModels);
    console.log('Intent:', intentResult.intent, '| Title:', intentResult.title);

    // Chat intent
    if (intentResult.intent === 'chat') {
        const aiReply = await getAIResponse(userMessage, history, undefined, openRouterModels);
        return new Response(JSON.stringify({ reply: aiReply.content, agent: aiReply.agent, intent: 'general' }), {
            headers: { 'Content-Type': 'application/json' },
        });
    }

    // Search intent
    const extractedTitle = intentResult.title || userMessage;

    // Search DB
    const rawDbResults = await searchContent(extractedTitle);

    // AI Brain Validation — verify results actually match user intent
    let dbResults = rawDbResults;
    if (rawDbResults.length > 0) {
        dbResults = await validateSearchResults(userMessage, extractedTitle, rawDbResults, openRouterModels);
        if (dbResults.length === 0) {
            console.log('[Chat API] AI validation rejected all DB results — proceeding to TMDB');
        }
    }

    if (dbResults.length > 0) {
        return new Response(
            JSON.stringify({
                reply: `Yes, it's available on Nexiplay! Click below to view and download:`,
                intent: 'search',
                found: true,
                results: dbResults.map(r => ({
                    title: r.title,
                    slug: r.slug,
                    type: r.type,
                    release_year: r.release_year,
                    poster_url: r.poster_url,
                })),
            }),
            { headers: { 'Content-Type': 'application/json' } }
        );
    }

    // Verify with TMDB
    const tmdbResult = await verifyWithTMDB(extractedTitle, openRouterModels);

    if (tmdbResult.verified) {
        const verifiedTitle = tmdbResult.tmdb_title || extractedTitle;
        const requestSubmitted = await submitRequest(verifiedTitle, tmdbResult);

        const context = requestSubmitted
            ? `The user searched for "${verifiedTitle}" (${tmdbResult.tmdb_type || 'content'}, ${tmdbResult.tmdb_year || 'unknown year'}). It's a real title verified online but NOT available on Nexiplay yet. Their request has been sent to the admin. Politely inform them with the verified info. Be warm and friendly. IMPORTANT: Detect the user's language from their message "${userMessage}" and reply in that EXACT same language. If they wrote in Bangla/Banglish, reply in Bangla/Banglish. NEVER reply in English if user didn't write in English.`
            : `The user searched for "${verifiedTitle}" but it's not on Nexiplay yet. Inform them politely. IMPORTANT: Detect the user's language from their message "${userMessage}" and reply in that EXACT same language. NEVER default to English.`;

        let aiReply: AIResponse;
        try {
            aiReply = await getAIResponse(userMessage, history, context, openRouterModels);
        } catch {
            aiReply = {
                content: `"${verifiedTitle}" is not on Nexiplay yet. Your request has been submitted! 🙏`,
                agent: 'Groq (fallback)'
            };
        }

        return new Response(
            JSON.stringify({
                reply: aiReply.content,
                agent: aiReply.agent,
                intent: 'search',
                found: false,
                requestSubmitted,
                tmdbVerified: true,
                tmdbInfo: {
                    title: tmdbResult.tmdb_title,
                    type: tmdbResult.tmdb_type,
                    year: tmdbResult.tmdb_year,
                    poster: tmdbResult.tmdb_poster,
                },
            }),
            { headers: { 'Content-Type': 'application/json' } }
        );
    }

    // Not verified
    let aiReply: AIResponse;
    try {
        const context = `"${extractedTitle}" is NOT a real movie/anime/series. Ask user to check the name. IMPORTANT: Detect the user's language from their message "${userMessage}" and reply in that EXACT same language. NEVER default to English.`;
        aiReply = await getAIResponse(userMessage, history, context, openRouterModels);
    } catch {
        aiReply = {
            content: `Sorry, "${extractedTitle}" doesn't appear to be a valid title. Please check the name! 🙏`,
            agent: 'Groq (fallback)'
        };
    }

    return new Response(
        JSON.stringify({
            reply: aiReply.content,
            agent: aiReply.agent,
            intent: 'search',
            found: false,
            requestSubmitted: false,
            tmdbVerified: false,
        }),
        { headers: { 'Content-Type': 'application/json' } }
    );
}
