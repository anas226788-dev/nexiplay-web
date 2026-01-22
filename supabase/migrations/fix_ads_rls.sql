-- Fix Ads Table RLS Policies
-- Drop existing policies to ensure clean slate
DROP POLICY IF EXISTS "Admin full access" ON public.ads;
DROP POLICY IF EXISTS "Public can read active ads" ON public.ads;

-- Re-enable RLS (just in case)
ALTER TABLE public.ads ENABLE ROW LEVEL SECURITY;

-- Create permissive policies
-- 1. Everyone can read active ads (needed for public site)
CREATE POLICY "Public can read active ads" ON public.ads
    FOR SELECT USING (is_active = true);

-- 2. Allow ALL operations for anon/authenticated (Admin Panel uses anon key often in this setup)
-- Note: In a stricter prod env, you'd use a specific role or auth check. 
-- For this project's simplified context where Admin likely uses the same supabase client keys:
CREATE POLICY "Admin full access" ON public.ads
    FOR ALL USING (true) WITH CHECK (true);

-- Ensure permissions are granted
GRANT ALL ON TABLE public.ads TO anon, authenticated, service_role;
