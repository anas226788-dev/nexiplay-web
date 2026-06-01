-- Create contact_messages table
CREATE TABLE public.contact_messages (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT NOT NULL,
    email TEXT NOT NULL,
    subject TEXT NOT NULL,
    message TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    is_read BOOLEAN DEFAULT FALSE
);

-- Create dmca_requests table
CREATE TABLE public.dmca_requests (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT NOT NULL,
    company TEXT,
    email TEXT NOT NULL,
    original_link TEXT NOT NULL,
    infringing_link TEXT NOT NULL,
    proof_link TEXT,
    message TEXT,
    status TEXT CHECK (status IN ('pending', 'approved', 'rejected')) DEFAULT 'pending',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable Row Level Security
ALTER TABLE public.contact_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.dmca_requests ENABLE ROW LEVEL SECURITY;

-- Policies for contact_messages
-- Public can insert
CREATE POLICY "Public can insert contact messages" ON public.contact_messages
    FOR INSERT WITH CHECK (true);

-- Only admins can view (assuming service role or admin auth logic matches)
-- For simplicity in this setup, we'll allow public insert and rely on dashboard for view.
-- Real-world should restrict SELECT to authenticated admins.

-- Policies for dmca_requests
-- Public can insert
CREATE POLICY "Public can insert dmca requests" ON public.dmca_requests
    FOR INSERT WITH CHECK (true);

-- Grant access
GRANT ALL ON TABLE public.contact_messages TO anon, authenticated, service_role;
GRANT ALL ON TABLE public.dmca_requests TO anon, authenticated, service_role;
