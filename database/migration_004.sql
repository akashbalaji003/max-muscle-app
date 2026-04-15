-- ============================================================
-- Migration 004: Intelligent Fitness Layer
-- Run this in Supabase SQL Editor
-- ============================================================

-- 1. Add body metrics to users table
ALTER TABLE users ADD COLUMN IF NOT EXISTS height_cm NUMERIC(5,1);
ALTER TABLE users ADD COLUMN IF NOT EXISTS weight_kg NUMERIC(5,1);
ALTER TABLE users ADD COLUMN IF NOT EXISTS goal VARCHAR(20); -- fat_loss | muscle_gain | maintenance

-- 2. Weight logs table (weekly tracking)
CREATE TABLE IF NOT EXISTS weight_logs (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  weight_kg   NUMERIC(5,1) NOT NULL,
  note        TEXT,
  logged_at   DATE NOT NULL DEFAULT CURRENT_DATE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(user_id, logged_at)
);

CREATE INDEX IF NOT EXISTS idx_weight_logs_user ON weight_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_weight_logs_date ON weight_logs(logged_at);
