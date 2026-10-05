-- Add per-content notice system

-- 1. Add notice_enabled column
ALTER TABLE public.movies
ADD COLUMN IF NOT EXISTS notice_enabled BOOLEAN DEFAULT false;

-- 2. Add notice_text column (distinct from running_notice to be clean)
ALTER TABLE public.movies
ADD COLUMN IF NOT EXISTS notice_text TEXT;

-- 3. Optional: Migrate existing running_notice data if desired, but user asked for strict per-content.
-- We will leave defaults as false/null to ensure "clean slate" behavior as requested ("Global notice was implemented incorrectly").

-- 4. Create index for faster filtering if needed (optional but good practice)
CREATE INDEX IF NOT EXISTS idx_movies_notice_enabled ON public.movies(notice_enabled);
