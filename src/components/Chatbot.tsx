'use client';

import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import { ChatbotSettings, FAQ } from '@/lib/types';
import Link from 'next/link';
import Image from 'next/image';

// --- TYPES & INTERFACES ---

type Language = 'en' | 'bn' | 'banglish';

const DICTIONARY: Record<string, Record<Language, string>> = {
    found: {
        en: "Yes! Found match for",
        bn: "হ্যাঁ! খুঁজে পেয়েছি:",
        banglish: "Ji! Khuje peyechi:"
    },
    notFound: {
        en: "Currently unavailable. Added request for",
        bn: "এটা এখনো নেই, রিকোয়েস্ট পাঠিয়েছি ✅",
        banglish: "Eta ekhono nai, request pathiyechi ✅"
    },
    error: {
        en: "Something went wrong.",
        bn: "কিছু সমস্যা হয়েছে।",
        banglish: "Kichu shomossha hoyeche."
    }
};

export default function Chatbot() {
    const [isOpen, setIsOpen] = useState(false);
    const [settings, setSettings] = useState<ChatbotSettings | null>(null);
    const [faqs, setFaqs] = useState<FAQ[]>([]);
    type ChatMessage = {
        text: string | React.ReactNode;
        isBot: boolean;
        isTranslated?: boolean;
        originalText?: string;
    };

    const [messages, setMessages] = useState<ChatMessage[]>([]);
    const [inputText, setInputText] = useState('');
    const [isTyping, setIsTyping] = useState(false);
    const [headerText, setHeaderText] = useState('Ask me anything ✨');

    // Header Animation State
    const headerTexts = ["Ask me anything ✨", "Search movies... 🎬", "Find anime... ⛩️", "Download help... 📥", "Bangla | English 🇧🇩"];
    const [textIndex, setTextIndex] = useState(0);

    const messagesEndRef = useRef<HTMLDivElement>(null);

    // --- Effects ---

    useEffect(() => {
        fetchChatData();

        // Header Text Loop
        const interval = setInterval(() => {
            setTextIndex(prev => (prev + 1) % headerTexts.length);
        }, 3000);

        return () => clearInterval(interval);
    }, []);

    useEffect(() => {
        setHeaderText(headerTexts[textIndex]);
    }, [textIndex]);

    useEffect(() => {
        // STRICT RULE: Greeting is ALWAYS English
        if (messages.length === 0) {
            const welcome = "Hi! I'm Nexiplay Assistant. Ask me anything about movies, anime, or series 😊";
            setMessages([{ text: <span className="whitespace-pre-line">{welcome}</span>, isBot: true }]);
        }
    }, [isOpen]);

    useEffect(() => {
        scrollToBottom();
    }, [messages, isOpen, isTyping]);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    const fetchChatData = async () => {
        const { data: settingsData } = await supabase.from('chatbot_settings').select('*').single();
        if (settingsData) setSettings(settingsData);

        const { data: faqsData } = await supabase.from('faqs').select('*').eq('is_active', true);
        if (faqsData) setFaqs(faqsData);
    };

    const detectLanguage = (text: string): Language => {
        // 1. Bengali Char Detection
        const bengaliRegex = /[\u0980-\u09FF]/;
        if (bengaliRegex.test(text)) return 'bn';

        // 2. Banglish Keyword Detection
        const banglishKeywords = ['ache', 'ase', 'chai', 'pabo', 'lagbe', 'ni', 'nai', 'kobe', 'ashbe', 'kivabe', 'kemne', 'kothay', 'ki', 'khuje'];
        const lowerText = text.toLowerCase();
        if (banglishKeywords.some(w => lowerText.includes(w))) return 'banglish';

        // 3. Default English
        return 'en';
    };

    const mockTranslate = (text: string): string => {
        // Simple Mock Translation Logic
        const translations: Record<string, string> = {
            "Hi! I'm Nexiplay Assistant. Ask me anything about movies, anime, or series 😊":
                "হাই! আমি নেক্সিপ্লে অ্যাসিস্ট্যান্ট। আমাকে মুভি, অ্যানিমে বা সিরিজ সম্পর্কে যা খুশি জিজ্ঞাসা করুন 😊",
            "Currently unavailable. Added request for": "এটি এখন উপলব্ধ নেই। রিকোয়েস্ট যোগ করা হয়েছে:",
            "Yes! Found match for": "হ্যাঁ! মিল খুঁজে পাওয়া গেছে:",
            "Something went wrong.": "কিছু ভুল হয়েছে।",
            "Hello! 👋 How can I assist you today?": "হ্যালো! 👋 আজ আপনাকে কীভাবে সাহায্য করতে পারি?"
        };

        // Check exact match first
        if (translations[text]) return translations[text];

        // Partial matches
        if (text.includes("available")) return "দুঃখিত, এটি এখনো নেই।";

        return `[অনুবাদকৃত] ${text}`;
    };

    const handleTranslate = (index: number) => {
        const msg = messages[index];
        if (typeof msg.text !== 'string') return;

        const newMessages = [...messages];

        if (msg.isTranslated) {
            // Revert to original
            newMessages[index] = {
                ...msg,
                text: msg.originalText || msg.text,
                isTranslated: false
            };
        } else {
            // Translate
            newMessages[index] = {
                ...msg,
                originalText: msg.text as string,
                text: mockTranslate(msg.text as string),
                isTranslated: true
            };
        }
        setMessages(newMessages);
    };

    const handleDeleteChat = () => {
        if (confirm("Are you sure you want to delete chat history?")) {
            const welcome = "Hi! I'm Nexiplay Assistant. Ask me anything about movies, anime, or series 😊";
            setMessages([{ text: welcome, isBot: true }]);
            // Clear any local storage if present (future proofing)
            localStorage.removeItem('nexiplay_chat_history');
        }
    };

    const handleTrendingRequest = async () => {
        const { data: trending } = await supabase
            .from('movies')
            .select('title, slug, type, poster_url, release_year')
            .eq('status', 'published')
            .order('created_at', { ascending: false })
            .limit(4);

        if (trending && trending.length > 0) {
            const responseContent = (
                <div className="flex flex-col gap-3">
                    <div className="flex items-center gap-2 mb-1">
                        <span className="text-lg">🔥</span>
                        <span className="font-bold text-white">Top Recommendations</span>
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                        {trending.map(m => (
                            <Link
                                key={m.slug}
                                href={`/${m.type}/${m.slug}`}
                                className="group relative aspect-[2/3] rounded-xl overflow-hidden shadow-lg border border-white/10"
                                onClick={() => setIsOpen(false)}
                            >
                                {m.poster_url ? (
                                    <Image src={m.poster_url} alt={m.title} fill className="object-cover transition-transform group-hover:scale-110" />
                                ) : (
                                    <div className="w-full h-full bg-dark-800 flex items-center justify-center text-xs text-gray-500">No Image</div>
                                )}
                                <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black via-black/80 to-transparent p-2 pt-6">
                                    <h4 className="text-[10px] font-bold text-white line-clamp-1 group-hover:text-red-500 transition-colors">
                                        {m.title}
                                    </h4>
                                    <span className="text-[9px] text-gray-400 capitalize">{m.type} • {m.release_year}</span>
                                </div>
                            </Link>
                        ))}
                    </div>

                    <div className="bg-white/5 p-3 rounded-xl border border-white/5 mt-1">
                        <p className="text-sm text-gray-300 leading-relaxed text-center">
                            আপনি যেটা চান লিখে বলুন, আমি <span className="text-green-400 font-bold">details + download link</span> এনে দেবো 😊
                        </p>
                    </div>
                </div>
            );
            setMessages(prev => [...prev, { text: responseContent, isBot: true }]);
        }
        setIsTyping(false);
    };

    const handleSend = async () => {
        if (!inputText.trim()) return;

        const userMessage = inputText.trim();
        const userLang = detectLanguage(userMessage);

        setMessages(prev => [...prev, { text: userMessage, isBot: false }]);
        setInputText('');
        setIsTyping(true);

        // 1. RECOMMENDATION CHECK (Async)
        const trendingKeywords = ['ki ki ache', 'what movies are available', 'recommend', 'suggestion', 'ki ki ase'];
        if (trendingKeywords.some(k => userMessage.toLowerCase().includes(k))) {
            await handleTrendingRequest();
            return;
        }

        // 2. Check Local FAQs/Greets first (Instant)
        const localResponse = getLocalIntent(userMessage);

        if (localResponse) {
            setTimeout(() => {
                setMessages(prev => [...prev, { text: localResponse, isBot: true }]);
                setIsTyping(false);
            }, 600);
            return;
        }

        // 3. If no local match, treat as SMART CONTENT SEARCH (Async)
        await handleContentSearch(userMessage, userLang);
    };

    // ----- SMART LOGIC UNIT -----

    const getLocalIntent = (input: string): string | null => {
        const lowerInput = input.toLowerCase();

        // 🇧🇩 Bangla Intent Mapping
        const intentMap: Record<string, string> = {
            'kivabe': 'how to',
            'kemne': 'how to',
            'parchi na': 'issue',
            'kaj kore na': 'issue',
            'noshto': 'issue',
            'link': 'link',
            'telegram': 'telegram',
            'group': 'telegram',
            'channel': 'telegram',
            'join': 'telegram'
        };

        // Check Greetings - English Reply Only
        if (['hi', 'hello', 'hey', 'salam', 'assalamualaikum', 'oi'].some(w => lowerInput.includes(w)) && lowerInput.length < 15) {
            return `Hello! 👋 How can I assist you today?`;
        }

        // Check FAQs with Mapping
        const matchedFAQ = faqs.find(faq => {
            const keywords = faq.keywords.toLowerCase().split(',').map(k => k.trim()).filter(k => k);
            return keywords.some(k => {
                if (lowerInput.includes(k)) return true;
                // Check mapped words
                const inputWords = lowerInput.split(' ');
                return inputWords.some(word => intentMap[word] === k);
            });
        });

        if (matchedFAQ) return matchedFAQ.answer;

        return null; // Proceed to Search
    };

    const handleContentSearch = async (rawInput: string, lang: Language) => {
        // 🧹 Smart Cleaning
        const stopWords = [
            // English
            'movie', 'series', 'anime', 'download', 'link', 'please', 'plz', 'do you have', 'is it available', 'search', 'find', 'want',
            // Bangla / Banglish
            'ache', 'ase', 'chai', 'pabo', 'lagbe', 'ni', 'nai', 'kobe', 'ashbe', 'link den', 'dhen', 'kothay', 'ki', 'ace', 'ase', 'den'
        ];

        let searchQuery = rawInput;
        stopWords.forEach(word => {
            searchQuery = searchQuery.replace(new RegExp(`\\b${word}\\b`, 'gi'), '');
        });

        searchQuery = searchQuery.replace(/[?.,!]/g, '').trim();

        if (searchQuery.length < 2) {
            const fallback = lang === 'bn' ? "বঝতে পারিনি, শুধু নামটা বলুন?" : lang === 'banglish' ? "Bujhte parini, shudhu naam ta bolun?" : "Sorry? Please type just the name.";
            setMessages(prev => [...prev, { text: fallback, isBot: true }]);
            setIsTyping(false);
            return;
        }

        // 🔍 Database Search (Fuzzy Logic using ilike)
        const { data: movies } = await supabase
            .from('movies')
            .select('title, slug, type, release_year, poster_url')
            .ilike('title', `%${searchQuery}%`)
            .limit(3);

        if (movies && movies.length > 0) {
            // ✅ FOUND - Use Dictionary
            const responseContent = (
                <div className="flex flex-col gap-3">
                    <span className="font-medium text-green-400">
                        {DICTIONARY.found[lang]} "{searchQuery}":
                    </span>
                    {movies.map(m => (
                        <Link
                            key={m.slug}
                            href={`/${m.type}/${m.slug}`}
                            className="flex items-center gap-3 p-2 bg-white/5 rounded-xl border border-white/5 hover:bg-white/10 transition-all hover:scale-[1.02] group"
                            onClick={() => setIsOpen(false)} // Close chat on click
                        >
                            {/* Tiny Poster */}
                            <div className="w-10 h-14 relative rounded overflow-hidden bg-dark-700 flex-shrink-0">
                                {m.poster_url && (
                                    <Image src={m.poster_url} alt={m.title} fill className="object-cover" />
                                )}
                            </div>
                            <div className="flex-1 min-w-0">
                                <h4 className="text-sm font-bold text-white group-hover:text-red-500 truncate">{m.title}</h4>
                                <div className="flex items-center gap-2 text-[10px] text-gray-400">
                                    <span className="uppercase bg-white/10 px-1 rounded">{m.type}</span>
                                    <span>{m.release_year}</span>
                                </div>
                            </div>
                            <div className="text-red-500">
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
                            </div>
                        </Link>
                    ))}
                </div>
            );
            setMessages(prev => [...prev, { text: responseContent, isBot: true }]);
        } else {
            // ❌ NOT FOUND -> Auto Request
            const { error } = await supabase.from('content_requests').insert({
                content_name: searchQuery
            });

            if (error) {
                console.error('Request Error:', error);
                setMessages(prev => [...prev, { text: DICTIONARY.error[lang], isBot: true }]);
            } else {
                // Use Dictionary for Not Found
                const notFoundMsg = DICTIONARY.notFound[lang];
                setMessages(prev => [...prev, { text: notFoundMsg, isBot: true }]);
            }
        }
        setIsTyping(false);
    };

    if (settings && !settings.is_enabled) return null;

    return (
        <>
            {/* Toggle Button (FAB) */}
            {!isOpen && (
                <button
                    onClick={() => setIsOpen(true)}
                    className="fixed bottom-20 md:bottom-6 right-6 z-50 p-0 w-14 h-14 bg-red-600 hover:bg-red-700 rounded-full shadow-lg shadow-red-900/40 transition-all hover:scale-110 active:scale-95 animate-bounce-slow flex items-center justify-center group overflow-hidden"
                >
                    <div className="absolute inset-0 bg-gradient-to-tr from-red-600 to-orange-500 opacity-0 group-hover:opacity-100 transition-opacity" />
                    <svg className="w-7 h-7 text-white relative z-10" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
                    </svg>
                    {/* Notification Dot */}
                    <span className="absolute top-3 right-3 w-2.5 h-2.5 bg-green-400 border-2 border-red-600 rounded-full z-20 animate-pulse"></span>
                </button>
            )}

            {/* Chat Window */}
            {isOpen && (
                <div className="fixed bottom-20 md:bottom-6 right-6 z-50 w-[90vw] md:w-[380px] h-[550px] max-h-[80vh] flex flex-col bg-dark-900/95 backdrop-blur-xl border border-white/10 rounded-2xl shadow-2xl overflow-hidden animate-fade-in-up ring-1 ring-white/5">
                    {/* Animated Header */}
                    <div className="p-4 bg-gradient-to-r from-red-600 to-red-700 flex items-center justify-between relative overflow-hidden">
                        {/* Background Pattern */}
                        <div className="absolute inset-0 opacity-10 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')]"></div>

                        <div className="flex items-center gap-3 relative z-10">
                            <div className="w-10 h-10 bg-white/20 backdrop-blur-md rounded-full flex items-center justify-center text-xl shadow-inner border border-white/10">
                                🤖
                            </div>
                            <div>
                                <h3 className="font-bold text-white text-sm tracking-wide">NexiBot</h3>
                                {/* Animated Status Text */}
                                <div className="flex items-center gap-1.5 h-4">
                                    <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse shadow-[0_0_8px_rgba(74,222,128,0.6)]"></span>
                                    <span className="text-[11px] text-white/90 font-medium animate-fade-in key-{textIndex}">
                                        {headerText}
                                    </span>
                                </div>
                            </div>
                        </div>
                        <div className="flex items-center gap-1 z-10">
                            <button
                                onClick={handleDeleteChat}
                                className="p-2 hover:bg-white/20 rounded-full transition-colors text-white/80 hover:text-white"
                                title="Delete Chat History"
                            >
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                </svg>
                            </button>
                            <button
                                onClick={() => setIsOpen(false)}
                                className="p-2 hover:bg-white/20 rounded-full transition-colors text-white/80 hover:text-white"
                            >
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                </svg>
                            </button>
                        </div>
                    </div>

                    {/* Messages Area */}
                    <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-black/40 scrollbar-thin scrollbar-thumb-white/10 scrollbar-track-transparent">
                        {messages.map((msg, idx) => (
                            <div
                                key={idx}
                                className={`flex ${msg.isBot ? 'justify-start' : 'justify-end'} animate-fade-in group`}
                            >
                                <div className={`flex flex-col ${msg.isBot ? 'items-start' : 'items-end'} max-w-[85%]`}>
                                    <div
                                        className={`relative p-3.5 rounded-2xl text-sm leading-relaxed shadow-sm w-full ${msg.isBot
                                            ? 'bg-dark-700 text-gray-100 rounded-tl-sm border border-white/5'
                                            : 'bg-red-600 text-white rounded-tr-sm shadow-red-900/20 shadow-lg'
                                            }`}
                                    >
                                        {msg.text}
                                    </div>
                                    {/* Translate Button for Bot */}
                                    {msg.isBot && typeof msg.text === 'string' && (
                                        <button
                                            onClick={() => handleTranslate(idx)}
                                            className="text-[10px] text-gray-500 mt-1 ml-1 hover:text-white flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity"
                                        >
                                            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5h12M9 3v2m1.048 9.5A18.022 18.022 0 016.412 9m6.088 9h7M11 21l5-10 5 10M12.751 5C11.783 10.77 8.07 15.61 3 18.129" />
                                            </svg>
                                            {msg.isTranslated ? 'Show Original' : 'Translate to Bengali'}
                                        </button>
                                    )}
                                </div>
                            </div>
                        ))}
                        {isTyping && (
                            <div className="flex justify-start animate-fade-in">
                                <div className="bg-dark-700 px-4 py-3 rounded-2xl rounded-tl-sm flex gap-1 items-center border border-white/5">
                                    <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce [animation-delay:-0.3s]"></span>
                                    <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce [animation-delay:-0.15s]"></span>
                                    <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce"></span>
                                </div>
                            </div>
                        )}
                        <div ref={messagesEndRef} />
                    </div>

                    {/* Input Area */}
                    <div className="p-3 bg-dark-800 border-t border-white/5">
                        <div className="flex items-center gap-2 bg-dark-900/80 p-1.5 rounded-xl border border-white/5 focus-within:border-red-500/50 focus-within:ring-1 focus-within:ring-red-500/20 transition-all shadow-inner">
                            <input
                                type="text"
                                value={inputText}
                                onChange={(e) => setInputText(e.target.value)}
                                onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                                placeholder="Write content name..."
                                className="flex-1 bg-transparent px-3 text-sm text-white placeholder-gray-500 focus:outline-none"
                            />
                            <button
                                onClick={handleSend}
                                disabled={!inputText.trim()}
                                className="p-2.5 bg-red-600 hover:bg-red-500 disabled:bg-gray-700 disabled:cursor-not-allowed text-white rounded-lg transition-all active:scale-95 shadow-lg shadow-red-900/20"
                            >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                                </svg>
                            </button>
                        </div>
                    </div>
                </div >
            )
            }
        </>
    );
}
