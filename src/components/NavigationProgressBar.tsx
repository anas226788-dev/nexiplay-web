'use client';

import { useEffect, useState, useRef } from 'react';
import { usePathname } from 'next/navigation';

export default function NavigationProgressBar() {
    const pathname = usePathname();
    const [isLoading, setIsLoading] = useState(false);
    const [progress, setProgress] = useState(0);
    const timeoutsRef = useRef<NodeJS.Timeout[]>([]);

    const clearAllTimeouts = () => {
        timeoutsRef.current.forEach(t => clearTimeout(t));
        timeoutsRef.current = [];
    };

    // When route changes, quickly complete to 100% and vanish
    useEffect(() => {
        if (isLoading) {
            clearAllTimeouts();
            setProgress(100);

            const hideTimer = setTimeout(() => {
                setIsLoading(false);
                setProgress(0);
            }, 250);
            timeoutsRef.current.push(hideTimer);
        }
    }, [pathname]);

    // Safety watchdog: Auto-complete and vanish within 900ms so it NEVER stays stuck
    useEffect(() => {
        if (isLoading) {
            const safetyTimer = setTimeout(() => {
                clearAllTimeouts();
                setProgress(100);
                setTimeout(() => {
                    setIsLoading(false);
                    setProgress(0);
                }, 200);
            }, 800);
            timeoutsRef.current.push(safetyTimer);
        }
    }, [isLoading]);

    // Intercept clicks on links for smooth visual feedback
    useEffect(() => {
        const handleClick = (e: MouseEvent) => {
            const target = (e.target as HTMLElement).closest('a');
            if (!target) return;

            const href = target.getAttribute('href');
            if (
                !href ||
                href.startsWith('#') ||
                href.startsWith('mailto:') ||
                href.startsWith('tel:') ||
                target.getAttribute('target') === '_blank'
            ) {
                return;
            }

            // Only trigger for internal route changes to a DIFFERENT page
            if (href.startsWith('/')) {
                const currentPath = window.location.pathname;
                // Ignore if clicking link to current page
                if (href === currentPath || href === `${currentPath}/`) return;

                clearAllTimeouts();
                setIsLoading(true);
                setProgress(35);

                const t1 = setTimeout(() => {
                    setProgress(prev => (prev >= 35 && prev < 75 ? 75 : prev));
                }, 120);

                const t2 = setTimeout(() => {
                    setProgress(prev => (prev >= 75 && prev < 90 ? 90 : prev));
                }, 300);

                timeoutsRef.current.push(t1, t2);
            }
        };

        document.addEventListener('click', handleClick);
        return () => {
            document.removeEventListener('click', handleClick);
            clearAllTimeouts();
        };
    }, [pathname]);

    // Cleanup on unmount
    useEffect(() => {
        return () => clearAllTimeouts();
    }, []);

    if (!isLoading && progress === 0) return null;

    return (
        <div className="fixed top-0 left-0 right-0 z-[9999] pointer-events-none h-[2.5px] bg-transparent">
            <div
                className="h-full bg-gradient-to-r from-[#FF2B57] via-[#9273F5] to-[#FFB878] shadow-[0_0_12px_rgba(146,115,245,0.85)] transition-all duration-200 ease-out"
                style={{
                    width: `${progress}%`,
                    opacity: progress === 100 ? 0 : 1
                }}
            />
        </div>
    );
}

