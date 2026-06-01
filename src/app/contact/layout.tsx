import { Metadata } from 'next';
import { buildPageMetadata } from '@/lib/metadata';

export const metadata: Metadata = buildPageMetadata({
    title: 'Contact Us',
    description: 'Get in touch with the Nexiplay team. Submit your questions, feedback, or support requests.',
    path: '/contact',
});

export default function ContactLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return children;
}
