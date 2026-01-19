'use client';

import { useState } from 'react';
import { supabase } from '@/lib/supabase';

export default function DMCAPage() {
    const [loading, setLoading] = useState(false);
    const [success, setSuccess] = useState(false);
    const [formData, setFormData] = useState({
        name: '',
        company: '',
        email: '',
        original_link: '',
        infringing_link: '',
        proof_link: '',
        message: ''
    });

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);

        const { error } = await supabase
            .from('dmca_requests')
            .insert([formData]);

        setLoading(false);

        if (error) {
            alert('Error submitting request. Please try again.');
        } else {
            setSuccess(true);
            setFormData({
                name: '',
                company: '',
                email: '',
                original_link: '',
                infringing_link: '',
                proof_link: '',
                message: ''
            });
        }
    };

    return (
        <div className="container mx-auto px-4 py-12 max-w-3xl text-gray-300">
            <h1 className="text-4xl font-bold text-white mb-4 text-center">DMCA Guidelines</h1>
            <p className="text-center text-gray-400 mb-8 max-w-2xl mx-auto">
                We take copyright infringement seriously. If you believe your content has been posted on Nexiplay without authorization, please submit a designated takedown request below.
            </p>

            <div className="bg-dark-800 p-8 rounded-2xl border border-white/5 shadow-2xl">
                {success ? (
                    <div className="text-center py-12 animate-fade-in">
                        <div className="w-16 h-16 bg-green-500/20 text-green-500 rounded-full flex items-center justify-center mx-auto mb-4">
                            <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                            </svg>
                        </div>
                        <h2 className="text-2xl font-bold text-white mb-2">Request Submitted</h2>
                        <p className="text-gray-400">Your DMCA request has been received. We usually process requests within 24-48 hours.</p>
                        <button
                            onClick={() => setSuccess(false)}
                            className="mt-6 text-red-500 hover:text-red-400 font-medium"
                        >
                            Submit another request
                        </button>
                    </div>
                ) : (
                    <form onSubmit={handleSubmit} className="space-y-6">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div>
                                <label className="block text-sm font-medium text-gray-400 mb-1">Your Name *</label>
                                <input
                                    type="text"
                                    required
                                    className="w-full bg-dark-900 border border-white/10 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-red-600 focus:ring-1 focus:ring-red-600 transition-colors"
                                    value={formData.name}
                                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-400 mb-1">Company / Organization</label>
                                <input
                                    type="text"
                                    className="w-full bg-dark-900 border border-white/10 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-red-600 focus:ring-1 focus:ring-red-600 transition-colors"
                                    value={formData.company}
                                    onChange={(e) => setFormData({ ...formData, company: e.target.value })}
                                />
                            </div>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-400 mb-1">Email Address *</label>
                            <input
                                type="email"
                                required
                                className="w-full bg-dark-900 border border-white/10 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-red-600 focus:ring-1 focus:ring-red-600 transition-colors"
                                value={formData.email}
                                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-400 mb-1">Link to Original Content (Proof) *</label>
                            <input
                                type="url"
                                required
                                className="w-full bg-dark-900 border border-white/10 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-red-600 focus:ring-1 focus:ring-red-600 transition-colors"
                                value={formData.original_link}
                                onChange={(e) => setFormData({ ...formData, original_link: e.target.value })}
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-400 mb-1">Infringing Link on Nexiplay *</label>
                            <input
                                type="url"
                                required
                                className="w-full bg-dark-900 border border-white/10 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-red-600 focus:ring-1 focus:ring-red-600 transition-colors"
                                value={formData.infringing_link}
                                onChange={(e) => setFormData({ ...formData, infringing_link: e.target.value })}
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-400 mb-1">Additional Proof Link (Optional)</label>
                            <input
                                type="url"
                                className="w-full bg-dark-900 border border-white/10 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-red-600 focus:ring-1 focus:ring-red-600 transition-colors"
                                value={formData.proof_link}
                                onChange={(e) => setFormData({ ...formData, proof_link: e.target.value })}
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-400 mb-1">Additional Message</label>
                            <textarea
                                rows={4}
                                className="w-full bg-dark-900 border border-white/10 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-red-600 focus:ring-1 focus:ring-red-600 transition-colors resize-none"
                                value={formData.message}
                                onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                            />
                        </div>

                        <div className="flex items-start gap-3 p-4 bg-dark-900 rounded-lg border border-red-500/20">
                            <input type="checkbox" required className="mt-1 accent-red-600 w-4 h-4" />
                            <p className="text-sm text-gray-400">
                                I swear, under penalty of perjury, that the information in the notification is accurate and that I am the copyright owner or am authorized to act on behalf of the owner of an exclusive right that is allegedly infringed.
                            </p>
                        </div>

                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full py-4 bg-red-600 hover:bg-red-700 text-white font-bold rounded-xl transition-all shadow-lg shadow-red-900/30 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
                        >
                            {loading ? (
                                <svg className="w-6 h-6 animate-spin text-white" fill="none" viewBox="0 0 24 24">
                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                                </svg>
                            ) : (
                                'Submit Takedown Request'
                            )}
                        </button>
                    </form>
                )}
            </div>
        </div>
    );
}
