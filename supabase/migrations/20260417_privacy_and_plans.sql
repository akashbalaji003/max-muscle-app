-- ============================================================
-- Privacy mode + Admin workout plan override
-- Run in Supabase SQL Editor
-- ============================================================

-- 1. Account visibility for social privacy
ALTER TABLE users
  ADD COLUMN IF NOT EXISTS account_visibility TEXT
  DEFAULT 'public'
  CHECK (account_visibility IN ('public', 'private'));

-- 2. Admin-assigned workout plan override
ALTER TABLE users
  ADD COLUMN IF NOT EXISTS assigned_plan TEXT
  CHECK (assigned_plan IN ('push_pull_legs', 'full_body', 'upper_lower', 'custom', NULL));

ALTER TABLE users
  ADD COLUMN IF NOT EXISTS plan_source TEXT
  DEFAULT 'system'
  CHECK (plan_source IN ('system', 'admin'));

-- 3. Backfill existing users — all public, system plan
UPDATE users SET account_visibility = 'public' WHERE account_visibility IS NULL;
UPDATE users SET plan_source = 'system' WHERE plan_source IS NULL;

-- 4. Indexes for social feed filtering
CREATE INDEX IF NOT EXISTS idx_users_account_visibility ON users(account_visibility);
CREATE INDEX IF NOT EXISTS idx_users_plan_source        ON users(plan_source);
