-- Create Chatbot Settings Table
CREATE TABLE IF NOT EXISTS chatbot_settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    is_enabled BOOLEAN DEFAULT true,
    bot_name TEXT DEFAULT 'NexiBot',
    welcome_message TEXT DEFAULT 'Hi there! 👋 How can I help you today?',
    placeholder_text TEXT DEFAULT 'Type your question...',
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- Ensure only one row exists for settings
CREATE UNIQUE INDEX IF NOT EXISTS chatbot_settings_one_row_idx ON chatbot_settings ((true));

-- Insert default settings if not exists
INSERT INTO chatbot_settings (is_enabled, bot_name, welcome_message, placeholder_text)
SELECT true, 'NexiBot', 'Hi there! 👋 How can I help you today?', 'Type your question...'
WHERE NOT EXISTS (SELECT 1 FROM chatbot_settings);

-- Create FAQs Table
CREATE TABLE IF NOT EXISTS faqs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    question TEXT NOT NULL,
    answer TEXT NOT NULL,
    keywords TEXT NOT NULL, -- Comma separated keywords
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- RLS Policies
ALTER TABLE chatbot_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE faqs ENABLE ROW LEVEL SECURITY;

-- Public READ access
CREATE POLICY "Public can view chatbot settings" ON chatbot_settings FOR SELECT USING (true);
CREATE POLICY "Public can view active faqs" ON faqs FOR SELECT USING (is_active = true);

-- Admin FULL access (assuming anon/authenticated for now based on previous patterns, strictly restricted in prod but here following project pattern)
-- NOTE: In a real app, strict RLS for admin-only write is needed.
-- For this project's simplified context where we might be using service roles or simplified auth:
CREATE POLICY "Enable insert for all (dev)" ON chatbot_settings FOR INSERT WITH CHECK (true);
CREATE POLICY "Enable update for all (dev)" ON chatbot_settings FOR UPDATE USING (true);

CREATE POLICY "Enable insert for all (dev)" ON faqs FOR INSERT WITH CHECK (true);
CREATE POLICY "Enable update for all (dev)" ON faqs FOR UPDATE USING (true);
CREATE POLICY "Enable delete for all (dev)" ON faqs FOR DELETE USING (true);
