'use client';

import dynamic from 'next/dynamic';

// Lazy load Chatbot (Client Component Only)
// This wrapper is needed because we can't use ssr: false in Server Components directly
const Chatbot = dynamic(() => import('@/components/Chatbot'), {
    ssr: false,
    loading: () => null // Invisible loading state
});

export default function ClientChatbot() {
    return <Chatbot />;
}
