package store

import (
	"context"
	"fmt"
	"strings"
)

// ListAssetComponents returns the active components for one asset, ordered by
// position_no.
func (s *postgresStore) ListAssetComponents(ctx context.Context, assetID int64) ([]AssetComponent, error) {
	rows, err := s.pool.Query(ctx,
		`SELECT id, asset_id, component_name, COALESCE(rfid_num,''), COALESCE(serial_no,''),
		        COALESCE(position_no,1), COALESCE(note,''), COALESCE(current_status,'active')
		 FROM tab_asset_component
		 WHERE asset_id = $1 AND deleted_at IS NULL
		 ORDER BY position_no, id`,
		assetID,
	)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var out []AssetComponent
	for rows.Next() {
		var c AssetComponent
		if err := rows.Scan(&c.ID, &c.AssetID, &c.ComponentName, &c.RFIDNum, &c.SerialNo,
			&c.PositionNo, &c.Note, &c.CurrentStatus); err != nil {
			return nil, err
		}
		out = append(out, c)
	}
	return out, rows.Err()
}

// CreateAssetComponent inserts a single component row and returns its id.
func (s *postgresStore) CreateAssetComponent(ctx context.Context, in AssetComponent) (int64, error) {
	if in.PositionNo <= 0 {
		in.PositionNo = 1
	}
	if in.CurrentStatus == "" {
		in.CurrentStatus = "active"
	}
	var id int64
	err := s.pool.QueryRow(ctx,
		`INSERT INTO tab_asset_component (asset_id, component_name, rfid_num, serial_no, position_no, note, current_status, created_by)
		 VALUES ($1,$2,$3,$4,$5,$6,$7,1) RETURNING id`,
		in.AssetID, in.ComponentName, nullStr(in.RFIDNum), nullStr(in.SerialNo),
		in.PositionNo, nullStr(in.Note), in.CurrentStatus,
	).Scan(&id)
	return id, err
}

// UpdateAssetComponent overwrites the editable fields on one component.
func (s *postgresStore) UpdateAssetComponent(ctx context.Context, id int64, in AssetComponent) error {
	if in.PositionNo <= 0 {
		in.PositionNo = 1
	}
	_, err := s.pool.Exec(ctx,
		`UPDATE tab_asset_component
		 SET component_name=$2, rfid_num=$3, serial_no=$4, position_no=$5, note=$6, updated_at=NOW()
		 WHERE id=$1 AND deleted_at IS NULL`,
		id, in.ComponentName, nullStr(in.RFIDNum), nullStr(in.SerialNo), in.PositionNo, nullStr(in.Note),
	)
	return err
}

// DeleteAssetComponent soft-deletes one component.
func (s *postgresStore) DeleteAssetComponent(ctx context.Context, id int64) error {
	_, err := s.pool.Exec(ctx,
		`UPDATE tab_asset_component SET deleted_at = NOW() WHERE id = $1`, id,
	)
	return err
}

// ReplaceAssetComponents soft-deletes every existing component on the asset
// and inserts the supplied list. The whole operation is atomic.
func (s *postgresStore) ReplaceAssetComponents(ctx context.Context, assetID int64, items []AssetComponent) error {
	tx, err := s.pool.Begin(ctx)
	if err != nil {
		return err
	}
	defer tx.Rollback(ctx)
	if _, err := tx.Exec(ctx,
		`UPDATE tab_asset_component SET deleted_at = NOW()
		 WHERE asset_id = $1 AND deleted_at IS NULL`,
		assetID,
	); err != nil {
		return err
	}
	for i, c := range items {
		name := strings.TrimSpace(c.ComponentName)
		if name == "" {
			continue
		}
		pos := c.PositionNo
		if pos <= 0 {
			pos = i + 1
		}
		status := c.CurrentStatus
		if status == "" {
			status = "active"
		}
		if _, err := tx.Exec(ctx,
			`INSERT INTO tab_asset_component (asset_id, component_name, rfid_num, serial_no, position_no, note, current_status, created_by)
			 VALUES ($1,$2,$3,$4,$5,$6,$7,1)`,
			assetID, name, nullStr(c.RFIDNum), nullStr(c.SerialNo), pos, nullStr(c.Note), status,
		); err != nil {
			return err
		}
	}
	return tx.Commit(ctx)
}

// BulkResolveByRFID matches each scanned RFID against tab_asset_component (and
// falls back to the legacy tab_asset.rfid_num column) for the given org.
// Unknown RFIDs are returned with Matched=false so the UI can list them
// separately. The order of the input slice is preserved.
func (s *postgresStore) BulkResolveByRFID(ctx context.Context, orgID int64, rfids []string) ([]ScanResult, error) {
	out := make([]ScanResult, 0, len(rfids))
	seen := make(map[string]ScanResult, len(rfids))
	clean := make([]string, 0, len(rfids))
	for _, raw := range rfids {
		v := strings.TrimSpace(raw)
		if v == "" {
			continue
		}
		if _, dup := seen[v]; dup {
			continue
		}
		seen[v] = ScanResult{RFID: v}
		clean = append(clean, v)
	}
	if len(clean) == 0 {
		return out, nil
	}

	placeholders := make([]string, len(clean))
	args := make([]any, 0, len(clean)+1)
	args = append(args, orgID)
	for i, v := range clean {
		placeholders[i] = fmt.Sprintf("$%d", i+2)
		args = append(args, v)
	}
	inList := strings.Join(placeholders, ",")

	rows, err := s.pool.Query(ctx,
		fmt.Sprintf(`SELECT c.rfid_num, a.id, a.asset_number, COALESCE(a.asset_name,''),
		        c.id, c.component_name
		 FROM tab_asset_component c
		 JOIN tab_asset a ON a.id = c.asset_id
		 WHERE a.organization_id = $1
		   AND c.deleted_at IS NULL
		   AND a.deleted_at IS NULL
		   AND c.rfid_num IN (%s)`, inList),
		args...,
	)
	if err != nil {
		return nil, err
	}
	for rows.Next() {
		var r ScanResult
		r.Matched = true
		if err := rows.Scan(&r.RFID, &r.AssetID, &r.AssetNumber, &r.AssetName, &r.ComponentID, &r.ComponentName); err != nil {
			rows.Close()
			return nil, err
		}
		seen[r.RFID] = r
	}
	rows.Close()

	rows2, err := s.pool.Query(ctx,
		fmt.Sprintf(`SELECT a.rfid_num, a.id, a.asset_number, COALESCE(a.asset_name,'')
		 FROM tab_asset a
		 WHERE a.organization_id = $1
		   AND a.deleted_at IS NULL
		   AND a.rfid_num IN (%s)`, inList),
		args...,
	)
	if err == nil {
		for rows2.Next() {
			var r ScanResult
			r.Matched = true
			if err := rows2.Scan(&r.RFID, &r.AssetID, &r.AssetNumber, &r.AssetName); err != nil {
				rows2.Close()
				return nil, err
			}
			existing := seen[r.RFID]
			if !existing.Matched {
				r.ComponentName = existing.ComponentName
				seen[r.RFID] = r
			}
		}
		rows2.Close()
	}

	for _, v := range clean {
		out = append(out, seen[v])
	}
	return out, nil
}
