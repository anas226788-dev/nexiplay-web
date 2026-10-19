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
                    50: '#F4F0FA',
                    100: '#E9E2FF',
                    200: '#D6C9FF',
                    300: '#B09AFF',
                    400: '#A18AFB',
                    500: '#9273F5',
                    600: '#7759D8',
                    700: '#5C46B2',
                    800: '#42347E',
                    900: '#2A214F',
                },
                dark: {
                    900: '#0D0B12',
                    800: '#17141F',
                    700: '#211D2B',
                    600: '#2A2536',
                    500: '#383247',
                },
                glass: {
                    base: 'var(--glass-base)',
                    border: 'var(--glass-border)',
                    highlight: 'var(--glass-highlight)',
                },
                // Hybrid redesign tokens (see ui_redesign_implementation_plan.md)
                np: {
                    bg: '#0D0B12',
                    surface: '#17141F',
                    'surface-2': '#211D2B',
                    primary: '#9273F5',
                    'primary-dark': '#5C46B2',
                    text: '#F4F0FA',
                    muted: '#ADA6B9',
                    success: '#57D6C0',
                    gold: '#FFB878',
                    error: '#FF7185',
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
                'np-clay': '0 10px 24px -8px rgba(146, 115, 245, 0.40), inset 0 2px 0 rgba(255, 255, 255, 0.22), inset 0 -3px 6px rgba(0, 0, 0, 0.25)',
                'np-inset': 'inset 2px 2px 6px rgba(0, 0, 0, 0.45), inset -1px -1px 3px rgba(255, 255, 255, 0.04)',
                'np-raised': '3px 3px 8px rgba(0, 0, 0, 0.45), -1px -1px 4px rgba(255, 255, 255, 0.04)',
            },
            transitionTimingFunction: {
                'np-spring': 'cubic-bezier(0.34, 1.56, 0.64, 1)',
            },
            backgroundImage: {
                'glass-gradient': 'linear-gradient(145deg, rgba(33, 29, 43, 0.78) 0%, rgba(23, 20, 31, 0.72) 100%)',
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
