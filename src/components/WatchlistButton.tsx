'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';

interface WatchlistButtonProps {
    movieId: string;
}

export default function WatchlistButton({ movieId }: WatchlistButtonProps) {
    const { user, loading } = useAuth();
    const router = useRouter();
    const [watchlistId, setWatchlistId] = useState<string | null>(null);
    const [checking, setChecking] = useState(true);
    const [actionLoading, setActionLoading] = useState(false);

    useEffect(() => {
        if (loading) return;
        const currentUser = user;
        if (!currentUser) {
            setChecking(false);
            return;
        }

        async function checkWatchlist() {
            try {
                const { data, error } = await supabase
                    .from('user_watchlist')
                    .select('id')
                    .eq('user_id', currentUser!.id)
                    .eq('movie_id', movieId)
                    .maybeSingle();
                
                if (!error && data) {
                    setWatchlistId(data.id);
                }
            } catch (err) {
                console.error('Error checking watchlist:', err);
            } finally {
                setChecking(false);
            }
        }

        checkWatchlist();
    }, [user, loading, movieId]);

    const handleToggleWatchlist = async () => {
        if (!user) {
            router.push('/login');
            return;
        }

        setActionLoading(true);
        try {
            if (watchlistId) {
                // Remove from watchlist
                const { error } = await supabase
                    .from('user_watchlist')
                    .delete()
                    .eq('id', watchlistId);
                
                if (!error) {
                    setWatchlistId(null);
                } else {
                    throw error;
                }
            } else {
                // Add to watchlist
                const { data, error } = await supabase
                    .from('user_watchlist')
                    .insert({
                        user_id: user.id,
                        movie_id: movieId
                    })
                    .select('id')
                    .single();
                
                if (!error && data) {
                    setWatchlistId(data.id);
                } else {
                    throw error;
                }
            }
        } catch (err: any) {
            alert(err.message || 'Failed to update watchlist');
        } finally {
            setActionLoading(false);
        }
    };

    if (loading || checking) {
        return (
            <div className="w-12 h-14 rounded-xl bg-white/5 animate-pulse flex items-center justify-center border border-white/10" />
        );
    }

    return (
        <button
            onClick={handleToggleWatchlist}
            disabled={actionLoading}
            className={`px-6 py-4 rounded-xl font-bold transition-all border flex items-center justify-center gap-2 group cursor-pointer duration-300 ${
                watchlistId
                    ? 'bg-red-500/10 border-red-500/30 text-red-400 hover:bg-red-500 hover:text-white hover:border-red-500 hover:shadow-lg hover:shadow-red-950/20'
                    : 'bg-white/5 border-white/10 text-white hover:bg-white/10 hover:shadow-lg hover:shadow-white/5'
            }`}
        >
            {watchlistId ? (
                <>
                    <svg className="w-6 h-6 fill-current" viewBox="0 0 24 24">
                        <path d="M17 3H7a2 2 0 0 0-2 2v16l7-3.5 7 3.5V5a2 2 0 0 0-2-2z" />
                    </svg>
                    <span>In My List</span>
                </>
            ) : (
                <>
                    <svg className="w-6 h-6 stroke-current fill-none group-hover:scale-105 transition-transform" viewBox="0 0 24 24" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v16l-7-3.5L5 21V5z" />
                    </svg>
                    <span>Add to List</span>
                </>
            )}
        </button>
    );
}
