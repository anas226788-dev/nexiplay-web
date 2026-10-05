-- 1. Watchlist Table
CREATE TABLE IF NOT EXISTS public.user_watchlist (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    movie_id UUID NOT NULL REFERENCES public.movies(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id, movie_id)
);

-- 2. Add columns to Comments Table
ALTER TABLE public.comments ADD COLUMN IF NOT EXISTS parent_id UUID REFERENCES public.comments(id) ON DELETE CASCADE;
ALTER TABLE public.comments ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;

-- 3. Notifications Table (Admin Direct Messages)
CREATE TABLE IF NOT EXISTS public.user_notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    message TEXT NOT NULL,
    is_read BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4. Add settings to profiles
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS hide_nsfw BOOLEAN DEFAULT FALSE;

-- 5. Add deletion status to events
ALTER TABLE public.user_events ADD COLUMN IF NOT EXISTS deleted_by_user BOOLEAN DEFAULT FALSE;

-- Enable RLS
ALTER TABLE public.user_watchlist ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_notifications ENABLE ROW LEVEL SECURITY;

-- RLS Policies
DROP POLICY IF EXISTS "Users can manage own watchlist" ON public.user_watchlist;
CREATE POLICY "Users can manage own watchlist" ON public.user_watchlist
    FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Admin can view all watchlists" ON public.user_watchlist;
CREATE POLICY "Admin can view all watchlists" ON public.user_watchlist
    FOR SELECT USING (true);

DROP POLICY IF EXISTS "Users can read own notifications" ON public.user_notifications;
CREATE POLICY "Users can read own notifications" ON public.user_notifications
    FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own notifications" ON public.user_notifications;
CREATE POLICY "Users can update own notifications" ON public.user_notifications
    FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Admin can manage all notifications" ON public.user_notifications;
CREATE POLICY "Admin can manage all notifications" ON public.user_notifications
    FOR ALL USING (true) WITH CHECK (true);
