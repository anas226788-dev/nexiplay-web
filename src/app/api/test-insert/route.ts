import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';

export async function GET() {
    const results: Record<string, unknown> = {};
    
    // Step 1: Check env vars
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    
    results.env = {
        url_present: !!url,
        anon_key_present: !!anonKey,
        service_key_present: !!serviceKey,
        url_value: url?.substring(0, 30) + '...',
    };
    
    // Determine which key is used
    const key = serviceKey || anonKey;
    const keyType = serviceKey ? 'SERVICE_ROLE' : 'ANON';
    results.using_key_type = keyType;
    
    if (!url || !key) {
        results.error = 'Missing Supabase credentials';
        return NextResponse.json(results);
    }
    
    const supabase = createClient(url, key);
    
    // Step 2: Test SELECT from content_requests
    try {
        const { data, error, status } = await supabase
            .from('content_requests')
            .select('*')
            .limit(3);
        
        results.select_test = {
            status,
            error: error ? { message: error.message, code: error.code, details: error.details, hint: error.hint } : null,
            row_count: data?.length ?? 0,
            sample: data?.slice(0, 2) ?? [],
        };
    } catch (e) {
        results.select_test = { exception: (e as Error).message };
    }
    
    // Step 3: Test INSERT into content_requests
    const testName = `__DEBUG_TEST_${Date.now()}`;
    try {
        const { data, error, status } = await supabase
            .from('content_requests')
            .insert({ content_name: testName, status: 'pending' })
            .select();
        
        results.insert_test = {
            status,
            error: error ? { message: error.message, code: error.code, details: error.details, hint: error.hint } : null,
            inserted: data ?? null,
            success: !error && data && data.length > 0,
        };
        
        // Clean up test row
        if (data && data[0]) {
            const { error: delErr } = await supabase
                .from('content_requests')
                .delete()
                .eq('id', data[0].id);
            results.cleanup = { success: !delErr, error: delErr?.message ?? null };
        }
    } catch (e) {
        results.insert_test = { exception: (e as Error).message };
    }
    
    // Step 4: If service key failed, also try anon key
    if (serviceKey && anonKey) {
        try {
            const anonClient = createClient(url, anonKey);
            const anonTestName = `__ANON_TEST_${Date.now()}`;
            const { data, error, status } = await anonClient
                .from('content_requests')
                .insert({ content_name: anonTestName, status: 'pending' })
                .select();
            
            results.anon_insert_test = {
                status,
                error: error ? { message: error.message, code: error.code, details: error.details, hint: error.hint } : null,
                success: !error && data && data.length > 0,
            };
            
            // Clean up
            if (data && data[0]) {
                await supabase.from('content_requests').delete().eq('id', data[0].id);
            }
        } catch (e) {
            results.anon_insert_test = { exception: (e as Error).message };
        }
    }

    // Step 5: Test the movies table search (to verify search works too)
    try {
        const { data, error } = await supabase
            .from('movies')
            .select('title, slug, type')
            .limit(3);
        
        results.movies_select_test = {
            error: error?.message ?? null,
            count: data?.length ?? 0,
            sample_titles: data?.map(d => d.title) ?? [],
        };
    } catch (e) {
        results.movies_select_test = { exception: (e as Error).message };
    }
    
    return NextResponse.json(results, { status: 200 });
}
