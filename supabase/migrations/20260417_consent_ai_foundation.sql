-- ─────────────────────────────────────────────────────────────────────────────
-- CONSENT + AI DATA FOUNDATION
-- Run in Supabase SQL Editor
-- ─────────────────────────────────────────────────────────────────────────────

-- ── 1. terms_versions ─────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS terms_versions (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  version        TEXT NOT NULL UNIQUE,
  title          TEXT NOT NULL,
  content        TEXT NOT NULL,
  effective_date DATE NOT NULL,
  created_at     TIMESTAMPTZ DEFAULT NOW(),
  is_active      BOOLEAN DEFAULT false
);

-- Seed v1.0
INSERT INTO terms_versions (version, title, content, effective_date, is_active)
VALUES (
  '1.0',
  'Terms of Use & Data Notice',
  'FitHub Gym Platform — Terms of Use & Data Notice | Version 1.0 | Effective 17 April 2026',
  '2026-04-17',
  true
) ON CONFLICT (version) DO NOTHING;

-- ── 2. user_consents ──────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS user_consents (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id             TEXT NOT NULL,
  role                TEXT NOT NULL CHECK (role IN ('member', 'admin')),
  terms_version_id    UUID REFERENCES terms_versions(id),
  consent_ai_training BOOLEAN DEFAULT false,
  consent_terms       BOOLEAN DEFAULT false,
  status              TEXT NOT NULL CHECK (status IN ('accepted', 'declined', 'withdrawn')),
  accepted_at         TIMESTAMPTZ,
  declined_at         TIMESTAMPTZ,
  withdrawn_at        TIMESTAMPTZ,
  created_at          TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_user_consents_user_id ON user_consents(user_id);
CREATE INDEX IF NOT EXISTS idx_user_consents_version ON user_consents(terms_version_id);
CREATE INDEX IF NOT EXISTS idx_user_consents_status  ON user_consents(status);

-- ── 3. ai_member_profiles ─────────────────────────────────────────────────────
-- NO phone_number, NO passwords, NO social data
CREATE TABLE IF NOT EXISTS ai_member_profiles (
  id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  member_id          UUID NOT NULL UNIQUE,   -- users.id — internal UUID only
  gym_id             UUID REFERENCES gyms(id),
  age_band           TEXT,                   -- '18-24', '25-34', etc.
  height_cm          NUMERIC(5,2),
  baseline_weight_kg NUMERIC(5,2),
  goal               TEXT,
  experience_level   TEXT,
  equipment_access   TEXT,
  injury_flags       JSONB DEFAULT '[]',
  consent_enabled    BOOLEAN DEFAULT true,
  created_at         TIMESTAMPTZ DEFAULT NOW(),
  updated_at         TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ai_profile_gym ON ai_member_profiles(gym_id);

-- ── 4. ai_weekly_training_features ────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS ai_weekly_training_features (
  id                        UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  member_id                 UUID NOT NULL,
  gym_id                    UUID REFERENCES gyms(id),
  week_start                DATE NOT NULL,
  sessions_completed        INT DEFAULT 0,
  weekly_minutes            INT DEFAULT 0,
  weekly_volume             NUMERIC(10,2) DEFAULT 0,
  adherence_percent         NUMERIC(5,2) DEFAULT 0,
  top_exercises             JSONB DEFAULT '[]',
  muscle_group_distribution JSONB DEFAULT '{}',
  avg_progression_score     NUMERIC(5,2) DEFAULT 0,
  attendance_count          INT DEFAULT 0,
  weight_kg                 NUMERIC(5,2),
  body_measurements         JSONB DEFAULT '{}',
  recovery_signals          JSONB DEFAULT '{}',
  assigned_plan             TEXT,
  plan_source               TEXT,
  created_at                TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(member_id, week_start)
);

CREATE INDEX IF NOT EXISTS idx_ai_weekly_member   ON ai_weekly_training_features(member_id);
CREATE INDEX IF NOT EXISTS idx_ai_weekly_gym      ON ai_weekly_training_features(gym_id);
CREATE INDEX IF NOT EXISTS idx_ai_weekly_date     ON ai_weekly_training_features(week_start);

-- ── 5. ai_exercise_progress ───────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS ai_exercise_progress (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  member_id       UUID NOT NULL,
  gym_id          UUID REFERENCES gyms(id),
  exercise_name   TEXT NOT NULL,
  week_start      DATE NOT NULL,
  top_weight      NUMERIC(7,2) DEFAULT 0,
  total_volume    NUMERIC(10,2) DEFAULT 0,
  estimated_1rm   NUMERIC(7,2),
  progress_delta  NUMERIC(7,2) DEFAULT 0,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(member_id, exercise_name, week_start)
);

CREATE INDEX IF NOT EXISTS idx_ai_exercise_member ON ai_exercise_progress(member_id);
CREATE INDEX IF NOT EXISTS idx_ai_exercise_gym    ON ai_exercise_progress(gym_id);
CREATE INDEX IF NOT EXISTS idx_ai_exercise_week   ON ai_exercise_progress(week_start);
