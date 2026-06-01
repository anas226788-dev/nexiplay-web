-- Add updated_at column to movies table
ALTER TABLE public.movies
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now());

-- Update existing rows to have updated_at = created_at if null (optional, helps with sorting)
UPDATE public.movies
SET updated_at = created_at
WHERE updated_at IS NULL;
