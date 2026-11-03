-- =================================================================
-- NEXIPLAY PRODUCTION DATABASE SECURITY LOCKDOWN MIGRATION
-- Generated: 2026-11-03
-- Objective: Revoke all unauthorized anonymous write/update/delete 
-- permissions and strictly enforce Row-Level Security (RLS).
-- =================================================================

-- 1. DROP ALL INSECURE DEVELOPMENT & PUBLIC WRITE/DELETE POLICIES
-- Movies & Content
DROP POLICY IF EXISTS "Dev allow public insert on movies" ON public.movies;
DROP POLICY IF EXISTS "Dev allow public update on movies" ON public.movies;
DROP POLICY IF EXISTS "Dev allow public delete on movies" ON public.movies;
DROP POLICY IF EXISTS "Allow delete movies" ON public.movies;

-- Downloads & Download Links
DROP POLICY IF EXISTS "Dev allow public insert on downloads" ON public.downloads;
DROP POLICY IF EXISTS "Dev allow public update on downloads" ON public.downloads;
DROP POLICY IF EXISTS "Dev allow public delete on downloads" ON public.downloads;
DROP POLICY IF EXISTS "Allow public insert on downloads" ON public.downloads;
DROP POLICY IF EXISTS "Allow public update on downloads" ON public.downloads;
DROP POLICY IF EXISTS "Allow public delete on downloads" ON public.downloads;

-- Categories & Taxonomies
DROP POLICY IF EXISTS "Dev allow public insert on categories" ON public.categories;
DROP POLICY IF EXISTS "Dev allow public update on categories" ON public.categories;
DROP POLICY IF EXISTS "Dev allow public delete on categories" ON public.categories;
DROP POLICY IF EXISTS "Dev allow public insert on movie_categories" ON public.movie_categories;
DROP POLICY IF EXISTS "Dev allow public delete on movie_categories" ON public.movie_categories;

-- App Settings & Configuration
DROP POLICY IF EXISTS "Dev allow public update on app_settings" ON public.app_settings;
DROP POLICY IF EXISTS "Allow public update on app_settings" ON public.app_settings;

-- Ads Table
DROP POLICY IF EXISTS "Admin full access" ON public.ads;
DROP POLICY IF EXISTS "Dev allow public write on ads" ON public.ads;

-- Content Requests Table
DROP POLICY IF EXISTS "Enable Update" ON public.content_requests;
DROP POLICY IF EXISTS "Enable Delete" ON public.content_requests;
DROP POLICY IF EXISTS "Allow admin delete on content_requests" ON public.content_requests;

-- Notices & Announcements
DROP POLICY IF EXISTS "Dev allow public write on notices" ON public.notices;

-- 2. ENSURE ROW LEVEL SECURITY (RLS) IS ENABLED ACROSS ALL TABLES
ALTER TABLE IF EXISTS public.movies ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.seasons ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.episodes ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.downloads ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.episode_download_links ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.movie_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.ads ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.notices ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.upcoming ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.updates ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.app_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.contact_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.dmca_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.content_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.telegram_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.stream_api_keys ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.comments ENABLE ROW LEVEL SECURITY;

-- 3. REVOKE INSECURE DIRECT PRIVILEGES FROM PUBLIC (anon)
REVOKE INSERT, UPDATE, DELETE ON public.movies FROM anon;
REVOKE INSERT, UPDATE, DELETE ON public.seasons FROM anon;
REVOKE INSERT, UPDATE, DELETE ON public.episodes FROM anon;
REVOKE INSERT, UPDATE, DELETE ON public.downloads FROM anon;
REVOKE INSERT, UPDATE, DELETE ON public.episode_download_links FROM anon;
REVOKE INSERT, UPDATE, DELETE ON public.categories FROM anon;
REVOKE INSERT, UPDATE, DELETE ON public.movie_categories FROM anon;
REVOKE INSERT, UPDATE, DELETE ON public.ads FROM anon;
REVOKE INSERT, UPDATE, DELETE ON public.notices FROM anon;
REVOKE INSERT, UPDATE, DELETE ON public.upcoming FROM anon;
REVOKE INSERT, UPDATE, DELETE ON public.updates FROM anon;
REVOKE INSERT, UPDATE, DELETE ON public.app_settings FROM anon;
REVOKE UPDATE, DELETE ON public.contact_messages FROM anon;
REVOKE UPDATE, DELETE ON public.dmca_requests FROM anon;
REVOKE UPDATE, DELETE ON public.content_requests FROM anon;
REVOKE ALL ON public.telegram_settings FROM anon;
REVOKE ALL ON public.stream_api_keys FROM anon;

-- 4. ESTABLISH SAFE PUBLIC READ-ONLY POLICIES
DROP POLICY IF EXISTS "Public read movies" ON public.movies;
CREATE POLICY "Public read movies" ON public.movies FOR SELECT USING (true);

DROP POLICY IF EXISTS "Public read seasons" ON public.seasons;
CREATE POLICY "Public read seasons" ON public.seasons FOR SELECT USING (true);

DROP POLICY IF EXISTS "Public read episodes" ON public.episodes;
CREATE POLICY "Public read episodes" ON public.episodes FOR SELECT USING (true);

DROP POLICY IF EXISTS "Public read downloads" ON public.downloads;
CREATE POLICY "Public read downloads" ON public.downloads FOR SELECT USING (true);

DROP POLICY IF EXISTS "Public read episode_download_links" ON public.episode_download_links;
CREATE POLICY "Public read episode_download_links" ON public.episode_download_links FOR SELECT USING (true);

DROP POLICY IF EXISTS "Public read categories" ON public.categories;
CREATE POLICY "Public read categories" ON public.categories FOR SELECT USING (true);

DROP POLICY IF EXISTS "Public read movie_categories" ON public.movie_categories;
CREATE POLICY "Public read movie_categories" ON public.movie_categories FOR SELECT USING (true);

DROP POLICY IF EXISTS "Public read active ads" ON public.ads;
CREATE POLICY "Public read active ads" ON public.ads FOR SELECT USING (is_active = true);

DROP POLICY IF EXISTS "Public read active notices" ON public.notices;
CREATE POLICY "Public read active notices" ON public.notices FOR SELECT USING (is_active = true);

DROP POLICY IF EXISTS "Public read upcoming" ON public.upcoming;
CREATE POLICY "Public read upcoming" ON public.upcoming FOR SELECT USING (true);

DROP POLICY IF EXISTS "Public read updates" ON public.updates;
CREATE POLICY "Public read updates" ON public.updates FOR SELECT USING (true);

DROP POLICY IF EXISTS "Public read app_settings" ON public.app_settings;
CREATE POLICY "Public read app_settings" ON public.app_settings FOR SELECT USING (true);

-- 5. ALLOW PUBLIC SUBMISSIONS (INSERT ONLY, NO UPDATE, NO DELETE)
DROP POLICY IF EXISTS "Public submit contact" ON public.contact_messages;
CREATE POLICY "Public submit contact" ON public.contact_messages FOR INSERT TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "Public submit dmca" ON public.dmca_requests;
CREATE POLICY "Public submit dmca" ON public.dmca_requests FOR INSERT TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "Public submit request" ON public.content_requests;
CREATE POLICY "Public submit request" ON public.content_requests FOR INSERT TO anon, authenticated WITH CHECK (true);

-- 6. COMMENTS SECURITY (Users can insert and only update/delete their own comments)
DROP POLICY IF EXISTS "Public read approved comments" ON public.comments;
CREATE POLICY "Public read approved comments" ON public.comments FOR SELECT USING (is_approved = true OR auth.uid() = user_id);

DROP POLICY IF EXISTS "Authenticated users create comments" ON public.comments;
CREATE POLICY "Authenticated users create comments" ON public.comments FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

-- Note: Admin operations (Insert/Update/Delete on movies, ads, settings, etc.) 
-- operate securely via service_role key from Next.js server actions / admin backend.
