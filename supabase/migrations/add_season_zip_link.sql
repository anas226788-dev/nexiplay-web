-- Add season_zip_link column to seasons table
ALTER TABLE seasons ADD COLUMN IF NOT EXISTS season_zip_link TEXT;

-- Comment on column
COMMENT ON COLUMN seasons.season_zip_link IS 'URL for full season ZIP download (Mega, GDrive, etc.)';
