'use client';

import { useState, useEffect } from 'react';
import AdVerificationPopup from './AdVerificationPopup';
import { useAdSettings } from '@/hooks/useAdSettings';

import { checkDownloadVerified, saveDownloadVerification } from '@/lib/verification';

export default function NovelVerificationGuard({ novelId, children }: { novelId: string, children: React.ReactNode }) {
    const { settings: adSettings, isLoading } = useAdSettings();
    const [needsVerification, setNeedsVerification] = useState(false);

    useEffect(() => {
        if (isLoading) return;
        
        const verificationEnabled = adSettings?.isNovelVerificationEnabled ?? false;
        if (!verificationEnabled) return;

        // Check if verified specifically for this novel
        const isVerified = checkDownloadVerified(novelId, 'novel');
        
        if (!isVerified) {
            setNeedsVerification(true);
            // Block scrolling when popup is active
            document.body.style.overflow = 'hidden';
        }
    }, [isLoading, adSettings, novelId]);

    const handleVerified = () => {
        saveDownloadVerification(novelId, 'novel');
        setNeedsVerification(false);
        document.body.style.overflow = '';
    };

    // Cleanup on unmount in case it was open
    useEffect(() => {
        return () => {
            document.body.style.overflow = '';
        };
    }, []);

    return (
        <>
            {needsVerification && (
                <AdVerificationPopup
                    onVerified={handleVerified}
                    adUrl1={adSettings?.novelAdUrl1 || adSettings?.directLinkUrl || 'https://nexiplay.live'}
                    adUrl2={adSettings?.novelAdUrl2 || adSettings?.popunderUrl || 'https://nexiplay.live'}
                    contentType="novel"
                />
            )}
            {/* Render children regardless so SEO isn't hurt, but the popup blocks interaction */}
            {children}
        </>
    );
}
