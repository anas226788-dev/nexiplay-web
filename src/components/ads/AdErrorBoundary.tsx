'use client';

import React, { Component, ReactNode } from 'react';

interface AdErrorBoundaryProps {
    children: ReactNode;
    fallback?: ReactNode;
    onError?: (error: Error, errorInfo: React.ErrorInfo) => void;
}

interface AdErrorBoundaryState {
    hasError: boolean;
    error: Error | null;
}

/**
 * Error boundary for ad components.
 * Catches any errors from ad scripts and prevents them from breaking the page.
 * Falls back to an empty placeholder to maintain layout.
 */
export class AdErrorBoundary extends Component<AdErrorBoundaryProps, AdErrorBoundaryState> {
    constructor(props: AdErrorBoundaryProps) {
        super(props);
        this.state = { hasError: false, error: null };
    }

    static getDerivedStateFromError(error: Error): AdErrorBoundaryState {
        return { hasError: true, error };
    }

    componentDidCatch(error: Error, errorInfo: React.ErrorInfo): void {
        // Log to console in development
        console.error('[AdErrorBoundary] Ad component error:', error);
        console.error('[AdErrorBoundary] Component stack:', errorInfo.componentStack);

        // Call optional error handler
        this.props.onError?.(error, errorInfo);
    }

    render(): ReactNode {
        if (this.state.hasError) {
            // Return fallback or empty placeholder
            return this.props.fallback ?? (
                <div
                    className="ad-error-placeholder"
                    style={{
                        minHeight: '1px',
                        background: 'transparent',
                    }}
                    aria-hidden="true"
                />
            );
        }

        return this.props.children;
    }
}

/**
 * Wrapper function component for easier use with hooks
 */
export function withAdErrorBoundary<P extends object>(
    WrappedComponent: React.ComponentType<P>,
    fallback?: ReactNode
): React.FC<P> {
    return function WithAdErrorBoundary(props: P) {
        return (
            <AdErrorBoundary fallback={fallback}>
                <WrappedComponent {...props} />
            </AdErrorBoundary>
        );
    };
}
