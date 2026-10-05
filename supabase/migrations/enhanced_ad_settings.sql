-- Add columns to app_settings for cleaner ad management
ALTER TABLE public.app_settings
ADD COLUMN IF NOT EXISTS ad_enabled_pages TEXT[] DEFAULT ARRAY['all'],
ADD COLUMN IF NOT EXISTS ad_enabled_devices TEXT DEFAULT 'all' CHECK (ad_enabled_devices IN ('all', 'desktop', 'mobile')),
ADD COLUMN IF NOT EXISTS native_ad_code TEXT,
ADD COLUMN IF NOT EXISTS social_bar_code TEXT;

-- Update ads table for better tracking
ALTER TABLE public.ads
ADD COLUMN IF NOT EXISTS size TEXT,
ADD COLUMN IF NOT EXISTS lazy_load BOOLEAN DEFAULT true;

-- Update existing ads to have a default size if missing
UPDATE public.ads SET size = '300x250' WHERE size IS NULL AND placement LIKE '%sidebar%';
UPDATE public.ads SET size = '728x90' WHERE size IS NULL AND placement LIKE '%top%';
UPDATE public.ads SET size = '728x90' WHERE size IS NULL AND placement LIKE '%bottom%';
