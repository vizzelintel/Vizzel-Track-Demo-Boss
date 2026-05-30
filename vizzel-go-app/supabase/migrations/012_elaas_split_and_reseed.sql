-- R1: Split asset code into elaas_code + asset_number, wire is_depreciation,
-- clear old DEMO-* placeholder assets, and reseed ~20 realistic gov assets.
-- Safe to re-run.

-- 1. Schema additions ---------------------------------------------------------
ALTER TABLE tab_asset ADD COLUMN IF NOT EXISTS elaas_code TEXT;

CREATE INDEX IF NOT EXISTS idx_tab_asset_elaas_code
    ON tab_asset(elaas_code) WHERE elaas_code IS NOT NULL;

-- 2. Soft delete old generic placeholders -------------------------------------
UPDATE tab_asset SET deleted_at = NOW()
WHERE deleted_at IS NULL
  AND organization_id = 1
  AND asset_number LIKE 'DEMO-%';

-- 3. Ensure LOVs --------------------------------------------------------------
INSERT INTO lov_get_by (id, name) VALUES
    (1, 'จัดซื้อ'), (2, 'บริจาค'), (3, 'โอนย้าย'), (4, 'จ้างทำ')
ON CONFLICT (id) DO NOTHING;

INSERT INTO lov_source_fund (id, name) VALUES
    (1, 'งบประมาณแผ่นดิน'),
    (2, 'รายได้ของหน่วยงาน'),
    (3, 'เงินบำรุง'),
    (4, 'เงินอุดหนุน')
ON CONFLICT (id) DO NOTHING;

-- 4. Ensure default asset status row ------------------------------------------
INSERT INTO tab_asset_status (id, status, organization_id, created_by)
SELECT 1, 'ใช้งาน', NULL, 1
WHERE NOT EXISTS (SELECT 1 FROM tab_asset_status WHERE id = 1);

-- 5. R1 demo taxonomy (high IDs to avoid conflict with synced demo data) ------
INSERT INTO tab_asset_category (id, organization_id, category_name, created_by) VALUES
    (9001, 1, 'ครุภัณฑ์คอมพิวเตอร์', 1),
    (9002, 1, 'ครุภัณฑ์สำนักงาน', 1),
    (9003, 1, 'ครุภัณฑ์ยานพาหนะและขนส่ง', 1),
    (9004, 1, 'ครุภัณฑ์ไฟฟ้าและวิทยุ', 1)
ON CONFLICT (id) DO NOTHING;

INSERT INTO tab_asset_type (id, category_id, type_name, created_by) VALUES
    (9101, 9001, 'คอมพิวเตอร์', 1),
    (9102, 9001, 'อุปกรณ์ต่อพ่วง', 1),
    (9103, 9002, 'เฟอร์นิเจอร์สำนักงาน', 1),
    (9104, 9003, 'ยานพาหนะ', 1),
    (9105, 9004, 'เครื่องปรับอากาศ', 1)
ON CONFLICT (id) DO NOTHING;

INSERT INTO tab_asset_class (id, asset_type_id, class_name, created_by) VALUES
    (9201, 9101, 'คอมพิวเตอร์ตั้งโต๊ะ', 1),
    (9202, 9101, 'คอมพิวเตอร์โน้ตบุ๊ก', 1),
    (9203, 9102, 'เครื่องพิมพ์เลเซอร์', 1),
    (9204, 9103, 'โต๊ะทำงาน', 1),
    (9205, 9103, 'เก้าอี้สำนักงาน', 1),
    (9206, 9103, 'ตู้เก็บเอกสาร', 1),
    (9207, 9104, 'รถยนต์นั่งส่วนกลาง', 1),
    (9208, 9104, 'รถจักรยานยนต์', 1),
    (9209, 9105, 'เครื่องปรับอากาศแบบติดผนัง', 1)
ON CONFLICT (id) DO NOTHING;

SELECT setval(pg_get_serial_sequence('tab_asset_category','id'),
              GREATEST((SELECT COALESCE(MAX(id),0) FROM tab_asset_category), 9100));
SELECT setval(pg_get_serial_sequence('tab_asset_type','id'),
              GREATEST((SELECT COALESCE(MAX(id),0) FROM tab_asset_type), 9200));
SELECT setval(pg_get_serial_sequence('tab_asset_class','id'),
              GREATEST((SELECT COALESCE(MAX(id),0) FROM tab_asset_class), 9300));

-- Bump the tab_asset sequence past any rows that 010_sync_demo_to_tab.sql
-- inserted with explicit IDs (the BIGSERIAL sequence was never advanced,
-- so a plain INSERT without an ID would otherwise reuse id=1).
SELECT setval(pg_get_serial_sequence('tab_asset','id'),
              GREATEST((SELECT COALESCE(MAX(id),0) FROM tab_asset), 1));
SELECT setval(pg_get_serial_sequence('tab_asset_address','id'),
              GREATEST((SELECT COALESCE(MAX(id),0) FROM tab_asset_address), 1));

-- 6. Seed ~20 realistic government assets — guarded so the seed only runs
-- on the very first deploy; once the production org is reseeded via the
-- ELAAS importer (migration 026 onwards) we MUST NOT re-emit the demo rows
-- on every container boot. Without the marker guard, deploys with multiple
-- machines could race-insert these demo rows AFTER migration 027 wiped the
-- table, leaving 22 stray demo assets cluttering the imported register.
--
-- The tab_migration_marker table is created by migration 026; if a server
-- is somehow still on the pre-026 schema we fall back to the legacy
-- WHERE NOT EXISTS guard so old environments stay seeded.
DO $$
BEGIN
    IF to_regclass('public.tab_migration_marker') IS NOT NULL THEN
        IF EXISTS (SELECT 1 FROM tab_migration_marker WHERE key = '026_clear_demo_data')
           OR EXISTS (SELECT 1 FROM tab_migration_marker WHERE key = '027_elaas_partial_wipe') THEN
            RAISE NOTICE '012 seed skipped: post-wipe marker present';
            RETURN;
        END IF;
    END IF;

    EXECUTE $insert$
INSERT INTO tab_asset (
    asset_number, elaas_code, asset_name, asset_details, asset_class_id, asset_value,
    organization_id, asset_status_id, is_check, is_depreciation,
    received_date, get_by_id, source_fund_id, available_age, created_by
)
SELECT v.asset_number, v.elaas_code, v.asset_name, v.asset_details, v.asset_class_id,
       v.asset_value, 1, 1, v.is_check, v.is_depreciation,
       v.received_date, v.get_by_id, v.source_fund_id, v.available_age, 1
FROM (VALUES
    ('001-43-0001', '101-630926-00001', 'คอมพิวเตอร์ตั้งโต๊ะ Dell OptiPlex 7090', 'CPU Intel i7 16GB 512GB SSD', 9201::bigint, 28000::bigint, true,  true,  '2022-03-15'::timestamptz, 1, 1, 5),
    ('001-43-0002', '101-630926-00002', 'คอมพิวเตอร์ตั้งโต๊ะ HP ProDesk 600 G6',  'CPU Intel i5 8GB 256GB SSD',  9201, 24000, true,  true,  '2022-03-15', 1, 1, 5),
    ('001-43-0003', '101-630926-00003', 'คอมพิวเตอร์โน้ตบุ๊ก Lenovo ThinkPad T14', 'จอ 14 นิ้ว i7 16GB',          9202, 42000, true,  true,  '2023-06-20', 1, 1, 5),
    ('001-43-0004', '101-630926-00004', 'คอมพิวเตอร์โน้ตบุ๊ก ASUS ExpertBook',     'จอ 14 นิ้ว i5 8GB',           9202, 32500, true,  true,  '2024-01-12', 1, 1, 5),
    ('001-43-0005', '101-630926-00005', 'เครื่องพิมพ์เลเซอร์ Brother HL-L2375DW',  'พิมพ์ขาวดำสองหน้าอัตโนมัติ',   9203, 6900,  true,  true,  '2024-04-04', 1, 1, 5),
    ('001-43-0006', '101-630926-00006', 'เครื่องพิมพ์เลเซอร์สี Canon LBP623Cdw',   'พิมพ์สีเลเซอร์',              9203, 14500, true,  true,  '2023-09-09', 1, 1, 5),
    ('002-58-0001', '101-630926-00007', 'โต๊ะทำงานเหล็ก ขนาด 5 ฟุต',              'โต๊ะทำงานเหล็กพ่นสี',         9204, 4800,  true,  true,  '2021-07-18', 1, 1, 8),
    ('002-58-0002', '101-630926-00008', 'โต๊ะประชุมไม้ 12 ที่นั่ง',                'โต๊ะประชุมไม้ทรงสี่เหลี่ยม',   9204, 18500, false, false, '2020-11-05', 2, 2, 10),
    ('002-58-0003', '101-630926-00009', 'เก้าอี้สำนักงาน Ergonomic',              'ปรับสูง-ต่ำได้ มีพนักพิงสูง',  9205, 5500,  true,  true,  '2023-02-22', 1, 1, 8),
    ('002-58-0004', '101-630926-00010', 'เก้าอี้ห้องประชุม บุนวม',                 'เก้าอี้บุนวมขาเหล็ก',         9205, 1800,  true,  true,  '2022-08-30', 1, 1, 8),
    ('002-58-0005', '101-630926-00011', 'ตู้เก็บเอกสารเหล็ก 4 ลิ้นชัก',            'ตู้เหล็กพร้อมกุญแจ',          9206, 6500,  true,  true,  '2021-05-14', 1, 1, 8),
    ('003-12-0001', '101-630926-00012', 'รถยนต์นั่งส่วนกลาง Toyota Camry Hybrid',  'เครื่องยนต์ 2.0L Hybrid',     9207, 1450000, true, true,  '2024-02-28', 1, 1, 10),
    ('003-12-0002', '101-630926-00013', 'รถจักรยานยนต์ Honda Wave 110i',           'รถจักรยานยนต์ใช้งานทั่วไป',   9208, 48500, true,  true,  '2023-10-10', 1, 1, 7),
    ('004-21-0001', '101-630926-00014', 'เครื่องปรับอากาศ Daikin 12000 BTU',       'แบบติดผนัง ระบบ Inverter',    9209, 21500, true,  true,  '2022-04-18', 1, 1, 7),
    ('004-21-0002', '101-630926-00015', 'เครื่องปรับอากาศ Mitsubishi 18000 BTU',   'แบบติดผนัง',                   9209, 28500, true,  true,  '2021-12-01', 1, 1, 7),
    ('004-21-0003', '101-630926-00016', 'เครื่องปรับอากาศ Panasonic 24000 BTU',    'แบบติดผนัง',                   9209, 36000, true,  true,  '2023-05-25', 1, 1, 7),
    ('001-43-0007', '101-630926-00017', 'คอมพิวเตอร์โน้ตบุ๊ก MacBook Pro M3',      'จอ 14 นิ้ว 16GB 512GB',       9202, 58900, true,  true,  '2024-08-15', 1, 1, 5),
    ('001-43-0008', '101-630926-00018', 'จอภาพ LG UltraFine 27 นิ้ว 4K',           'จอแสดงผลความละเอียดสูง',     9202, 12800, true,  true,  '2024-03-03', 1, 1, 5),
    ('002-58-0006', '101-630926-00019', 'ตู้เก็บเอกสาร 2 บานเลื่อนกระจก',          'ตู้กระจกบานเลื่อน',           9206, 8200,  true,  true,  '2022-12-12', 2, 2, 8),
    ('003-12-0003', '101-630926-00020', 'รถยนต์ตรวจการณ์ Ford Ranger',             'รถกระบะ 4 ประตู',             9207, 985000, true, true,  '2023-07-07', 1, 1, 10)
) AS v(asset_number, elaas_code, asset_name, asset_details, asset_class_id, asset_value,
       is_check, is_depreciation, received_date, get_by_id, source_fund_id, available_age)
WHERE NOT EXISTS (
    SELECT 1 FROM tab_asset t
    WHERE t.organization_id = 1
      AND t.asset_number = v.asset_number
      AND t.deleted_at IS NULL
);
$insert$;
END;
$$;

-- 7. Backfill elaas_code on rows that were re-seeded earlier without it -------
UPDATE tab_asset a SET elaas_code = m.elaas_code
FROM (VALUES
    ('001-43-0001', '101-630926-00001'), ('001-43-0002', '101-630926-00002'),
    ('001-43-0003', '101-630926-00003'), ('001-43-0004', '101-630926-00004'),
    ('001-43-0005', '101-630926-00005'), ('001-43-0006', '101-630926-00006'),
    ('002-58-0001', '101-630926-00007'), ('002-58-0002', '101-630926-00008'),
    ('002-58-0003', '101-630926-00009'), ('002-58-0004', '101-630926-00010'),
    ('002-58-0005', '101-630926-00011'), ('003-12-0001', '101-630926-00012'),
    ('003-12-0002', '101-630926-00013'), ('004-21-0001', '101-630926-00014'),
    ('004-21-0002', '101-630926-00015'), ('004-21-0003', '101-630926-00016'),
    ('001-43-0007', '101-630926-00017'), ('001-43-0008', '101-630926-00018'),
    ('002-58-0006', '101-630926-00019'), ('003-12-0003', '101-630926-00020')
) AS m(asset_number, elaas_code)
WHERE a.organization_id = 1
  AND a.asset_number = m.asset_number
  AND (a.elaas_code IS NULL OR a.elaas_code = '');

-- 8. Address rows (idempotent) ------------------------------------------------
INSERT INTO tab_asset_address (asset_id, building_name, room_name, created_by)
SELECT a.id, v.building, v.room, 1
FROM tab_asset a
JOIN (VALUES
    ('001-43-0001', 'อาคารสำนักงาน 1', 'ห้อง IT-101'),
    ('001-43-0002', 'อาคารสำนักงาน 1', 'ห้อง IT-101'),
    ('001-43-0003', 'อาคารสำนักงาน 1', 'ห้องผู้บริหาร'),
    ('001-43-0004', 'อาคารสำนักงาน 1', 'ห้องการเงิน'),
    ('001-43-0005', 'อาคารสำนักงาน 1', 'ห้องธุรการ'),
    ('001-43-0006', 'อาคารสำนักงาน 1', 'ห้องประชุม'),
    ('002-58-0001', 'อาคารสำนักงาน 1', 'ห้องธุรการ'),
    ('002-58-0002', 'อาคารสำนักงาน 1', 'ห้องประชุมใหญ่'),
    ('002-58-0003', 'อาคารสำนักงาน 1', 'ห้องการเงิน'),
    ('002-58-0004', 'อาคารสำนักงาน 1', 'ห้องประชุมใหญ่'),
    ('002-58-0005', 'อาคารสำนักงาน 1', 'ห้องเอกสาร'),
    ('003-12-0001', 'โรงจอดรถ', 'ช่อง A1'),
    ('003-12-0002', 'โรงจอดรถ', 'ช่อง B1'),
    ('004-21-0001', 'อาคารสำนักงาน 1', 'ห้องผู้บริหาร'),
    ('004-21-0002', 'อาคารสำนักงาน 1', 'ห้องประชุมใหญ่'),
    ('004-21-0003', 'อาคารสำนักงาน 1', 'ห้องการเงิน'),
    ('001-43-0007', 'อาคารสำนักงาน 1', 'ห้องผู้บริหาร'),
    ('001-43-0008', 'อาคารสำนักงาน 1', 'ห้อง IT-101'),
    ('002-58-0006', 'อาคารสำนักงาน 1', 'ห้องเอกสาร'),
    ('003-12-0003', 'โรงจอดรถ', 'ช่อง A2')
) AS v(asset_number, building, room)
    ON a.asset_number = v.asset_number AND a.organization_id = 1
WHERE NOT EXISTS (
    SELECT 1 FROM tab_asset_address ad
    WHERE ad.asset_id = a.id AND ad.deleted_at IS NULL
);
