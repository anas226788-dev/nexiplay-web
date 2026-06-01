-- Create download_links table for resolution-based cloud provider links
CREATE TABLE IF NOT EXISTS download_links (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    movie_id UUID REFERENCES movies(id) ON DELETE CASCADE,
    resolution TEXT NOT NULL CHECK (resolution IN ('360p', '480p', '720p', '1080p')),
    file_size TEXT,
    mega_link TEXT,
    gdrive_link TEXT,
    mediafire_link TEXT,
    terabox_link TEXT,
    pcloud_link TEXT,
    youtube_link TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(movie_id, resolution)
);

-- Enable RLS
ALTER TABLE download_links ENABLE ROW LEVEL SECURITY;

-- Allow public read access
CREATE POLICY "Public can read download_links" ON download_links 
    FOR SELECT USING (true);

-- Allow all operations (for admin)
CREATE POLICY "Admin full access to download_links" ON download_links 
    FOR ALL USING (true);

-- Add index for faster lookups
CREATE INDEX idx_download_links_movie_id ON download_links(movie_id);

COMMENT ON TABLE download_links IS 'Stores download links per resolution with multiple cloud providers';
