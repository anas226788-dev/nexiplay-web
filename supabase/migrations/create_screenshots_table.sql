-- =================================================================
-- CREATE SCREENSHOTS TABLE
-- Run this in Supabase SQL Editor
-- =================================================================

-- 1. Create Table
CREATE TABLE IF NOT EXISTS movie_screenshots (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    movie_id UUID NOT NULL REFERENCES movies(id) ON DELETE CASCADE,
    image_url TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Indexes
CREATE INDEX IF NOT EXISTS idx_screenshots_movie_id ON movie_screenshots(movie_id);

-- 3. Enable RLS
ALTER TABLE movie_screenshots ENABLE ROW LEVEL SECURITY;

-- 4. Policies
-- Public Read
CREATE POLICY "Public Read Screenshots"
    ON movie_screenshots FOR SELECT
    USING (true);

-- Admin (or Dev) Write
-- Ideally restrict to authenticated, but using TRUE for Dev speed as requested before
CREATE POLICY "Dev Allow Write Screenshots"
    ON movie_screenshots FOR INSERT
    WITH CHECK (true);

CREATE POLICY "Dev Allow Delete Screenshots"
    ON movie_screenshots FOR DELETE
    USING (true);

-- 5. Storage Bucket (Shell command or Manual)
-- We assume a 'screenshots' bucket will be created or we reuse 'posters'
-- Ideally create a 'screenshots' bucket manually in Supabase Dashboard.
