-- =================================================================
-- CREATE ADS TABLE: For advanced ad management
-- Run this in Supabase SQL Editor
-- =================================================================

-- 1. Create Ads Table
CREATE TABLE IF NOT EXISTS ads (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title TEXT NOT NULL,
    placement TEXT NOT NULL CHECK (placement IN ('home_top', 'home_bottom', 'movie_sidebar', 'popup_global')),
    ad_type TEXT NOT NULL CHECK (ad_type IN ('image', 'script')),
    image_url TEXT,
    script_code TEXT,
    destination_url TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Indexes for faster lookup
CREATE INDEX IF NOT EXISTS idx_ads_placement ON ads(placement);
CREATE INDEX IF NOT EXISTS idx_ads_active ON ads(is_active);

-- 3. Enable RLS
ALTER TABLE ads ENABLE ROW LEVEL SECURITY;

-- 4. Policies
-- Public can READ active ads
CREATE POLICY "Public Read Active Ads"
    ON ads FOR SELECT
    USING (is_active = true);

-- Admin (or Dev Public) can WRITE (Insert/Update/Delete)
-- For now, allowing all writes since we are in Dev Mode
CREATE POLICY "Dev Allow Write Ads"
    ON ads FOR INSERT
    WITH CHECK (true);

CREATE POLICY "Dev Allow Update Ads"
    ON ads FOR UPDATE
    USING (true);

CREATE POLICY "Dev Allow Delete Ads"
    ON ads FOR DELETE
    USING (true);
