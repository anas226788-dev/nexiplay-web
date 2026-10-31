import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

export async function GET(req: NextRequest) {
    try {
        // Try to get from app_update, fallback to web_launch_modal
        const { data: config } = await supabase
            .from('app_config')
            .select('apk_url, latest_version_name')
            .eq('id', 'app_update')
            .limit(1)
            .single();

        let apkUrl = config?.apk_url || '';
        let versionName = config?.latest_version_name || '1.0.0';

        if (!apkUrl) {
            const { data: webConfig } = await supabase
                .from('app_config')
                .select('apk_url, latest_version_name')
                .eq('id', 'web_launch_modal')
                .limit(1)
                .single();
            if (webConfig?.apk_url) {
                apkUrl = webConfig.apk_url;
                versionName = webConfig.latest_version_name || versionName;
            }
        }

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
