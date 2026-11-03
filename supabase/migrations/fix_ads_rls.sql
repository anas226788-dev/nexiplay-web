-- Fix Ads Table RLS Policies
-- NOTE: In production, write operations are handled securely by backend service_role.
-- Anonymous users are only allowed SELECT access for active ads.
DROP POLICY IF EXISTS "Admin full access" ON public.ads;
DROP POLICY IF EXISTS "Public can read active ads" ON public.ads;

-- Re-enable RLS
ALTER TABLE public.ads ENABLE ROW LEVEL SECURITY;

-- 1. Everyone can read active ads (needed for public site)
CREATE POLICY "Public can read active ads" ON public.ads
    FOR SELECT USING (is_active = true);

-- Grant SELECT only to anon/authenticated
GRANT SELECT ON TABLE public.ads TO anon, authenticated;
GRANT ALL ON TABLE public.ads TO service_role;
