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

-- Allow Anonymous Inserts (Public submission)
CREATE POLICY "Anon Insert" ON content_requests FOR INSERT TO anon, authenticated, service_role WITH CHECK (true);

-- Allow Reading (Public and Authenticated)
CREATE POLICY "Enable Read" ON content_requests FOR SELECT TO anon, authenticated, service_role USING (true);

-- Update/Delete restricted to service_role (Admin Backend)
REVOKE UPDATE, DELETE ON content_requests FROM anon;
GRANT ALL ON content_requests TO service_role;
