-- Finish: per-step delegates, target-side transfer approval, return RFID audit

CREATE TABLE IF NOT EXISTS tab_approval_delegate (
    id BIGSERIAL PRIMARY KEY,
    organization_id BIGINT NOT NULL REFERENCES tab_organization(id),
    step_key TEXT NOT NULL,
    user_id BIGINT NOT NULL REFERENCES tab_user(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (organization_id, step_key)
);

ALTER TABLE tab_approval_instance
    ADD COLUMN IF NOT EXISTS approval_side TEXT NOT NULL DEFAULT 'source';

ALTER TABLE tab_asset_transfer
    ADD COLUMN IF NOT EXISTS target_approval_instance_id BIGINT REFERENCES tab_approval_instance(id);

ALTER TABLE tab_internal_request_withdrawal
    ADD COLUMN IF NOT EXISTS return_scan_rfids TEXT,
    ADD COLUMN IF NOT EXISTS return_inspected_at TIMESTAMPTZ;

INSERT INTO tab_approval_workflow (code, name) VALUES
    ('transfer_receive', 'รับโอนข้ามหน่วยงาน')
ON CONFLICT (code) DO NOTHING;

INSERT INTO tab_approval_workflow_step (workflow_id, step_order, step_key, label_th, requires_branch)
SELECT w.id, s.step_order, s.step_key, s.label_th, s.requires_branch
FROM tab_approval_workflow w
JOIN (VALUES
    ('transfer_receive', 1, 'section_head', 'หัวหน้างาน (ปลายทาง)', NULL),
    ('transfer_receive', 2, 'director', 'ผู้อำนวยการ (ปลายทาง)', NULL)
) AS s(code, step_order, step_key, label_th, requires_branch) ON w.code = s.code
ON CONFLICT (workflow_id, step_order) DO NOTHING;

-- Demo delegates org 1: map first users by role if present
INSERT INTO tab_approval_delegate (organization_id, step_key, user_id)
SELECT 1, 'section_head', u.id
FROM tab_user_organization_role r
JOIN tab_user u ON u.id = r.user_id
WHERE r.organization_id = 1 AND r.role_id = 3 AND r.deleted_at IS NULL
ORDER BY u.id LIMIT 1
ON CONFLICT (organization_id, step_key) DO NOTHING;

INSERT INTO tab_approval_delegate (organization_id, step_key, user_id)
SELECT 1, 'director', u.id
FROM tab_user_organization_role r
JOIN tab_user u ON u.id = r.user_id
WHERE r.organization_id = 1 AND r.role_id = 2 AND r.deleted_at IS NULL
ORDER BY u.id LIMIT 1
ON CONFLICT (organization_id, step_key) DO NOTHING;

INSERT INTO tab_approval_delegate (organization_id, step_key, user_id)
SELECT 1, 'chief_admin', u.id
FROM tab_user_organization_role r
JOIN tab_user u ON u.id = r.user_id
WHERE r.organization_id = 1 AND r.role_id = 2 AND r.deleted_at IS NULL
ORDER BY u.id LIMIT 1
ON CONFLICT (organization_id, step_key) DO NOTHING;

INSERT INTO tab_approval_delegate (organization_id, step_key, user_id)
SELECT 1, 'mayor', u.id
FROM tab_user_organization_role r
JOIN tab_user u ON u.id = r.user_id
WHERE r.organization_id = 1 AND r.role_id = 2 AND r.deleted_at IS NULL
ORDER BY u.id LIMIT 1
ON CONFLICT (organization_id, step_key) DO NOTHING;
