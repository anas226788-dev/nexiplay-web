'use client';

import React, { createContext, useContext, useState } from 'react';

interface ActiveMovie {
    id: string;
    allowGlobal: boolean;
}

interface ActiveMovieContextType {
    activeMovie: ActiveMovie | null;
    setActiveMovie: (movie: ActiveMovie | null) => void;
}

const ActiveMovieContext = createContext<ActiveMovieContextType | undefined>(undefined);

export function ActiveMovieProvider({ children }: { children: React.ReactNode }) {
    const [activeMovie, setActiveMovie] = useState<ActiveMovie | null>(null);

    return (
        <ActiveMovieContext.Provider value={{ activeMovie, setActiveMovie }}>
            {children}
        </ActiveMovieContext.Provider>
    );
}

export function useActiveMovie() {
    const context = useContext(ActiveMovieContext);
    if (context === undefined) {
        throw new Error('useActiveMovie must be used within an ActiveMovieProvider');
    }
    return context;
}
