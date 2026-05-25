CREATE TABLE IF NOT EXISTS refresh_tokens (
    id BIGSERIAL PRIMARY KEY,
    user_id BIGINT NOT NULL REFERENCES users(id),
    token_hash TEXT NOT NULL UNIQUE,
    expires_at TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS asset_docs (
    id BIGSERIAL PRIMARY KEY,
    asset_id BIGINT NOT NULL REFERENCES assets(id),
    doc_name TEXT NOT NULL,
    doc_type TEXT NOT NULL DEFAULT 'file',
    doc_url TEXT NOT NULL DEFAULT '',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS asset_class_docs (
    id BIGSERIAL PRIMARY KEY,
    class_id BIGINT NOT NULL REFERENCES asset_classes(id),
    doc_name TEXT NOT NULL,
    doc_type TEXT NOT NULL DEFAULT 'file',
    doc_url TEXT NOT NULL DEFAULT '',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS warranties (
    id BIGSERIAL PRIMARY KEY,
    organization_id BIGINT NOT NULL REFERENCES organizations(id),
    asset_number TEXT NOT NULL,
    asset_name TEXT NOT NULL DEFAULT '',
    warranty_end DATE,
    status TEXT NOT NULL DEFAULT 'active',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE assets ADD COLUMN IF NOT EXISTS image_url TEXT NOT NULL DEFAULT '';
