-- ============================================================
-- GYM PLATFORM - PostgreSQL Schema
-- Run this on your Supabase project's SQL Editor
-- ============================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================
-- USERS
-- ============================================================
CREATE TABLE IF NOT EXISTS users (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  phone_number  VARCHAR(20) UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  name          VARCHAR(100),
  avatar_url    TEXT,
  created_at    TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- MEMBERSHIPS
-- ============================================================
CREATE TABLE IF NOT EXISTS memberships (
  id         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id    UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  start_date DATE NOT NULL,
  end_date   DATE NOT NULL,
  active     BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id)  -- one membership record per user (upsert approach)
);

-- ============================================================
-- ATTENDANCE
-- ============================================================
CREATE TABLE IF NOT EXISTS attendance (
  id         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id    UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  date       DATE NOT NULL DEFAULT CURRENT_DATE,
  checked_in_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, date)  -- only one check-in per user per day
);

-- ============================================================
-- EXERCISES (seeded catalogue)
-- ============================================================
CREATE TABLE IF NOT EXISTS exercises (
  id       UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name     VARCHAR(100) UNIQUE NOT NULL,
  category VARCHAR(50) NOT NULL  -- chest, back, legs, shoulders, arms, core, cardio
);

-- ============================================================
-- WORKOUTS (sessions)
-- ============================================================
CREATE TABLE IF NOT EXISTS workouts (
  id         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id    UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  date       DATE NOT NULL DEFAULT CURRENT_DATE,
  notes      TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- WORKOUT ENTRIES (sets per exercise inside a session)
-- ============================================================
CREATE TABLE IF NOT EXISTS workout_entries (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  workout_id  UUID NOT NULL REFERENCES workouts(id) ON DELETE CASCADE,
  exercise_id UUID NOT NULL REFERENCES exercises(id),
  weight      NUMERIC(6,2) NOT NULL,  -- kg
  reps        INT NOT NULL,
  sets        INT NOT NULL
);

-- ============================================================
-- PERSONAL RECORDS
-- ============================================================
CREATE TABLE IF NOT EXISTS prs (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  exercise_id UUID NOT NULL REFERENCES exercises(id),
  max_weight  NUMERIC(6,2) NOT NULL,
  achieved_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, exercise_id)
);

-- ============================================================
-- PROGRESS PHOTOS
-- ============================================================
CREATE TABLE IF NOT EXISTS progress_photos (
  id        UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id   UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  image_url TEXT NOT NULL,
  date      DATE NOT NULL DEFAULT CURRENT_DATE,
  is_weekly BOOLEAN DEFAULT FALSE,
  note      TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- INDEXES
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_attendance_user    ON attendance(user_id);
CREATE INDEX IF NOT EXISTS idx_attendance_date    ON attendance(date);
CREATE INDEX IF NOT EXISTS idx_workouts_user      ON workouts(user_id);
CREATE INDEX IF NOT EXISTS idx_workouts_date      ON workouts(date);
CREATE INDEX IF NOT EXISTS idx_workout_entries_workout ON workout_entries(workout_id);
CREATE INDEX IF NOT EXISTS idx_prs_user           ON prs(user_id);
CREATE INDEX IF NOT EXISTS idx_progress_photos    ON progress_photos(user_id, date);

-- ============================================================
-- SEED: EXERCISE CATALOGUE
-- ============================================================
INSERT INTO exercises (name, category) VALUES
  -- Chest
  ('Bench Press', 'chest'),
  ('Incline Bench Press', 'chest'),
  ('Decline Bench Press', 'chest'),
  ('Dumbbell Fly', 'chest'),
  ('Push-Up', 'chest'),
  ('Cable Crossover', 'chest'),
  -- Back
  ('Deadlift', 'back'),
  ('Pull-Up', 'back'),
  ('Barbell Row', 'back'),
  ('Lat Pulldown', 'back'),
  ('Seated Cable Row', 'back'),
  ('T-Bar Row', 'back'),
  -- Legs
  ('Squat', 'legs'),
  ('Leg Press', 'legs'),
  ('Romanian Deadlift', 'legs'),
  ('Leg Curl', 'legs'),
  ('Leg Extension', 'legs'),
  ('Calf Raise', 'legs'),
  ('Lunges', 'legs'),
  -- Shoulders
  ('Overhead Press', 'shoulders'),
  ('Dumbbell Shoulder Press', 'shoulders'),
  ('Lateral Raise', 'shoulders'),
  ('Front Raise', 'shoulders'),
  ('Face Pull', 'shoulders'),
  ('Shrugs', 'shoulders'),
  -- Arms
  ('Barbell Curl', 'arms'),
  ('Dumbbell Curl', 'arms'),
  ('Hammer Curl', 'arms'),
  ('Tricep Dips', 'arms'),
  ('Skull Crusher', 'arms'),
  ('Cable Tricep Pushdown', 'arms'),
  -- Core
  ('Plank', 'core'),
  ('Crunches', 'core'),
  ('Leg Raises', 'core'),
  ('Russian Twist', 'core'),
  ('Ab Wheel Rollout', 'core'),
  -- Cardio
  ('Treadmill Run', 'cardio'),
  ('Cycling', 'cardio'),
  ('Jump Rope', 'cardio'),
  ('Rowing Machine', 'cardio')
ON CONFLICT (name) DO NOTHING;
