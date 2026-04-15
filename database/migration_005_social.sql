-- ============================================================
-- Migration 005: Social Platform Layer
-- Run this in your Supabase SQL Editor
-- ============================================================

-- ── Post Likes ────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS post_likes (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  post_id     UUID NOT NULL REFERENCES progress_photos(id) ON DELETE CASCADE,
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, post_id)
);

-- ── Post Comments ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS post_comments (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  post_id     UUID NOT NULL REFERENCES progress_photos(id) ON DELETE CASCADE,
  body        TEXT NOT NULL CHECK (char_length(body) > 0 AND char_length(body) <= 500),
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- ── User Follows ──────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS user_follows (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  follower_id   UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  following_id  UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(follower_id, following_id),
  CHECK (follower_id <> following_id)   -- can't follow yourself
);

-- ── Activity / Notifications ──────────────────────────────────
CREATE TABLE IF NOT EXISTS activity_feed (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  recipient_id  UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  actor_id      UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type          TEXT NOT NULL CHECK (type IN ('like','comment','follow','pr_highlight','streak')),
  post_id       UUID REFERENCES progress_photos(id) ON DELETE CASCADE,
  comment_id    UUID REFERENCES post_comments(id)   ON DELETE CASCADE,
  meta          JSONB,           -- extra data: comment body preview, streak count, etc.
  read          BOOLEAN DEFAULT FALSE,
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  -- de-duplicate: one like-notification per actor+post pair
  UNIQUE NULLS NOT DISTINCT (recipient_id, actor_id, type, post_id)
);

-- ── Indexes (performance) ─────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_post_likes_post       ON post_likes(post_id);
CREATE INDEX IF NOT EXISTS idx_post_likes_user       ON post_likes(user_id);
CREATE INDEX IF NOT EXISTS idx_post_comments_post    ON post_comments(post_id);
CREATE INDEX IF NOT EXISTS idx_post_comments_user    ON post_comments(user_id);
CREATE INDEX IF NOT EXISTS idx_user_follows_follower ON user_follows(follower_id);
CREATE INDEX IF NOT EXISTS idx_user_follows_following ON user_follows(following_id);
CREATE INDEX IF NOT EXISTS idx_activity_recipient    ON activity_feed(recipient_id, created_at DESC);

-- ── Optional: add avatar_url to users if missing ──────────────
-- (already present in original schema, but safe to re-add)
ALTER TABLE users ADD COLUMN IF NOT EXISTS avatar_url TEXT;
