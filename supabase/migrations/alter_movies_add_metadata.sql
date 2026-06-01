-- =================================================================
-- ALTER MOVIES TABLE - ADD METADATA
-- Run this in Supabase SQL Editor
-- =================================================================

ALTER TABLE movies
ADD COLUMN IF NOT EXISTS language TEXT DEFAULT 'Hindi',
ADD COLUMN IF NOT EXISTS source TEXT DEFAULT 'BluRay',
ADD COLUMN IF NOT EXISTS cast_members TEXT DEFAULT '', -- 'cast' is a reserved keyword in some SQL dialects, using cast_members
ADD COLUMN IF NOT EXISTS format TEXT DEFAULT 'MKV',
ADD COLUMN IF NOT EXISTS subtitle TEXT DEFAULT 'English';

-- Note: We use 'cast_members' to avoid conflict, but we can map it to 'cast' in the frontend if needed.
