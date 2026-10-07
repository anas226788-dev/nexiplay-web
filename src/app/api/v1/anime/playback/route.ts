import { NextRequest, NextResponse } from 'next/server';
import { decryptStream } from '@/lib/streamCrypto';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
    const { searchParams } = new URL(request.url);
    const token = searchParams.get('token');

    if (!token) {
        return new NextResponse('Access denied: Missing security token.', { status: 400 });
    }

    const payload = decryptStream(token);
    if (!payload || !payload.url) {
        return new NextResponse('Access denied: Invalid or expired token.', { status: 403 });
    }

    const targetUrl = payload.url;
    const lowerUrl = targetUrl.toLowerCase();
    const origin = request.nextUrl.origin;

    // If it's a direct m3u8 or video file, route through our stream proxy
    const isM3U8 = lowerUrl.includes('.m3u8') || lowerUrl.includes('/hls');
    const isVideoFile = lowerUrl.includes('.mp4') || lowerUrl.includes('.ts');

    if (isM3U8 || isVideoFile) {
        // Redirect seamlessly to the internal stream proxy
        const proxyUrl = `${origin}/api/proxy-stream?url=${encodeURIComponent(targetUrl)}`;
        return NextResponse.redirect(proxyUrl);
    }

    // If it's an embed webpage or third-party player, redirect directly to play in player iframe
    return NextResponse.redirect(targetUrl);
}

export async function OPTIONS() {
    return new NextResponse(null, {
        headers: {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'GET, OPTIONS',
            'Access-Control-Allow-Headers': 'Range, Content-Type, Authorization'
        }
    });
}
