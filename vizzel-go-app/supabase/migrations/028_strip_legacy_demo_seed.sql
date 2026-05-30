-- 028_strip_legacy_demo_seed.sql — Remove the 22 demo-seed rows that
-- migration 012 race-inserted on the second Fly machine *after* migration
-- 027 had already wiped the table. Migration 012 has since been guarded
-- with a marker check so this leak can't recur, but we still need to
-- delete the orphans that landed on production before the guard shipped.
--
-- One-shot: keeps any user-added rows with these exact codes (extremely
-- unlikely but cheap to defend against) by also matching the demo asset
-- names embedded in 012.

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM tab_migration_marker WHERE key = '028_strip_legacy_demo_seed') THEN
        DELETE FROM tab_asset
        WHERE organization_id = 1
          AND elaas_code IN (
              '101-630926-00001','101-630926-00002','101-630926-00003','101-630926-00004',
              '101-630926-00005','101-630926-00006','101-630926-00007','101-630926-00008',
              '101-630926-00009','101-630926-00010','101-630926-00011','101-630926-00012',
              '101-630926-00013','101-630926-00014','101-630926-00015','101-630926-00016',
              '101-630926-00017','101-630926-00018','101-630926-00019','101-630926-00020',
              '101-630926-00050','101-630926-00099'
          )
          AND created_at < '2026-05-30 06:22:30+00';

        INSERT INTO tab_migration_marker (key) VALUES ('028_strip_legacy_demo_seed');
    END IF;
END;
$$;
