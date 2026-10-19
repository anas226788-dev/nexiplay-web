'use client';

import dynamic from 'next/dynamic';
import { usePathname } from 'next/navigation';

// Lazy load Chatbot (Client Component Only)
// This wrapper is needed because we can't use ssr: false in Server Components directly
const Chatbot = dynamic(() => import('@/components/Chatbot'), {
    ssr: false,
    loading: () => null // Invisible loading state
});

export default function ClientChatbot() {
    const pathname = usePathname();

    // Do not display chatbot on immersive fullscreen Shorts feed
    if (pathname?.startsWith('/shorts')) {
        return null;
    }

    return <Chatbot />;
}

