-- Production-aligned core tables (tab_* naming). Coexists with simplified tables via views.

CREATE TABLE IF NOT EXISTS tab_organization (
    id BIGSERIAL PRIMARY KEY,
    name TEXT,
    branch TEXT,
    record_limit INT NOT NULL DEFAULT 0,
    user_limit INT NOT NULL DEFAULT 10,
    officer_limit INT NOT NULL DEFAULT 0,
    storage_limit BIGINT NOT NULL DEFAULT 0,
    is_institute BOOLEAN NOT NULL DEFAULT FALSE,
    is_dept BOOLEAN NOT NULL DEFAULT FALSE,
    is_section BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ,
    deleted_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS tab_user (
    id BIGSERIAL PRIMARY KEY,
    username TEXT NOT NULL,
    email TEXT NOT NULL UNIQUE,
    password TEXT NOT NULL,
    prefix TEXT,
    name TEXT,
    surname TEXT,
    image TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ,
    deleted_at TIMESTAMPTZ,
    last_active_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS tab_user_organization_role (
    id BIGSERIAL PRIMARY KEY,
    user_id BIGINT NOT NULL REFERENCES tab_user(id),
    organization_id BIGINT NOT NULL REFERENCES tab_organization(id),
    role_id INT NOT NULL DEFAULT 4,
    dept_id BIGINT,
    institute_id BIGINT,
    section_id BIGINT,
    position_id BIGINT,
    status BOOLEAN NOT NULL DEFAULT TRUE,
    verify INT NOT NULL DEFAULT 1,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ,
    deleted_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS lov_role (
    id SERIAL PRIMARY KEY,
    role_name TEXT NOT NULL
);

INSERT INTO lov_role (id, role_name) VALUES
    (1, 'Super Admin'),
    (2, 'Admin Organization'),
    (3, 'Officer'),
    (4, 'Member')
ON CONFLICT DO NOTHING;

CREATE TABLE IF NOT EXISTS lov_menu (
    id SERIAL PRIMARY KEY,
    menu_name TEXT NOT NULL,
    menu_path TEXT
);

CREATE TABLE IF NOT EXISTS tab_organization_menu (
    id BIGSERIAL PRIMARY KEY,
    organization_id BIGINT NOT NULL REFERENCES tab_organization(id),
    menu_id INT NOT NULL REFERENCES lov_menu(id),
    enabled BOOLEAN NOT NULL DEFAULT TRUE,
    UNIQUE (organization_id, menu_id)
);

-- Bridge views: map existing demo data to production table names
CREATE OR REPLACE VIEW v_tab_organization AS
SELECT id, name, NULL::TEXT AS branch, 0 AS record_limit, 10 AS user_limit,
       0 AS officer_limit, 0::BIGINT AS storage_limit,
       FALSE AS is_institute, FALSE AS is_dept, FALSE AS is_section,
       created_at, NULL::TIMESTAMPTZ AS updated_at, NULL::TIMESTAMPTZ AS deleted_at
FROM organizations;

CREATE OR REPLACE VIEW v_tab_user AS
SELECT id, split_part(email, '@', 1) AS username, email, password_hash AS password,
       NULL::TEXT AS prefix, display_name AS name, ''::TEXT AS surname,
       NULL::TEXT AS image, created_at, NULL::TIMESTAMPTZ AS updated_at,
       NULL::TIMESTAMPTZ AS deleted_at, NULL::TIMESTAMPTZ AS last_active_at
FROM users;

CREATE OR REPLACE VIEW v_tab_asset AS
SELECT id, organization_id, asset_number, asset_name, rfid_num, category_id, class_id,
       category_name, class_name, type_name, building_name, room_name, owner_name,
       asset_status_name, asset_value, status, created_at
FROM assets;
