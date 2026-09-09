import { Metadata } from 'next';
import { buildPageMetadata } from '@/lib/metadata';
import { supabaseNovels } from '@/lib/supabase-novels';
import NovelsExplorer from '@/components/NovelsExplorer';

export const metadata: Metadata = buildPageMetadata({
    title: 'Nexiplay Novels - Read Free Novels Online',
    description: 'Read the latest and best novels for free on Nexiplay. Enjoy a seamless reading experience with our built-in reader.',
    path: '/novels',
});

export const revalidate = 60; // Cache for 1 minute

export default async function NovelsIndexPage() {
    const { data: novels, error } = await supabaseNovels
        .from('novels')
        .select('*')
        .order('created_at', { ascending: false });

    return (
        <div className="container mx-auto px-4 py-8 md:py-12 min-h-screen">
            <div className="mb-8 md:mb-10 text-center">
                <h1 className="text-3xl md:text-5xl font-black text-white mb-3">
                    <span className="bg-gradient-to-r from-red-500 to-red-600 bg-clip-text text-transparent">Nexiplay</span> Novels
                </h1>
                <p className="text-gray-400 max-w-2xl mx-auto text-sm md:text-base">
                    Dive into our collection of free romantic novels. Search, browse, and experience seamless reading anywhere.
                </p>
            </div>

            <NovelsExplorer initialNovels={novels || []} />
        </div>
    );
}
