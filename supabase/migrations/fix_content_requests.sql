-- FIX: Re-create Content Requests Table with Explicit Permissions
DROP TABLE IF EXISTS content_requests;

CREATE TABLE content_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    content_name TEXT NOT NULL,
    status TEXT DEFAULT 'pending',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- Enable RLS
ALTER TABLE content_requests ENABLE ROW LEVEL SECURITY;

-- Allow Anonymous Inserts (Public)
CREATE POLICY "Anon Insert" ON content_requests FOR INSERT TO anon, authenticated, service_role WITH CHECK (true);

-- Allow Reading (Admin/Dev)
CREATE POLICY "Enable Read" ON content_requests FOR SELECT TO anon, authenticated, service_role USING (true);

-- Allow Update/Delete (Admin/Dev)
CREATE POLICY "Enable Update" ON content_requests FOR UPDATE TO anon, authenticated, service_role USING (true);
CREATE POLICY "Enable Delete" ON content_requests FOR DELETE TO anon, authenticated, service_role USING (true);

-- Grant permissions to postgres roles (just in case)
GRANT ALL ON content_requests TO anon;
GRANT ALL ON content_requests TO authenticated;
GRANT ALL ON content_requests TO service_role;
