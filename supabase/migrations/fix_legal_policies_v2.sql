-- Allow reading contact_messages (Required for Admin Panel)
CREATE POLICY "Enable read access for all users" ON public.contact_messages
    FOR SELECT USING (true);

-- Allow reading dmca_requests (Required for Admin Panel)
CREATE POLICY "Enable read access for all users" ON public.dmca_requests
    FOR SELECT USING (true);

-- Allow updating dmca_requests (Required for Admin Panel Approve/Reject)
CREATE POLICY "Enable update access for all users" ON public.dmca_requests
    FOR UPDATE USING (true) WITH CHECK (true);
