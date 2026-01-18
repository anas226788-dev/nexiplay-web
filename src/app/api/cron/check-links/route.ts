import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Initialize Supabase with Service Role Key for Admin Access
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

const PROVIDERS = [
    { key: 'mega_link', label: 'Mega' },
    { key: 'gdrive_link', label: 'Google Drive' },
    { key: 'mediafire_link', label: 'MediaFire' },
    { key: 'terabox_link', label: 'TeraBox' },
    { key: 'pcloud_link', label: 'pCloud' },
    { key: 'youtube_link', label: 'YouTube' }
];

async function checkUrl(url: string): Promise<'ACTIVE' | 'EXPIRED'> {
    if (!url) return 'ACTIVE';
    try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 5000); // 5s timeout

        const response = await fetch(url, {
            method: 'HEAD',
            signal: controller.signal,
            headers: { 'User-Agent': 'NexiPlay-LinkChecker/1.0' }
        });
        clearTimeout(timeoutId);

        if (response.status === 404 || response.status === 410) return 'EXPIRED';
        // 403 is tricky aka Forbidden, often heavily protected links return this but are valid in browser.
        // For safety, we treat 403 as ACTIVE in automated checks unless specific knowledge.
        return 'ACTIVE';
    } catch (error) {
        console.error(`Error checking ${url}:`, error);
        // Network error/timeout - assume ACTIVE to avoid false positives?
        // Or assume EXPIRED if DNS fails.
        // For now, return ACTIVE to be safe against timeouts.
        return 'ACTIVE';
    }
}

export async function GET() {
    try {
        const limit = 20; // Check 20 items per run to stay within free tier limits

        // 1. Check Movie Links
        const { data: movieLinks } = await supabase
            .from('download_links')
            .select('*')
            .order('last_checked_at', { ascending: true, nullsFirst: true })
            .limit(limit);

        if (movieLinks) {
            for (const row of movieLinks) {
                const statusUpdate: any = { ...row.link_status };
                let hasChange = false;

                for (const provider of PROVIDERS) {
                    const link = row[provider.key];
                    if (link) {
                        const status = await checkUrl(link);
                        if (statusUpdate[provider.key] !== status) {
                            statusUpdate[provider.key] = status;
                            hasChange = true;
                        }
                    }
                }

                await supabase.from('download_links').update({
                    link_status: statusUpdate,
                    last_checked_at: new Date().toISOString()
                }).eq('id', row.id);
            }
        }

        // 2. Check Episode Links (Series)
        const { data: episodeLinks } = await supabase
            .from('episode_download_links')
            .select('*')
            .order('last_checked_at', { ascending: true, nullsFirst: true })
            .limit(limit);

        if (episodeLinks) {
            for (const row of episodeLinks) {
                const statusUpdate: any = { ...row.link_status };

                for (const provider of PROVIDERS) {
                    const link = row[provider.key];
                    if (link) {
                        const status = await checkUrl(link);
                        if (statusUpdate[provider.key] !== status) {
                            statusUpdate[provider.key] = status;
                        }
                    }
                }

                await supabase.from('episode_download_links').update({
                    link_status: statusUpdate,
                    last_checked_at: new Date().toISOString()
                }).eq('id', row.id);
            }
        }

        return NextResponse.json({ success: true, message: 'Link check complete' });
    } catch (error) {
        return NextResponse.json({ success: false, error: String(error) }, { status: 500 });
    }
}
