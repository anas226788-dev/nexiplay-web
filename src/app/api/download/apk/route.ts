import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

export async function GET(req: NextRequest) {
    try {

        const { data: config } = await supabase
            .from('app_config')
            .select('apk_url, version_name')
            .limit(1)
            .single();

        const apkUrl = config?.apk_url || '';
        const versionName = config?.version_name || 'latest';

        if (!apkUrl) {
            return NextResponse.json({ error: 'No APK configured in app_config' }, { status: 404 });
        }

        // If client requests metadata only via ?meta=1
        if (req.nextUrl.searchParams.get('meta') === '1') {
            return NextResponse.json({
                apk_url: apkUrl,
                version_name: versionName,
                filename: `NexiPlay-v${versionName}.apk`
            });
        }

        // Stream APK file directly through website with proper download attachment headers
        const apkRes = await fetch(apkUrl, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
                'Accept': '*/*',
            },
            redirect: 'follow',
        });

        if (!apkRes.ok || !apkRes.body) {
            return NextResponse.redirect(apkUrl);
        }

        const contentLength = apkRes.headers.get('content-length');
        const headers = new Headers();
        headers.set('Content-Type', 'application/vnd.android.package-archive');
        headers.set('Content-Disposition', `attachment; filename="NexiPlay-v${versionName}.apk"`);
        if (contentLength) {
            headers.set('Content-Length', contentLength);
        }
        headers.set('Cache-Control', 'public, max-age=1800');
        headers.set('Access-Control-Allow-Origin', '*');

        return new Response(apkRes.body, {
            status: 200,
            headers,
        });
    } catch (err: any) {
        console.error('[APK Download Error]', err);
        return NextResponse.json({ error: 'Failed to stream APK download' }, { status: 500 });
    }
}
