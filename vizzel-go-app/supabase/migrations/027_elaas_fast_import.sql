-- 027_elaas_fast_import.sql — Prerequisites for the bulk ELAAS xlsx importer.
--
-- 1. Bump the LOV BIGSERIAL sequences past the rows that earlier migrations
--    INSERT'd with explicit ids. Without this, an auto-generated id collides
--    with id=1..4 the moment EnsureLovGetBy/EnsureLovSourceFund try to create
--    a previously-unseen ELAAS label such as "ซื้อ/จ้าง" or "เงินงบประมาณ".
-- 2. Add UNIQUE (name) so the ensure helpers can ON CONFLICT DO UPDATE and
--    return the existing id (idempotent, race-safe).
-- 3. Seed the canonical "ปกติ" status that the importer maps "ใช้งาน" to.
-- 4. Wipe any partial ELAAS rows from an earlier failed import attempt
--    (asset_number patterns "001-43-…" etc.) so the next bulk insert starts
--    from a clean slate. Guarded behind a one-shot marker so manual data
--    survives subsequent restarts.

-- 1 / 2 ----------------------------------------------------------------------
SELECT setval(pg_get_serial_sequence('lov_get_by', 'id'),
              GREATEST((SELECT COALESCE(MAX(id),0) FROM lov_get_by), 0));
SELECT setval(pg_get_serial_sequence('lov_source_fund', 'id'),
              GREATEST((SELECT COALESCE(MAX(id),0) FROM lov_source_fund), 0));

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'lov_get_by_name_uq'
    ) THEN
        ALTER TABLE lov_get_by ADD CONSTRAINT lov_get_by_name_uq UNIQUE (name);
    END IF;
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'lov_source_fund_name_uq'
    ) THEN
        ALTER TABLE lov_source_fund ADD CONSTRAINT lov_source_fund_name_uq UNIQUE (name);
    END IF;
END;
$$;

-- 3 -------------------------------------------------------------------------
INSERT INTO tab_asset_status (status, is_locked, organization_id, created_by)
SELECT 'ปกติ', FALSE, NULL, 1
WHERE NOT EXISTS (
    SELECT 1 FROM tab_asset_status
    WHERE status = 'ปกติ' AND deleted_at IS NULL
);

-- 4 -------------------------------------------------------------------------
-- One-shot cleanup of partial imports from the legacy slow per-row path so we
-- don't end up with two "ที่ดินที่มีโฉนด" rows after the bulk importer runs.
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM tab_migration_marker WHERE key = '027_elaas_partial_wipe') THEN
        EXECUTE 'TRUNCATE TABLE tab_asset_component RESTART IDENTITY CASCADE';
        EXECUTE 'TRUNCATE TABLE tab_asset_owner RESTART IDENTITY CASCADE';
        EXECUTE 'TRUNCATE TABLE tab_asset_address RESTART IDENTITY CASCADE';
        EXECUTE 'TRUNCATE TABLE tab_asset RESTART IDENTITY CASCADE';
        EXECUTE 'TRUNCATE TABLE tab_asset_class RESTART IDENTITY CASCADE';
        EXECUTE 'TRUNCATE TABLE tab_asset_type RESTART IDENTITY CASCADE';
        EXECUTE 'TRUNCATE TABLE tab_asset_category RESTART IDENTITY CASCADE';
        INSERT INTO tab_migration_marker (key) VALUES ('027_elaas_partial_wipe');
    END IF;
END;
$$;
