'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import Link from 'next/link';
import Image from 'next/image';

// --- TYPES ---
interface ChatbotConfig {
    is_enabled: boolean;
    bot_name: string | null;
    welcome_message: string | null;
}

interface ContentResult {
    title: string;
    slug: string;
    type: string;
    release_year: number | null;
    poster_url: string | null;
}

interface ChatMessage {
    text: string | React.ReactNode;
    isBot: boolean;
    role?: 'user' | 'assistant';
    plainText?: string;
    agent?: string;
}

interface StreamStatus {
    step: string;
    message: string;
}

const formatAgentName = (name?: string | null): string => {
    if (!name) return '';
    let cleaned = name.trim();
    if (cleaned.toLowerCase().startsWith('openrouter (')) {
        cleaned = cleaned.slice(12, -1).trim();
    } else if (cleaned.toLowerCase().startsWith('groq (')) {
        cleaned = cleaned.slice(6, -1).trim();
    }
    if (cleaned.includes('/')) {
        cleaned = cleaned.split('/').pop() || cleaned;
    }
    return cleaned
        .replace(/^openrouter\s*/i, '')
        .replace(/^groq\s*/i, '')
        .replace(/:free$/i, '')
        .replace(/-free$/i, '')
        .replace(/\s*\(free\)$/i, '')
        .trim();
};

export default function Chatbot() {
    const [isOpen, setIsOpen] = useState(false);
    const [settings, setSettings] = useState<ChatbotConfig | null>(null);
    const [messages, setMessages] = useState<ChatMessage[]>([]);
    const [inputText, setInputText] = useState('');
    const [isTyping, setIsTyping] = useState(false);
    const [currentSteps, setCurrentSteps] = useState<StreamStatus[]>([]);
    const [headerText, setHeaderText] = useState('Ask me anything ✨');
    const [activeAgent, setActiveAgent] = useState<string | null>(null);

    const headerTexts = ["Ask me anything ✨", "Powered by AI 🧠", "Any language 🌍", "Download help 📥", "Movies & Anime 🎬"];
    const [textIndex, setTextIndex] = useState(0);

    const messagesEndRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLInputElement>(null);

    // --- Effects ---
    useEffect(() => {
        if (isOpen && !settings) fetchChatSettings();
        const interval = setInterval(() => {
            setTextIndex(prev => (prev + 1) % headerTexts.length);
        }, 3000);
        return () => clearInterval(interval);
    }, [isOpen, settings]);

    useEffect(() => { setHeaderText(headerTexts[textIndex]); }, [textIndex]);

    useEffect(() => {
        if (messages.length === 0) {
            const welcome = "Hi! I'm Nexiplay AI Assistant. Ask me anything about movies, anime, series, or how to download — in any language! 😊\n\n💡 Tip: Type a movie/anime name and I'll find it for you!";
            setMessages([{
                text: <span className="whitespace-pre-line">{welcome}</span>,
                isBot: true, role: 'assistant', plainText: welcome
            }]);
        }
    }, [isOpen]);

    useEffect(() => { scrollToBottom(); }, [messages, isOpen, isTyping, currentSteps]);

    useEffect(() => {
        if (isOpen) setTimeout(() => inputRef.current?.focus(), 300);
    }, [isOpen]);

    const scrollToBottom = () => messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });

    const fetchChatSettings = async () => {
        try {
            const { data } = await supabase.from('chatbot_settings').select('is_enabled, bot_name, welcome_message').single();
            if (data) setSettings(data);
        } catch {
            setSettings({ is_enabled: true, bot_name: 'NexiBot AI', welcome_message: null });
        }
    };

    const getAIHistory = useCallback((): { role: string; content: string }[] => {
        return messages.filter(m => m.role && m.plainText).map(m => ({ role: m.role!, content: m.plainText! }));
    }, [messages]);

    // --- Render Content Result Cards ---
    const renderResultCards = (results: ContentResult[]) => (
        <div className="flex flex-col gap-3">
            <span className="font-medium text-green-400">✅ Found on Nexiplay:</span>
            {results.map(m => (
                <Link key={m.slug} href={`/${m.type}/${m.slug}`}
                    className="flex items-center gap-3 p-2 bg-white/5 rounded-xl border border-white/5 hover:bg-white/10 transition-all hover:scale-[1.02] group"
                    onClick={() => setIsOpen(false)}>
                    <div className="w-10 h-14 relative rounded overflow-hidden bg-dark-700 flex-shrink-0">
                        {m.poster_url && <Image src={m.poster_url} alt={m.title} fill className="object-cover" />}
                    </div>
                    <div className="flex-1 min-w-0">
                        <h4 className="text-sm font-bold text-white group-hover:text-red-500 truncate">{m.title}</h4>
                        <div className="flex items-center gap-2 text-[10px] text-gray-400">
                            <span className="uppercase bg-white/10 px-1 rounded">{m.type}</span>
                            {m.release_year && <span>{m.release_year}</span>}
                        </div>
                    </div>
                    <div className="text-red-500">
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
                    </div>
                </Link>
            ))}
        </div>
    );

    // --- Render Request Submitted Badge ---
    const renderRequestBadge = () => (
        <div className="flex flex-col gap-2 mt-2">
            <div className="flex items-center gap-2 p-2 bg-yellow-500/10 border border-yellow-500/20 rounded-lg">
                <svg className="w-4 h-4 text-yellow-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span className="text-[11px] text-yellow-400/90">📥 Request sent to admin</span>
            </div>
            {renderContactFallback()}
        </div>
    );

    // --- Contact Page Fallback Link ---
    const renderContactFallback = () => (
        <div className="p-2.5 bg-blue-500/5 border border-blue-500/10 rounded-lg">
            <p className="text-[11px] text-gray-400 leading-relaxed">
                <span className="text-blue-400">🔹</span> AI আপনার কথা সঠিকভাবে না বুঝলে, <Link href="/contact" onClick={() => setIsOpen(false)} className="text-blue-400 underline hover:text-blue-300">Contact পেজে</Link> গিয়ে সঠিক নাম দিয়ে request করুন।
            </p>
            <p className="text-[10px] text-gray-500 mt-1">
                <span className="text-blue-400">🔹</span> If AI didn&apos;t understand you correctly, <Link href="/contact" onClick={() => setIsOpen(false)} className="text-blue-400 underline hover:text-blue-300">visit Contact page</Link> to submit your request with the correct name.
            </p>
        </div>
    );

    // --- Render TMDB Verified Badge ---
    const renderTMDBBadge = (info: { title?: string; type?: string; year?: string; poster?: string }) => (
        <div className="flex items-center gap-3 mt-2 p-2.5 bg-blue-500/10 border border-blue-500/20 rounded-lg">
            {info.poster && (
                <div className="w-8 h-12 relative rounded overflow-hidden flex-shrink-0">
                    <Image src={info.poster} alt={info.title || ''} fill className="object-cover" />
                </div>
            )}
            <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5">
                    <span className="text-[10px] bg-blue-500/30 text-blue-300 px-1.5 py-0.5 rounded font-bold">✓ VERIFIED</span>
                </div>
                <p className="text-[11px] text-blue-300/80 mt-0.5 truncate">
                    {info.title} {info.type && `• ${info.type}`} {info.year && `• ${info.year}`}
                </p>
            </div>
        </div>
    );

    // --- Step Status Icons ---
    const getStepIcon = (step: string) => {
        switch (step) {
            case 'thinking': return '🧠';
            case 'searching_local': return '🔍';
            case 'verifying_online': return '🌐';
            case 'submitting': return '📥';
            case 'generating': return '💬';
            case 'not_verified': return '❌';
            default: return '⏳';
        }
    };

    // --- Streaming Status Indicator ---
    const renderStreamingSteps = () => {
        if (currentSteps.length === 0) return null;
        return (
            <div className="flex justify-start animate-fade-in">
                <div className="bg-dark-700 p-3.5 rounded-2xl rounded-tl-sm border border-white/5 max-w-[85%] w-full">
                    <div className="space-y-2">
                        {currentSteps.map((s, i) => {
                            const isLatest = i === currentSteps.length - 1;
                            const isDone = !isLatest;
                            return (
                                <div key={i} className={`flex items-center gap-2.5 transition-all duration-300 ${isDone ? 'opacity-50' : 'opacity-100'}`}>
                                    {isDone ? (
                                        <span className="text-green-400 text-xs">✓</span>
                                    ) : (
                                        <span className="animate-pulse text-sm">{getStepIcon(s.step)}</span>
                                    )}
                                    <span className={`text-xs ${isDone ? 'text-gray-500 line-through' : 'text-gray-300 font-medium'}`}>
                                        {s.message}
                                    </span>
                                    {isLatest && (
                                        <span className="flex gap-0.5 ml-1">
                                            <span className="w-1.5 h-1.5 bg-red-400 rounded-full animate-bounce [animation-delay:-0.3s]" />
                                            <span className="w-1.5 h-1.5 bg-red-400 rounded-full animate-bounce [animation-delay:-0.15s]" />
                                            <span className="w-1.5 h-1.5 bg-red-400 rounded-full animate-bounce" />
                                        </span>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                </div>
            </div>
        );
    };

    // --- Main Send Handler (Frontend-animated steps) ---
    const handleSend = async () => {
        if (!inputText.trim() || isTyping) return;

        const userMessage = inputText.trim();
        setInputText('');

        setMessages(prev => [...prev, {
            text: userMessage, isBot: false, role: 'user', plainText: userMessage
        }]);

        setIsTyping(true);
        setCurrentSteps([]);

        // Helper: add a step with delay
        const addStep = (step: string, message: string) => {
            return new Promise<void>(resolve => {
                setCurrentSteps(prev => [...prev, { step, message }]);
                setTimeout(resolve, 900);
            });
        };

        try {
            // Step 1: Show "Thinking" immediately
            await addStep('thinking', '🧠 Analyzing your message...');

            // Start the API call (non-streaming for reliability)
            const history = getAIHistory();
            const fetchPromise = fetch('/api/chat', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ message: userMessage, history, streaming: false })
            });

            // Step 2: Show "Searching" while waiting
            await addStep('searching_local', '🔍 Searching Nexiplay database...');

            // Wait for API response
            const response = await fetchPromise;
            if (!response.ok) throw new Error(`API error: ${response.status}`);
            const data = await response.json();

            // Step 3: Show additional steps based on what happened
            if (data.intent === 'search' && !data.found) {
                if (data.tmdbVerified !== undefined) {
                    await addStep('verifying_online', '🌐 Verifying online...');
                }
                if (data.requestSubmitted) {
                    await addStep('submitting', '📥 Submitting request to admin...');
                }
                if (data.tmdbVerified === false) {
                    await addStep('not_verified', '❌ Could not verify this title');
                }
            }

            // Small delay before showing result
            await new Promise(r => setTimeout(r, 500));

            // Show the result
            handleStreamResult(data);

        } catch (error) {
            console.error('Send error:', error);
            setMessages(prev => [...prev, {
                text: "Sorry, I'm having trouble right now. Please try again! 🙏",
                isBot: true, role: 'assistant',
                plainText: "Sorry, I'm having trouble right now. Please try again!"
            }]);
        } finally {
            setIsTyping(false);
            setCurrentSteps([]);
        }
    };

    // --- Handle final result from stream ---
    const handleStreamResult = (data: {
        reply?: string; intent?: string; found?: boolean;
        results?: ContentResult[]; requestSubmitted?: boolean;
        tmdbVerified?: boolean; tmdbInfo?: { title?: string; type?: string; year?: string; poster?: string };
        error?: string;
        agent?: string;
    }) => {
        if (data.error) {
            setMessages(prev => [...prev, {
                text: data.error, isBot: true, role: 'assistant', plainText: data.error
            }]);
            return;
        }

        if (data.agent) {
            setActiveAgent(data.agent);
        }

        // Search with results found
        if (data.intent === 'search' && data.found && data.results && data.results.length > 0) {
            setMessages(prev => [...prev, {
                text: renderResultCards(data.results!),
                isBot: true, role: 'assistant',
                plainText: `Found on Nexiplay: ${data.results!.map(r => r.title).join(', ')}`,
                agent: data.agent
            }]);
            if (data.reply) {
                setMessages(prev => [...prev, {
                    text: <span className="whitespace-pre-line">{data.reply}</span>,
                    isBot: true, role: 'assistant', plainText: data.reply,
                    agent: data.agent
                }]);
            }
        }
        // Search not found
        else if (data.intent === 'search' && !data.found) {
            const replyContent = (
                <div>
                    <span className="whitespace-pre-line">{data.reply}</span>
                    {data.tmdbVerified && data.tmdbInfo && renderTMDBBadge(data.tmdbInfo)}
                    {data.requestSubmitted && renderRequestBadge()}
                    {data.tmdbVerified === false && (
                        <div className="flex flex-col gap-2 mt-2">
                            <div className="flex items-center gap-2 p-2 bg-red-500/10 border border-red-500/20 rounded-lg">
                                <span className="text-[11px] text-red-400/90">⚠️ Could not verify as a real movie/anime/series</span>
                            </div>
                            {renderContactFallback()}
                        </div>
                    )}
                </div>
            );
            setMessages(prev => [...prev, {
                text: replyContent, isBot: true, role: 'assistant',
                plainText: data.reply || "Content not found.",
                agent: data.agent
            }]);
        }
        // General chat
        else {
            setMessages(prev => [...prev, {
                text: <span className="whitespace-pre-line">{data.reply}</span>,
                isBot: true, role: 'assistant', plainText: data.reply,
                agent: data.agent
            }]);
        }
    };

    const handleDeleteChat = () => {
        if (confirm("Are you sure you want to delete chat history?")) {
            const welcome = "Hi! I'm Nexiplay AI Assistant. Ask me anything about movies, anime, series, or how to download — in any language! 😊\n\n💡 Tip: Type a movie/anime name and I'll find it for you!";
            setMessages([{
                text: <span className="whitespace-pre-line">{welcome}</span>,
                isBot: true, role: 'assistant', plainText: welcome
            }]);
            setActiveAgent(null);
            localStorage.removeItem('nexiplay_chat_history');
        }
    };

    if (settings && !settings.is_enabled) return null;

    return (
        <>
            {/* Toggle Button (FAB) + Floating Message */}
            {!isOpen && (
                <div className="fixed bottom-20 md:bottom-6 right-4 md:right-6 z-50 flex items-end gap-2 md:gap-3">
                    <div className="animate-float bg-white text-gray-800 px-3 py-2 md:px-4 md:py-2.5 rounded-2xl rounded-br-sm shadow-xl text-xs md:text-sm font-medium max-w-[160px] md:max-w-[200px] relative">
                        <span>Need help? Chat with me! 💬</span>
                        <div className="absolute -right-2 bottom-2 w-0 h-0 border-t-[6px] border-t-transparent border-b-[6px] border-b-transparent border-l-[8px] border-l-white"></div>
                    </div>
                    <button onClick={() => setIsOpen(true)}
                        className="p-0 w-14 h-14 md:w-16 md:h-16 bg-gradient-to-br from-red-500 to-red-700 hover:from-red-600 hover:to-red-800 rounded-full shadow-lg shadow-red-900/40 transition-all duration-300 hover:scale-110 active:scale-95 flex items-center justify-center group overflow-hidden flex-shrink-0">
                        <svg className="w-7 h-7 md:w-8 md:h-8 text-white relative z-10" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                        </svg>
                        <span className="absolute top-1.5 right-1.5 md:top-2 md:right-2 w-3 h-3 md:w-3.5 md:h-3.5 bg-green-400 border-2 border-red-600 rounded-full z-20 animate-pulse shadow-[0_0_8px_rgba(74,222,128,0.6)]"></span>
                    </button>
                </div>
            )}

            {/* Chat Window */}
            {isOpen && (
                <div className="fixed bottom-0 left-0 right-0 md:bottom-6 md:left-auto md:right-6 z-50 w-full md:w-[380px] h-[85vh] md:h-[550px] md:max-h-[80vh] flex flex-col bg-dark-900/95 backdrop-blur-xl border-t md:border border-white/10 md:rounded-2xl shadow-2xl overflow-hidden animate-fade-in-up ring-1 ring-white/5">
                    {/* Header */}
                    <div className="p-4 bg-gradient-to-r from-red-600 to-red-700 flex items-center justify-between relative overflow-hidden">
                        <div className="absolute inset-0 opacity-10 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')]"></div>
                        <div className="flex items-center gap-3 relative z-10">
                            <div className="w-10 h-10 bg-white/20 backdrop-blur-md rounded-full flex items-center justify-center text-xl shadow-inner border border-white/10">🤖</div>
                            <div>
                                <h3 className="font-bold text-white text-sm tracking-wide flex items-center gap-1.5">
                                    {settings?.bot_name || 'NexiBot AI'}
                                    <span className="text-[9px] bg-white/20 px-1.5 py-0.5 rounded-full font-medium tracking-wider">SMART AI</span>
                                </h3>
                                <div className="flex items-center gap-1.5 h-4">
                                    <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse shadow-[0_0_8px_rgba(74,222,128,0.6)]"></span>
                                    <span className="text-[11px] text-white/90 font-medium animate-fade-in">
                                        {activeAgent ? `Connected: ${formatAgentName(activeAgent)}` : headerText}
                                    </span>
                                </div>
                            </div>
                        </div>
                        <div className="flex items-center gap-1 z-10">
                            <button onClick={handleDeleteChat} className="p-2 hover:bg-white/20 rounded-full transition-colors text-white/80 hover:text-white" title="Delete Chat History">
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                            </button>
                            <button onClick={() => setIsOpen(false)} className="p-2 hover:bg-white/20 rounded-full transition-colors text-white/80 hover:text-white">
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                            </button>
                        </div>
                    </div>

                    {/* Messages Area */}
                    <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-black/40 scrollbar-thin scrollbar-thumb-white/10 scrollbar-track-transparent">
                        {messages.map((msg, idx) => (
                            <div key={idx} className={`flex ${msg.isBot ? 'justify-start' : 'justify-end'} animate-fade-in group`}>
                                <div className={`flex flex-col ${msg.isBot ? 'items-start' : 'items-end'} max-w-[85%]`}>
                                    <div className={`relative p-3.5 rounded-2xl text-sm leading-relaxed shadow-sm w-full ${msg.isBot
                                        ? 'bg-dark-700 text-gray-100 rounded-tl-sm border border-white/5'
                                        : 'bg-red-600 text-white rounded-tr-sm shadow-red-900/20 shadow-lg'}`}>
                                        {msg.text}
                                    </div>
                                    {msg.isBot && msg.agent && (
                                        <div className="text-[10px] text-gray-500 mt-1 ml-1 flex items-center gap-1">
                                            <span className="w-1.5 h-1.5 rounded-full bg-green-500 inline-block"></span>
                                            <span>Active Agent: {formatAgentName(msg.agent)}</span>
                                        </div>
                                    )}
                                </div>
                            </div>
                        ))}

                        {/* Streaming Step Status */}
                        {isTyping && renderStreamingSteps()}

                        {/* Fallback typing indicator (when no steps yet) */}
                        {isTyping && currentSteps.length === 0 && (
                            <div className="flex justify-start animate-fade-in">
                                <div className="bg-dark-700 px-4 py-3 rounded-2xl rounded-tl-sm flex gap-1.5 items-center border border-white/5">
                                    <span className="w-2 h-2 bg-red-400 rounded-full animate-bounce [animation-delay:-0.3s]"></span>
                                    <span className="w-2 h-2 bg-red-400 rounded-full animate-bounce [animation-delay:-0.15s]"></span>
                                    <span className="w-2 h-2 bg-red-400 rounded-full animate-bounce"></span>
                                    <span className="text-[10px] text-gray-500 ml-2">AI is thinking...</span>
                                </div>
                            </div>
                        )}
                        <div ref={messagesEndRef} />
                    </div>

                    {/* Input Area */}
                    <div className="p-3 bg-dark-800 border-t border-white/5">
                        <div className="flex items-center gap-2 bg-dark-900/80 p-1.5 rounded-xl border border-white/5 focus-within:border-red-500/50 focus-within:ring-1 focus-within:ring-red-500/20 transition-all shadow-inner">
                            <input ref={inputRef} type="text" value={inputText}
                                onChange={(e) => setInputText(e.target.value)}
                                onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                                placeholder="Ask anything or search content..."
                                disabled={isTyping}
                                className="flex-1 bg-transparent px-3 text-sm text-white placeholder-gray-500 focus:outline-none disabled:opacity-50" />
                            <button onClick={handleSend} disabled={!inputText.trim() || isTyping}
                                className="p-2.5 bg-red-600 hover:bg-red-500 disabled:bg-gray-700 disabled:cursor-not-allowed text-white rounded-lg transition-all active:scale-95 shadow-lg shadow-red-900/20">
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                                </svg>
                            </button>
                        </div>
                        <p className="text-center text-[10px] text-gray-600 mt-1.5 px-2">
                            ⚡ AI ভুল করতে পারে। সঠিক তথ্যের জন্য যাচাই করুন।
                            <span className="text-gray-700"> • </span>
                            AI can make mistakes. Please verify.
                        </p>
                    </div>
                </div>
            )}
        </>
    );
}
