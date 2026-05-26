-- Issue token (QR) + return reminder tracking for borrow workflow

ALTER TABLE tab_internal_request_withdrawal
    ADD COLUMN IF NOT EXISTS issue_token TEXT,
    ADD COLUMN IF NOT EXISTS issued_at TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS reminder_sent_at TIMESTAMPTZ;

CREATE UNIQUE INDEX IF NOT EXISTS idx_withdrawal_issue_token
    ON tab_internal_request_withdrawal (issue_token)
    WHERE issue_token IS NOT NULL AND deleted_at IS NULL;
