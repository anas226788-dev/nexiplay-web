-- Dynamic Season System for Anime & Series
-- Creates tables for seasons, episodes, and episode download links

-- Seasons table
CREATE TABLE IF NOT EXISTS seasons (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    movie_id UUID REFERENCES movies(id) ON DELETE CASCADE,
    season_number INTEGER NOT NULL,
    season_title TEXT,
    poster_url TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(movie_id, season_number)
);

-- Episodes table
CREATE TABLE IF NOT EXISTS episodes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    season_id UUID REFERENCES seasons(id) ON DELETE CASCADE,
    episode_number INTEGER NOT NULL,
    episode_title TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(season_id, episode_number)
);

-- Episode download links (same structure as movie download_links)
CREATE TABLE IF NOT EXISTS episode_download_links (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    episode_id UUID REFERENCES episodes(id) ON DELETE CASCADE,
    resolution TEXT NOT NULL CHECK (resolution IN ('360p', '480p', '720p', '1080p')),
    file_size TEXT,
    mega_link TEXT,
    gdrive_link TEXT,
    mediafire_link TEXT,
    terabox_link TEXT,
    pcloud_link TEXT,
    youtube_link TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(episode_id, resolution)
);

-- Enable RLS
ALTER TABLE seasons ENABLE ROW LEVEL SECURITY;
ALTER TABLE episodes ENABLE ROW LEVEL SECURITY;
ALTER TABLE episode_download_links ENABLE ROW LEVEL SECURITY;

-- Public read policies
CREATE POLICY "Public read seasons" ON seasons FOR SELECT USING (true);
CREATE POLICY "Public read episodes" ON episodes FOR SELECT USING (true);
CREATE POLICY "Public read episode_download_links" ON episode_download_links FOR SELECT USING (true);

-- Admin write policies
CREATE POLICY "Admin write seasons" ON seasons FOR ALL USING (true);
CREATE POLICY "Admin write episodes" ON episodes FOR ALL USING (true);
CREATE POLICY "Admin write episode_download_links" ON episode_download_links FOR ALL USING (true);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_seasons_movie_id ON seasons(movie_id);
CREATE INDEX IF NOT EXISTS idx_episodes_season_id ON episodes(season_id);
CREATE INDEX IF NOT EXISTS idx_episode_download_links_episode_id ON episode_download_links(episode_id);

COMMENT ON TABLE seasons IS 'Stores seasons for series and anime content';
COMMENT ON TABLE episodes IS 'Stores episodes within seasons';
COMMENT ON TABLE episode_download_links IS 'Stores download links per episode resolution';
