-- ============================================================
-- Migration 003: Add joined_on and last_renewed_on to memberships
-- Run this in Supabase SQL Editor
-- ============================================================

-- joined_on: the original date the member first got a membership (never changes)
-- last_renewed_on: updated each time the membership is extended/renewed
ALTER TABLE memberships ADD COLUMN IF NOT EXISTS joined_on DATE;
ALTER TABLE memberships ADD COLUMN IF NOT EXISTS last_renewed_on DATE;

-- Backfill existing records: set joined_on = start_date
UPDATE memberships SET joined_on = start_date WHERE joined_on IS NULL;
