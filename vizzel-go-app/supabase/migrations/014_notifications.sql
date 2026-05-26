-- R3: In-app notifications + per-org outbound channels.
-- Persistent notifications for the bell UI, and outbound dispatch config
-- (LINE Messaging API, LINE Notify, generic webhook, Discord).

CREATE TABLE IF NOT EXISTS tab_notification (
  id BIGSERIAL PRIMARY KEY,
  organization_id BIGINT REFERENCES tab_organization(id),
  user_id BIGINT REFERENCES tab_user(id),
  event_type TEXT NOT NULL,
  title TEXT NOT NULL,
  body TEXT,
  link TEXT,
  ref_type TEXT,
  ref_id BIGINT,
  is_read BOOLEAN NOT NULL DEFAULT FALSE,
  read_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_tab_notification_user_created
  ON tab_notification(user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_tab_notification_user_unread
  ON tab_notification(user_id, created_at DESC) WHERE is_read = FALSE;

CREATE TABLE IF NOT EXISTS tab_notification_channel (
  id BIGSERIAL PRIMARY KEY,
  organization_id BIGINT NOT NULL REFERENCES tab_organization(id),
  channel_type TEXT NOT NULL,
  name TEXT NOT NULL,
  config_json JSONB NOT NULL DEFAULT '{}'::jsonb,
  events TEXT[] NOT NULL DEFAULT '{}',
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ,
  deleted_at TIMESTAMPTZ,
  created_by BIGINT
);

CREATE INDEX IF NOT EXISTS idx_tab_notification_channel_org
  ON tab_notification_channel(organization_id) WHERE deleted_at IS NULL;

-- R2 fixup: ensure the 410-00-2222 computer set + 3 components really exist.
-- Migration 013 also tries to seed this row, but only when an existing asset
-- shell is present. This block creates the asset shell first, then guarantees
-- the components.

INSERT INTO tab_asset (
  asset_number, elaas_code, asset_name, asset_value, organization_id,
  asset_status_id, is_check, is_depreciation, received_date, created_at, created_by
)
SELECT '410-00-2222', '101-630926-00050', 'ชุดคอมพิวเตอร์สำนักงาน', 35000, 1, 1,
       false, true, '2022-03-15', NOW(), 1
WHERE NOT EXISTS (
  SELECT 1 FROM tab_asset
  WHERE asset_number = '410-00-2222' AND organization_id = 1
);

INSERT INTO tab_asset_component (asset_id, component_name, rfid_num, position_no, created_at)
SELECT a.id, c.name, c.rfid, c.pos, NOW()
FROM tab_asset a
CROSS JOIN (VALUES
  ('เครื่องคอมพิวเตอร์', 'RFID-410-00-2222-CPU', 1),
  ('จอภาพ',               'RFID-410-00-2222-MON', 2),
  ('UPS',                  'RFID-410-00-2222-UPS', 3)
) AS c(name, rfid, pos)
WHERE a.asset_number = '410-00-2222'
  AND a.organization_id = 1
  AND a.deleted_at IS NULL
  AND NOT EXISTS (
    SELECT 1 FROM tab_asset_component x
    WHERE x.asset_id = a.id AND x.rfid_num = c.rfid AND x.deleted_at IS NULL
  );
