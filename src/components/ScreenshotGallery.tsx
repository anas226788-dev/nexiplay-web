'use client';

import { useState } from 'react';
import Image from 'next/image';

interface ScreenshotGalleryProps {
    screenshots: {
        id: string;
        image_url: string;
    }[];
}

export default function ScreenshotGallery({ screenshots }: ScreenshotGalleryProps) {
    const [selectedImage, setSelectedImage] = useState<string | null>(null);

    if (!screenshots || screenshots.length === 0) return null;

    return (
        <div className="container mx-auto px-4 max-w-6xl mt-12 mb-12">
            <div className="flex items-center gap-3 mb-6">
                <span className="w-1 h-8 bg-white/20 rounded-full"></span>
                <h2 className="text-2xl font-bold text-white">Screenshots</h2>
            </div>

            {/* Gallery Grid - Scrollable on mobile, Grid on desktop */}
            <div className="flex overflow-x-auto pb-4 gap-4 md:grid md:grid-cols-2 lg:grid-cols-3 md:overflow-visible scrollbar-hide snap-x">
                {screenshots.map((shot, index) => (
                    <div
                        key={shot.id}
                        className="relative flex-none w-[80vw] md:w-auto aspect-video rounded-xl overflow-hidden cursor-pointer border border-white/10 group snap-center"
                        onClick={() => setSelectedImage(shot.image_url)}
                    >
                        <Image
                            src={shot.image_url}
                            alt={`Screenshot ${index + 1}`}
                            fill
                            className="object-cover transition-transform duration-500 group-hover:scale-105"
                            sizes="(max-width: 768px) 80vw, (max-width: 1200px) 50vw, 33vw"
                        />
                        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors flex items-center justify-center">
                            <svg className="w-10 h-10 text-white opacity-0 group-hover:opacity-100 transition-opacity transform scale-75 group-hover:scale-100" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM10 7v3m0 0v3m0-3h3m-3 0H7" />
                            </svg>
                        </div>
                    </div>
                ))}
            </div>

            {/* Lightbox */}
            {selectedImage && (
                <div
                    className="fixed inset-0 z-50 bg-black/95 backdrop-blur-xl flex items-center justify-center p-4 animate-fadeIn"
                    onClick={() => setSelectedImage(null)}
                >
                    <button
                        className="absolute top-4 right-4 text-white/50 hover:text-white transition-colors z-50"
                        onClick={() => setSelectedImage(null)}
                    >
                        <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>

                    <div className="relative w-full max-w-7xl aspect-video rounded-lg overflow-hidden shadow-2xl">
                        <Image
                            src={selectedImage}
                            alt="Full Screen Screenshot"
                            fill
                            className="object-contain"
                        />
                    </div>
                </div>
            )}
        </div>
    );
}
