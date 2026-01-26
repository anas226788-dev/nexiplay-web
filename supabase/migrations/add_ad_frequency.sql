-- Add ad_frequency_session column to app_settings table
ALTER TABLE app_settings 
ADD COLUMN IF NOT EXISTS ad_frequency_session INTEGER DEFAULT 1;

-- Update RLS policies just in case (usually not needed for adding columns but good practice)
-- Existing policies should cover it
