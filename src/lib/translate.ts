/**
 * Multi-Language Translation Utility
 * Supports: English, Bangla, Banglish
 * Uses LibreTranslate API with local dictionary fallback
 */

export type Language = 'en' | 'bn' | 'banglish';

// LibreTranslate public instance
const LIBRETRANSLATE_URL = 'https://libretranslate.com/translate';

// Extended Banglish keywords for detection
const BANGLISH_KEYWORDS = [
    // Common words
    'ache', 'ase', 'nai', 'ni', 'chai', 'pabo', 'lagbe', 'korbo', 'hobe',
    'kobe', 'kothay', 'kemon', 'kemne', 'kivabe', 'ki', 'keno', 'ken',
    'ashbe', 'jabe', 'parbo', 'parlam', 'korte', 'kora', 'dekhte', 'dekha',
    'bolo', 'bolun', 'bujhi', 'bujhte', 'pari', 'parchi', 'parbo',
    // Greetings
    'salam', 'assalamualaikum', 'walaikum', 'bhalo', 'bhai', 'vai', 'apa',
    // Questions
    'kobe', 'kokhon', 'keno', 'kothay', 'koto', 'kacha', 'pacchi',
    // Actions
    'den', 'dhen', 'dao', 'din', 'nao', 'dekhi', 'dekhao', 'khuje', 'khujun',
    // Common phrases
    'thik', 'thak', 'ache', 'hoy', 'hoye', 'gelo', 'eshe', 'elo',
    // Movie related
    'movie', 'anime', 'series', 'download', 'link', 'episode', 'ep',
    'season', 'sub', 'dub', 'bangla', 'eng', 'hindi'
];

// Extended dictionary for common phrases
const TRANSLATION_DICTIONARY: Record<string, Record<Language, string>> = {
    // Greetings
    greeting: {
        en: "Hello! 👋 How can I assist you today?",
        bn: "হ্যালো! 👋 আজ আপনাকে কীভাবে সাহায্য করতে পারি?",
        banglish: "Hello! 👋 Aaj apnake kivabe help korte pari?"
    },
    // Found responses
    found: {
        en: "Yes! Found match for",
        bn: "হ্যাঁ! খুঁজে পেয়েছি:",
        banglish: "Ji! Khuje peyechi:"
    },
    // Not found
    notFound: {
        en: "Currently unavailable. Request submitted! ✅",
        bn: "এটা এখনো নেই, রিকোয়েস্ট পাঠিয়েছি ✅",
        banglish: "Eta ekhono nai, request pathiyechi ✅"
    },
    // Error
    error: {
        en: "Something went wrong. Please try again.",
        bn: "কিছু সমস্যা হয়েছে। আবার চেষ্টা করুন।",
        banglish: "Kichu problem hoyeche. Abar try korun."
    },
    // Ask name
    askName: {
        en: "Sorry? Please type just the name.",
        bn: "বুঝতে পারিনি, শুধু নামটা বলুন?",
        banglish: "Bujhte parini, shudhu naam ta bolun?"
    },
    // Trending
    trending: {
        en: "🔥 Top Recommendations",
        bn: "🔥 সেরা সাজেশন",
        banglish: "🔥 Top Recommendations"
    },
    // Help text
    helpText: {
        en: "Type the name of what you want, I'll bring details + download link 😊",
        bn: "আপনি যেটা চান লিখে বলুন, আমি details + download link এনে দেবো 😊",
        banglish: "Apni jeta chan likhe bolun, ami details + download link ene debo 😊"
    },
    // Download help
    downloadHelp: {
        en: "Click any resolution button, then choose your preferred download server!",
        bn: "যেকোনো resolution বাটনে ক্লিক করুন, তারপর আপনার পছন্দের সার্ভার বেছে নিন!",
        banglish: "Jekono resolution button e click korun, tarpor apnar favorite server theke download korun!"
    },
    // Telegram
    telegram: {
        en: "Join our Telegram for updates and direct support!",
        bn: "আপডেট এবং সরাসরি সাপোর্টের জন্য আমাদের টেলিগ্রামে জয়েন করুন!",
        banglish: "Update ar direct support er jonno amader Telegram e join korun!"
    }
};

/**
 * Detect language from text
 */
export function detectLanguage(text: string): Language {
    // 1. Bengali Unicode detection (highest priority)
    const bengaliRegex = /[\u0980-\u09FF]/;
    if (bengaliRegex.test(text)) return 'bn';

    // 2. Banglish keyword detection
    const lowerText = text.toLowerCase();
    const words = lowerText.split(/\s+/);

    let banglishScore = 0;
    for (const word of words) {
        if (BANGLISH_KEYWORDS.some(kw => word.includes(kw) || kw.includes(word))) {
            banglishScore++;
        }
    }

    // If more than 30% of words are Banglish keywords, classify as Banglish
    if (banglishScore > 0 && (banglishScore / words.length) >= 0.3) {
        return 'banglish';
    }

    // Additional Banglish patterns
    const banglishPatterns = [
        /\b(ki|keno|kobe|kothay|kemne|kivabe)\b/i,
        /\b(ache|ase|nai|chai|lagbe|hobe)\b/i,
        /\b(bhai|vai|apa|bolo|bolun)\b/i
    ];

    if (banglishPatterns.some(pattern => pattern.test(lowerText))) {
        return 'banglish';
    }

    // 3. Default to English
    return 'en';
}

/**
 * Get dictionary translation
 */
export function getDictionaryPhrase(key: string, lang: Language): string {
    return TRANSLATION_DICTIONARY[key]?.[lang] || TRANSLATION_DICTIONARY[key]?.en || key;
}

/**
 * Translate text using LibreTranslate API
 * Falls back to dictionary if API fails
 */
export async function translateText(
    text: string,
    fromLang: Language,
    toLang: Language
): Promise<string> {
    // If same language, return as-is
    if (fromLang === toLang) return text;

    // Banglish handling - use dictionary or return as-is
    if (fromLang === 'banglish' || toLang === 'banglish') {
        // For Banglish, we use local processing (no API translate)
        return text;
    }

    // Map to LibreTranslate language codes
    const langMap: Record<Language, string> = {
        en: 'en',
        bn: 'bn',
        banglish: 'en' // Treat as English for API
    };

    try {
        const response = await fetch(LIBRETRANSLATE_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                q: text,
                source: langMap[fromLang],
                target: langMap[toLang],
                format: 'text'
            })
        });

        if (!response.ok) {
            console.warn('Translation API failed, using original text');
            return text;
        }

        const data = await response.json();
        return data.translatedText || text;
    } catch (error) {
        console.warn('Translation error:', error);
        return text; // Fallback to original
    }
}

/**
 * Clean search query by removing stop words
 */
export function cleanSearchQuery(rawInput: string): string {
    const stopWords = [
        // English
        'movie', 'series', 'anime', 'download', 'link', 'please', 'plz',
        'do you have', 'is it available', 'search', 'find', 'want', 'need',
        'give', 'get', 'show', 'the', 'a', 'an', 'me',
        // Bangla / Banglish
        'ache', 'ase', 'chai', 'pabo', 'lagbe', 'ni', 'nai', 'kobe', 'ashbe',
        'link den', 'dhen', 'kothay', 'ki', 'ace', 'den', 'dao', 'daw',
        'khuje', 'khujun', 'dekhao', 'dekhi', 'dekha', 'korte', 'parbo',
        'ta', 'er', 'te', 'ke', 'theke', 'jonno'
    ];

    let searchQuery = rawInput;
    stopWords.forEach(word => {
        searchQuery = searchQuery.replace(new RegExp(`\\b${word}\\b`, 'gi'), '');
    });

    return searchQuery.replace(/[?.,!'"]/g, '').trim();
}

/**
 * Check if input is a greeting
 */
export function isGreeting(text: string): boolean {
    const greetings = [
        'hi', 'hello', 'hey', 'hola', 'hii', 'hiii',
        'salam', 'assalamualaikum', 'walaikum', 'oi',
        'good morning', 'good afternoon', 'good evening',
        'sup', 'yo', 'namaste'
    ];

    const lowerText = text.toLowerCase().trim();
    return greetings.some(g => lowerText === g || lowerText.startsWith(g + ' ')) && lowerText.length < 25;
}

/**
 * Check if input is asking for trending/recommendations
 */
export function isTrendingRequest(text: string): boolean {
    const keywords = [
        'ki ki ache', 'ki ache', 'ki ase', 'what movies',
        'recommend', 'suggestion', 'trending', 'popular',
        'best', 'top', 'new', 'latest', 'notun', 'niye aso',
        'show me', 'what do you have', 'ki movies', 'kon anime'
    ];

    const lowerText = text.toLowerCase();
    return keywords.some(k => lowerText.includes(k));
}

export { TRANSLATION_DICTIONARY, BANGLISH_KEYWORDS };
