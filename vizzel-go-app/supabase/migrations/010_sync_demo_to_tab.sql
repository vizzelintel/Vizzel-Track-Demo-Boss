-- One-time sync: demo tables -> tab_* (idempotent)

INSERT INTO tab_organization (id, name, created_at)
SELECT id, name, created_at FROM organizations
ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name;

INSERT INTO tab_user (id, username, email, password, name, created_at)
SELECT id,
       COALESCE(NULLIF(split_part(email, '@', 1), ''), 'user'),
       email,
       password_hash,
       display_name,
       created_at
FROM users
ON CONFLICT (id) DO NOTHING;

INSERT INTO tab_user_organization_role (user_id, organization_id, role_id, verify, status, created_at)
SELECT u.id, u.organization_id, COALESCE(u.role_id, 2)::INT,
       CASE WHEN COALESCE(u.role_id, 2) IN (1, 2) THEN 2 ELSE 1 END,
       TRUE, u.created_at
FROM users u
WHERE NOT EXISTS (
    SELECT 1 FROM tab_user_organization_role r
    WHERE r.user_id = u.id AND r.organization_id = u.organization_id
);

INSERT INTO tab_asset_status (id, status, organization_id, created_at, created_by)
SELECT 1, 'ใช้งาน', NULL, NOW(), 1
WHERE NOT EXISTS (SELECT 1 FROM tab_asset_status WHERE id = 1);
INSERT INTO tab_asset_status (id, status, organization_id, created_at, created_by)
SELECT 2, 'ซ่อมบำรุง', NULL, NOW(), 1
WHERE NOT EXISTS (SELECT 1 FROM tab_asset_status WHERE id = 2);
INSERT INTO tab_asset_status (id, status, organization_id, created_at, created_by)
SELECT 3, 'จำหน่ายแล้ว', NULL, NOW(), 1
WHERE NOT EXISTS (SELECT 1 FROM tab_asset_status WHERE id = 3);

INSERT INTO tab_asset_category (id, organization_id, category_name, created_at, created_by)
SELECT id, organization_id, name, created_at, 1 FROM asset_categories
ON CONFLICT (id) DO NOTHING;

INSERT INTO tab_asset_type (id, category_id, type_name, created_at, created_by)
SELECT t.id, t.category_id, t.name, t.created_at, 1 FROM asset_types t
ON CONFLICT (id) DO NOTHING;

INSERT INTO tab_asset_class (id, asset_type_id, class_name, created_at, created_by)
SELECT c.id,
       COALESCE(c.type_id, (SELECT t.id FROM tab_asset_type t WHERE t.category_id = c.category_id LIMIT 1)),
       c.name,
       c.created_at,
       1
FROM asset_classes c
ON CONFLICT (id) DO NOTHING;

INSERT INTO tab_building (id, organization_id, building_name, created_at)
SELECT id, organization_id, name, created_at FROM buildings
ON CONFLICT (id) DO NOTHING;

INSERT INTO tab_room (id, building_id, room_number, room_name, created_at)
SELECT id, building_id, room_number, name, created_at FROM rooms
ON CONFLICT (id) DO NOTHING;

INSERT INTO tab_dept (id, organization_id, dept_name, created_at)
SELECT id, organization_id, name, created_at FROM departments
ON CONFLICT (id) DO NOTHING;

INSERT INTO tab_asset (id, asset_number, rfid_num, asset_name, asset_class_id, asset_value, organization_id,
    asset_status_id, received_date, created_at, deleted_at, created_by)
SELECT a.id,
       a.asset_number,
       NULLIF(a.rfid_num, ''),
       a.asset_name,
       NULLIF(a.class_id, 0),
       a.asset_value,
       a.organization_id,
       CASE a.asset_status_name
           WHEN 'ซ่อมบำรุง' THEN 2
           WHEN 'จำหน่ายแล้ว' THEN 3
           ELSE 1
       END,
       a.created_at,
       a.created_at,
       CASE WHEN a.status = 'deleted' THEN NOW() ELSE NULL END,
       1
FROM assets a
WHERE NOT EXISTS (SELECT 1 FROM tab_asset t WHERE t.id = a.id);

INSERT INTO tab_asset_address (asset_id, building_name, room_name, created_at, created_by)
SELECT a.id, NULLIF(a.building_name, ''), NULLIF(a.room_name, ''), a.created_at, 1
FROM assets a
WHERE (a.building_name != '' OR a.room_name != '')
  AND NOT EXISTS (SELECT 1 FROM tab_asset_address ad WHERE ad.asset_id = a.id);

INSERT INTO tab_asset_owner (asset_id, owner_name, created_at, created_by)
SELECT a.id, NULLIF(a.owner_name, ''), a.created_at, 1
FROM assets a
WHERE a.owner_name != ''
  AND NOT EXISTS (SELECT 1 FROM tab_asset_owner o WHERE o.asset_id = a.id);

INSERT INTO tab_check_job (id, organization_id, job_name, status, progress, created_at)
SELECT id, organization_id, title, status, progress, created_at FROM audit_jobs
ON CONFLICT (id) DO NOTHING;

INSERT INTO tab_asset_repair (id, asset_id, note, created_at)
SELECT r.id,
       (SELECT a.id FROM tab_asset a WHERE a.asset_number = r.asset_number AND a.organization_id = r.organization_id LIMIT 1),
       r.note,
       r.created_at
FROM repairs r
ON CONFLICT (id) DO NOTHING;

INSERT INTO tab_internal_request_withdrawal (id, organization_id, requester_name, item_name, status, created_at)
SELECT id, organization_id, requester, item_name, status, created_at FROM withdrawals
ON CONFLICT (id) DO NOTHING;
