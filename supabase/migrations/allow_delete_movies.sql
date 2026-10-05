-- Enable delete access for movies table
-- This allows the Admin Panel to delete content
CREATE POLICY "Enable delete access for all users" ON public.movies
    FOR DELETE USING (true);

-- Ensure RLS is enabled (if not already)
ALTER TABLE public.movies ENABLE ROW LEVEL SECURITY;
