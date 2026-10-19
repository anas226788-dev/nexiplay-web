import type { Metadata } from 'next';
import Image from 'next/image';

export const metadata: Metadata = {
    title: 'Credits | Nexiplay',
    description: 'Third-party data and image credits used by Nexiplay.',
};

export default function CreditsPage() {
    return (
        <main className="container mx-auto min-h-[70vh] max-w-4xl px-4 pb-16 pt-28 md:pt-36">
            <header className="mb-8">
                <p className="text-xs font-bold uppercase tracking-[.22em] text-[#B09AFF]">Nexiplay</p>
                <h1 className="mt-2 text-3xl font-black text-white sm:text-4xl">Credits</h1>
                <p className="mt-3 text-sm leading-6 text-gray-400">Acknowledgements for third-party data and media services used on this website.</p>
            </header>

            <section className="rounded-2xl border border-white/10 bg-white/[.035] p-5 sm:p-7">
                <a href="https://www.themoviedb.org/" target="_blank" rel="noopener noreferrer" className="inline-flex rounded-lg bg-white px-3 py-2" aria-label="The Movie Database">
                    <Image
                        src="https://www.themoviedb.org/assets/2/v4/logos/v2/blue_square_2-d537fb228cf3ded904ef09b136fe3fec72548ebc1fea3fbbd1ad9e36364db38b.svg"
                        alt="The Movie Database logo"
                        width={100}
                        height={56}
                        unoptimized
                        className="h-10 w-auto"
                    />
                </a>
                <p className="mt-5 text-sm leading-6 text-gray-300">
                    This website uses TMDB and the TMDB APIs but is not endorsed, certified, or otherwise approved by TMDB.
                </p>
                <p className="mt-3 text-xs leading-5 text-gray-500">
                    Movie and television data and images provided by <a href="https://www.themoviedb.org/" target="_blank" rel="noopener noreferrer" className="text-[#B09AFF] hover:underline">The Movie Database (TMDB)</a>.
                </p>
            </section>
        </main>
    );
}
