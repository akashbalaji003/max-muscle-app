-- Follow requests for private accounts
CREATE TABLE IF NOT EXISTS follow_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  requester_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  target_id    UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at   TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(requester_id, target_id),
  CHECK (requester_id <> target_id)
);
CREATE INDEX IF NOT EXISTS idx_follow_req_target    ON follow_requests(target_id);
CREATE INDEX IF NOT EXISTS idx_follow_req_requester ON follow_requests(requester_id);
