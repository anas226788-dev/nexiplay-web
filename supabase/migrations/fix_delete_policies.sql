-- Allow deleting contact_messages (Required for Admin Panel)
CREATE POLICY "Enable delete access for all users" ON public.contact_messages
    FOR DELETE USING (true);

-- Allow deleting dmca_requests (Required for Admin Panel)
CREATE POLICY "Enable delete access for all users" ON public.dmca_requests
    FOR DELETE USING (true);
