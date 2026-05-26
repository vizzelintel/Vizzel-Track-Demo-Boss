-- Per-instance step assignees: requester picks approver per step at submit time.
-- Org-level tab_approval_delegate remains default pre-fill only.

CREATE TABLE IF NOT EXISTS tab_approval_instance_step (
  id BIGSERIAL PRIMARY KEY,
  instance_id BIGINT NOT NULL REFERENCES tab_approval_instance(id) ON DELETE CASCADE,
  step_key TEXT NOT NULL,
  assigned_user_id BIGINT NOT NULL REFERENCES tab_user(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (instance_id, step_key)
);

CREATE INDEX IF NOT EXISTS idx_approval_instance_step_instance
  ON tab_approval_instance_step (instance_id);

CREATE INDEX IF NOT EXISTS idx_approval_instance_step_user
  ON tab_approval_instance_step (assigned_user_id);
