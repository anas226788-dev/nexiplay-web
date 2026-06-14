'use client';

import { useEffect } from 'react';
import { useActiveMovie } from '@/context/ActiveMovieContext';

export default function ActiveMovieSetter({
    movieId,
    allowGlobalNotices,
}: {
    movieId: string;
    allowGlobalNotices: boolean;
}) {
    const { setActiveMovie } = useActiveMovie();

    useEffect(() => {
        setActiveMovie({ id: movieId, allowGlobal: allowGlobalNotices });
        return () => {
            setActiveMovie(null);
        };
    }, [movieId, allowGlobalNotices, setActiveMovie]);

    return null;
}
