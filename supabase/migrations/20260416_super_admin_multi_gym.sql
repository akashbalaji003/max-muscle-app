-- ============================================================
-- Super Admin + Multi-Gym Support
-- Run this in Supabase SQL Editor (Dashboard > SQL Editor)
-- Safe to run on existing data — all gym_id columns are nullable
-- ============================================================

-- 1. gyms table
CREATE TABLE IF NOT EXISTS gyms (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name            TEXT NOT NULL,
  slug            TEXT UNIQUE NOT NULL,
  logo_url        TEXT,
  primary_color   TEXT DEFAULT '#E11D1D',
  secondary_color TEXT DEFAULT '#000000',
  address         TEXT,
  phone           TEXT,
  status          TEXT DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'suspended')),
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

-- 2. subscriptions table — SaaS billing prep (no payment integration yet)
--    Unique constraint on gym_id so ON CONFLICT works correctly
CREATE TABLE IF NOT EXISTS subscriptions (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  gym_id       UUID UNIQUE REFERENCES gyms(id) ON DELETE CASCADE,
  plan_name    TEXT NOT NULL DEFAULT 'trial',
  status       TEXT DEFAULT 'trial' CHECK (status IN ('trial','active','expired','paused')),
  start_date   DATE NOT NULL DEFAULT CURRENT_DATE,
  renewal_date DATE,
  created_at   TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Insert default gym for all existing data
INSERT INTO gyms (name, slug, address, phone)
VALUES ('Maximum Muscle Fitness Studio', 'maximum-muscle', 'Perungalathur, Chennai', '8056329329')
ON CONFLICT (slug) DO NOTHING;

-- 4. Add gym_id to core tables (nullable — no breaking changes to existing queries)
ALTER TABLE users           ADD COLUMN IF NOT EXISTS gym_id UUID REFERENCES gyms(id);
ALTER TABLE memberships     ADD COLUMN IF NOT EXISTS gym_id UUID REFERENCES gyms(id);
ALTER TABLE attendance      ADD COLUMN IF NOT EXISTS gym_id UUID REFERENCES gyms(id);
ALTER TABLE workouts        ADD COLUMN IF NOT EXISTS gym_id UUID REFERENCES gyms(id);

-- 5. Add gym_id to social/community tables
ALTER TABLE progress_photos ADD COLUMN IF NOT EXISTS gym_id UUID REFERENCES gyms(id);
ALTER TABLE post_likes      ADD COLUMN IF NOT EXISTS gym_id UUID REFERENCES gyms(id);
ALTER TABLE post_comments   ADD COLUMN IF NOT EXISTS gym_id UUID REFERENCES gyms(id);
ALTER TABLE activity_feed   ADD COLUMN IF NOT EXISTS gym_id UUID REFERENCES gyms(id);
ALTER TABLE user_follows    ADD COLUMN IF NOT EXISTS gym_id UUID REFERENCES gyms(id);

-- 6. Indexes on all new gym_id columns for query performance
CREATE INDEX IF NOT EXISTS idx_users_gym_id           ON users(gym_id);
CREATE INDEX IF NOT EXISTS idx_memberships_gym_id     ON memberships(gym_id);
CREATE INDEX IF NOT EXISTS idx_attendance_gym_id      ON attendance(gym_id);
CREATE INDEX IF NOT EXISTS idx_workouts_gym_id        ON workouts(gym_id);
CREATE INDEX IF NOT EXISTS idx_progress_photos_gym_id ON progress_photos(gym_id);
CREATE INDEX IF NOT EXISTS idx_post_likes_gym_id      ON post_likes(gym_id);
CREATE INDEX IF NOT EXISTS idx_post_comments_gym_id   ON post_comments(gym_id);
CREATE INDEX IF NOT EXISTS idx_activity_feed_gym_id   ON activity_feed(gym_id);
CREATE INDEX IF NOT EXISTS idx_user_follows_gym_id    ON user_follows(gym_id);

-- 7. Backfill all existing rows to the default gym
DO $$
DECLARE
  default_id UUID;
BEGIN
  SELECT id INTO default_id FROM gyms WHERE slug = 'maximum-muscle';

  UPDATE users           SET gym_id = default_id WHERE gym_id IS NULL;
  UPDATE memberships     SET gym_id = default_id WHERE gym_id IS NULL;
  UPDATE attendance      SET gym_id = default_id WHERE gym_id IS NULL;
  UPDATE workouts        SET gym_id = default_id WHERE gym_id IS NULL;
  UPDATE progress_photos SET gym_id = default_id WHERE gym_id IS NULL;
  UPDATE post_likes      SET gym_id = default_id WHERE gym_id IS NULL;
  UPDATE post_comments   SET gym_id = default_id WHERE gym_id IS NULL;
  UPDATE activity_feed   SET gym_id = default_id WHERE gym_id IS NULL;
  UPDATE user_follows    SET gym_id = default_id WHERE gym_id IS NULL;
END $$;

-- 8. Insert starter subscription for default gym
--    ON CONFLICT (gym_id) is safe because gym_id is UNIQUE on subscriptions
INSERT INTO subscriptions (gym_id, plan_name, status, start_date, renewal_date)
SELECT
  id,
  'starter',
  'active',
  CURRENT_DATE,
  (CURRENT_DATE + INTERVAL '1 year')::DATE
FROM gyms
WHERE slug = 'maximum-muscle'
ON CONFLICT (gym_id) DO NOTHING;
