'use client';

import { useState } from 'react';
import { Download } from '@/lib/types';
import { useAdSettings } from '@/hooks/useAdSettings';
import AdVerificationPopup from './AdVerificationPopup';

// ── localStorage helpers for download verification ──
const checkDownloadVerified = (contentId: string, contentType: string): boolean => {
    if (typeof window === 'undefined') return false;
    try {
        const raw = localStorage.getItem('nexiplay_download_verification');
        if (!raw) return false;
        const records = JSON.parse(raw);
        const record = records[contentId];
        if (!record) return false;
        const now = Date.now();
        if (contentType === 'movie') {
            return now - record.verifiedAt < 24 * 60 * 60 * 1000;
        } else {
            return now - record.verifiedAt < 25 * 60 * 1000;
        }
    } catch { return false; }
};

const saveDownloadVerification = (contentId: string, contentType: string) => {
    if (typeof window === 'undefined') return;
    try {
        const raw = localStorage.getItem('nexiplay_download_verification') || '{}';
        const records = JSON.parse(raw);
        records[contentId] = { verifiedAt: Date.now(), contentType };
        localStorage.setItem('nexiplay_download_verification', JSON.stringify(records));
    } catch {}
};

interface DownloadButtonProps {
    download: Download;
    contentId: string;
    contentType: string;
}

export default function DownloadButton({ download, contentId, contentType }: DownloadButtonProps) {
    const [showVerification, setShowVerification] = useState(false);
    const { settings: adSettings } = useAdSettings();

    // Format: [ 720p – 800MB ]
    const buttonText = download.file_size
        ? `${download.quality} – ${download.file_size}`
        : download.quality;

    const handleClick = (e: React.MouseEvent) => {
        const verificationEnabled = adSettings?.isDownloadVerificationEnabled ?? false;
        if (!verificationEnabled) return; // allow direct download

        const verified = checkDownloadVerified(contentId, contentType);
        if (verified) return; // allow direct download

        // Block and show verification
        e.preventDefault();
        e.stopPropagation();
        setShowVerification(true);
    };

    const handleVerificationComplete = () => {
        saveDownloadVerification(contentId, contentType);
        setShowVerification(false);
        // Auto-open the download
        if (download.file_url) {
            window.open(download.file_url, '_blank', 'noopener,noreferrer');
        }
    };

    if (!download.file_url) {
        return (
            <button
                disabled
                className="download-btn flex items-center justify-center gap-2 px-6 py-4 rounded-xl bg-dark-700/50 border border-white/10 opacity-50 cursor-not-allowed w-full md:w-auto"
            >
                <svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>
                <span className="font-semibold text-gray-400">[ {buttonText} ]</span>
                <span className="text-xs text-gray-500 ml-2">Coming Soon</span>
            </button>
        );
    }

    return (
        <>
            {showVerification && (
                <AdVerificationPopup
                    onVerified={handleVerificationComplete}
                    adUrl1={adSettings?.downloadAdUrl1 || adSettings?.directLinkUrl || 'https://nexiplay.live'}
                    adUrl2={adSettings?.downloadAdUrl2 || adSettings?.popunderUrl || 'https://nexiplay.live'}
                />
            )}
            <a
                href={download.file_url}
                target="_blank"
                rel="noopener noreferrer"
                onClick={handleClick}
                className="download-btn inline-flex items-center justify-center gap-3 px-6 py-4 rounded-xl bg-gradient-to-r from-red-600 to-red-700 hover:from-red-500 hover:to-red-600 border border-red-500/30 shadow-lg shadow-red-900/30 transition-all duration-300 hover:shadow-red-900/50 hover:scale-[1.02] w-full md:w-auto group"
            >
                <svg
                    className="w-5 h-5 text-white transition-transform group-hover:translate-y-0.5"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                </svg>
                <span className="font-bold text-white text-lg">[ {buttonText} ]</span>
            </a>
        </>
    );
}

// Download section component
interface DownloadSectionProps {
    downloads: Download[];
    contentId: string;
    contentType: string;
}

export function DownloadSection({ downloads, contentId, contentType }: DownloadSectionProps) {
    // Sort by quality: 1080p first, then 720p, then 480p
    const sortedDownloads = [...downloads].sort((a, b) => {
        const order: Record<string, number> = { '1080p': 0, '720p': 1, '480p': 2 };
        return (order[a.quality] ?? 3) - (order[b.quality] ?? 3);
    });

    return (
        <div className="space-y-4">
            <h3 className="section-title text-xl">
                <svg className="w-5 h-5 mr-2 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                </svg>
                Download Links
            </h3>

            {sortedDownloads.length > 0 ? (
                <div className="flex flex-wrap gap-3">
                    {sortedDownloads.map((download) => (
                        <DownloadButton key={download.id} download={download} contentId={contentId} contentType={contentType} />
                    ))}
                </div>
            ) : (
                <div className="p-6 rounded-xl bg-dark-700/50 border border-white/5 text-center">
                    <svg className="w-12 h-12 mx-auto text-gray-600 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                    </svg>
                    <p className="text-gray-500">No download links available yet.</p>
                </div>
            )}

            {/* Download Instructions */}
            <div className="mt-4 p-4 rounded-lg bg-dark-700/30 border border-white/5">
                <p className="text-xs text-gray-500 flex items-start gap-2">
                    <svg className="w-4 h-4 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <span>Click the download button to start downloading. Higher quality means larger file size.</span>
                </p>
            </div>
        </div>
    );
}
