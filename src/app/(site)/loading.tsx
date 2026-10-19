export default function SiteLoading() {
    return (
        <div className="min-h-screen pt-24 px-4 container mx-auto max-w-6xl animate-fade-in">
            {/* Header placeholder shimmer */}
            <div className="h-64 md:h-96 w-full rounded-2xl np-skeleton mb-8" />

            {/* Grid of cards shimmer */}
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                {Array.from({ length: 10 }).map((_, i) => (
                    <div key={i} className="space-y-2">
                        <div className="aspect-[2/3] rounded-xl np-skeleton" />
                        <div className="h-4 w-3/4 rounded np-skeleton" />
                        <div className="h-3 w-1/2 rounded np-skeleton" />
                    </div>
                ))}
            </div>
        </div>
    );
}
