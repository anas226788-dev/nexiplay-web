-- Create the upcoming table
CREATE TABLE IF NOT EXISTS public.upcoming (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    title TEXT NOT NULL,
    slug TEXT NOT NULL,
    poster_url TEXT NOT NULL,
    type TEXT NOT NULL CHECK (type IN ('anime', 'series', 'movie')),
    release_date DATE NOT NULL,
    status TEXT NOT NULL CHECK (status IN ('announced', 'confirmed', 'delayed')),
    trailer_url TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.upcoming ENABLE ROW LEVEL SECURITY;

-- Allow public read access
CREATE POLICY "Enable read access for all users on upcoming" 
ON public.upcoming FOR SELECT 
USING (true);

-- Allow generic all access (assuming admin is authenticated or handled via logic)
-- In production, you'd restrict this to authenticated admins
CREATE POLICY "Enable full access for authenticated users on upcoming" 
ON public.upcoming FOR ALL 
USING (auth.role() = 'authenticated');

-- Create an index to optimize the homepage query sorting by release date
CREATE INDEX IF NOT EXISTS upcoming_release_date_idx ON public.upcoming (release_date ASC);
