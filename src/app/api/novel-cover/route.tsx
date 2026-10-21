import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'edge';

export async function GET(req: NextRequest) {
    const { searchParams } = new URL(req.url);
    const slug = searchParams.get('slug') || searchParams.get('title') || 'nexiplay-novel';
    
    let hash = 0;
    for (let i = 0; i < slug.length; i++) {
        hash = (hash * 31 + slug.charCodeAt(i)) & 0xffffffff;
    }
    const coverNum = (Math.abs(hash) % 9) + 1;

    const res = NextResponse.redirect(new URL(`/novel-covers/cover-${coverNum}.jpg`, req.url), 308);
    res.headers.set('Cache-Control', 'public, max-age=31536000, s-maxage=31536000, immutable');
    return res;
}
