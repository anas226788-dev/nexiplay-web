import { createClient } from '@supabase/supabase-js';
export { createClient };

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://ttgpplyunomwtqbgsupw.supabase.co';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InR0Z3BwbHl1bm9td3RxYmdzdXB3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzU3MjA5MTQsImV4cCI6MjA5MTI5NjkxNH0.8EVuBI_pN0dfpMFamh0szRqONSmDfWm4BNY5MGxL02g';

// Create client
export const supabase = createClient(
    supabaseUrl,
    supabaseAnonKey
);

export const isSupabaseConfigured = true;
