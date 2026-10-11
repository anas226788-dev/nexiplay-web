/** @type {import('tailwindcss').Config} */
module.exports = {
    content: [
        "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
        "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
        "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
    ],
    theme: {
        extend: {
            colors: {
                primary: {
                    50: '#fef2f2',
                    100: '#fee2e2',
                    200: '#fecaca',
                    300: '#fca5a5',
                    400: '#f87171',
                    500: '#E50914', // Brand Red
                    600: '#dc2626',
                    700: '#b91c1c',
                    800: '#991b1b',
                    900: '#7f1d1d',
                },
                dark: {
                    900: '#000000', // Deepest Black
                    800: '#0a0a0a', // Surface
                    700: '#121212', // Card Bg
                    600: '#1a1a1a',
                    500: '#2e2e2e',
                },
                glass: {
                    base: 'var(--glass-base)',
                    border: 'var(--glass-border)',
                    highlight: 'var(--glass-highlight)',
                },
                // Hybrid redesign tokens (see ui_redesign_implementation_plan.md)
                np: {
                    bg: '#0B0D16',
                    surface: '#141625',
                    'surface-2': '#1B1E31',
                    primary: '#E51D48',
                    'primary-dark': '#A70F35',
                    text: '#F7F8FC',
                    muted: '#A7AABD',
                    success: '#28D391',
                    gold: '#F6C453',
                    error: '#EF4444',
                    border: 'rgba(255, 255, 255, 0.10)',
                },
            },
            fontFamily: {
                sans: ['Inter', 'system-ui', 'sans-serif'],
                'np-display': ['"Plus Jakarta Sans"', 'Inter', 'system-ui', 'sans-serif'],
                'np-mono': ['"JetBrains Mono"', 'ui-monospace', 'monospace'],
            },
            borderRadius: {
                'np-card': '12px',
                'np-panel': '20px',
                'np-sheet': '28px',
            },
            boxShadow: {
                'np-glass': '0 8px 32px rgba(0, 0, 0, 0.35), inset 0 1px 0 rgba(255, 255, 255, 0.06)',
                'np-clay': '0 10px 24px -8px rgba(229, 29, 72, 0.55), inset 0 2px 0 rgba(255, 255, 255, 0.22), inset 0 -3px 6px rgba(0, 0, 0, 0.25)',
                'np-inset': 'inset 2px 2px 6px rgba(0, 0, 0, 0.45), inset -1px -1px 3px rgba(255, 255, 255, 0.04)',
                'np-raised': '3px 3px 8px rgba(0, 0, 0, 0.45), -1px -1px 4px rgba(255, 255, 255, 0.04)',
            },
            transitionTimingFunction: {
                'np-spring': 'cubic-bezier(0.34, 1.56, 0.64, 1)',
            },
            backgroundImage: {
                'glass-gradient': 'linear-gradient(145deg, rgba(30, 30, 30, 0.6) 0%, rgba(10, 10, 10, 0.4) 100%)',
                'glass-shine': 'linear-gradient(105deg, transparent 20%, rgba(255,255,255,0.05) 25%, transparent 30%)',
            },
            keyframes: {
                float: {
                    '0%, 100%': { transform: 'translateY(0px)' },
                    '50%': { transform: 'translateY(-6px)' },
                },
            },
            animation: {
                float: 'float 3s ease-in-out infinite',
            },
        },
    },
    plugins: [],
};
