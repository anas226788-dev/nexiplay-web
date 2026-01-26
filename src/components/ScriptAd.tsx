'use client';

import { useEffect, useRef } from 'react';

interface ScriptAdProps {
    scriptCode: string;
    id?: string;
    className?: string;
}

export default function ScriptAd({ scriptCode, id, className = '' }: ScriptAdProps) {
    const containerRef = useRef<HTMLDivElement>(null);
    const hasRun = useRef(false);

    useEffect(() => {
        if (!containerRef.current || !scriptCode || hasRun.current) return;

        const container = containerRef.current;
        container.innerHTML = ''; // Clear previous

        // Create a temporary container to extract script tags
        const tempDiv = document.createElement('div');
        tempDiv.innerHTML = scriptCode;

        const scripts = tempDiv.querySelectorAll('script');
        const nonScriptContent = tempDiv.childNodes;

        // Append non-script content (e.g. div placeholders)
        nonScriptContent.forEach((node) => {
            if (node.nodeName !== 'SCRIPT') {
                container.appendChild(node.cloneNode(true));
            }
        });

        // Execute scripts properly
        scripts.forEach((oldScript) => {
            const newScript = document.createElement('script');
            // Copy attributes
            Array.from(oldScript.attributes).forEach((attr) => {
                newScript.setAttribute(attr.name, attr.value);
            });
            // Copy content
            if (oldScript.innerHTML) {
                newScript.appendChild(document.createTextNode(oldScript.innerHTML));
            }

            // Mark as async to prevent blocking
            newScript.async = true;

            container.appendChild(newScript);
        });

        hasRun.current = true; // Prevent duplicate execution in Strict Mode

        return () => {
            // Cleanup: We intentionally DON'T clear sticky global ads (like social bar)
            // But for container-based ads, we should.
            // If the script modified body, we can't easily undo it.
            // For safety in SPAs, we clear the container we own.
            if (container) container.innerHTML = '';
            hasRun.current = false; // Reset on unmount
        };
    }, [scriptCode]);

    return <div id={id} ref={containerRef} className={`ad-script-container ${className}`} />;
}
