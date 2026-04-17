-- Add custom_plan JSONB column to users table
-- Stores admin-assigned workout plans with full exercise/sets/reps detail
ALTER TABLE users ADD COLUMN IF NOT EXISTS custom_plan JSONB DEFAULT NULL;
