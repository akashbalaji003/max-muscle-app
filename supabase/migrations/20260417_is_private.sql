-- Add is_private boolean to users (replaces account_visibility for privacy checks)
ALTER TABLE users ADD COLUMN IF NOT EXISTS is_private BOOLEAN DEFAULT false;
CREATE INDEX IF NOT EXISTS idx_users_is_private ON users(is_private);
