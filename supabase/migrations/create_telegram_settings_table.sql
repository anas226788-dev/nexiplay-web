-- =================================================================
-- CREATE TELEGRAM SETTINGS TABLE
-- Run this in Supabase SQL Editor
-- =================================================================

-- 1. Create Table
CREATE TABLE IF NOT EXISTS telegram_settings (
    id SERIAL PRIMARY KEY, -- Singleton row, usually ID=1
    telegram_type TEXT DEFAULT 'channel', -- 'group' or 'channel'
    telegram_url TEXT DEFAULT '',
    is_active BOOLEAN DEFAULT TRUE,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Insert Default Row (Singleton)
INSERT INTO telegram_settings (id, telegram_type, telegram_url, is_active)
VALUES (1, 'channel', 'https://t.me/your_channel', true)
ON CONFLICT (id) DO NOTHING;

-- 3. Enable RLS
ALTER TABLE telegram_settings ENABLE ROW LEVEL SECURITY;

-- 4. Policies
-- Public Read
CREATE POLICY "Public Read Telegram Settings"
    ON telegram_settings FOR SELECT
    USING (true);

-- Admin Update (Dev)
CREATE POLICY "Dev Allow Update Telegram Settings"
    ON telegram_settings FOR UPDATE
    USING (true);
