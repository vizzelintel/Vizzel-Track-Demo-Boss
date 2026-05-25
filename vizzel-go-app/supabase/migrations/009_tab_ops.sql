-- Operations tables (audit, withdrawal)

CREATE TABLE IF NOT EXISTS tab_check_job (
    id BIGSERIAL PRIMARY KEY,
    organization_id BIGINT REFERENCES tab_organization(id),
    job_name TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'ongoing',
    progress INT NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS tab_internal_request_withdrawal (
    id BIGSERIAL PRIMARY KEY,
    organization_id BIGINT REFERENCES tab_organization(id),
    requester_name TEXT,
    item_name TEXT,
    status TEXT NOT NULL DEFAULT 'pending',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at TIMESTAMPTZ
);
