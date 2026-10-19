-- Configuration for the Mood Picks recommendation quiz.
ALTER TABLE public.app_settings
    ADD COLUMN IF NOT EXISTS mood_profiles jsonb NOT NULL DEFAULT '[
        {"id":"feel-good","label":"Feel-good","description":"Light, funny stories for a brighter mood.","genres":["comedy","family","romance"],"types":["movie","series","anime"]},
        {"id":"adventure","label":"Adventure","description":"Fast, exciting stories with a sense of discovery.","genres":["action","adventure","fantasy"],"types":["movie","series","anime"]},
        {"id":"thoughtful","label":"Thoughtful","description":"Character-led drama, mystery and science fiction.","genres":["drama","mystery","science-fiction"],"types":["movie","series","anime"]},
        {"id":"cozy","label":"Cozy","description":"Warm animation and easygoing stories.","genres":["animation","family","comedy"],"types":["movie","series","anime"]}
    ]'::jsonb;
