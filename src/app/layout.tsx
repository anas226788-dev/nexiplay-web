import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';

import AdSpot from '@/components/AdSpot';
import NoticeSystem from '@/components/NoticeSystem';
import Script from 'next/script';

const inter = Inter({
    subsets: ['latin'],
    display: 'swap', // Prevents font blocking
    preload: true,
});

// Constants... (metadata)
export const metadata: Metadata = {
    title: {
        template: '%s | Nexiplay',
        default: 'Nexiplay - Download Movies, Series & Anime',
    },
    description: 'Your ultimate destination for downloading high-quality movies, series, and anime.',
    verification: {
        google: 'jvLQjTLiIH_oAJPYsTyeKWYb1HlqXpjAcO_kk-0Tm8g',
    },
    icons: {
        icon: '/favicon.png',
        shortcut: '/favicon.png',
        apple: '/favicon.png',
    },
};

export const viewport = {
    width: 'device-width',
    initialScale: 1,
    maximumScale: 1,
    userScalable: false,
};

export default function RootLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <html lang="en" suppressHydrationWarning>
            <body className={`${inter.className} gradient-bg min-h-screen`} suppressHydrationWarning>
                <NoticeSystem />
                <AdSpot placement="popup_global" />

                {/* Google Analytics 4 */}
                <Script
                    src="https://www.googletagmanager.com/gtag/js?id=G-697MJ5V5CL"
                    strategy="afterInteractive"
                />
                <Script id="google-analytics" strategy="afterInteractive">
                    {`
                        window.dataLayer = window.dataLayer || [];
                        function gtag(){dataLayer.push(arguments);}
                        gtag('js', new Date());
                        gtag('config', 'G-697MJ5V5CL');
                    `}
                </Script>

                {children}
            </body>
        </html>
    );
}
