import { Inter } from 'next/font/google';
import Script from 'next/script';
import './globals.css';

import NoticeSystem from '@/components/NoticeSystem';
import AppLaunchModal from '@/components/AppLaunchModal';
import AntiAdBlockGate from '@/components/AntiAdBlockGate';
import SecurityShield from '@/components/SecurityShield';
import CookieConsent from '@/components/CookieConsent';
import NavigationProgressBar from '@/components/NavigationProgressBar';
import { PopunderAd, SocialBarAd } from '@/components/ads';
import { AdProvider } from '@/context/AdProvider';
import { TutorialProvider } from '@/context/TutorialContext';
import { ActiveMovieProvider } from '@/context/ActiveMovieContext';
import { AuthProvider } from '@/context/AuthContext';
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
                <script
                    dangerouslySetInnerHTML={{
                        __html: `(function(){try{var b=function(e){e.preventDefault();e.stopPropagation();if(e.stopImmediatePropagation)e.stopImmediatePropagation();return false;};window.addEventListener('contextmenu',b,true);document.addEventListener('contextmenu',b,true);var k=function(e){var c=e.ctrlKey||e.metaKey,s=e.shiftKey||e.altKey,ky=(e.key||'').toLowerCase(),cd=e.code||'',kc=e.keyCode||e.which;if(ky==='f12'||cd==='F12'||kc===123||ky==='contextmenu'||cd==='ContextMenu'||kc===93||(e.shiftKey&&(ky==='f10'||cd==='F10'||kc===121)))return b(e);if(c){if(s&&(ky==='i'||cd==='KeyI'||kc===73||ky==='j'||cd==='KeyJ'||kc===74||ky==='c'||cd==='KeyC'||kc===67||ky==='k'||cd==='KeyK'||kc===75||ky==='e'||cd==='KeyE'||kc===69||ky==='m'||cd==='KeyM'||kc===77))return b(e);if(ky==='u'||cd==='KeyU'||kc===85||ky==='s'||cd==='KeyS'||kc===83||ky==='p'||cd==='KeyP'||kc===80)return b(e);}};window.addEventListener('keydown',k,true);document.addEventListener('keydown',k,true);}catch(_){}})();`,
                    }}
                />
                <NavigationProgressBar />
                <AdProvider>
                    <TutorialProvider>
                        <AuthProvider>
                            <ActiveMovieProvider>
                                <NoticeSystem />
                                <AppLaunchModal />
                                <PopunderAd />
                                <SocialBarAd />
                                <AntiAdBlockGate />
                                <SecurityShield />
                                <CookieConsent />

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
                            </ActiveMovieProvider>
                        </AuthProvider>
                    </TutorialProvider>
                </AdProvider>
            </body>
        </html>
    );
}
