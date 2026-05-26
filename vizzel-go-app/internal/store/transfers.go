package store

import (
	"context"
)

func (s *postgresStore) ListTransfers(ctx context.Context, orgID int64) ([]TransferRecord, error) {
	rows, err := s.pool.Query(ctx,
		`SELECT t.id, t.asset_id, COALESCE(a.asset_number,''), COALESCE(t.component_id,0),
		        t.transfer_type, t.status, COALESCE(t.reason,''), COALESCE(t.approval_instance_id,0),
		        t.created_at::text
		 FROM tab_asset_transfer t
		 LEFT JOIN tab_asset a ON a.id = t.asset_id
		 WHERE t.organization_id = $1 AND t.deleted_at IS NULL
		 ORDER BY t.id DESC LIMIT 200`,
		orgID,
	)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var out []TransferRecord
	for rows.Next() {
		var tr TransferRecord
		if err := rows.Scan(&tr.ID, &tr.AssetID, &tr.AssetNumber, &tr.ComponentID,
			&tr.TransferType, &tr.Status, &tr.Reason, &tr.ApprovalInstanceID, &tr.CreatedAt); err != nil {
			return nil, err
		}
		out = append(out, tr)
	}
	return out, rows.Err()
}

func (s *postgresStore) CreateTransfer(ctx context.Context, orgID int64, in TransferInput) (int64, error) {
	var id int64
	err := s.pool.QueryRow(ctx,
		`INSERT INTO tab_asset_transfer (
			organization_id, asset_id, component_id, transfer_type,
			to_institute_id, to_dept_id, to_section_id, to_user_id,
			reason, status, requested_by
		) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,'draft',$10) RETURNING id`,
		orgID, in.AssetID, nullInt64(in.ComponentID), in.TransferType,
		nullInt64(in.ToInstituteID), nullInt64(in.ToDeptID), nullInt64(in.ToSectionID),
		nullInt64(in.ToUserID), in.Reason, nullInt64(in.RequestedBy),
	).Scan(&id)
	return id, err
}

func (s *postgresStore) ListChildOrganizations(ctx context.Context, parentID int64) ([]Row, error) {
	return s.listRowsPG(ctx,
		`SELECT id, COALESCE(name,''), NULL, NULL, NULL, created_at
		 FROM tab_organization
		 WHERE parent_organization_id = $1 AND deleted_at IS NULL
		 ORDER BY id`,
		parentID,
	)
}

func (s *postgresStore) ResolveOrgScope(ctx context.Context, orgID int64, includeChildren bool) ([]int64, error) {
	if !includeChildren {
		return []int64{orgID}, nil
	}
	ids := []int64{orgID}
	children, err := s.ListChildOrganizations(ctx, orgID)
	if err != nil {
		return ids, err
	}
	for _, c := range children {
		ids = append(ids, c.ID)
	}
	return ids, nil
}
