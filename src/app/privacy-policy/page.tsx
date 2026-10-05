import { Metadata } from 'next';
import { buildPageMetadata } from '@/lib/metadata';

export const metadata: Metadata = buildPageMetadata({
    title: 'Privacy Policy',
    description: 'Privacy Policy for Nexiplay. Learn how we handle your data and protect your privacy.',
    path: '/privacy-policy',
});

export default function PrivacyPolicyPage() {
    return (
        <div className="container mx-auto px-4 py-12 max-w-4xl text-gray-300">
            <h1 className="text-4xl font-bold text-white mb-2">Privacy Policy</h1>
            <p className="text-sm text-gray-500 mb-8">Last Updated: February 23, 2026</p>

            <div className="space-y-6 bg-dark-800 p-8 rounded-2xl border border-white/5">
                <section>
                    <h2 className="text-2xl font-semibold text-red-500 mb-4">1. Introduction</h2>
                    <p>
                        This Privacy Policy describes how Nexiplay (&quot;we,&quot; &quot;us,&quot; or &quot;our&quot;) collects, uses, and handles information when you visit our website. By accessing or using Nexiplay, you acknowledge that you have read, understood, and agree to the practices described in this Privacy Policy.
                    </p>
                    <p className="mt-2">
                        <strong>Nexiplay does not host, store, upload, or distribute any copyrighted content on its servers.</strong> Our website functions solely as an index of publicly available, third-party links found across the internet.
                    </p>
                </section>

                <section>
                    <h2 className="text-2xl font-semibold text-red-500 mb-4">2. Information We Collect</h2>
                    <p>We collect minimal information necessary to operate and improve our services:</p>

                    <h3 className="text-lg font-semibold text-white mt-4 mb-2">2.1 Information You Voluntarily Provide</h3>
                    <ul className="list-disc list-inside mt-2 space-y-1 ml-4">
                        <li><strong>Contact Information:</strong> If you voluntarily submit a message through our contact form, we may collect your name and email address solely for the purpose of responding to your inquiry. We do not require user registration, account creation, or login.</li>
                        <li><strong>Content Requests:</strong> If you submit a content request, we may collect the name of the requested content for internal reference only.</li>
                    </ul>

                    <h3 className="text-lg font-semibold text-white mt-4 mb-2">2.2 Information Collected Automatically</h3>
                    <ul className="list-disc list-inside mt-2 space-y-1 ml-4">
                        <li><strong>Server Logs:</strong> Our hosting providers may automatically collect standard server log information, including your IP address, browser type and version, operating system, referring URL, pages visited, date and time of access, and request method. This data is collected for security monitoring, abuse prevention, and diagnostic purposes.</li>
                        <li><strong>Analytics Data:</strong> We may use third-party analytics services to collect aggregated, non-personally-identifiable usage data such as page views, session duration, and geographic region. This data helps us understand general usage patterns.</li>
                        <li><strong>Cookies and Similar Technologies:</strong> Our website and third-party services operating on our website (including advertising networks) may use cookies, web beacons, pixels, and similar tracking technologies. These may be used for displaying advertisements, measuring ad performance, and basic site functionality. You may configure your browser to refuse cookies; however, some features may not function properly.</li>
                    </ul>

                    <h3 className="text-lg font-semibold text-white mt-4 mb-2">2.3 Information We Do NOT Collect</h3>
                    <ul className="list-disc list-inside mt-2 space-y-1 ml-4">
                        <li>We do <strong>not</strong> require user accounts, passwords, or login credentials.</li>
                        <li>We do <strong>not</strong> collect payment information, financial data, or government-issued identification.</li>
                        <li>We do <strong>not</strong> knowingly collect personally identifiable information beyond what is described above.</li>
                    </ul>
                </section>

                <section>
                    <h2 className="text-2xl font-semibold text-red-500 mb-4">3. How We Use Information</h2>
                    <p>Any information collected is used strictly for the following purposes:</p>
                    <ul className="list-disc list-inside mt-2 space-y-1 ml-4">
                        <li>To respond to inquiries or support requests submitted via the contact form.</li>
                        <li>To monitor, analyze, and improve website performance, security, and user experience.</li>
                        <li>To detect, prevent, and address abuse, fraud, or technical issues.</li>
                        <li>To display advertisements through third-party advertising networks that support the free operation of this website.</li>
                        <li>To comply with applicable legal obligations or respond to lawful requests from authorities.</li>
                    </ul>
                </section>

                <section>
                    <h2 className="text-2xl font-semibold text-red-500 mb-4">4. Data Sharing and Disclosure</h2>
                    <p>
                        We do <strong>NOT</strong> sell, trade, rent, or otherwise transfer your personally identifiable information to any third party for commercial purposes.
                    </p>
                    <p className="mt-2">We may share information only in the following limited circumstances:</p>
                    <ul className="list-disc list-inside mt-2 space-y-1 ml-4">
                        <li><strong>Third-Party Service Providers:</strong> Information may be processed by third-party services we use (e.g., hosting, analytics, advertising) strictly for the purposes described in this policy. These providers operate under their own privacy policies.</li>
                        <li><strong>Legal Compliance:</strong> We may disclose information if required to do so by law, court order, or governmental regulation, or if we believe in good faith that such disclosure is necessary to protect our rights, your safety, or the safety of others.</li>
                        <li><strong>Aggregated Data:</strong> We may share non-personally-identifiable, aggregated statistical data with partners or advertisers. This data cannot be used to identify any individual user.</li>
                    </ul>
                </section>

                <section>
                    <h2 className="text-2xl font-semibold text-red-500 mb-4">5. Third-Party Services</h2>
                    <p>
                        Our website integrates with or relies upon third-party services that may independently collect data. We do not control the data practices of these third parties. We strongly encourage you to review their respective privacy policies:
                    </p>
                    <ul className="list-disc list-inside mt-2 space-y-1 ml-4">
                        <li><strong>Adsterra</strong> — Advertising network for displaying advertisements.</li>
                        <li><strong>Cloudflare</strong> — Content delivery, DDoS protection, and security services.</li>
                        <li><strong>Vercel</strong> — Website hosting and deployment infrastructure.</li>
                        <li><strong>Supabase</strong> — Backend database services.</li>
                    </ul>
                    <p className="mt-2 text-sm italic">
                        We are not responsible for the privacy practices, data collection methods, or content of any third-party service. Your use of such services is governed solely by their terms and policies.
                    </p>
                </section>

                <section>
                    <h2 className="text-2xl font-semibold text-red-500 mb-4">6. Cookies</h2>
                    <p>
                        Cookies are small text files placed on your device by websites you visit. We and our third-party partners may use cookies for the following purposes:
                    </p>
                    <ul className="list-disc list-inside mt-2 space-y-1 ml-4">
                        <li><strong>Essential Cookies:</strong> Required for basic site functionality and security.</li>
                        <li><strong>Analytics Cookies:</strong> Used to understand how visitors interact with our website.</li>
                        <li><strong>Advertising Cookies:</strong> Used by third-party ad networks to deliver relevant advertisements and measure campaign effectiveness.</li>
                    </ul>
                    <p className="mt-2">
                        You may disable cookies through your browser settings at any time. Please note that disabling cookies may impair certain features of the website.
                    </p>
                </section>

                <section>
                    <h2 className="text-2xl font-semibold text-red-500 mb-4">7. Data Retention</h2>
                    <p>
                        We retain voluntarily provided contact information (name, email, message content) only for as long as reasonably necessary to fulfill the purpose for which it was collected, typically no longer than 12 months after the last interaction.
                    </p>
                    <p className="mt-2">
                        Server logs and analytics data are retained in accordance with the retention policies of our hosting and analytics providers. We do not maintain independent long-term archives of server log data.
                    </p>
                </section>

                <section>
                    <h2 className="text-2xl font-semibold text-red-500 mb-4">8. Children&apos;s Privacy</h2>
                    <p>
                        Nexiplay is not directed at individuals under the age of 13 (or the applicable minimum age in your jurisdiction). We do not knowingly collect personally identifiable information from children. If you are a parent or guardian and believe that your child has provided us with personal information, please contact us immediately via our <a href="/contact" className="text-red-400 hover:underline">Contact Page</a>, and we will take reasonable steps to delete such information.
                    </p>
                </section>

                <section>
                    <h2 className="text-2xl font-semibold text-red-500 mb-4">9. Data Security</h2>
                    <p>
                        We implement commercially reasonable technical and organizational measures to protect the information we collect against unauthorized access, alteration, disclosure, or destruction. However, no method of transmission over the Internet or method of electronic storage is 100% secure. We cannot and do not guarantee absolute security of your data.
                    </p>
                </section>

                <section>
                    <h2 className="text-2xl font-semibold text-red-500 mb-4">10. Your Rights</h2>
                    <p>Depending on your jurisdiction, you may have the right to:</p>
                    <ul className="list-disc list-inside mt-2 space-y-1 ml-4">
                        <li>Request access to the personal data we hold about you.</li>
                        <li>Request correction or deletion of your personal data.</li>
                        <li>Object to or request restriction of processing of your personal data.</li>
                        <li>Withdraw consent to data processing where consent was the legal basis.</li>
                    </ul>
                    <p className="mt-2">
                        To exercise any of these rights, please contact us via our <a href="/contact" className="text-red-400 hover:underline">Contact Page</a>. We will respond to legitimate requests within a reasonable timeframe.
                    </p>
                </section>

                <section>
                    <h2 className="text-2xl font-semibold text-red-500 mb-4">11. Limitation of Liability</h2>
                    <p>
                        To the maximum extent permitted by applicable law, Nexiplay and its operators shall not be held liable for any direct, indirect, incidental, consequential, or punitive damages arising from your use of this website, reliance on any information provided herein, or any actions taken based on the content of this website. This includes, without limitation, any damages resulting from the collection, use, or disclosure of information by third-party services integrated with this website.
                    </p>
                </section>

                <section>
                    <h2 className="text-2xl font-semibold text-red-500 mb-4">12. Governing Law</h2>
                    <p>
                        This Privacy Policy shall be governed by and construed in accordance with the laws of the jurisdiction in which our primary operations are conducted, without regard to conflict of law principles. Any disputes arising under or in connection with this Privacy Policy shall be subject to the exclusive jurisdiction of the competent courts in that jurisdiction.
                    </p>
                </section>

                <section>
                    <h2 className="text-2xl font-semibold text-red-500 mb-4">13. Changes to This Privacy Policy</h2>
                    <p>
                        We reserve the right to update or modify this Privacy Policy at any time without prior notice. Any changes will be effective immediately upon posting the revised policy on this page with an updated &quot;Last Updated&quot; date. Your continued use of Nexiplay after any modifications constitutes your acceptance of the revised Privacy Policy. We encourage you to review this page periodically.
                    </p>
                </section>

                <section>
                    <h2 className="text-2xl font-semibold text-red-500 mb-4">14. Contact Us</h2>
                    <p>
                        If you have any questions, concerns, or requests regarding this Privacy Policy or our data practices, please contact us via our <a href="/contact" className="text-red-400 hover:underline">Contact Page</a> or email us at <span className="text-red-400 font-bold">nexiplay@proton.me</span>.
                    </p>
                </section>
            </div>
        </div>
    );
}
