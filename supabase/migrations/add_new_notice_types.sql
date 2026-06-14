-- Migration: Add new notice types (toast, bottom_bar, fullscreen, marquee)
-- Inspired by major platforms: YouTube (toast), Spotify (bottom_bar), Netflix (fullscreen), Bloomberg (marquee)

-- Update the type column check constraint to include new notice types
ALTER TABLE public.notices DROP CONSTRAINT IF EXISTS notices_type_check;
ALTER TABLE public.notices ADD CONSTRAINT notices_type_check CHECK (type IN ('top_bar', 'popup', 'inline', 'toast', 'bottom_bar', 'fullscreen', 'marquee', 'marquee_bottom'));
