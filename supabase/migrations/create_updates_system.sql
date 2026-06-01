-- ============================================================
-- Latest Updates System v3 - ONE card per content
-- UNIQUE on content_id (single entry per anime/series/movie)
-- ============================================================

-- Drop old triggers if they exist
DROP TRIGGER IF EXISTS trg_update_on_new_movie ON public.movies;
DROP TRIGGER IF EXISTS trg_update_on_new_season ON public.seasons;
DROP TRIGGER IF EXISTS trg_update_on_new_episode ON public.episodes;
DROP FUNCTION IF EXISTS fn_update_on_new_movie();
DROP FUNCTION IF EXISTS fn_update_on_new_season();
DROP FUNCTION IF EXISTS fn_update_on_new_episode();

-- Drop and recreate table
DROP TABLE IF EXISTS public.updates;

CREATE TABLE public.updates (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    content_id UUID NOT NULL UNIQUE,  -- ONE card per content
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

-- Index for fast homepage query
CREATE INDEX idx_updates_updated_at ON public.updates (updated_at DESC);

-- RLS
ALTER TABLE public.updates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public read updates" ON public.updates
    FOR SELECT USING (true);

CREATE POLICY "Admin full access updates" ON public.updates
    FOR ALL USING (true) WITH CHECK (true);
