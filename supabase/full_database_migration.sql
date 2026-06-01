-- =====================================================================
-- NEXIPLAY - COMPLETE DATABASE MIGRATION
-- Run this in your NEW Supabase SQL Editor to recreate everything.
-- Generated: 2026-04-09
-- =====================================================================
-- NOTE: Run this ONCE on a fresh Supabase project.
-- This includes: Tables, Columns, Indexes, RLS, Policies, Storage, Grants.
-- =====================================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";


-- =====================================================================
-- 1. TABLES CREATION (in dependency order)
-- =====================================================================

-- ─────────────────────────────────────────
-- 1.1 MOVIES TABLE (Core)
-- ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.movies (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title TEXT NOT NULL,
    slug TEXT UNIQUE NOT NULL,
    poster_url TEXT,
    description TEXT,
    type TEXT NOT NULL CHECK (type IN ('movie', 'series', 'anime')),
    release_year INTEGER,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
    -- Metadata columns
    language TEXT DEFAULT 'Hindi',
    source TEXT DEFAULT 'BluRay',
    cast_members TEXT DEFAULT '',
    format TEXT DEFAULT 'MKV',
    subtitle TEXT DEFAULT 'English',
    -- Trailer
    trailer_url TEXT DEFAULT NULL,
    -- Trending columns
    is_trending BOOLEAN DEFAULT false,
    trending_rank INTEGER DEFAULT 0,
    banner_url_desktop TEXT,
    banner_url_mobile TEXT,
    -- Running series columns
    is_running BOOLEAN DEFAULT false,
    last_episode INTEGER DEFAULT 0,
    next_episode INTEGER DEFAULT 1,
    running_status TEXT DEFAULT 'Ongoing' CHECK (running_status IN ('Ongoing', 'Completed', 'Hiatus')),
    running_notice TEXT,
    next_episode_date TIMESTAMP WITH TIME ZONE DEFAULT NULL,
    -- Per-content notice system
    notice_enabled BOOLEAN DEFAULT false,
    notice_text TEXT,
    -- Ad link (Dual Action Click System)
    ad_link TEXT,
    -- Admin notes / Running Tasks
    admin_note TEXT DEFAULT NULL,
    notify_admin BOOLEAN DEFAULT FALSE,
    -- Adult content flag
    is_adult BOOLEAN DEFAULT false
);

-- Indexes for movies
CREATE INDEX IF NOT EXISTS idx_movies_slug ON movies(slug);
CREATE INDEX IF NOT EXISTS idx_movies_type ON movies(type);
CREATE INDEX IF NOT EXISTS idx_movies_release_year ON movies(release_year DESC);
CREATE INDEX IF NOT EXISTS idx_movies_is_trending ON public.movies(is_trending);
CREATE INDEX IF NOT EXISTS idx_movies_trending_rank ON public.movies(trending_rank);
CREATE INDEX IF NOT EXISTS idx_movies_is_running ON public.movies(is_running);
CREATE INDEX IF NOT EXISTS idx_movies_notice_enabled ON public.movies(notice_enabled);


-- ─────────────────────────────────────────
-- 1.2 DOWNLOADS TABLE (Legacy)
-- ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.downloads (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    movie_id UUID NOT NULL REFERENCES movies(id) ON DELETE CASCADE,
    quality TEXT NOT NULL CHECK (quality IN ('480p', '720p', '1080p')),
    file_size TEXT,
    file_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_downloads_movie_id ON downloads(movie_id);


-- ─────────────────────────────────────────
-- 1.3 DOWNLOAD_LINKS TABLE (New - Multi-provider)
-- ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.download_links (
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
    link_status JSONB DEFAULT '{}'::jsonb,
    last_checked_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(movie_id, resolution)
);

CREATE INDEX IF NOT EXISTS idx_download_links_movie_id ON download_links(movie_id);
COMMENT ON TABLE download_links IS 'Stores download links per resolution with multiple cloud providers';
COMMENT ON COLUMN download_links.link_status IS 'JSON object tracking status per provider, e.g. {"mega_link": "ACTIVE"}';


-- ─────────────────────────────────────────
-- 1.4 CATEGORIES TABLE
-- ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.categories (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    slug TEXT UNIQUE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_categories_slug ON categories(slug);


-- ─────────────────────────────────────────
-- 1.5 MOVIE_CATEGORIES TABLE (Junction)
-- ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.movie_categories (
    movie_id UUID NOT NULL REFERENCES movies(id) ON DELETE CASCADE,
    category_id UUID NOT NULL REFERENCES categories(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    PRIMARY KEY (movie_id, category_id)
);

CREATE INDEX IF NOT EXISTS idx_movie_categories_movie_id ON movie_categories(movie_id);
CREATE INDEX IF NOT EXISTS idx_movie_categories_category_id ON movie_categories(category_id);


-- ─────────────────────────────────────────
-- 1.6 SEASONS TABLE
-- ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.seasons (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    movie_id UUID REFERENCES movies(id) ON DELETE CASCADE,
    season_number INTEGER NOT NULL,
    season_title TEXT,
    poster_url TEXT,
    season_zip_link TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(movie_id, season_number)
);

CREATE INDEX IF NOT EXISTS idx_seasons_movie_id ON seasons(movie_id);
COMMENT ON TABLE seasons IS 'Stores seasons for series and anime content';
COMMENT ON COLUMN seasons.season_zip_link IS 'URL for full season ZIP download (Mega, GDrive, etc.)';


-- ─────────────────────────────────────────
-- 1.7 EPISODES TABLE
-- ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.episodes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    season_id UUID REFERENCES seasons(id) ON DELETE CASCADE,
    episode_number INTEGER NOT NULL,
    episode_title TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(season_id, episode_number)
);

CREATE INDEX IF NOT EXISTS idx_episodes_season_id ON episodes(season_id);
COMMENT ON TABLE episodes IS 'Stores episodes within seasons';


-- ─────────────────────────────────────────
-- 1.8 EPISODE_DOWNLOAD_LINKS TABLE
-- ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.episode_download_links (
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
    link_status JSONB DEFAULT '{}'::jsonb,
    last_checked_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(episode_id, resolution)
);

CREATE INDEX IF NOT EXISTS idx_episode_download_links_episode_id ON episode_download_links(episode_id);
COMMENT ON TABLE episode_download_links IS 'Stores download links per episode resolution';
COMMENT ON COLUMN episode_download_links.link_status IS 'JSON object tracking status per provider';


-- ─────────────────────────────────────────
-- 1.9 MOVIE_SCREENSHOTS TABLE
-- ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.movie_screenshots (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    movie_id UUID NOT NULL REFERENCES movies(id) ON DELETE CASCADE,
    image_url TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_screenshots_movie_id ON movie_screenshots(movie_id);


-- ─────────────────────────────────────────
-- 1.10 COMMENTS TABLE
-- ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.comments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    movie_id UUID NOT NULL REFERENCES movies(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    email TEXT NOT NULL,
    message TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    is_approved BOOLEAN DEFAULT TRUE
);

CREATE INDEX IF NOT EXISTS idx_comments_movie_id ON comments(movie_id);
CREATE INDEX IF NOT EXISTS idx_comments_created_at ON comments(created_at DESC);


-- ─────────────────────────────────────────
-- 1.11 ADS TABLE
-- ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.ads (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    title TEXT NOT NULL,
    placement TEXT NOT NULL,
    ad_type TEXT NOT NULL CHECK (ad_type IN ('image', 'script')),
    image_url TEXT,
    script_code TEXT,
    destination_url TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    device_target TEXT NOT NULL DEFAULT 'both' CHECK (device_target IN ('desktop', 'mobile', 'both')),
    size TEXT,
    lazy_load BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Placement check constraint (latest version with all values)
ALTER TABLE public.ads ADD CONSTRAINT ads_placement_check 
CHECK (placement IN (
    'home_top', 
    'home_bottom', 
    'movie_sidebar', 
    'popup_global', 
    'download_bottom', 
    'episode_list',
    'native_list',
    'social_bar'
));


-- ─────────────────────────────────────────
-- 1.12 NOTICES TABLE
-- ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.notices (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    content TEXT NOT NULL,
    type TEXT NOT NULL CHECK (type IN ('top_bar', 'popup', 'inline')),
    pages TEXT NOT NULL DEFAULT 'all' CHECK (pages IN ('all', 'home', 'movie')),
    is_active BOOLEAN DEFAULT TRUE,
    bg_color TEXT DEFAULT 'bg-red-600',
    text_color TEXT DEFAULT 'text-white',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);


-- ─────────────────────────────────────────
-- 1.13 APP_SETTINGS TABLE (Singleton)
-- ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.app_settings (
    id SERIAL PRIMARY KEY,
    is_ads_enabled BOOLEAN DEFAULT FALSE,
    popunder_url TEXT,
    direct_link_url TEXT,
    ad_enabled_pages TEXT[] DEFAULT ARRAY['all'],
    ad_enabled_devices TEXT DEFAULT 'all' CHECK (ad_enabled_devices IN ('all', 'desktop', 'mobile')),
    native_ad_code TEXT,
    social_bar_code TEXT,
    ad_frequency_session INTEGER DEFAULT 1,
    -- Social links
    social_pinterest TEXT,
    social_twitter TEXT,
    social_facebook TEXT,
    social_youtube TEXT,
    social_reddit TEXT,
    social_tumblr TEXT,
    social_aboutme TEXT,
    social_instagram TEXT,
    social_threads TEXT,
    -- Additional ad/link columns
    gplink_url TEXT,
    smartlink_url TEXT,
    latest_update_click_ad_link TEXT,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Insert default settings
INSERT INTO app_settings (id, is_ads_enabled, popunder_url, direct_link_url)
VALUES (1, false, '', '')
ON CONFLICT (id) DO NOTHING;


-- ─────────────────────────────────────────
-- 1.14 TELEGRAM_SETTINGS TABLE (Singleton)
-- ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.telegram_settings (
    id SERIAL PRIMARY KEY,
    telegram_type TEXT DEFAULT 'channel',
    telegram_url TEXT DEFAULT '',
    is_active BOOLEAN DEFAULT TRUE,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

INSERT INTO telegram_settings (id, telegram_type, telegram_url, is_active)
VALUES (1, 'channel', 'https://t.me/your_channel', true)
ON CONFLICT (id) DO NOTHING;


-- ─────────────────────────────────────────
-- 1.15 CHATBOT_SETTINGS TABLE (Singleton)
-- ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.chatbot_settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    is_enabled BOOLEAN DEFAULT true,
    bot_name TEXT DEFAULT 'NexiBot',
    welcome_message TEXT DEFAULT 'Hi there! 👋 How can I help you today?',
    placeholder_text TEXT DEFAULT 'Type your question...',
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

CREATE UNIQUE INDEX IF NOT EXISTS chatbot_settings_one_row_idx ON chatbot_settings ((true));

INSERT INTO chatbot_settings (is_enabled, bot_name, welcome_message, placeholder_text)
SELECT true, 'NexiBot', 'Hi there! 👋 How can I help you today?', 'Type your question...'
WHERE NOT EXISTS (SELECT 1 FROM chatbot_settings);


-- ─────────────────────────────────────────
-- 1.16 FAQS TABLE
-- ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.faqs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    question TEXT NOT NULL,
    answer TEXT NOT NULL,
    keywords TEXT NOT NULL,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);


-- ─────────────────────────────────────────
-- 1.17 CONTENT_REQUESTS TABLE
-- ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.content_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    content_name TEXT NOT NULL,
    status TEXT DEFAULT 'pending',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);


-- ─────────────────────────────────────────
-- 1.18 DOWNLOAD_TUTORIALS TABLE
-- ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.download_tutorials (
    id SERIAL PRIMARY KEY,
    source_key TEXT NOT NULL UNIQUE,
    source_name TEXT NOT NULL,
    tutorial_url TEXT NOT NULL,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Seed default tutorial rows
INSERT INTO public.download_tutorials (source_key, source_name, tutorial_url) VALUES
    ('gdrive', 'Google Drive', ''),
    ('mega', 'Mega', ''),
    ('terabox', 'TeraBox', ''),
    ('mediafire', 'MediaFire', ''),
    ('pcloud', 'pCloud', ''),
    ('youtube', 'YouTube', '')
ON CONFLICT (source_key) DO NOTHING;


-- ─────────────────────────────────────────
-- 1.19 CONTACT_MESSAGES TABLE
-- ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.contact_messages (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT NOT NULL,
    email TEXT NOT NULL,
    subject TEXT NOT NULL,
    message TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    is_read BOOLEAN DEFAULT FALSE
);


-- ─────────────────────────────────────────
-- 1.20 DMCA_REQUESTS TABLE
-- ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.dmca_requests (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT NOT NULL,
    company TEXT,
    email TEXT NOT NULL,
    original_link TEXT NOT NULL,
    infringing_link TEXT NOT NULL,
    proof_link TEXT,
    message TEXT,
    status TEXT CHECK (status IN ('pending', 'approved', 'rejected')) DEFAULT 'pending',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);


-- ─────────────────────────────────────────
-- 1.21 UPCOMING TABLE
-- ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.upcoming (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    title TEXT NOT NULL,
    slug TEXT NOT NULL,
    poster_url TEXT NOT NULL,
    type TEXT NOT NULL CHECK (type IN ('anime', 'series', 'movie')),
    release_date DATE NOT NULL,
    status TEXT NOT NULL CHECK (status IN ('announced', 'confirmed', 'delayed')),
    trailer_url TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS upcoming_release_date_idx ON public.upcoming (release_date ASC);


-- ─────────────────────────────────────────
-- 1.22 UPDATES TABLE
-- ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.updates (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    content_id UUID NOT NULL UNIQUE,
    title TEXT NOT NULL,
    poster_url TEXT,
    slug TEXT NOT NULL,
    content_type TEXT NOT NULL CHECK (content_type IN ('anime', 'series', 'movie')),
    update_type TEXT NOT NULL CHECK (update_type IN ('movie', 'season', 'episode')),
    season_number INTEGER,
    episode_number INTEGER,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_updates_updated_at ON public.updates (updated_at DESC);


-- =====================================================================
-- 2. ENABLE ROW LEVEL SECURITY (RLS) ON ALL TABLES
-- =====================================================================

ALTER TABLE public.movies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.downloads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.download_links ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.movie_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.seasons ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.episodes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.episode_download_links ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.movie_screenshots ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.app_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.telegram_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chatbot_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.faqs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.content_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.download_tutorials ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contact_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.dmca_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.upcoming ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.updates ENABLE ROW LEVEL SECURITY;


-- =====================================================================
-- 3. RLS POLICIES FOR ALL TABLES
-- =====================================================================

-- ─────────────────────────────────────────
-- 3.1 MOVIES
-- ─────────────────────────────────────────
CREATE POLICY "Allow public read access on movies"
    ON public.movies FOR SELECT USING (true);
CREATE POLICY "Dev allow public insert on movies"
    ON public.movies FOR INSERT WITH CHECK (true);
CREATE POLICY "Dev allow public update on movies"
    ON public.movies FOR UPDATE USING (true);
CREATE POLICY "Dev allow public delete on movies"
    ON public.movies FOR DELETE USING (true);
CREATE POLICY "Enable delete access for all users"
    ON public.movies FOR DELETE USING (true);

-- ─────────────────────────────────────────
-- 3.2 DOWNLOADS (Legacy)
-- ─────────────────────────────────────────
CREATE POLICY "Allow public read access on downloads"
    ON public.downloads FOR SELECT USING (true);
CREATE POLICY "Dev allow public insert on downloads"
    ON public.downloads FOR INSERT WITH CHECK (true);
CREATE POLICY "Dev allow public update on downloads"
    ON public.downloads FOR UPDATE USING (true);
CREATE POLICY "Dev allow public delete on downloads"
    ON public.downloads FOR DELETE USING (true);

-- ─────────────────────────────────────────
-- 3.3 DOWNLOAD_LINKS
-- ─────────────────────────────────────────
CREATE POLICY "Public can read download_links"
    ON public.download_links FOR SELECT USING (true);
CREATE POLICY "Admin full access to download_links"
    ON public.download_links FOR ALL USING (true);

-- ─────────────────────────────────────────
-- 3.4 CATEGORIES
-- ─────────────────────────────────────────
CREATE POLICY "Allow public read access on categories"
    ON public.categories FOR SELECT USING (true);
CREATE POLICY "Dev allow public insert on categories"
    ON public.categories FOR INSERT WITH CHECK (true);
CREATE POLICY "Dev allow public update on categories"
    ON public.categories FOR UPDATE USING (true);
CREATE POLICY "Dev allow public delete on categories"
    ON public.categories FOR DELETE USING (true);

-- ─────────────────────────────────────────
-- 3.5 MOVIE_CATEGORIES
-- ─────────────────────────────────────────
CREATE POLICY "Allow public read access on movie_categories"
    ON public.movie_categories FOR SELECT USING (true);
CREATE POLICY "Dev allow public insert on movie_categories"
    ON public.movie_categories FOR INSERT WITH CHECK (true);
CREATE POLICY "Dev allow public delete on movie_categories"
    ON public.movie_categories FOR DELETE USING (true);

-- ─────────────────────────────────────────
-- 3.6 SEASONS
-- ─────────────────────────────────────────
CREATE POLICY "Public read seasons"
    ON public.seasons FOR SELECT USING (true);
CREATE POLICY "Admin write seasons"
    ON public.seasons FOR ALL USING (true);

-- ─────────────────────────────────────────
-- 3.7 EPISODES
-- ─────────────────────────────────────────
CREATE POLICY "Public read episodes"
    ON public.episodes FOR SELECT USING (true);
CREATE POLICY "Admin write episodes"
    ON public.episodes FOR ALL USING (true);

-- ─────────────────────────────────────────
-- 3.8 EPISODE_DOWNLOAD_LINKS
-- ─────────────────────────────────────────
CREATE POLICY "Public read episode_download_links"
    ON public.episode_download_links FOR SELECT USING (true);
CREATE POLICY "Admin write episode_download_links"
    ON public.episode_download_links FOR ALL USING (true);

-- ─────────────────────────────────────────
-- 3.9 MOVIE_SCREENSHOTS
-- ─────────────────────────────────────────
CREATE POLICY "Public Read Screenshots"
    ON public.movie_screenshots FOR SELECT USING (true);
CREATE POLICY "Dev Allow Write Screenshots"
    ON public.movie_screenshots FOR INSERT WITH CHECK (true);
CREATE POLICY "Dev Allow Delete Screenshots"
    ON public.movie_screenshots FOR DELETE USING (true);

-- ─────────────────────────────────────────
-- 3.10 COMMENTS
-- ─────────────────────────────────────────
CREATE POLICY "Public Read Comments"
    ON public.comments FOR SELECT USING (true);
CREATE POLICY "Public Insert Comments"
    ON public.comments FOR INSERT WITH CHECK (true);
CREATE POLICY "Dev Allow Delete Comments"
    ON public.comments FOR DELETE USING (true);
CREATE POLICY "Dev Allow Update Comments"
    ON public.comments FOR UPDATE USING (true);

-- ─────────────────────────────────────────
-- 3.11 ADS
-- ─────────────────────────────────────────
CREATE POLICY "Public can read active ads"
    ON public.ads FOR SELECT USING (is_active = true);
CREATE POLICY "Public Access"
    ON public.ads FOR SELECT USING (true);
CREATE POLICY "Admin full access"
    ON public.ads FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Dev Allow Delete Ads"
    ON public.ads FOR DELETE USING (true);
CREATE POLICY "Dev Allow Update Ads"
    ON public.ads FOR UPDATE USING (true);
CREATE POLICY "Dev Allow Write Ads"
    ON public.ads FOR INSERT WITH CHECK (true);

-- ─────────────────────────────────────────
-- 3.12 NOTICES
-- ─────────────────────────────────────────
CREATE POLICY "Public can read active notices"
    ON public.notices FOR SELECT USING (is_active = true);
CREATE POLICY "Admin full access notices"
    ON public.notices FOR ALL USING (true) WITH CHECK (true);

-- ─────────────────────────────────────────
-- 3.13 APP_SETTINGS
-- ─────────────────────────────────────────
CREATE POLICY "Public can read settings"
    ON public.app_settings FOR SELECT USING (true);
CREATE POLICY "Dev allow public update on app_settings"
    ON public.app_settings FOR UPDATE USING (true);

-- ─────────────────────────────────────────
-- 3.14 TELEGRAM_SETTINGS
-- ─────────────────────────────────────────
CREATE POLICY "Public Read Telegram Settings"
    ON public.telegram_settings FOR SELECT USING (true);
CREATE POLICY "Dev Allow Update Telegram Settings"
    ON public.telegram_settings FOR UPDATE USING (true);

-- ─────────────────────────────────────────
-- 3.15 CHATBOT_SETTINGS
-- ─────────────────────────────────────────
CREATE POLICY "Public can view chatbot settings"
    ON public.chatbot_settings FOR SELECT USING (true);
CREATE POLICY "Enable insert for all (dev) chatbot_settings"
    ON public.chatbot_settings FOR INSERT WITH CHECK (true);
CREATE POLICY "Enable update for all (dev) chatbot_settings"
    ON public.chatbot_settings FOR UPDATE USING (true);

-- ─────────────────────────────────────────
-- 3.16 FAQS
-- ─────────────────────────────────────────
CREATE POLICY "Public can view active faqs"
    ON public.faqs FOR SELECT USING (is_active = true);
CREATE POLICY "Enable insert for all (dev) faqs"
    ON public.faqs FOR INSERT WITH CHECK (true);
CREATE POLICY "Enable update for all (dev) faqs"
    ON public.faqs FOR UPDATE USING (true);
CREATE POLICY "Enable delete for all (dev) faqs"
    ON public.faqs FOR DELETE USING (true);

-- ─────────────────────────────────────────
-- 3.17 CONTENT_REQUESTS
-- ─────────────────────────────────────────
CREATE POLICY "Anon Insert"
    ON public.content_requests FOR INSERT TO anon, authenticated, service_role WITH CHECK (true);
CREATE POLICY "Enable Read"
    ON public.content_requests FOR SELECT TO anon, authenticated, service_role USING (true);
CREATE POLICY "Enable Update"
    ON public.content_requests FOR UPDATE TO anon, authenticated, service_role USING (true);
CREATE POLICY "Enable Delete"
    ON public.content_requests FOR DELETE TO anon, authenticated, service_role USING (true);

-- ─────────────────────────────────────────
-- 3.18 DOWNLOAD_TUTORIALS
-- ─────────────────────────────────────────
CREATE POLICY "Public can read tutorials"
    ON public.download_tutorials FOR SELECT USING (true);
CREATE POLICY "Admin full access tutorials"
    ON public.download_tutorials FOR ALL USING (true) WITH CHECK (true);

-- ─────────────────────────────────────────
-- 3.19 CONTACT_MESSAGES
-- ─────────────────────────────────────────
CREATE POLICY "Public can insert contact messages"
    ON public.contact_messages FOR INSERT WITH CHECK (true);
CREATE POLICY "Enable read access for all users"
    ON public.contact_messages FOR SELECT USING (true);
CREATE POLICY "Enable delete access for all users on contact_messages"
    ON public.contact_messages FOR DELETE USING (true);

-- ─────────────────────────────────────────
-- 3.20 DMCA_REQUESTS
-- ─────────────────────────────────────────
CREATE POLICY "Public can insert dmca requests"
    ON public.dmca_requests FOR INSERT WITH CHECK (true);
CREATE POLICY "Enable read access for all users on dmca"
    ON public.dmca_requests FOR SELECT USING (true);
CREATE POLICY "Enable update access for all users on dmca"
    ON public.dmca_requests FOR UPDATE USING (true) WITH CHECK (true);
CREATE POLICY "Enable delete access for all users on dmca"
    ON public.dmca_requests FOR DELETE USING (true);

-- ─────────────────────────────────────────
-- 3.21 UPCOMING
-- ─────────────────────────────────────────
CREATE POLICY "Enable read access for all users on upcoming"
    ON public.upcoming FOR SELECT USING (true);
CREATE POLICY "Enable full access for authenticated users on upcoming"
    ON public.upcoming FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Enable full access for all on upcoming"
    ON public.upcoming FOR ALL USING (true) WITH CHECK (true);

-- ─────────────────────────────────────────
-- 3.22 UPDATES
-- ─────────────────────────────────────────
CREATE POLICY "Public read updates"
    ON public.updates FOR SELECT USING (true);
CREATE POLICY "Admin full access updates"
    ON public.updates FOR ALL USING (true) WITH CHECK (true);


-- =====================================================================
-- 4. GRANT PERMISSIONS
-- =====================================================================

GRANT ALL ON TABLE public.ads TO anon, authenticated, service_role;
GRANT ALL ON TABLE public.notices TO anon, authenticated, service_role;
GRANT ALL ON TABLE public.contact_messages TO anon, authenticated, service_role;
GRANT ALL ON TABLE public.dmca_requests TO anon, authenticated, service_role;
GRANT ALL ON TABLE public.content_requests TO anon, authenticated, service_role;
GRANT ALL ON TABLE public.download_tutorials TO anon, authenticated, service_role;


-- =====================================================================
-- 5. STORAGE BUCKET & POLICIES
-- =====================================================================

-- Create 'posters' bucket (public)
INSERT INTO storage.buckets (id, name, public)
VALUES ('posters', 'posters', true)
ON CONFLICT (id) DO NOTHING;

-- Storage policies for 'posters' bucket
CREATE POLICY "Public Access"
    ON storage.objects FOR SELECT
    USING ( bucket_id = 'posters' );

CREATE POLICY "Public Upload"
    ON storage.objects FOR INSERT
    WITH CHECK ( bucket_id = 'posters' );

CREATE POLICY "Public Update"
    ON storage.objects FOR UPDATE
    USING ( bucket_id = 'posters' );

CREATE POLICY "Public Delete"
    ON storage.objects FOR DELETE
    USING ( bucket_id = 'posters' );


-- =====================================================================
-- 6. DONE! 🎉
-- Your new Supabase project is now fully set up with all tables,
-- indexes, RLS policies, storage buckets, and permissions.
-- 
-- NEXT STEPS:
-- 1. Update your .env.local with the new Supabase URL and keys
-- 2. If you have data to migrate, export from old project and import
-- 3. Create any additional storage buckets you need (e.g., 'screenshots')
-- =====================================================================

-- ===== FIX 1: app_settings missing columns =====
ALTER TABLE public.app_settings
ADD COLUMN IF NOT EXISTS social_instagram TEXT,
ADD COLUMN IF NOT EXISTS social_threads TEXT,
ADD COLUMN IF NOT EXISTS gplink_url TEXT,
ADD COLUMN IF NOT EXISTS smartlink_url TEXT,
ADD COLUMN IF NOT EXISTS latest_update_click_ad_link TEXT;

-- ===== FIX 2: ads - Public Access policy =====
CREATE POLICY "Public Access" ON public.ads
    FOR SELECT USING (true);

-- ===== FIX 3: movies - Enable delete access =====
CREATE POLICY "Enable delete access for all users" ON public.movies
    FOR DELETE USING (true);

-- ===== FIX 4: upcoming - Full access for all =====
CREATE POLICY "Enable full access for all on upcoming" ON public.upcoming
    FOR ALL USING (true) WITH CHECK (true);
