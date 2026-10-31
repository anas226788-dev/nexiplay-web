import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';
export const maxDuration = 30;

/**
 * Free Third-Party Image Upload Route (Zero Supabase Storage Quota Used)
 * 1. Primary: Catbox.moe (Free, permanent, zero account/keys needed, unblocked in BD)
 * 2. Fallback: Freeimage.host (Free Chevereto public API, permanent direct links)
 */
export async function POST(req: NextRequest) {
    try {
        const formData = await req.formData();
        const file = formData.get('file') as File | null;

        if (!file) {
            return NextResponse.json({ error: 'No image file provided.' }, { status: 400 });
        }

        // Validate image mime type
        if (!file.type.startsWith('image/')) {
            return NextResponse.json({ error: 'File must be an image.' }, { status: 400 });
        }

        // Max 10MB
        if (file.size > 10 * 1024 * 1024) {
            return NextResponse.json({ error: 'Image size exceeds 10MB limit.' }, { status: 400 });
        }

        const buffer = Buffer.from(await file.arrayBuffer());
        const filename = file.name || 'avatar.jpg';

        // 1. PRIMARY: Catbox.moe upload
        try {
            const catboxData = new FormData();
            catboxData.append('reqtype', 'fileupload');
            catboxData.append('fileToUpload', new Blob([buffer], { type: file.type }), filename);

            const catboxRes = await fetch('https://catbox.moe/user/api.php', {
                method: 'POST',
                body: catboxData,
                signal: AbortSignal.timeout(15000),
            });

            if (catboxRes.ok) {
                const text = (await catboxRes.text()).trim();
                if (text.startsWith('http://') || text.startsWith('https://')) {
                    console.log('[Upload Avatar] ✅ Catbox upload success:', text);
                    return NextResponse.json({
                        success: true,
                        url: text,
                        provider: 'catbox'
                    });
                }
            }
        } catch (catboxErr: any) {
            console.warn('[Upload Avatar] Catbox upload failed, trying fallback:', catboxErr.message);
        }

        // 2. FALLBACK: Freeimage.host upload
        try {
            const freeimageData = new FormData();
            freeimageData.append('key', '6d207e02198a847aa98d0a2a901485a5');
            freeimageData.append('action', 'upload');
            freeimageData.append('source', new Blob([buffer], { type: file.type }), filename);

            const freeimageRes = await fetch('https://freeimage.host/api/1/upload', {
                method: 'POST',
                body: freeimageData,
                signal: AbortSignal.timeout(15000),
            });

            if (freeimageRes.ok) {
                const data = await freeimageRes.json();
                const directUrl = data?.image?.url || data?.image?.display_url;
                if (directUrl) {
                    console.log('[Upload Avatar] ✅ Freeimage.host upload success:', directUrl);
                    return NextResponse.json({
                        success: true,
                        url: directUrl,
                        provider: 'freeimage'
                    });
                }
            }
        } catch (freeimageErr: any) {
            console.warn('[Upload Avatar] Freeimage.host upload failed:', freeimageErr.message);
        }

        return NextResponse.json({
            error: 'Failed to upload photo to free image hosting servers. Please try again.'
        }, { status: 502 });

    } catch (err: any) {
        console.error('[Upload Avatar] Internal route error:', err);
        return NextResponse.json({ error: err.message || 'Server error uploading avatar.' }, { status: 500 });
    }
}
