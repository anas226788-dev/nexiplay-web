-- Create ads table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.ads (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    title TEXT NOT NULL,
    placement TEXT NOT NULL CHECK (placement IN ('home_top', 'home_bottom', 'movie_sidebar', 'popup_global', 'download_bottom', 'episode_list')),
    ad_type TEXT NOT NULL CHECK (ad_type IN ('image', 'script')),
    image_url TEXT,
    script_code TEXT,
    destination_url TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable RLS
ALTER TABLE public.ads ENABLE ROW LEVEL SECURITY;

-- Policies
-- Public read access (for website to fetch ads)
CREATE POLICY "Public can read active ads" ON public.ads
    FOR SELECT USING (is_active = true);

-- Admin full access (read all, insert, update, delete)
CREATE POLICY "Admin full access" ON public.ads
    FOR ALL USING (true) WITH CHECK (true);

-- Grant access
GRANT ALL ON TABLE public.ads TO anon, authenticated, service_role;
