'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { FormEvent, useState } from 'react';
import { useAuth } from '@/context/AuthContext';

export default function LoginPage() {
    const router = useRouter();
    const { signIn, resendVerification } = useAuth();
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [successMsg, setSuccessMsg] = useState('');
    const [loading, setLoading] = useState(false);
    const [isResending, setIsResending] = useState(false);

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
            <div className="glass p-6 sm:p-8 rounded-2xl border border-white/10">
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

                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label className="block text-xs font-bold uppercase tracking-wider text-gray-500 mb-2">Email</label>
                        <input
                            type="email"
                            value={email}
                            onChange={(event) => setEmail(event.target.value)}
                            required
                            className="w-full rounded-xl bg-black/40 border border-white/10 px-4 py-3 text-white outline-none focus:border-red-500/60"
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
                            className="w-full rounded-xl bg-black/40 border border-white/10 px-4 py-3 text-white outline-none focus:border-red-500/60"
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
                        disabled={loading}
                        className="w-full rounded-xl bg-red-600 px-5 py-3 font-black text-white hover:bg-red-500 disabled:opacity-60 transition-colors"
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
