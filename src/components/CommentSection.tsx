'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { Comment } from '@/lib/types';

interface CommentSectionProps {
    movieId: string;
}

export default function CommentSection({ movieId }: CommentSectionProps) {
    const [comments, setComments] = useState<Comment[]>([]);
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);

    // Form State
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [message, setMessage] = useState('');

    useEffect(() => {
        fetchComments();
    }, [movieId]);

    async function fetchComments() {
        const { data } = await supabase
            .from('comments')
            .select('*')
            .eq('movie_id', movieId)
            .order('created_at', { ascending: false });

        if (data) {
            setComments(data);
        }
        setLoading(false);
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setSubmitting(true);

        const { error } = await supabase
            .from('comments')
            .insert({
                movie_id: movieId,
                name,
                email,
                message,
                is_approved: true // Auto-approve for now
            });

        if (error) {
            alert('Error posting comment');
            console.error(error);
        } else {
            // Reset form and refresh comments
            setName('');
            setEmail('');
            setMessage('');
            fetchComments();
        }
        setSubmitting(false);
    };

    return (
        <div className="container mx-auto px-4 max-w-4xl mt-12 mb-20">
            <div className="glass p-6 md:p-8 rounded-2xl border border-white/5">
                <div className="flex items-center gap-3 mb-8">
                    <span className="w-1 h-8 bg-blue-500 rounded-full"></span>
                    <h2 className="text-2xl font-bold text-white">
                        Comments <span className="text-gray-500 text-lg font-normal">({comments.length})</span>
                    </h2>
                </div>

                {/* Comment Form */}
                <form onSubmit={handleSubmit} className="mb-12 space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <input
                            type="text"
                            placeholder="Name"
                            required
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            className="bg-dark-700 border border-white/10 rounded-lg p-3 text-white focus:outline-none focus:border-blue-500 transition-colors"
                        />
                        <input
                            type="email"
                            placeholder="Email"
                            required
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            className="bg-dark-700 border border-white/10 rounded-lg p-3 text-white focus:outline-none focus:border-blue-500 transition-colors"
                        />
                    </div>
                    <textarea
                        placeholder="Write your comment here..."
                        required
                        rows={3}
                        value={message}
                        onChange={(e) => setMessage(e.target.value)}
                        className="w-full bg-dark-700 border border-white/10 rounded-lg p-3 text-white focus:outline-none focus:border-blue-500 transition-colors"
                    />
                    <div className="flex justify-end">
                        <button
                            type="submit"
                            disabled={submitting}
                            className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-lg transition-colors shadow-lg shadow-blue-900/20 disabled:opacity-50"
                        >
                            {submitting ? 'Posting...' : 'Post Comment'}
                        </button>
                    </div>
                </form>

                {/* Comment List */}
                <div className="space-y-6">
                    {loading ? (
                        <div className="text-center text-gray-500 py-4">Loading comments...</div>
                    ) : comments.length > 0 ? (
                        comments.map((comment) => (
                            <div key={comment.id} className="flex gap-4 group">
                                <div className="flex-shrink-0 w-10 h-10 rounded-full bg-gradient-to-br from-gray-700 to-gray-800 flex items-center justify-center text-white font-bold text-sm border border-white/10">
                                    {comment.name.charAt(0).toUpperCase()}
                                </div>
                                <div className="flex-1 space-y-1">
                                    <div className="flex items-center gap-2">
                                        <span className="font-bold text-white">{comment.name}</span>
                                        <span className="text-xs text-gray-500">
                                            {new Date(comment.created_at).toLocaleDateString()}
                                        </span>
                                    </div>
                                    <p className="text-gray-300 text-sm leading-relaxed">
                                        {comment.message}
                                    </p>
                                </div>
                            </div>
                        ))
                    ) : (
                        <div className="text-center py-8 bg-white/5 rounded-xl border border-white/5 border-dashed">
                            <p className="text-gray-400">No comments yet. Be the first to say something!</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
