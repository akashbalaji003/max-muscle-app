-- ============================================================
-- Migration 002: Add banned column to users
-- Run this in Supabase SQL Editor
-- ============================================================

ALTER TABLE users ADD COLUMN IF NOT EXISTS banned BOOLEAN NOT NULL DEFAULT FALSE;
