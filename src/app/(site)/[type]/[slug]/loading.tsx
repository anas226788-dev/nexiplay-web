export default function MovieDetailLoading() {
    return (
        <div className="min-h-screen pb-20 animate-fade-in">
            {/* Backdrop Shimmer Skeleton */}
            <div className="relative w-full">
                <div className="absolute inset-0 h-[60vh] w-full overflow-hidden bg-gradient-to-b from-[#17141F]/60 via-[#0D0B12]/80 to-[#0D0B12] np-skeleton" />

                {/* Content Container */}
                <div className="relative z-10 container mx-auto px-4 max-w-6xl pt-28 pb-12">
                    <div className="grid grid-cols-1 md:grid-cols-[300px_1fr] gap-8 md:gap-12 items-start">
                        {/* LEFT COLUMN: Poster Shimmer */}
                        <div className="space-y-6">
                            <div className="hidden md:block aspect-[2/3] rounded-2xl np-skeleton border border-white/10" />
                        </div>

                        {/* RIGHT COLUMN: Details Shimmer */}
                        <div className="space-y-5">
                            {/* Breadcrumb shimmer */}
                            <div className="h-4 w-48 rounded np-skeleton" />

                            {/* Badge shimmer */}
                            <div className="flex gap-2">
                                <div className="h-6 w-16 rounded np-skeleton" />
                                <div className="h-6 w-14 rounded np-skeleton" />
                            </div>

                            {/* Title shimmer */}
                            <div className="h-10 md:h-14 w-3/4 rounded-xl np-skeleton" />

                            {/* Details box shimmer */}
                            <div className="p-5 rounded-xl border border-white/5 bg-[#17141F]/40 backdrop-blur-sm space-y-3">
                                <div className="h-5 w-2/3 rounded np-skeleton" />
                                <div className="h-4 w-full rounded np-skeleton" />
                                <div className="h-4 w-5/6 rounded np-skeleton" />
                                <div className="h-4 w-4/6 rounded np-skeleton" />
                            </div>

                            {/* Action Buttons Shimmer */}
                            <div className="flex flex-wrap gap-4 pt-4">
                                <div className="h-14 w-44 rounded-xl np-skeleton shadow-lg" />
                                <div className="h-14 w-44 rounded-xl np-skeleton border border-white/10" />
                                <div className="h-14 w-32 rounded-xl np-skeleton border border-white/10" />
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Downloads / Episodes Skeleton */}
            <div className="container mx-auto px-4 max-w-4xl mt-10">
                <div className="p-6 sm:p-8 rounded-3xl border border-white/5 bg-[#17141F]/30 space-y-4">
                    <div className="h-7 w-48 rounded np-skeleton" />
                    <div className="h-16 w-full rounded-xl np-skeleton" />
                    <div className="h-16 w-full rounded-xl np-skeleton" />
                </div>
            </div>
        </div>
    );
}
