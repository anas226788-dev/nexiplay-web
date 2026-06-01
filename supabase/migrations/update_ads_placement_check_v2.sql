-- Drop the existing check constraint
ALTER TABLE public.ads DROP CONSTRAINT IF EXISTS ads_placement_check;

-- Add the updated check constraint with all supported values
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
