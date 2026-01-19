'use client';

import { useEffect, useRef } from 'react';

interface ScriptAdProps {
    scriptCode: string;
}

export default function ScriptAd({ scriptCode }: ScriptAdProps) {
    const containerRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (!containerRef.current || !scriptCode) return;

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
            Array.from(oldScript.attributes).forEach((attr) => {
                newScript.setAttribute(attr.name, attr.value);
            });
            newScript.appendChild(document.createTextNode(oldScript.innerHTML));
            container.appendChild(newScript);
        });

        return () => {
            if (container) container.innerHTML = '';
        };
    }, [scriptCode]);

    return <div ref={containerRef} className="ad-script-container" />;
}
