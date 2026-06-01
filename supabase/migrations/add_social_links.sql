-- Add social link columns to app_settings table
ALTER TABLE app_settings
ADD COLUMN IF NOT EXISTS social_pinterest text,
ADD COLUMN IF NOT EXISTS social_twitter text,
ADD COLUMN IF NOT EXISTS social_facebook text,
ADD COLUMN IF NOT EXISTS social_youtube text,
ADD COLUMN IF NOT EXISTS social_reddit text,
ADD COLUMN IF NOT EXISTS social_tumblr text,
ADD COLUMN IF NOT EXISTS social_aboutme text;

-- Telegram is already in telegram_settings, but for consistency in the footer loop,
-- we might want to keep using telegram_settings OR move it here.
-- For now, we will use the existing telegram_settings for Telegram to avoid breaking existing logic,
-- but Map it in the frontend. OR we can add a simple link here too.
-- Let's stick to using telegram_settings for Telegram details as it has extra fields like 'type'.
