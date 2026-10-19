-- Admin-managed allowlist for the Kids Zone pages in web and Android.
ALTER TABLE public.app_settings
    ADD COLUMN IF NOT EXISTS kids_mode_settings jsonb NOT NULL DEFAULT '{
        "enabled": true,
        "title": "Kids Zone",
        "description": "A parent-curated corner for younger viewers.",
        "allowedGenres": ["animation", "family"],
        "allowedTypes": ["anime", "movie", "series"]
    }'::jsonb;
