-- Add running series tracking columns to movies table
ALTER TABLE public.movies
ADD COLUMN IF NOT EXISTS is_running BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS last_episode INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS next_episode INTEGER DEFAULT 1;

-- Add index for faster queries on running tasks page
CREATE INDEX IF NOT EXISTS idx_movies_is_running ON public.movies(is_running);
