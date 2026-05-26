-- Transfer destination: recipient user + building/room at target org

ALTER TABLE tab_asset_transfer
    ADD COLUMN IF NOT EXISTS target_building_id BIGINT REFERENCES tab_building(id),
    ADD COLUMN IF NOT EXISTS target_room_id BIGINT REFERENCES tab_room(id);

CREATE INDEX IF NOT EXISTS idx_transfer_target_location
    ON tab_asset_transfer (target_building_id, target_room_id)
    WHERE deleted_at IS NULL;
