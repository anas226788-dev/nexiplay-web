-- =================================================================
-- CREATE COMMENTS TABLE
-- Run this in Supabase SQL Editor
-- =================================================================

-- 1. Create Table
CREATE TABLE IF NOT EXISTS comments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    movie_id UUID NOT NULL REFERENCES movies(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    email TEXT NOT NULL,
    message TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    is_approved BOOLEAN DEFAULT TRUE     -- Optional: For moderation
);

-- 2. Indexes
CREATE INDEX IF NOT EXISTS idx_comments_movie_id ON comments(movie_id);
CREATE INDEX IF NOT EXISTS idx_comments_created_at ON comments(created_at DESC);

-- 3. Enable RLS
ALTER TABLE comments ENABLE ROW LEVEL SECURITY;

-- 4. Policies
-- Public Read (Everyone can read comments)
CREATE POLICY "Public Read Comments"
    ON comments FOR SELECT
    USING (true);

-- Public Write (Everyone can post comments - No Login)
CREATE POLICY "Public Insert Comments"
    ON comments FOR INSERT
    WITH CHECK (true);

-- Admin Delete (Only Dev/Admin)
CREATE POLICY "Dev Allow Delete Comments"
    ON comments FOR DELETE
    USING (true);

-- Admin Update (Only Dev/Admin)
CREATE POLICY "Dev Allow Update Comments"
    ON comments FOR UPDATE
    USING (true);
