import { Metadata } from 'next';
import { buildPageMetadata } from '@/lib/metadata';

export const metadata: Metadata = buildPageMetadata({
    title: 'DMCA Takedown Request',
    description: 'Submit a DMCA takedown request if you believe your copyrighted content is linked on Nexiplay.',
    path: '/dmca',
});

export default function DMCALayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return children;
}
