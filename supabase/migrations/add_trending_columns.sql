-- Add trending feature columns to movies table
ALTER TABLE public.movies
ADD COLUMN IF NOT EXISTS is_trending BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS trending_rank INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS banner_url_desktop TEXT,
ADD COLUMN IF NOT EXISTS banner_url_mobile TEXT;

-- Index for fast trending queries
CREATE INDEX IF NOT EXISTS idx_movies_is_trending ON public.movies(is_trending);
CREATE INDEX IF NOT EXISTS idx_movies_trending_rank ON public.movies(trending_rank);
