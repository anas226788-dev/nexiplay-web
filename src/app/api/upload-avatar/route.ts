import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';
export const maxDuration = 30;

// Simple in-memory rate limiting: max 10 uploads per 10 minutes per IP
const uploadRateLimit = new Map<string, { count: number; resetAt: number }>();

function isRateLimited(ip: string): boolean {
    const now = Date.now();
    const windowMs = 10 * 60 * 1000;
    const maxRequests = 10;

    // Prune stale records if map grows large
    if (uploadRateLimit.size > 1000) {
        for (const [k, v] of uploadRateLimit.entries()) {
            if (now > v.resetAt) uploadRateLimit.delete(k);
        }
    }

    const record = uploadRateLimit.get(ip);
    if (!record || now > record.resetAt) {
        uploadRateLimit.set(ip, { count: 1, resetAt: now + windowMs });
        return false;
    }

    if (record.count >= maxRequests) {
        return true;
    }

    record.count++;
    return false;
}

/**
 * Validates file signature against authentic image magic bytes
 * (JPEG, PNG, GIF, WebP).
 */
function isValidImageMagicBytes(buffer: Buffer): boolean {
    if (buffer.length < 12) return false;

    // JPEG: FF D8 FF
    if (buffer[0] === 0xFF && buffer[1] === 0xD8 && buffer[2] === 0xFF) {
        return true;
    }

    // PNG: 89 50 4E 47 0D 0A 1A 0A
    if (
        buffer[0] === 0x89 &&
        buffer[1] === 0x50 &&
        buffer[2] === 0x4E &&
        buffer[3] === 0x47 &&
        buffer[4] === 0x0D &&
        buffer[5] === 0x0A &&
        buffer[6] === 0x1A &&
        buffer[7] === 0x0A
    ) {
        return true;
    }

    // GIF: GIF87a or GIF89a
    if (
        buffer[0] === 0x47 &&
        buffer[1] === 0x49 &&
        buffer[2] === 0x46 &&
        buffer[3] === 0x38 &&
        (buffer[4] === 0x37 || buffer[4] === 0x39) &&
        buffer[5] === 0x61
    ) {
        return true;
    }

    // WebP: RIFF....WEBP
    if (
        buffer[0] === 0x52 &&
        buffer[1] === 0x49 &&
        buffer[2] === 0x46 &&
        buffer[3] === 0x46 &&
        buffer[8] === 0x57 &&
        buffer[9] === 0x45 &&
        buffer[10] === 0x42 &&
        buffer[11] === 0x50
    ) {
        return true;
    }

    return false;
}

/**
 * Free Third-Party Image Upload Route (Zero Supabase Storage Quota Used)
 * 1. Primary: Catbox.moe (Free, permanent, zero account/keys needed, unblocked in BD)
 * 2. Fallback: Freeimage.host (Free Chevereto public API, permanent direct links)
 */
export async function POST(req: NextRequest) {
    try {
        const clientIp = req.headers.get('x-forwarded-for')?.split(',')[0].trim() ||
            req.headers.get('x-real-ip') ||
            '127.0.0.1';

        if (isRateLimited(clientIp)) {
            return NextResponse.json({
                error: 'Too many upload attempts. Please wait 10 minutes.'
            }, { status: 429 });
        }

        const formData = await req.formData();
        const file = formData.get('file') as File | null;

        if (!file) {
            return NextResponse.json({ error: 'No image file provided.' }, { status: 400 });
        }

        // Validate image mime type header
        if (!file.type.startsWith('image/')) {
            return NextResponse.json({ error: 'File must be an image.' }, { status: 400 });
        }

        // Max 5MB size limit
        if (file.size > 5 * 1024 * 1024) {
            return NextResponse.json({ error: 'Image size exceeds 5MB limit.' }, { status: 400 });
        }

        const buffer = Buffer.from(await file.arrayBuffer());

        // Validate binary magic bytes
        if (!isValidImageMagicBytes(buffer)) {
            return NextResponse.json({ error: 'Invalid or corrupted image format.' }, { status: 400 });
        }

        // Clean filename and ensure safe extension
        const rawName = (file.name || 'avatar.jpg').replace(/[^a-zA-Z0-9._-]/g, '');
        const filename = rawName.length > 0 ? rawName : 'avatar.jpg';

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
            const freeimageApiKey = process.env.FREEIMAGE_API_KEY || '6d207e02198a847aa98d0a2a901485a5';
            freeimageData.append('key', freeimageApiKey);
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
            error: 'Failed to upload photo to image hosting servers. Please try again.'
        }, { status: 502 });

    } catch (err: any) {
        console.error('[Upload Avatar] Internal route error:', err);
        return NextResponse.json({ error: 'Server error uploading avatar.' }, { status: 500 });
    }
}
