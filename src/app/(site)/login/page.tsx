'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { FormEvent, useEffect, useState } from 'react';
import { useAuth } from '@/context/AuthContext';

export default function LoginPage() {
    const router = useRouter();
    const { signIn, signInWithGoogle, resendVerification } = useAuth();
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [successMsg, setSuccessMsg] = useState('');
    const [loading, setLoading] = useState(false);
    const [googleLoading, setGoogleLoading] = useState(false);
    const [isResending, setIsResending] = useState(false);

    useEffect(() => {
        if (typeof window !== 'undefined') {
            const params = new URLSearchParams(window.location.search);
            const err = params.get('error');
            if (err) {
                setError(decodeURIComponent(err));
            }
        }
    }, []);

    const handleGoogleSignIn = async () => {
        setError('');
        setSuccessMsg('');
        setGoogleLoading(true);
        try {
            await signInWithGoogle();
        } catch (err: any) {
            setError(err.message || 'Failed to sign in with Google.');
            setGoogleLoading(false);
        }
    };

    const handleSubmit = async (event: FormEvent) => {
        event.preventDefault();
        setError('');
        setLoading(true);
        try {
            await signIn(email.trim(), password);
            router.push('/');
        } catch (err: any) {
            setError(err.message || 'Login failed. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    const handleResendEmail = async () => {
        setError('');
        setSuccessMsg('');
        setIsResending(true);
        try {
            await resendVerification(email.trim());
            setSuccessMsg('Verification email sent successfully! Please check your Inbox and SPAM/Junk folder.');
        } catch (err: any) {
            setError(err.message || 'Failed to resend email. Please try again.');
        } finally {
            setIsResending(false);
        }
    };

    return (
        <div className="container mx-auto px-4 pt-32 pb-20 max-w-md">
            <div className="glass p-6 sm:p-8 rounded-2xl border border-white/10 shadow-2xl">
                <h1 className="text-3xl font-black text-white mb-2">Login</h1>
                <p className="text-sm text-gray-400 mb-6">Track your watch and download history on Nexiplay.</p>

                {successMsg && (
                    <div className="mb-4 rounded-xl border border-green-500/30 bg-green-500/10 px-4 py-3 text-sm text-green-200">
                        {successMsg}
                    </div>
                )}

                {error && (
                    <div className="mb-4 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-200">
                        <p>{error}</p>
                        {error.toLowerCase().includes('email not confirmed') && (
                            <div className="mt-3 flex flex-col items-start gap-1">
                                <button 
                                    onClick={handleResendEmail}
                                    disabled={isResending}
                                    className="text-xs font-bold underline hover:text-white disabled:opacity-50"
                                >
                                    {isResending ? 'Resending...' : 'Resend Verification Email'}
                                </button>
                                <span className="text-[10px] text-red-300 opacity-80">(If you don't see the email, please check your SPAM/Junk folder)</span>
                            </div>
                        )}
                    </div>
                )}

                {/* Google Sign In Button */}
                <button
                    type="button"
                    onClick={handleGoogleSignIn}
                    disabled={googleLoading || loading}
                    className="w-full flex items-center justify-center gap-3 rounded-xl bg-white/5 hover:bg-white/10 active:scale-[0.99] border border-white/15 px-5 py-3.5 font-bold text-white transition-all duration-200 hover:border-white/30 disabled:opacity-60 shadow-md group"
                >
                    {googleLoading ? (
                        <div className="flex items-center gap-2 text-sm text-gray-300">
                            <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                            <span>Connecting to Google...</span>
                        </div>
                    ) : (
                        <>
                            <svg className="w-5 h-5 flex-shrink-0" viewBox="0 0 24 24">
                                <path
                                    fill="#4285F4"
                                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                                />
                                <path
                                    fill="#34A853"
                                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                                />
                                <path
                                    fill="#FBBC05"
                                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                                />
                                <path
                                    fill="#EA4335"
                                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                                />
                            </svg>
                            <span className="text-sm font-semibold tracking-wide">Continue with Google</span>
                        </>
                    )}
                </button>

                {/* Divider */}
                <div className="relative my-6 flex items-center justify-center">
                    <div className="border-t border-white/10 w-full" />
                    <span className="bg-[#101018] px-3 text-xs uppercase tracking-wider text-gray-500 rounded-full border border-white/5 relative z-10">
                        or with email
                    </span>
                </div>

                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label className="block text-xs font-bold uppercase tracking-wider text-gray-500 mb-2">Email</label>
                        <input
                            type="email"
                            value={email}
                            onChange={(event) => setEmail(event.target.value)}
                            required
                            className="w-full rounded-xl bg-black/40 border border-white/10 px-4 py-3 text-white outline-none focus:border-red-500/60 transition-colors"
                            placeholder="you@example.com"
                        />
                    </div>
                    <div>
                        <label className="block text-xs font-bold uppercase tracking-wider text-gray-500 mb-2">Password</label>
                        <input
                            type="password"
                            value={password}
                            onChange={(event) => setPassword(event.target.value)}
                            required
                            className="w-full rounded-xl bg-black/40 border border-white/10 px-4 py-3 text-white outline-none focus:border-red-500/60 transition-colors"
                            placeholder="Your password"
                        />
                        <div className="flex justify-end mt-2">
                            <Link href="/forgot-password" className="text-xs text-red-400 hover:text-red-300 font-bold">
                                Forgot password?
                            </Link>
                        </div>
                    </div>
                    <button
                        type="submit"
                        disabled={loading || googleLoading}
                        className="w-full rounded-xl bg-red-600 px-5 py-3 font-black text-white hover:bg-red-500 disabled:opacity-60 transition-colors shadow-lg shadow-red-600/20"
                    >
                        {loading ? 'Logging in...' : 'Login'}
                    </button>
                </form>

                <p className="mt-6 text-center text-sm text-gray-400">
                    New here?{' '}
                    <Link href="/register" className="font-bold text-red-400 hover:text-red-300">
                        Create account
                    </Link>
                </p>
            </div>
        </div>
    );
}
