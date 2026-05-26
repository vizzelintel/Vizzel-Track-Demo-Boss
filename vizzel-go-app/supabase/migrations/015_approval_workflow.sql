-- R4/R5: Generic approval engine + repair/withdrawal/transfer extensions

CREATE TABLE IF NOT EXISTS tab_approval_workflow (
    id BIGSERIAL PRIMARY KEY,
    code TEXT NOT NULL UNIQUE,
    name TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS tab_approval_workflow_step (
    id BIGSERIAL PRIMARY KEY,
    workflow_id BIGINT NOT NULL REFERENCES tab_approval_workflow(id) ON DELETE CASCADE,
    step_order INT NOT NULL,
    step_key TEXT NOT NULL,
    label_th TEXT NOT NULL,
    requires_branch TEXT,
    UNIQUE (workflow_id, step_order)
);

CREATE TABLE IF NOT EXISTS tab_approval_instance (
    id BIGSERIAL PRIMARY KEY,
    organization_id BIGINT NOT NULL REFERENCES tab_organization(id),
    workflow_code TEXT NOT NULL,
    ref_type TEXT NOT NULL,
    ref_id BIGINT NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending',
    current_step INT NOT NULL DEFAULT 1,
    branch TEXT,
    requested_by BIGINT REFERENCES tab_user(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_approval_instance_org_status
    ON tab_approval_instance (organization_id, status);

CREATE TABLE IF NOT EXISTS tab_approval_step_log (
    id BIGSERIAL PRIMARY KEY,
    instance_id BIGINT NOT NULL REFERENCES tab_approval_instance(id) ON DELETE CASCADE,
    step_order INT NOT NULL,
    step_key TEXT NOT NULL,
    actor_user_id BIGINT REFERENCES tab_user(id),
    action TEXT NOT NULL,
    branch TEXT,
    note TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE tab_asset_repair
    ADD COLUMN IF NOT EXISTS organization_id BIGINT REFERENCES tab_organization(id),
    ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'draft',
    ADD COLUMN IF NOT EXISTS approval_instance_id BIGINT REFERENCES tab_approval_instance(id),
    ADD COLUMN IF NOT EXISTS requested_by BIGINT REFERENCES tab_user(id),
    ADD COLUMN IF NOT EXISTS symptom TEXT,
    ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ;

UPDATE tab_asset_repair r
SET organization_id = a.organization_id,
    status = COALESCE(NULLIF(r.status, ''), 'pending')
FROM tab_asset a
WHERE r.asset_id = a.id AND r.organization_id IS NULL;

ALTER TABLE tab_internal_request_withdrawal
    ADD COLUMN IF NOT EXISTS asset_id BIGINT REFERENCES tab_asset(id),
    ADD COLUMN IF NOT EXISTS user_id BIGINT REFERENCES tab_user(id),
    ADD COLUMN IF NOT EXISTS withdrawal_type TEXT NOT NULL DEFAULT 'borrow',
    ADD COLUMN IF NOT EXISTS due_date DATE,
    ADD COLUMN IF NOT EXISTS returned_at TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS approval_instance_id BIGINT REFERENCES tab_approval_instance(id),
    ADD COLUMN IF NOT EXISTS note TEXT;

CREATE TABLE IF NOT EXISTS tab_asset_transfer (
    id BIGSERIAL PRIMARY KEY,
    organization_id BIGINT NOT NULL REFERENCES tab_organization(id),
    asset_id BIGINT NOT NULL REFERENCES tab_asset(id),
    component_id BIGINT REFERENCES tab_asset_component(id),
    transfer_type TEXT NOT NULL DEFAULT 'temporary',
    to_institute_id BIGINT,
    to_dept_id BIGINT,
    to_section_id BIGINT,
    to_user_id BIGINT REFERENCES tab_user(id),
    reason TEXT,
    status TEXT NOT NULL DEFAULT 'draft',
    approval_instance_id BIGINT REFERENCES tab_approval_instance(id),
    requested_by BIGINT REFERENCES tab_user(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ,
    deleted_at TIMESTAMPTZ
);

INSERT INTO tab_approval_workflow (code, name) VALUES
    ('repair', 'แจ้งซ่อมบำรุง'),
    ('withdrawal', 'เบิก-ยืม'),
    ('transfer', 'โอนย้ายครุภัณฑ์')
ON CONFLICT (code) DO NOTHING;

INSERT INTO tab_approval_workflow_step (workflow_id, step_order, step_key, label_th, requires_branch)
SELECT w.id, s.step_order, s.step_key, s.label_th, s.requires_branch
FROM tab_approval_workflow w
JOIN (VALUES
    ('repair', 1, 'section_head', 'หัวหน้างาน', NULL),
    ('repair', 2, 'director', 'ผู้อำนวยการ', NULL),
    ('repair', 3, 'chief_admin', 'เลขานุการ', 'B'),
    ('repair', 4, 'mayor', 'นายก/ปลัด', 'B'),
    ('withdrawal', 1, 'section_head', 'หัวหน้างาน', NULL),
    ('withdrawal', 2, 'director', 'ผู้อำนวยการ', NULL),
    ('withdrawal', 3, 'chief_admin', 'เลขานุการ', 'B'),
    ('withdrawal', 4, 'mayor', 'นายก/ปลัด', 'B'),
    ('transfer', 1, 'section_head', 'หัวหน้างาน', NULL),
    ('transfer', 2, 'director', 'ผู้อำนวยการ', NULL),
    ('transfer', 3, 'chief_admin', 'เลขานุการ', 'B'),
    ('transfer', 4, 'mayor', 'นายก/ปลัด', 'B')
) AS s(code, step_order, step_key, label_th, requires_branch) ON w.code = s.code
ON CONFLICT (workflow_id, step_order) DO NOTHING;
