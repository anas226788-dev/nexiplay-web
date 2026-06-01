-- Create Content Requests Table
CREATE TABLE IF NOT EXISTS content_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    content_name TEXT NOT NULL,
    status TEXT DEFAULT 'pending', -- pending, added, rejected
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- RLS Policies
ALTER TABLE content_requests ENABLE ROW LEVEL SECURITY;

-- Public can insert (make requests)
CREATE POLICY "Public can make requests" ON content_requests FOR INSERT WITH CHECK (true);

-- Admin can do everything (simplified for project context)
CREATE POLICY "Enable read for all (dev)" ON content_requests FOR SELECT USING (true);
CREATE POLICY "Enable update for all (dev)" ON content_requests FOR UPDATE USING (true);
CREATE POLICY "Enable delete for all (dev)" ON content_requests FOR DELETE USING (true);
