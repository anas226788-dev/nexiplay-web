-- Add per-content ad link for Dual Action Click System

ALTER TABLE public.movies
ADD COLUMN IF NOT EXISTS ad_link TEXT;

-- This column stores the external ad URL to open in a new tab when the banner is clicked
COMMENT ON COLUMN public.movies.ad_link IS 'External ad/shortlink URL opened in new tab on banner click';
