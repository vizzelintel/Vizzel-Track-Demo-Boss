-- 026_clear_demo_data.sql — Wipe all demo transactional + master data so the
-- production org can be re-seeded via the ELAAS Excel importer.
--
-- Preserved:
--   • tab_user           — admin@demo.local + superadmin@demo.local only
--   • tab_organization   — id=1 only (any extra demo orgs go away)
--   • tab_role / lov_resource / tab_role_permission (RBAC seed from 024)
--   • lov_get_by / lov_source_fund (ELAAS lookup, from 007)
--   • tab_approval_workflow / tab_approval_workflow_step (from 015/023)
--
-- IDEMPOTENT: a marker row in tab_migration_marker guarantees this only runs
-- once. Without it, every server restart would re-wipe newly imported data.

CREATE TABLE IF NOT EXISTS tab_migration_marker (
    key TEXT PRIMARY KEY,
    applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM tab_migration_marker WHERE key = '026_clear_demo_data') THEN
        RAISE NOTICE '026_clear_demo_data already applied, skipping';
        RETURN;
    END IF;

    -- -------- Approvals / notifications -----------------------------------
    EXECUTE 'TRUNCATE TABLE tab_approval_step_log RESTART IDENTITY CASCADE';
    EXECUTE 'TRUNCATE TABLE tab_approval_instance RESTART IDENTITY CASCADE';
    EXECUTE 'TRUNCATE TABLE tab_notification RESTART IDENTITY CASCADE';
    EXECUTE 'TRUNCATE TABLE tab_notification_channel RESTART IDENTITY CASCADE';

    -- -------- Disposal ----------------------------------------------------
    EXECUTE 'TRUNCATE TABLE tab_disposal_lot_doc RESTART IDENTITY CASCADE';
    EXECUTE 'TRUNCATE TABLE tab_disposal_lot_item RESTART IDENTITY CASCADE';
    EXECUTE 'TRUNCATE TABLE tab_disposal_lot RESTART IDENTITY CASCADE';

    -- -------- Transfers / withdrawals / repairs ---------------------------
    EXECUTE 'TRUNCATE TABLE tab_asset_transfer RESTART IDENTITY CASCADE';
    EXECUTE 'TRUNCATE TABLE tab_internal_request_withdrawal RESTART IDENTITY CASCADE';
    EXECUTE 'TRUNCATE TABLE tab_asset_repair RESTART IDENTITY CASCADE';

    -- -------- Audit jobs --------------------------------------------------
    EXECUTE 'TRUNCATE TABLE tab_check_job RESTART IDENTITY CASCADE';

    -- -------- Asset children ---------------------------------------------
    EXECUTE 'TRUNCATE TABLE tab_asset_component RESTART IDENTITY CASCADE';
    EXECUTE 'TRUNCATE TABLE tab_asset_doc RESTART IDENTITY CASCADE';
    EXECUTE 'TRUNCATE TABLE tab_asset_image RESTART IDENTITY CASCADE';
    EXECUTE 'TRUNCATE TABLE tab_asset_owner RESTART IDENTITY CASCADE';
    EXECUTE 'TRUNCATE TABLE tab_asset_address RESTART IDENTITY CASCADE';

    -- -------- Assets + taxonomy (re-seeded via ELAAS importer) ------------
    EXECUTE 'TRUNCATE TABLE tab_asset RESTART IDENTITY CASCADE';
    EXECUTE 'TRUNCATE TABLE tab_asset_class RESTART IDENTITY CASCADE';
    EXECUTE 'TRUNCATE TABLE tab_asset_type RESTART IDENTITY CASCADE';
    EXECUTE 'TRUNCATE TABLE tab_asset_category RESTART IDENTITY CASCADE';
    EXECUTE 'TRUNCATE TABLE tab_asset_status RESTART IDENTITY CASCADE';

    INSERT INTO tab_asset_status (id, status, is_locked, organization_id, created_by) VALUES
        (1, 'ใช้งาน',       TRUE, NULL, 1),
        (2, 'ซ่อมบำรุง',    TRUE, NULL, 1),
        (3, 'จำหน่ายแล้ว',  TRUE, NULL, 1)
    ON CONFLICT (id) DO NOTHING;
    PERFORM setval(pg_get_serial_sequence('tab_asset_status','id'),
                   GREATEST((SELECT COALESCE(MAX(id),3) FROM tab_asset_status), 3));

    -- -------- Org structure ----------------------------------------------
    EXECUTE 'TRUNCATE TABLE tab_section RESTART IDENTITY CASCADE';
    EXECUTE 'TRUNCATE TABLE tab_dept RESTART IDENTITY CASCADE';
    EXECUTE 'TRUNCATE TABLE tab_institute RESTART IDENTITY CASCADE';
    EXECUTE 'TRUNCATE TABLE tab_position RESTART IDENTITY CASCADE';

    -- -------- Locations --------------------------------------------------
    EXECUTE 'TRUNCATE TABLE tab_room RESTART IDENTITY CASCADE';
    EXECUTE 'TRUNCATE TABLE tab_building RESTART IDENTITY CASCADE';

    -- -------- Legacy demo mirror tables ----------------------------------
    IF to_regclass('public.assets') IS NOT NULL THEN
        EXECUTE 'TRUNCATE TABLE assets RESTART IDENTITY CASCADE';
    END IF;
    IF to_regclass('public.asset_classes') IS NOT NULL THEN
        EXECUTE 'TRUNCATE TABLE asset_classes RESTART IDENTITY CASCADE';
    END IF;
    IF to_regclass('public.asset_types') IS NOT NULL THEN
        EXECUTE 'TRUNCATE TABLE asset_types RESTART IDENTITY CASCADE';
    END IF;
    IF to_regclass('public.asset_categories') IS NOT NULL THEN
        EXECUTE 'TRUNCATE TABLE asset_categories RESTART IDENTITY CASCADE';
    END IF;
    IF to_regclass('public.buildings') IS NOT NULL THEN
        EXECUTE 'TRUNCATE TABLE buildings RESTART IDENTITY CASCADE';
    END IF;
    IF to_regclass('public.rooms') IS NOT NULL THEN
        EXECUTE 'TRUNCATE TABLE rooms RESTART IDENTITY CASCADE';
    END IF;
    IF to_regclass('public.departments') IS NOT NULL THEN
        EXECUTE 'TRUNCATE TABLE departments RESTART IDENTITY CASCADE';
    END IF;
    IF to_regclass('public.institutes') IS NOT NULL THEN
        EXECUTE 'TRUNCATE TABLE institutes RESTART IDENTITY CASCADE';
    END IF;
    IF to_regclass('public.sections') IS NOT NULL THEN
        EXECUTE 'TRUNCATE TABLE sections RESTART IDENTITY CASCADE';
    END IF;
    IF to_regclass('public.positions') IS NOT NULL THEN
        EXECUTE 'TRUNCATE TABLE positions RESTART IDENTITY CASCADE';
    END IF;
    IF to_regclass('public.audit_jobs') IS NOT NULL THEN
        EXECUTE 'TRUNCATE TABLE audit_jobs RESTART IDENTITY CASCADE';
    END IF;
    IF to_regclass('public.repairs') IS NOT NULL THEN
        EXECUTE 'TRUNCATE TABLE repairs RESTART IDENTITY CASCADE';
    END IF;
    IF to_regclass('public.withdrawals') IS NOT NULL THEN
        EXECUTE 'TRUNCATE TABLE withdrawals RESTART IDENTITY CASCADE';
    END IF;
    IF to_regclass('public.sales') IS NOT NULL THEN
        EXECUTE 'TRUNCATE TABLE sales RESTART IDENTITY CASCADE';
    END IF;
    IF to_regclass('public.warranties') IS NOT NULL THEN
        EXECUTE 'TRUNCATE TABLE warranties RESTART IDENTITY CASCADE';
    END IF;
    IF to_regclass('public.import_log') IS NOT NULL THEN
        EXECUTE 'TRUNCATE TABLE import_log RESTART IDENTITY CASCADE';
    END IF;

    -- -------- Users & org access -----------------------------------------
    DELETE FROM tab_user_organization_role
    WHERE user_id NOT IN (
        SELECT id FROM tab_user
        WHERE email IN ('admin@demo.local', 'superadmin@demo.local')
    );

    DELETE FROM tab_user
    WHERE email NOT IN ('admin@demo.local', 'superadmin@demo.local');

    IF to_regclass('public.users') IS NOT NULL THEN
        EXECUTE $sql$
            DELETE FROM users
            WHERE email NOT IN ('admin@demo.local', 'superadmin@demo.local')
        $sql$;
    END IF;
    IF to_regclass('public.org_access') IS NOT NULL THEN
        EXECUTE 'TRUNCATE TABLE org_access RESTART IDENTITY CASCADE';
    END IF;
    IF to_regclass('public.refresh_tokens') IS NOT NULL THEN
        EXECUTE 'TRUNCATE TABLE refresh_tokens RESTART IDENTITY CASCADE';
    END IF;

    -- -------- Organizations: keep only id=1 ------------------------------
    DELETE FROM tab_organization_menu WHERE organization_id <> 1;
    DELETE FROM tab_organization WHERE id <> 1;

    IF to_regclass('public.organization_menus') IS NOT NULL THEN
        EXECUTE 'DELETE FROM organization_menus WHERE organization_id <> 1';
    END IF;
    IF to_regclass('public.organizations') IS NOT NULL THEN
        EXECUTE 'DELETE FROM organizations WHERE id <> 1';
    END IF;

    -- Re-link the surviving demo users to org 1
    INSERT INTO tab_user_organization_role (user_id, organization_id, role_id, verify, status)
    SELECT u.id, 1,
           CASE u.email WHEN 'superadmin@demo.local' THEN 1 ELSE 2 END,
           2, TRUE
    FROM tab_user u
    WHERE u.email IN ('admin@demo.local', 'superadmin@demo.local')
      AND NOT EXISTS (
          SELECT 1 FROM tab_user_organization_role r
          WHERE r.user_id = u.id AND r.organization_id = 1
      );

    INSERT INTO tab_migration_marker (key) VALUES ('026_clear_demo_data');
END;
$$;
