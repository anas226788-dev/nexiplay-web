-- Fix Cascade Delete for Complete Data Deletion

-- 1. Fix movie_categories foreign key to cascade on delete
ALTER TABLE IF EXISTS public.movie_categories
DROP CONSTRAINT IF EXISTS movie_categories_movie_id_fkey;

ALTER TABLE IF EXISTS public.movie_categories
ADD CONSTRAINT movie_categories_movie_id_fkey
FOREIGN KEY (movie_id) REFERENCES movies(id) ON DELETE CASCADE;

-- 2. Ensure downloads table has cascade (if not already)
ALTER TABLE IF EXISTS public.downloads
DROP CONSTRAINT IF EXISTS downloads_movie_id_fkey;

ALTER TABLE IF EXISTS public.downloads
ADD CONSTRAINT downloads_movie_id_fkey
FOREIGN KEY (movie_id) REFERENCES movies(id) ON DELETE CASCADE;

-- 3. Ensure movie_screenshots has cascade
ALTER TABLE IF EXISTS public.movie_screenshots
DROP CONSTRAINT IF EXISTS movie_screenshots_movie_id_fkey;

ALTER TABLE IF EXISTS public.movie_screenshots
ADD CONSTRAINT movie_screenshots_movie_id_fkey
FOREIGN KEY (movie_id) REFERENCES movies(id) ON DELETE CASCADE;

-- Summary of CASCADE relationships after this migration:
-- movies (DELETE) → seasons, episodes, episode_download_links, screenshots, 
--                    download_links, downloads, movie_categories, movie_screenshots, 
--                    comments all get DELETED automatically
