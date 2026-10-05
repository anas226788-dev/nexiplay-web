-- Create novels table
CREATE TABLE IF NOT EXISTS public.novels (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    title TEXT NOT NULL,
    slug TEXT NOT NULL UNIQUE,
    author TEXT,
    genre TEXT,
    cover_url TEXT,
    description TEXT,
    blogger_label TEXT,
    status TEXT DEFAULT 'ongoing',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS for novels
ALTER TABLE public.novels ENABLE ROW LEVEL SECURITY;

-- Policies for novels
CREATE POLICY "Enable all access for novels"
    ON public.novels FOR ALL
    USING (true)
    WITH CHECK (true);

-- Create user_novel_progress table for bookmarks
CREATE TABLE IF NOT EXISTS public.user_novel_progress (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL,
    novel_id UUID REFERENCES public.novels(id) ON DELETE CASCADE,
    last_chapter_read INTEGER DEFAULT 1,
    bookmarked_chapter INTEGER,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id, novel_id)
);

-- Enable RLS for user_novel_progress
ALTER TABLE public.user_novel_progress ENABLE ROW LEVEL SECURITY;

-- Policies for user_novel_progress
CREATE POLICY "Enable all access for user_novel_progress"
    ON public.user_novel_progress FOR ALL
    USING (true)
    WITH CHECK (true);
