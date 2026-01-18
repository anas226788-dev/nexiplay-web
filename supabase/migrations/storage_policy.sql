-- =================================================================
-- FIX STORAGE PERMISSIONS: Allow public upload to 'posters' bucket
-- Run this in Supabase SQL Editor to fix "violates row-level security policy"
-- =================================================================

-- 1. Create the 'posters' bucket if it doesn't exist
INSERT INTO storage.buckets (id, name, public)
VALUES ('posters', 'posters', true)
ON CONFLICT (id) DO NOTHING;

-- 2. Drop existing policies to avoid conflicts
DROP POLICY IF EXISTS "Public Access" ON storage.objects;
DROP POLICY IF EXISTS "Public Upload" ON storage.objects;
DROP POLICY IF EXISTS "Public Update" ON storage.objects;
DROP POLICY IF EXISTS "Public Delete" ON storage.objects;

-- 3. Enable RLS on objects (Skipped: Already enabled by Supabase)
-- ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;

-- 4. Create wide-open policies for Development
-- ALLOW SELECT (View images)
CREATE POLICY "Public Access"
ON storage.objects FOR SELECT
USING ( bucket_id = 'posters' );

-- ALLOW INSERT (Upload images) - THIS FIXES YOUR ERROR
CREATE POLICY "Public Upload"
ON storage.objects FOR INSERT
WITH CHECK ( bucket_id = 'posters' );

-- ALLOW UPDATE (Replace images)
CREATE POLICY "Public Update"
ON storage.objects FOR UPDATE
USING ( bucket_id = 'posters' );

-- ALLOW DELETE (Remove images)
CREATE POLICY "Public Delete"
ON storage.objects FOR DELETE
USING ( bucket_id = 'posters' );
