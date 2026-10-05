'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';

export default function AuthCallbackPage() {
    const router = useRouter();
    const [statusMessage, setStatusMessage] = useState('Verifying your Google account...');
    const [errorMessage, setErrorMessage] = useState('');

    useEffect(() => {
        let isMounted = true;

        const processAuth = async () => {
            try {
                if (typeof window === 'undefined') return;

                const urlParams = new URLSearchParams(window.location.search);
                const hashParams = new URLSearchParams(window.location.hash.substring(1));

                // 1. Check for error parameters from OAuth provider
                const error = urlParams.get('error') || hashParams.get('error');
                const errorDesc = urlParams.get('error_description') || hashParams.get('error_description');

                if (error || errorDesc) {
                    const cleanMsg = errorDesc || error || 'Google sign-in was cancelled or failed.';
                    if (isMounted) {
                        setErrorMessage(cleanMsg);
                        setStatusMessage('Redirecting to login...');
                    }
                    setTimeout(() => {
                        router.replace(`/login?error=${encodeURIComponent(cleanMsg)}`);
                    }, 2000);
                    return;
                }

                // 2. PKCE flow - exchange code for session if present
                const code = urlParams.get('code');
                if (code) {
                    if (isMounted) setStatusMessage('Setting up your session...');
                    const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);
                    if (exchangeError) {
                        console.error('OAuth code exchange failed:', exchangeError);
                        if (isMounted) {
                            setErrorMessage(exchangeError.message);
                            setStatusMessage('Redirecting to login...');
                        }
                        setTimeout(() => {
                            router.replace(`/login?error=${encodeURIComponent(exchangeError.message)}`);
                        }, 2000);
                        return;
                    }
                }

                // 3. Check current session
                const { data: { session } } = await supabase.auth.getSession();
                if (session) {
                    if (isMounted) setStatusMessage('Success! Redirecting...');
                    router.replace('/');
                    return;
                }

                // 4. Fallback listener for auth state change
                const { data: authListener } = supabase.auth.onAuthStateChange((event, nextSession) => {
                    if (nextSession) {
                        authListener.subscription.unsubscribe();
                        if (isMounted) setStatusMessage('Success! Redirecting...');
                        router.replace('/');
                    }
                });

                // 5. Ultimate fallback timer
                const timer = setTimeout(() => {
                    authListener.subscription.unsubscribe();
                    router.replace('/');
                }, 3000);

                return () => {
                    clearTimeout(timer);
                    authListener.subscription.unsubscribe();
                };
            } catch (err: any) {
                console.error('Auth callback exception:', err);
                if (isMounted) {
                    setErrorMessage(err.message || 'Authentication error.');
                    setStatusMessage('Redirecting to login...');
                }
                setTimeout(() => {
                    router.replace(`/login?error=${encodeURIComponent(err.message || 'Login failed')}`);
                }, 2000);
            }
        };

        processAuth();

        return () => {
            isMounted = false;
        };
    }, [router]);

    return (
        <div className="min-h-screen bg-[#0c0c12] flex items-center justify-center px-4">
            <div className="w-full max-w-md p-8 rounded-2xl bg-white/[0.03] border border-white/10 backdrop-blur-xl text-center shadow-2xl relative overflow-hidden">
                {/* Glowing backdrop circle */}
                <div className="absolute -top-16 -left-16 w-32 h-32 bg-red-600/20 rounded-full blur-2xl pointer-events-none" />
                <div className="absolute -bottom-16 -right-16 w-32 h-32 bg-blue-600/20 rounded-full blur-2xl pointer-events-none" />

                {/* Logo */}
                <div className="w-14 h-14 mx-auto mb-6 rounded-2xl bg-gradient-to-br from-red-600 to-red-800 flex items-center justify-center shadow-lg shadow-red-600/30">
                    <span className="text-white font-black text-2xl">N</span>
                </div>

                <h1 className="text-2xl font-black text-white mb-2">
                    {errorMessage ? 'Sign-in Failed' : 'Completing Sign In'}
                </h1>

                {errorMessage ? (
                    <div className="mt-4 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-200">
                        {errorMessage}
                    </div>
                ) : (
                    <div className="flex flex-col items-center justify-center my-6 gap-4">
                        <div className="w-10 h-10 border-3 border-red-500/20 border-t-red-500 rounded-full animate-spin" />
                        <p className="text-sm text-gray-400 font-medium">{statusMessage}</p>
                    </div>
                )}
            </div>
        </div>
    );
}
