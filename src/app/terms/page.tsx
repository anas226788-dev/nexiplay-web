import { Metadata } from 'next';
import { buildPageMetadata } from '@/lib/metadata';

export const metadata: Metadata = buildPageMetadata({
    title: 'Terms of Service',
    description: 'Terms of Service governing your use of Nexiplay.',
    path: '/terms',
});

export default function TermsPage() {
    return (
        <div className="container mx-auto px-4 py-12 max-w-4xl text-gray-300">
            <h1 className="text-4xl font-bold text-white mb-2">Terms of Service</h1>
            <p className="text-sm text-gray-500 mb-8">Last Updated: February 23, 2026</p>

            <div className="space-y-6 bg-dark-800 p-8 rounded-2xl border border-white/5">
                <section>
                    <h2 className="text-2xl font-semibold text-red-500 mb-4">1. Acceptance of Terms</h2>
                    <p>
                        By accessing, browsing, or using Nexiplay (&quot;the Website,&quot; &quot;the Service,&quot; &quot;we,&quot; &quot;us,&quot; or &quot;our&quot;), you acknowledge that you have read, understood, and agree to be legally bound by these Terms of Service and our <a href="/privacy-policy" className="text-red-400 hover:underline">Privacy Policy</a>. If you do not agree with any part of these terms, you must immediately cease use of this website.
                    </p>
                    <p className="mt-2">
                        We reserve the right to modify, amend, or update these Terms at any time without prior notice. Your continued use of the Website following any such changes constitutes your acceptance of the revised Terms. It is your responsibility to review these Terms periodically.
                    </p>
                </section>

                <section>
                    <h2 className="text-2xl font-semibold text-red-500 mb-4">2. Nature of the Service</h2>
                    <p>
                        Nexiplay operates solely as a <strong>link-indexing directory</strong>. The Website indexes and catalogs links to content that is publicly available on third-party websites across the internet.
                    </p>
                    <div className="mt-3 p-4 bg-black/20 rounded-lg border border-red-500/10 space-y-2">
                        <p><strong className="text-white">Nexiplay does NOT:</strong></p>
                        <ul className="list-disc list-inside space-y-1 ml-4">
                            <li>Host, store, upload, or distribute any files, media, or copyrighted content on its own servers.</li>
                            <li>Stream, transmit, or facilitate the streaming of any audio or video content.</li>
                            <li>Upload, modify, or reproduce any copyrighted materials.</li>
                            <li>Claim ownership over any content referenced, indexed, or linked on this Website.</li>
                            <li>Guarantee the accuracy, availability, legality, or quality of any third-party content linked from this Website.</li>
                        </ul>
                    </div>
                    <p className="mt-3">
                        All downloadable files, media, and content linked on this Website are hosted on external, third-party servers over which Nexiplay exercises no control or authority.
                    </p>
                </section>

                <section>
                    <h2 className="text-2xl font-semibold text-red-500 mb-4">3. User Responsibility</h2>
                    <p>
                        By using this Website, you expressly acknowledge and agree to the following:
                    </p>
                    <ul className="list-disc list-inside mt-2 space-y-2 ml-4">
                        <li>You are solely and entirely responsible for ensuring that your access to this Website and any content accessed through links on this Website is lawful in your jurisdiction.</li>
                        <li>You will not use this Website for any purpose that is unlawful, unauthorized, or prohibited by these Terms.</li>
                        <li>You access any third-party content linked from this Website at your own risk and discretion. Nexiplay bears no responsibility for any consequences arising from your interaction with third-party websites or their content.</li>
                        <li>You understand that links indexed on this Website may become unavailable, broken, or lead to content that has been modified by the third-party host without our knowledge.</li>
                        <li>You will not attempt to circumvent, disable, or interfere with any security features, access controls, or technical measures of this Website.</li>
                    </ul>
                </section>

                <section>
                    <h2 className="text-2xl font-semibold text-red-500 mb-4">4. Prohibited Uses</h2>
                    <p>You agree not to use this Website to:</p>
                    <ul className="list-disc list-inside mt-2 space-y-1 ml-4">
                        <li>Engage in any activity that violates any applicable local, national, or international law or regulation.</li>
                        <li>Reproduce, duplicate, copy, sell, resell, or exploit any portion of the Website or its content for commercial purposes without express written consent.</li>
                        <li>Introduce viruses, trojans, worms, or other malicious code or technology intended to disrupt or damage the Website.</li>
                        <li>Scrape, crawl, or use automated systems to access the Website in a manner that exceeds reasonable use or imposes an unreasonable load on our infrastructure.</li>
                        <li>Impersonate any person or entity, or misrepresent your affiliation with any person or entity.</li>
                        <li>Attempt to gain unauthorized access to any portion of the Website, other accounts, computer systems, or networks connected to the Website.</li>
                    </ul>
                    <p className="mt-2">
                        Violation of these provisions may result in immediate termination of your access to the Website without notice.
                    </p>
                </section>

                <section>
                    <h2 className="text-2xl font-semibold text-red-500 mb-4">5. Intellectual Property and Copyright</h2>
                    <p>
                        All trademarks, logos, service marks, trade names, and other intellectual property displayed on this Website belong to their respective owners. Nexiplay does not claim ownership of any third-party intellectual property.
                    </p>
                    <p className="mt-2">
                        The Website&apos;s original design, layout, code, and branding are the property of Nexiplay and are protected by applicable intellectual property laws. Unauthorized reproduction or distribution of these elements is prohibited.
                    </p>
                </section>

                <section>
                    <h2 className="text-2xl font-semibold text-red-500 mb-4">6. Copyright Notice and DMCA Takedown</h2>
                    <div className="text-sm space-y-3 bg-black/20 p-4 rounded-lg border border-red-500/10">
                        <p>
                            Nexiplay respects the intellectual property rights of others. We do not host, store, or distribute any copyrighted content on our servers. All linked content is hosted on external, third-party servers that are not owned, operated, or controlled by Nexiplay.
                        </p>
                        <p>
                            If you are the rightful owner or authorized representative of copyrighted material and believe that a link indexed on this Website infringes upon your copyright, you may submit a takedown request in accordance with our <a href="/dmca" className="text-red-400 hover:underline">DMCA Policy</a>.
                        </p>
                        <p>Your takedown notice must include:</p>
                        <ul className="list-disc list-inside ml-4 space-y-1">
                            <li>Identification of the copyrighted work you claim has been infringed.</li>
                            <li>The specific URL(s) on our Website where the allegedly infringing reference appears.</li>
                            <li>Your full name, contact information, and a statement of good faith.</li>
                            <li>A declaration that you are the copyright owner or authorized to act on behalf of the owner.</li>
                        </ul>
                        <p>
                            Upon receipt of a valid and complete takedown notice, we will make reasonable efforts to remove or disable access to the referenced link(s) in a timely manner.
                        </p>
                        <p className="font-bold text-red-400 mt-2">
                            DMCA Contact: <span className="text-red-400">nexiplay@proton.me</span> or via our <a href="/contact" className="text-red-400 hover:underline">Contact Page</a>.
                        </p>
                    </div>
                </section>

                <section>
                    <h2 className="text-2xl font-semibold text-red-500 mb-4">7. Disclaimer of Warranties</h2>
                    <p>
                        THE WEBSITE AND ALL CONTENT, INFORMATION, LINKS, AND MATERIALS AVAILABLE ON OR THROUGH THIS WEBSITE ARE PROVIDED ON AN <strong>&quot;AS IS&quot;</strong> AND <strong>&quot;AS AVAILABLE&quot;</strong> BASIS WITHOUT WARRANTIES OF ANY KIND, WHETHER EXPRESS, IMPLIED, STATUTORY, OR OTHERWISE.
                    </p>
                    <p className="mt-2">
                        TO THE FULLEST EXTENT PERMITTED BY APPLICABLE LAW, NEXIPLAY EXPRESSLY DISCLAIMS ALL WARRANTIES, INCLUDING BUT NOT LIMITED TO:
                    </p>
                    <ul className="list-disc list-inside mt-2 space-y-1 ml-4">
                        <li>IMPLIED WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE, AND NON-INFRINGEMENT.</li>
                        <li>WARRANTIES REGARDING THE ACCURACY, RELIABILITY, COMPLETENESS, OR TIMELINESS OF ANY CONTENT OR INFORMATION.</li>
                        <li>WARRANTIES THAT THE WEBSITE WILL BE UNINTERRUPTED, ERROR-FREE, SECURE, OR FREE OF VIRUSES OR OTHER HARMFUL COMPONENTS.</li>
                        <li>WARRANTIES REGARDING THE LEGALITY, QUALITY, SAFETY, OR AVAILABILITY OF ANY THIRD-PARTY CONTENT LINKED FROM THIS WEBSITE.</li>
                    </ul>
                </section>

                <section>
                    <h2 className="text-2xl font-semibold text-red-500 mb-4">8. Limitation of Liability</h2>
                    <p>
                        TO THE MAXIMUM EXTENT PERMITTED BY APPLICABLE LAW, NEXIPLAY, ITS OPERATORS, AFFILIATES, OFFICERS, DIRECTORS, EMPLOYEES, AGENTS, AND SERVICE PROVIDERS SHALL NOT BE LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL, CONSEQUENTIAL, EXEMPLARY, OR PUNITIVE DAMAGES (INCLUDING BUT NOT LIMITED TO LOSS OF PROFITS, DATA, GOODWILL, OR OTHER INTANGIBLE LOSSES) ARISING OUT OF OR IN CONNECTION WITH:
                    </p>
                    <ul className="list-disc list-inside mt-2 space-y-1 ml-4">
                        <li>Your use of or inability to use this Website.</li>
                        <li>Any content, information, or links provided on or through this Website.</li>
                        <li>Any actions taken by you based on information found on this Website.</li>
                        <li>Any unauthorized access to or alteration of your data or transmissions.</li>
                        <li>Any third-party content, services, or websites accessed through links on this Website.</li>
                        <li>Any errors, omissions, interruptions, defects, or delays in the operation of the Website.</li>
                    </ul>
                    <p className="mt-2">
                        THIS LIMITATION APPLIES REGARDLESS OF THE THEORY OF LIABILITY (CONTRACT, TORT, STRICT LIABILITY, OR OTHERWISE), EVEN IF NEXIPLAY HAS BEEN ADVISED OF THE POSSIBILITY OF SUCH DAMAGES.
                    </p>
                </section>

                <section>
                    <h2 className="text-2xl font-semibold text-red-500 mb-4">9. Indemnification</h2>
                    <p>
                        You agree to indemnify, defend, and hold harmless Nexiplay, its operators, affiliates, agents, and service providers from and against any and all claims, liabilities, damages, losses, costs, and expenses (including reasonable legal fees) arising out of or related to:
                    </p>
                    <ul className="list-disc list-inside mt-2 space-y-1 ml-4">
                        <li>Your use of or access to this Website.</li>
                        <li>Your violation of these Terms of Service or any applicable law or regulation.</li>
                        <li>Your infringement of any intellectual property or other rights of any third party.</li>
                        <li>Any content or information you submit through this Website.</li>
                    </ul>
                </section>

                <section>
                    <h2 className="text-2xl font-semibold text-red-500 mb-4">10. Third-Party Links and Content</h2>
                    <p>
                        This Website contains links to third-party websites and resources that are not owned or controlled by Nexiplay. We have no control over, and assume no responsibility for, the content, privacy policies, practices, availability, or legality of any third-party websites or resources.
                    </p>
                    <p className="mt-2">
                        The inclusion of any link on this Website does not imply endorsement, affiliation, sponsorship, or approval of the linked website or its content. You access third-party websites entirely at your own risk and subject to the terms and conditions of those websites.
                    </p>
                </section>

                <section>
                    <h2 className="text-2xl font-semibold text-red-500 mb-4">11. Termination</h2>
                    <p>
                        We reserve the right, at our sole discretion, to restrict, suspend, or terminate your access to all or any part of this Website at any time, for any reason or no reason, with or without notice, and without liability.
                    </p>
                    <p className="mt-2">
                        All provisions of these Terms that by their nature should survive termination shall survive, including but not limited to: Disclaimer of Warranties, Limitation of Liability, Indemnification, and Governing Law.
                    </p>
                </section>

                <section>
                    <h2 className="text-2xl font-semibold text-red-500 mb-4">12. Advertisements</h2>
                    <p>
                        This Website may display advertisements provided by third-party advertising networks. These advertisements may include pop-under ads, banner ads, native ads, and social bar advertisements. Nexiplay does not endorse, guarantee, or assume responsibility for any products, services, or content advertised through these networks.
                    </p>
                    <p className="mt-2">
                        Your interactions with advertisers and any terms, conditions, warranties, or representations associated with such dealings are solely between you and the advertiser. Nexiplay shall not be liable for any loss or damage arising from such interactions.
                    </p>
                </section>

                <section>
                    <h2 className="text-2xl font-semibold text-red-500 mb-4">13. Governing Law and Dispute Resolution</h2>
                    <p>
                        These Terms of Service shall be governed by and construed in accordance with the laws of the jurisdiction in which our primary operations are conducted, without regard to its conflict of law provisions.
                    </p>
                    <p className="mt-2">
                        Any dispute, controversy, or claim arising out of or relating to these Terms shall first be attempted to be resolved through good-faith negotiation. If such negotiation fails, the dispute shall be submitted to the exclusive jurisdiction of the competent courts in the applicable jurisdiction.
                    </p>
                    <p className="mt-2">
                        You agree that any cause of action arising out of or related to the use of this Website must commence within one (1) year after the cause of action accrues. Otherwise, such cause of action is permanently barred.
                    </p>
                </section>

                <section>
                    <h2 className="text-2xl font-semibold text-red-500 mb-4">14. Severability</h2>
                    <p>
                        If any provision of these Terms is found to be unlawful, void, or unenforceable by a court of competent jurisdiction, that provision shall be deemed severable and shall not affect the validity and enforceability of the remaining provisions. The unenforceable provision shall be replaced with a valid and enforceable provision that most closely reflects the original intent.
                    </p>
                </section>

                <section>
                    <h2 className="text-2xl font-semibold text-red-500 mb-4">15. Entire Agreement</h2>
                    <p>
                        These Terms of Service, together with our <a href="/privacy-policy" className="text-red-400 hover:underline">Privacy Policy</a> and <a href="/dmca" className="text-red-400 hover:underline">DMCA Policy</a>, constitute the entire agreement between you and Nexiplay with respect to your use of this Website, and supersede all prior or contemporaneous communications, proposals, and agreements, whether oral or written.
                    </p>
                </section>

                <section>
                    <h2 className="text-2xl font-semibold text-red-500 mb-4">16. Contact Us</h2>
                    <p>
                        If you have any questions or concerns regarding these Terms of Service, please contact us via our <a href="/contact" className="text-red-400 hover:underline">Contact Page</a> or email us at <span className="text-red-400 font-bold">nexiplay@proton.me</span>.
                    </p>
                </section>
            </div>
        </div>
    );
}
