import { Inter } from 'next/font/google';
import Script from 'next/script';
import './globals.css';

import NoticeSystem from '@/components/NoticeSystem';
import { PopunderAd, SocialBarAd } from '@/components/ads';
import { AdProvider } from '@/context/AdProvider';
import { TutorialProvider } from '@/context/TutorialContext';
import { rootMetadata } from '@/lib/metadata';

const inter = Inter({
    subsets: ['latin'],
    display: 'swap',
    preload: true,
});

export const metadata = rootMetadata;

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
                <AdProvider>
                    <TutorialProvider>
                        <NoticeSystem />
                        <PopunderAd />
                        <SocialBarAd />

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
                    </TutorialProvider>
                </AdProvider>
            </body>
        </html>
    );
}
