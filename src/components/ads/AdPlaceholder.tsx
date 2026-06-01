'use client';

import React from 'react';

export type AdSize = '300x250' | '320x50' | '728x90' | '160x300' | '468x60' | 'responsive';

interface AdPlaceholderProps {
    size: AdSize;
    className?: string;
    showLabel?: boolean;
}

/**
 * Height and width map for different ad sizes
 * Used to reserve space and prevent CLS (Cumulative Layout Shift)
 */
const SIZE_MAP: Record<AdSize, { width: string; height: string; mobileHeight?: string }> = {
    '300x250': { width: '300px', height: '250px' },
    '320x50': { width: '320px', height: '50px' },
    '728x90': { width: '728px', height: '90px', mobileHeight: '50px' },
    '160x300': { width: '160px', height: '300px' },
    '468x60': { width: '468px', height: '60px', mobileHeight: '50px' },
    'responsive': { width: '100%', height: 'auto' },
};

/**
 * Placeholder component that reserves space for ads before they load.
 * Prevents CLS (Cumulative Layout Shift) by maintaining consistent dimensions.
 */
export function AdPlaceholder({ size, className = '', showLabel = false }: AdPlaceholderProps) {
    const dimensions = SIZE_MAP[size] || SIZE_MAP['300x250'];

    return (
        <div
            className={`ad-placeholder ${className}`}
            style={{
                width: '100%',
                maxWidth: dimensions.width,
                minHeight: dimensions.height,
                margin: '0 auto',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
            }}
            aria-hidden="true"
        >
            {showLabel && (
                <span
                    className="text-[10px] text-gray-600 uppercase tracking-wider"
                    style={{ opacity: 0.5 }}
                >
                    Ad Loading...
                </span>
            )}
        </div>
    );
}

/**
 * CSS class generator for ad containers
 */
export function getAdContainerClasses(size: AdSize, isMobile: boolean): string {
    const baseClasses = 'ad-container relative overflow-hidden';

    if (size === 'responsive') {
        return `${baseClasses} w-full`;
    }

    // Mobile adjustments
    if (isMobile) {
        switch (size) {
            case '728x90':
                return `${baseClasses} max-w-[320px] h-[50px]`;
            case '160x300':
                return `${baseClasses} hidden`; // Hide vertical banners on mobile
            default:
                return `${baseClasses} max-w-full`;
        }
    }

    return baseClasses;
}

/**
 * Style object generator for ad containers with CLS prevention
 */
export function getAdContainerStyles(size: AdSize, isMobile: boolean): React.CSSProperties {
    const dimensions = SIZE_MAP[size];
    if (!dimensions) return {};

    let height = dimensions.height;
    if (isMobile && dimensions.mobileHeight) {
        height = dimensions.mobileHeight;
    }

    return {
        width: '100%',
        maxWidth: dimensions.width,
        minHeight: size !== 'responsive' ? height : undefined,
        margin: '0 auto',
        overflow: 'hidden',
    };
}
