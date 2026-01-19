import { Metadata } from 'next';

export const metadata: Metadata = {
    title: 'Terms of Service | Nexiplay',
    description: 'Terms of Service for using Nexiplay.',
};

export default function TermsPage() {
    return (
        <div className="container mx-auto px-4 py-12 max-w-4xl text-gray-300">
            <h1 className="text-4xl font-bold text-white mb-8">Terms of Service</h1>

            <div className="space-y-6 bg-dark-800 p-8 rounded-2xl border border-white/5">
                <section>
                    <h2 className="text-2xl font-semibold text-red-500 mb-4">1. Acceptance of Terms</h2>
                    <p>By accessing and using Neixplay, you accept and agree to be bound by the terms and provision of this agreement.</p>
                </section>

                <section>
                    <h2 className="text-2xl font-semibold text-red-500 mb-4">2. Disclaimer</h2>
                    <p>
                        Nexiplay does <strong>NOT</strong> host any files on its servers. All content provided on this site is for educational and promotional purposes only.
                        We index links available on the internet. We are not responsible for the content of external websites.
                    </p>
                </section>

                <section>
                    <h2 className="text-2xl font-semibold text-red-500 mb-4">3. User Responsibility</h2>
                    <p>
                        You agree to use this site only for lawful purposes. You are responsible for ensuring that your access to this site and the material available on or through it are legal in each jurisdiction in or through which you access or view the site or such material.
                    </p>
                </section>

                <section>
                    <h2 className="text-2xl font-semibold text-red-500 mb-4">4. Content Removal</h2>
                    <p>
                        We respect the intellectual property rights of others. If you believe that your work has been copied in a way that constitutes copyright infringement, please follow our <a href="/dmca" className="text-red-400 hover:underline">DMCA Policy</a> to request removal.
                    </p>
                </section>

                <section>
                    <h2 className="text-2xl font-semibold text-red-500 mb-4">5. Changes to Terms</h2>
                    <p>
                        We reserve the right to modify these terms from time to time at our sole discretion. Your continued use of the site will signify your acceptance of any adjustment to these terms.
                    </p>
                </section>

                <section>
                    <h2 className="text-2xl font-semibold text-red-500 mb-4">6. Digital Millennium Copyright Act Policy : Information (DMCA)</h2>
                    <div className="text-sm space-y-3 bg-black/20 p-4 rounded-lg border border-red-500/10">
                        <p>We do not store any copyright-protected content on our websites/servers. All the posts are made only for educational purposes and any linked content is stored only in third-party websites. Since freedom of speech is allowed in this fashion, we do not attend in any kind of copyright infringing.</p>
                        <p>This is a promotional website only, all the downloadable content provided on this site (All materials) is for testing/promotion purposes only. All files placed here are for introducing purpose.</p>
                        <p>All parts of the This Website/Blog website are for private use only.</p>
                        <p>All contents are provided by non-affiliated third parties.</p>
                        <p>They are only indexed much like how Google works.</p>
                        <p>This site merely indexes of other sites’s contents. The hosting server or the administrator cannot be held responsible for the contents of any linked sites or any link contained in a linked site, or changes / updates to such sites. All materials on this website is for Educational Purposes ONLY.</p>
                        <p>This Website/Blog does not accept responsibility for content hosted on third party websites and does not have any involvement in the downloading/uploading of movies. We just post links available in internet.</p>
                        <p className="font-semibold text-white">We highly ENCOURAGE users to BUY the CDs or DVDs of the movie or the music they like. Please, buy original contents from author or developer site!</p>
                        <p>If you do *not* agree to all the terms, please disconnect from this site now itself.</p>
                        <p>By remaining at this site, you affirm your understanding and compliance of the above disclaimer and absolve this site of any responsibility henceforth.</p>
                        <p>All files found on this site have been collected from various sources across the web and are believed to be in the “public domain”.</p>
                        <p>All the logos and stuff are the property of their respective owners.</p>
                        <p>You should DELETE IT (data) within 24 hours and make a point to buy the original CD or DVD from a local or online store.</p>
                        <p>For any copyright issues, you should contact the hosters files sites’s itself.</p>
                        <p>If you are the rightful owner of any contents posted here and object to them being displayed or If you are one of the representatives of copy rights department and you don’t like our conditions of store, please mail us at <span className="text-red-400 font-bold">nexiplay@proton.me</span> or Contact Us immediately and we will delete it!</p>
                        <p className="font-bold text-red-500 mt-4">Kindly mail us at (nexiplay@proton.me) or contact us though the contact form for any DMCA issues.</p>
                    </div>
                </section>
            </div>
        </div>
    );
}
