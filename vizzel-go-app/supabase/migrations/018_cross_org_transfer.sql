-- Cross-org transfer target + component-level borrow

ALTER TABLE tab_asset_transfer
    ADD COLUMN IF NOT EXISTS target_organization_id BIGINT REFERENCES tab_organization(id);

ALTER TABLE tab_internal_request_withdrawal
    ADD COLUMN IF NOT EXISTS component_id BIGINT REFERENCES tab_asset_component(id);

CREATE INDEX IF NOT EXISTS idx_transfer_target_org
    ON tab_asset_transfer (target_organization_id, status)
    WHERE deleted_at IS NULL;
