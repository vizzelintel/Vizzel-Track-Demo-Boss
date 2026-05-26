-- R2: Asset components (physical pieces) — each row carries its own RFID and
-- belongs to a parent tab_asset row. Backfills existing assets so the change
-- is non-destructive for the demo dataset.

CREATE TABLE IF NOT EXISTS tab_asset_component (
  id BIGSERIAL PRIMARY KEY,
  asset_id BIGINT NOT NULL REFERENCES tab_asset(id) ON DELETE CASCADE,
  component_name TEXT NOT NULL,
  rfid_num TEXT,
  serial_no TEXT,
  position_no INT NOT NULL DEFAULT 1,
  note TEXT,
  current_status TEXT NOT NULL DEFAULT 'active',
  current_owner_user_id BIGINT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ,
  deleted_at TIMESTAMPTZ,
  created_by BIGINT NOT NULL DEFAULT 1
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_tab_asset_component_rfid
  ON tab_asset_component(rfid_num)
  WHERE rfid_num IS NOT NULL AND rfid_num <> '' AND deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_tab_asset_component_asset
  ON tab_asset_component(asset_id) WHERE deleted_at IS NULL;

INSERT INTO tab_asset_component (asset_id, component_name, rfid_num, position_no, created_at)
SELECT a.id, COALESCE(NULLIF(a.asset_name,''), 'ชิ้นหลัก'), a.rfid_num, 1, NOW()
FROM tab_asset a
WHERE a.deleted_at IS NULL
  AND a.rfid_num IS NOT NULL AND a.rfid_num <> ''
  AND NOT EXISTS (SELECT 1 FROM tab_asset_component c WHERE c.asset_id = a.id AND c.deleted_at IS NULL);

DELETE FROM tab_asset_component
WHERE asset_id IN (SELECT id FROM tab_asset WHERE asset_number = '410-00-2222' AND organization_id = 1)
  AND (rfid_num IS NULL OR rfid_num NOT LIKE 'RFID-410-00-2222-%');

INSERT INTO tab_asset_component (asset_id, component_name, rfid_num, position_no, created_at)
SELECT a.id, c.name, c.rfid, c.pos, NOW()
FROM tab_asset a
CROSS JOIN (VALUES
  ('เครื่องคอมพิวเตอร์', 'RFID-410-00-2222-CPU', 1),
  ('จอภาพ',               'RFID-410-00-2222-MON', 2),
  ('UPS',                  'RFID-410-00-2222-UPS', 3)
) AS c(name, rfid, pos)
WHERE a.asset_number = '410-00-2222' AND a.organization_id = 1 AND a.deleted_at IS NULL
  AND NOT EXISTS (
    SELECT 1 FROM tab_asset_component x
    WHERE x.asset_id = a.id AND x.rfid_num = c.rfid AND x.deleted_at IS NULL
  );

INSERT INTO tab_asset (asset_number, elaas_code, asset_name, asset_value, organization_id, asset_status_id, is_check, is_depreciation, received_date, created_at, created_by)
SELECT '510-00-3333', '101-630926-00099', 'เต้นสนามขนาดใหญ่ 6x6 ม.', 28000, 1, 1, false, true, '2023-05-12', NOW(), 1
WHERE NOT EXISTS (SELECT 1 FROM tab_asset WHERE asset_number = '510-00-3333' AND organization_id = 1);

INSERT INTO tab_asset_component (asset_id, component_name, rfid_num, position_no, created_at)
SELECT a.id, c.name, c.rfid, c.pos, NOW()
FROM tab_asset a
CROSS JOIN (VALUES
  ('หลังคาเต้น',  'RFID-510-00-3333-01', 1),
  ('เสาเต้น A',    'RFID-510-00-3333-02', 2),
  ('เสาเต้น B',    'RFID-510-00-3333-03', 3),
  ('เสาเต้น C',    'RFID-510-00-3333-04', 4),
  ('เสาเต้น D',    'RFID-510-00-3333-05', 5),
  ('ถุงเก็บ',      'RFID-510-00-3333-06', 6)
) AS c(name, rfid, pos)
WHERE a.asset_number = '510-00-3333' AND a.organization_id = 1 AND a.deleted_at IS NULL
  AND NOT EXISTS (
    SELECT 1 FROM tab_asset_component x
    WHERE x.asset_id = a.id AND x.rfid_num = c.rfid AND x.deleted_at IS NULL
  );
