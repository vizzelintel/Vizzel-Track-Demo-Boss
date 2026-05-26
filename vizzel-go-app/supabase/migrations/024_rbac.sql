-- 024_rbac.sql — RBAC permissions per role (granular view/edit/delete per resource).
-- Admin (role_id = 1) is locked and ALWAYS granted every permission via fallback in code.
-- Roles can be created freely; permissions toggled per role.

CREATE TABLE IF NOT EXISTS tab_role (
    id           BIGSERIAL PRIMARY KEY,
    name         TEXT NOT NULL,
    description  TEXT NOT NULL DEFAULT '',
    is_system    BOOLEAN NOT NULL DEFAULT FALSE,
    is_locked    BOOLEAN NOT NULL DEFAULT FALSE,
    created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at   TIMESTAMPTZ
);

-- Resources you can grant permissions against.
CREATE TABLE IF NOT EXISTS lov_resource (
    id           BIGSERIAL PRIMARY KEY,
    code         TEXT NOT NULL UNIQUE,
    label        TEXT NOT NULL,
    sort_order   INT NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS tab_role_permission (
    id           BIGSERIAL PRIMARY KEY,
    role_id      BIGINT NOT NULL REFERENCES tab_role(id) ON DELETE CASCADE,
    resource     TEXT NOT NULL,
    can_view     BOOLEAN NOT NULL DEFAULT FALSE,
    can_edit     BOOLEAN NOT NULL DEFAULT FALSE,
    can_delete   BOOLEAN NOT NULL DEFAULT FALSE,
    UNIQUE (role_id, resource)
);

-- Seed the four built-in roles. Admin (id=1) is locked.
INSERT INTO tab_role (id, name, description, is_system, is_locked) VALUES
    (1, 'Super Admin', 'ผู้ดูแลระบบสูงสุด (ล็อก ทำได้ทุกอย่าง)', TRUE, TRUE),
    (2, 'Admin Organization', 'ผู้ดูแลองค์กร', TRUE, FALSE),
    (3, 'Officer', 'เจ้าหน้าที่', TRUE, FALSE),
    (4, 'Member', 'สมาชิก', TRUE, FALSE)
ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name,
    description = EXCLUDED.description,
    is_system = EXCLUDED.is_system,
    is_locked = EXCLUDED.is_locked;

SELECT setval(pg_get_serial_sequence('tab_role','id'), GREATEST((SELECT COALESCE(MAX(id),1) FROM tab_role), 4));

INSERT INTO lov_resource (code, label, sort_order) VALUES
    ('assets',        'สินทรัพย์/ครุภัณฑ์',         10),
    ('users',         'ผู้ใช้งาน',                  20),
    ('organization',  'องค์กร / โครงสร้าง',         30),
    ('audit',         'ตรวจนับสินทรัพย์',           40),
    ('withdrawal',    'เบิก-ยืม',                   50),
    ('transfer',      'โอนย้าย',                    60),
    ('repair',        'แจ้งซ่อม',                   70),
    ('sales',         'จำหน่าย',                    80),
    ('reports',       'รายงาน',                     90),
    ('settings',      'ตั้งค่าระบบ',               100),
    ('super_admin',   'Super Admin',               110)
ON CONFLICT (code) DO NOTHING;

-- Default permission grants per built-in role.
-- Admin Org (role 2): full on everything except super_admin
INSERT INTO tab_role_permission (role_id, resource, can_view, can_edit, can_delete)
SELECT 2, code, TRUE, TRUE, TRUE FROM lov_resource WHERE code <> 'super_admin'
ON CONFLICT (role_id, resource) DO NOTHING;

INSERT INTO tab_role_permission (role_id, resource, can_view, can_edit, can_delete) VALUES
    (3, 'assets',       TRUE, TRUE,  FALSE),
    (3, 'audit',        TRUE, TRUE,  FALSE),
    (3, 'withdrawal',   TRUE, TRUE,  FALSE),
    (3, 'transfer',     TRUE, TRUE,  FALSE),
    (3, 'repair',       TRUE, TRUE,  FALSE),
    (3, 'sales',        TRUE, TRUE,  FALSE),
    (3, 'reports',      TRUE, FALSE, FALSE),
    (3, 'organization', TRUE, FALSE, FALSE),
    (3, 'users',        TRUE, FALSE, FALSE),
    (3, 'settings',     TRUE, FALSE, FALSE)
ON CONFLICT (role_id, resource) DO NOTHING;

INSERT INTO tab_role_permission (role_id, resource, can_view, can_edit, can_delete) VALUES
    (4, 'assets',     TRUE, FALSE, FALSE),
    (4, 'audit',      TRUE, FALSE, FALSE),
    (4, 'withdrawal', TRUE, TRUE,  FALSE),
    (4, 'reports',    TRUE, FALSE, FALSE)
ON CONFLICT (role_id, resource) DO NOTHING;

CREATE INDEX IF NOT EXISTS idx_role_permission_role ON tab_role_permission(role_id);
CREATE INDEX IF NOT EXISTS idx_role_permission_resource ON tab_role_permission(resource);
