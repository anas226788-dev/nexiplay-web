-- Add link tracking columns to download_links (Movies)
ALTER TABLE download_links 
ADD COLUMN IF NOT EXISTS link_status JSONB DEFAULT '{}'::jsonb,
ADD COLUMN IF NOT EXISTS last_checked_at TIMESTAMPTZ;

-- Add link tracking columns to episode_download_links (Series/Anime)
ALTER TABLE episode_download_links 
ADD COLUMN IF NOT EXISTS link_status JSONB DEFAULT '{}'::jsonb,
ADD COLUMN IF NOT EXISTS last_checked_at TIMESTAMPTZ;

-- Comments
COMMENT ON COLUMN download_links.link_status IS 'JSON object tracking status per provider, e.g. {"mega_link": "ACTIVE"}';
COMMENT ON COLUMN episode_download_links.link_status IS 'JSON object tracking status per provider';
