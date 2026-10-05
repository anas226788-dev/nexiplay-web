-- Update ads table
ALTER TABLE public.ads 
ADD COLUMN IF NOT EXISTS device_target TEXT NOT NULL DEFAULT 'both' CHECK (device_target IN ('desktop', 'mobile', 'both'));

-- Create notices table
CREATE TABLE IF NOT EXISTS public.notices (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    content TEXT NOT NULL,
    type TEXT NOT NULL CHECK (type IN ('top_bar', 'popup', 'inline')),
    pages TEXT NOT NULL DEFAULT 'all' CHECK (pages IN ('all', 'home', 'movie')),
    is_active BOOLEAN DEFAULT TRUE,
    bg_color TEXT DEFAULT 'bg-red-600',
    text_color TEXT DEFAULT 'text-white',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable RLS for notices
ALTER TABLE public.notices ENABLE ROW LEVEL SECURITY;

-- Policies for notices
CREATE POLICY "Public can read active notices" ON public.notices
    FOR SELECT USING (is_active = true);

CREATE POLICY "Admin full access notices" ON public.notices
    FOR ALL USING (true) WITH CHECK (true);

-- Grant access
GRANT ALL ON TABLE public.notices TO anon, authenticated, service_role;
