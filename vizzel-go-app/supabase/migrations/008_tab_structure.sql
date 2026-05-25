-- Org structure (production names)

CREATE TABLE IF NOT EXISTS tab_dept (
    id BIGSERIAL PRIMARY KEY,
    organization_id BIGINT REFERENCES tab_organization(id),
    dept_name TEXT,
    institute_id BIGINT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS tab_institute (
    id BIGSERIAL PRIMARY KEY,
    organization_id BIGINT REFERENCES tab_organization(id),
    institute_name TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS tab_section (
    id BIGSERIAL PRIMARY KEY,
    dept_id BIGINT REFERENCES tab_dept(id),
    section_name TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS tab_position (
    id BIGSERIAL PRIMARY KEY,
    organization_id BIGINT REFERENCES tab_organization(id),
    position_name TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS tab_building (
    id BIGSERIAL PRIMARY KEY,
    organization_id BIGINT REFERENCES tab_organization(id),
    building_name TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS tab_room (
    id BIGSERIAL PRIMARY KEY,
    building_id BIGINT REFERENCES tab_building(id),
    room_number TEXT,
    room_name TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at TIMESTAMPTZ
);
