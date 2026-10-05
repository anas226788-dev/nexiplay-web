import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
    const searchParams = request.nextUrl.searchParams;
    const url = searchParams.get('url');

    if (!url || !url.startsWith('http')) {
        return new NextResponse('Invalid URL', { status: 400 });
    }

    // Only allow Supabase storage URLs for security
    if (!url.includes('supabase.co/storage/v1/object/public/')) {
        return new NextResponse('Unauthorized URL', { status: 403 });
    }

    try {
        const response = await fetch(url);
        
        if (!response.ok) {
            return new NextResponse('Failed to fetch image', { status: response.status });
        }

        const headers = new Headers(response.headers);
        // CRITICAL FIX: Remove the x-robots-tag: none that Supabase adds, which blocks Telegram/FB
        headers.delete('x-robots-tag');
        // Add immutable caching
        headers.set('Cache-Control', 'public, max-age=31536000, immutable');

        return new NextResponse(response.body, {
            status: 200,
            headers,
        });
    } catch (error) {
        return new NextResponse('Error fetching image', { status: 500 });
    }
}
