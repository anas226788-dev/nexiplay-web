import { Metadata } from 'next';

export const metadata: Metadata = {
    title: 'Privacy Policy | Nexiplay',
    description: 'Privacy Policy for Nexiplay. Learn how we collect and use data.',
};

export default function PrivacyPolicyPage() {
    return (
        <div className="container mx-auto px-4 py-12 max-w-4xl text-gray-300">
            <h1 className="text-4xl font-bold text-white mb-8">Privacy Policy</h1>

            <div className="space-y-6 bg-dark-800 p-8 rounded-2xl border border-white/5">
                <section>
                    <h2 className="text-2xl font-semibold text-red-500 mb-4">1. Information We Collect</h2>
                    <p>We collect minimal information to provide our services:</p>
                    <ul className="list-disc list-inside mt-2 space-y-1 ml-4">
                        <li><strong>Email Address:</strong> Only if you voluntarily contact us via our contact form.</li>
                        <li><strong>Usage Data:</strong> Basic analytics such as page views and browser type (via third-party services).</li>
                        <li><strong>Cookies:</strong> Used by third-party ad networks (like Adsterra) to show relevant ads.</li>
                    </ul>
                </section>

                <section>
                    <h2 className="text-2xl font-semibold text-red-500 mb-4">2. How We Use Information</h2>
                    <p>We use the collected information to:</p>
                    <ul className="list-disc list-inside mt-2 space-y-1 ml-4">
                        <li>Respond to your inquiries or support requests.</li>
                        <li>Analyze website traffic to improve user experience.</li>
                        <li>Display advertisements to support our free service.</li>
                    </ul>
                </section>

                <section>
                    <h2 className="text-2xl font-semibold text-red-500 mb-4">3. Data Sharing</h2>
                    <p>
                        We do <strong>NOT</strong> sell, trade, or rent your personal identification information to others.
                        We may share generic aggregated demographic information not linked to any personal identification information with our business partners and advertisers.
                    </p>
                </section>

                <section>
                    <h2 className="text-2xl font-semibold text-red-500 mb-4">4. Third-Party Services</h2>
                    <p>
                        We use third-party services that may collect their own data:
                    </p>
                    <ul className="list-disc list-inside mt-2 space-y-1 ml-4">
                        <li><strong>Adsterra:</strong> For displaying advertisements.</li>
                        <li><strong>Cloudflare:</strong> For security and content delivery.</li>
                    </ul>
                    <p className="mt-2 text-sm italic">Please check their respective privacy policies for more details.</p>
                </section>

                <section>
                    <h2 className="text-2xl font-semibold text-red-500 mb-4">5. Contact Us</h2>
                    <p>If you have any questions about this Privacy Policy, please contact us via our <a href="/contact" className="text-red-400 hover:underline">Contact Page</a>.</p>
                </section>
            </div>
        </div>
    );
}
