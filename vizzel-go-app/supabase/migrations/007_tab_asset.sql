-- Production asset taxonomy + tab_asset (Prisma-aligned)

CREATE TABLE IF NOT EXISTS tab_asset_category (
    id BIGSERIAL PRIMARY KEY,
    organization_id BIGINT REFERENCES tab_organization(id),
    category_name TEXT NOT NULL DEFAULT '',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ,
    deleted_at TIMESTAMPTZ,
    created_by BIGINT NOT NULL DEFAULT 1,
    updated_by BIGINT,
    deleted_by BIGINT
);

CREATE TABLE IF NOT EXISTS tab_asset_type (
    id BIGSERIAL PRIMARY KEY,
    category_id BIGINT REFERENCES tab_asset_category(id),
    type_name TEXT NOT NULL DEFAULT '',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ,
    deleted_at TIMESTAMPTZ,
    created_by BIGINT NOT NULL DEFAULT 1,
    updated_by BIGINT,
    deleted_by BIGINT
);

CREATE TABLE IF NOT EXISTS tab_asset_class (
    id BIGSERIAL PRIMARY KEY,
    asset_type_id BIGINT REFERENCES tab_asset_type(id),
    class_name TEXT NOT NULL DEFAULT '',
    warranty TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ,
    deleted_at TIMESTAMPTZ,
    created_by BIGINT NOT NULL DEFAULT 1,
    updated_by BIGINT,
    deleted_by BIGINT
);

CREATE TABLE IF NOT EXISTS tab_asset_status (
    id BIGSERIAL PRIMARY KEY,
    status TEXT NOT NULL,
    is_locked BOOLEAN NOT NULL DEFAULT FALSE,
    organization_id BIGINT REFERENCES tab_organization(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ,
    deleted_at TIMESTAMPTZ,
    created_by BIGINT NOT NULL DEFAULT 1,
    updated_by BIGINT,
    deleted_by BIGINT
);

CREATE TABLE IF NOT EXISTS lov_get_by (
    id SERIAL PRIMARY KEY,
    name TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS lov_source_fund (
    id SERIAL PRIMARY KEY,
    name TEXT NOT NULL
);

INSERT INTO lov_get_by (id, name) VALUES (1, 'จัดซื้อ'), (2, 'บริจาค'), (3, 'โอนย้าย')
ON CONFLICT DO NOTHING;

INSERT INTO lov_source_fund (id, name) VALUES (1, 'งบประมาณแผ่นดิน'), (2, 'รายได้'), (3, 'เงินบำรุง')
ON CONFLICT DO NOTHING;

CREATE TABLE IF NOT EXISTS tab_asset (
    id BIGSERIAL PRIMARY KEY,
    asset_number TEXT NOT NULL,
    rfid_num TEXT,
    asset_name TEXT NOT NULL DEFAULT '',
    asset_details TEXT,
    asset_class_id BIGINT REFERENCES tab_asset_class(id),
    asset_value BIGINT DEFAULT 0,
    organization_id BIGINT REFERENCES tab_organization(id),
    asset_status_id BIGINT REFERENCES tab_asset_status(id),
    is_check BOOLEAN NOT NULL DEFAULT FALSE,
    is_depreciation BOOLEAN NOT NULL DEFAULT TRUE,
    received_date TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    expiry_date TIMESTAMPTZ,
    get_by_id INT REFERENCES lov_get_by(id),
    get_from TEXT,
    source_fund_id INT REFERENCES lov_source_fund(id),
    available_age INT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ,
    deleted_at TIMESTAMPTZ,
    created_by BIGINT NOT NULL DEFAULT 1,
    updated_by BIGINT,
    deleted_by BIGINT
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_tab_asset_rfid ON tab_asset(rfid_num) WHERE rfid_num IS NOT NULL AND rfid_num != '';
CREATE INDEX IF NOT EXISTS idx_tab_asset_org ON tab_asset(organization_id);
CREATE INDEX IF NOT EXISTS idx_tab_asset_org_deleted ON tab_asset(organization_id) WHERE deleted_at IS NULL;

CREATE TABLE IF NOT EXISTS tab_asset_address (
    id BIGSERIAL PRIMARY KEY,
    asset_id BIGINT REFERENCES tab_asset(id) ON DELETE CASCADE,
    room_id BIGINT,
    building_name TEXT,
    room_name TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ,
    deleted_at TIMESTAMPTZ,
    created_by BIGINT NOT NULL DEFAULT 1
);

CREATE TABLE IF NOT EXISTS tab_asset_owner (
    id BIGSERIAL PRIMARY KEY,
    user_id BIGINT REFERENCES tab_user(id),
    asset_id BIGINT NOT NULL REFERENCES tab_asset(id) ON DELETE CASCADE,
    owner_name TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ,
    deleted_at TIMESTAMPTZ,
    created_by BIGINT NOT NULL DEFAULT 1
);

CREATE TABLE IF NOT EXISTS tab_asset_image (
    id BIGSERIAL PRIMARY KEY,
    asset_id BIGINT REFERENCES tab_asset(id) ON DELETE CASCADE,
    image TEXT,
    organization_id BIGINT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS tab_asset_doc (
    id BIGSERIAL PRIMARY KEY,
    doc TEXT NOT NULL DEFAULT '',
    asset_id BIGINT REFERENCES tab_asset(id) ON DELETE CASCADE,
    doc_name TEXT,
    doc_type TEXT,
    organization_id BIGINT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS tab_asset_repair (
    id BIGSERIAL PRIMARY KEY,
    asset_id BIGINT REFERENCES tab_asset(id),
    note TEXT,
    return_date DATE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at TIMESTAMPTZ
);
