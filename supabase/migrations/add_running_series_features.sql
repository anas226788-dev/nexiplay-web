-- Add running series features to movies table

-- 1. Add running_status column with check constraint (simulating enum)
ALTER TABLE public.movies
ADD COLUMN IF NOT EXISTS running_status TEXT DEFAULT 'Ongoing' CHECK (running_status IN ('Ongoing', 'Completed', 'Hiatus'));

-- 2. Add running_notice column for custom messages
ALTER TABLE public.movies
ADD COLUMN IF NOT EXISTS running_notice TEXT;

-- 3. Add next_episode_date column
ALTER TABLE public.movies
ADD COLUMN IF NOT EXISTS next_episode_date TIMESTAMP WITH TIME ZONE;

-- 4. Update existing running series to have 'Ongoing' status
UPDATE public.movies
SET running_status = 'Ongoing'
WHERE is_running = true;

-- 5. Update non-running series to 'Completed' (optional, but good for consistency)
UPDATE public.movies
SET running_status = 'Completed'
WHERE is_running = false;
