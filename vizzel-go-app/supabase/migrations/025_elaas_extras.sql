-- 025_elaas_extras.sql — extra columns to capture full ELAAS report data.
-- Adds optional fields used by the ELAAS xlsx parser for อบต. reports.

ALTER TABLE IF EXISTS assets ADD COLUMN IF NOT EXISTS asset_details         TEXT;
ALTER TABLE IF EXISTS assets ADD COLUMN IF NOT EXISTS received_date         DATE;
ALTER TABLE IF EXISTS assets ADD COLUMN IF NOT EXISTS warranty_start        DATE;
ALTER TABLE IF EXISTS assets ADD COLUMN IF NOT EXISTS warranty_end          DATE;
ALTER TABLE IF EXISTS assets ADD COLUMN IF NOT EXISTS accumulated_depr      NUMERIC(18,2) DEFAULT 0;
ALTER TABLE IF EXISTS assets ADD COLUMN IF NOT EXISTS net_book_value        NUMERIC(18,2) DEFAULT 0;
ALTER TABLE IF EXISTS assets ADD COLUMN IF NOT EXISTS available_age         INT;
ALTER TABLE IF EXISTS assets ADD COLUMN IF NOT EXISTS condition_name        TEXT;
ALTER TABLE IF EXISTS assets ADD COLUMN IF NOT EXISTS responsible_dept      TEXT;
ALTER TABLE IF EXISTS assets ADD COLUMN IF NOT EXISTS get_by_label          TEXT;
ALTER TABLE IF EXISTS assets ADD COLUMN IF NOT EXISTS source_fund_label     TEXT;
ALTER TABLE IF EXISTS assets ADD COLUMN IF NOT EXISTS source_fund_breakdown JSONB;

CREATE TABLE IF NOT EXISTS import_log (
    id              BIGSERIAL PRIMARY KEY,
    organization_id BIGINT NOT NULL,
    kind            TEXT NOT NULL,
    filename        TEXT,
    total_rows      INT NOT NULL DEFAULT 0,
    imported        INT NOT NULL DEFAULT 0,
    failed          INT NOT NULL DEFAULT 0,
    skipped         INT NOT NULL DEFAULT 0,
    note            TEXT,
    created_by      BIGINT,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_import_log_org ON import_log(organization_id);
