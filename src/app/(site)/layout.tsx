import Header from '@/components/Header';
import Footer from '@/components/Footer';
import SplashScreen from '@/components/SplashScreen';
import AnimatedTelegramCTA from '@/components/AnimatedTelegramCTA';
import ClientChatbot from '@/components/ClientChatbot';
import AdultGateProvider from '@/components/AdultGateProvider';
import UserAnalyticsTracker from '@/components/UserAnalyticsTracker';

export default function SiteLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <div className="flex flex-col min-h-screen">
            <SplashScreen />
            <UserAnalyticsTracker />
            <Header />
            <AnimatedTelegramCTA />
            <AdultGateProvider>
                <main className="flex-1">{children}</main>
            </AdultGateProvider>
            <ClientChatbot />
            <Footer />
        </div>
    );
}
