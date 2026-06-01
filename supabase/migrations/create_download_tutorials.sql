-- Download Tutorials table for "How To Download" system

CREATE TABLE IF NOT EXISTS public.download_tutorials (
    id SERIAL PRIMARY KEY,
    source_key TEXT NOT NULL UNIQUE,  -- 'gdrive', 'mega', 'terabox', 'mediafire', 'pcloud', 'youtube'
    source_name TEXT NOT NULL,        -- 'Google Drive', 'Mega', etc.
    tutorial_url TEXT NOT NULL,       -- YouTube embed URL or any video URL
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Seed default rows (empty URLs — admin fills them in)
INSERT INTO public.download_tutorials (source_key, source_name, tutorial_url) VALUES
    ('gdrive', 'Google Drive', ''),
    ('mega', 'Mega', ''),
    ('terabox', 'TeraBox', ''),
    ('mediafire', 'MediaFire', ''),
    ('pcloud', 'pCloud', ''),
    ('youtube', 'YouTube', '')
ON CONFLICT (source_key) DO NOTHING;

-- Enable RLS
ALTER TABLE public.download_tutorials ENABLE ROW LEVEL SECURITY;

-- Public read access
CREATE POLICY "Public can read tutorials" ON public.download_tutorials
    FOR SELECT USING (true);

-- Admin full access (via service role or authenticated)
CREATE POLICY "Admin full access tutorials" ON public.download_tutorials
    FOR ALL USING (true) WITH CHECK (true);
