import type { Metadata } from 'next';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import SplashScreen from '@/components/SplashScreen';
import AdManager from '@/components/AdManager';
import AnimatedTelegramCTA from '@/components/AnimatedTelegramCTA';
import Chatbot from '@/components/Chatbot';

export const metadata: Metadata = {
    title: 'Nexiplay - Download Movies, Series & Anime',
    description: 'Your ultimate destination for downloading high-quality movies, series, and anime. Free HD downloads available.',
    keywords: ['movies', 'series', 'anime', 'download', 'HD', 'free'],
    openGraph: {
        title: 'Nexiplay - Download Movies, Series & Anime',
        description: 'Your ultimate destination for downloading high-quality movies, series, and anime.',
        type: 'website',
    },
};

export default function SiteLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <div className="flex flex-col min-h-screen">
            <AdManager />
            <SplashScreen />
            <Header />
            <AnimatedTelegramCTA />
            <main className="flex-1">
                {children}
            </main>
            <Chatbot />
            <Footer />
        </div>
    );
}
