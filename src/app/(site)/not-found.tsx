import Link from 'next/link';

export default function NotFound() {
    return (
        <div className="container mx-auto px-4 py-20">
            <div className="max-w-md mx-auto text-center">
                <div className="text-8xl font-bold bg-gradient-to-r from-red-500 to-red-700 bg-clip-text text-transparent mb-6">
                    404
                </div>
                <h1 className="text-2xl font-bold mb-4">Page Not Found</h1>
                <p className="text-gray-400 mb-8">
                    The content you&apos;re looking for doesn&apos;t exist or has been removed.
                </p>
                <Link href="/" className="btn-primary">
                    <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                    </svg>
                    Back to Home
                </Link>
            </div>
        </div>
    );
}
