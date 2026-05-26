-- Bulk disposal lots (ออกจำหน่าย) + approval workflow

CREATE TABLE IF NOT EXISTS tab_disposal_lot (
    id BIGSERIAL PRIMARY KEY,
    organization_id BIGINT NOT NULL REFERENCES tab_organization(id),
    lot TEXT NOT NULL,
    reason TEXT,
    disposal_date DATE,
    buyer TEXT,
    amount NUMERIC(18, 2),
    status TEXT NOT NULL DEFAULT 'draft',
    approval_instance_id BIGINT REFERENCES tab_approval_instance(id),
    requested_by BIGINT REFERENCES tab_user(id),
    asset_count INT NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ,
    deleted_at TIMESTAMPTZ,
    UNIQUE (lot, organization_id)
);

CREATE INDEX IF NOT EXISTS idx_disposal_lot_org_status
    ON tab_disposal_lot (organization_id, status)
    WHERE deleted_at IS NULL;

CREATE TABLE IF NOT EXISTS tab_disposal_lot_item (
    lot_id BIGINT NOT NULL REFERENCES tab_disposal_lot(id) ON DELETE CASCADE,
    asset_id BIGINT NOT NULL REFERENCES tab_asset(id),
    PRIMARY KEY (lot_id, asset_id)
);

CREATE INDEX IF NOT EXISTS idx_disposal_lot_item_asset
    ON tab_disposal_lot_item (asset_id);

CREATE TABLE IF NOT EXISTS tab_disposal_lot_doc (
    id BIGSERIAL PRIMARY KEY,
    lot_id BIGINT NOT NULL REFERENCES tab_disposal_lot(id) ON DELETE CASCADE,
    doc_path TEXT NOT NULL,
    doc_name TEXT,
    doc_type TEXT,
    filesize BIGINT,
    organization_id BIGINT REFERENCES tab_organization(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_by BIGINT REFERENCES tab_user(id)
);

INSERT INTO tab_approval_workflow (code, name) VALUES
    ('disposal', 'ออกจำหน่ายครุภัณฑ์')
ON CONFLICT (code) DO NOTHING;

INSERT INTO tab_approval_workflow_step (workflow_id, step_order, step_key, label_th, requires_branch)
SELECT w.id, s.step_order, s.step_key, s.label_th, s.requires_branch
FROM tab_approval_workflow w
JOIN (VALUES
    ('disposal', 1, 'section_head', 'หัวหน้างาน', NULL),
    ('disposal', 2, 'director', 'ผู้อำนวยการ', NULL),
    ('disposal', 3, 'chief_admin', 'เลขานุการ', 'B'),
    ('disposal', 4, 'mayor', 'นายก/ปลัด', 'B')
) AS s(code, step_order, step_key, label_th, requires_branch) ON w.code = s.code
ON CONFLICT (workflow_id, step_order) DO NOTHING;
