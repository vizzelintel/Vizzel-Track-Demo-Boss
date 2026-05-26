package store

import (
	"context"
	"fmt"
)

func (s *postgresStore) ListTransfers(ctx context.Context, orgID int64) ([]TransferRecord, error) {
	rows, err := s.pool.Query(ctx,
		`SELECT * FROM (
		 SELECT t.id, t.asset_id, COALESCE(a.asset_number,''), COALESCE(t.component_id,0),
		        t.transfer_type, t.status, COALESCE(t.reason,''), COALESCE(t.approval_instance_id,0),
		        t.created_at::text, COALESCE(t.target_organization_id,0), 'outgoing'
		 FROM tab_asset_transfer t
		 LEFT JOIN tab_asset a ON a.id = t.asset_id
		 WHERE t.organization_id = $1 AND t.deleted_at IS NULL
		 UNION ALL
		 SELECT t.id, t.asset_id, COALESCE(a.asset_number,''), COALESCE(t.component_id,0),
		        t.transfer_type, t.status, COALESCE(t.reason,''), COALESCE(t.approval_instance_id,0),
		        t.created_at::text, COALESCE(t.target_organization_id,0), 'incoming'
		 FROM tab_asset_transfer t
		 LEFT JOIN tab_asset a ON a.id = t.asset_id
		 WHERE t.target_organization_id = $1 AND t.status = 'pending_target' AND t.deleted_at IS NULL
		 ) u ORDER BY created_at DESC LIMIT 200`,
		orgID, orgID,
	)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var out []TransferRecord
	for rows.Next() {
		var tr TransferRecord
		if err := rows.Scan(&tr.ID, &tr.AssetID, &tr.AssetNumber, &tr.ComponentID,
			&tr.TransferType, &tr.Status, &tr.Reason, &tr.ApprovalInstanceID, &tr.CreatedAt,
			&tr.TargetOrganizationID, &tr.Direction); err != nil {
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
			organization_id, asset_id, component_id, transfer_type, target_organization_id,
			to_institute_id, to_dept_id, to_section_id, to_user_id,
			reason, status, requested_by
		) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,'draft',$11) RETURNING id`,
		orgID, in.AssetID, nullInt64(in.ComponentID), in.TransferType, nullInt64(in.TargetOrganizationID),
		nullInt64(in.ToInstituteID), nullInt64(in.ToDeptID), nullInt64(in.ToSectionID),
		nullInt64(in.ToUserID), in.Reason, nullInt64(in.RequestedBy),
	).Scan(&id)
	return id, err
}

func (s *postgresStore) AcceptTransferAtTarget(ctx context.Context, targetOrgID, transferID int64) error {
	var transferType string
	var assetID int64
	err := s.pool.QueryRow(ctx,
		`SELECT transfer_type, asset_id FROM tab_asset_transfer
		 WHERE id = $1 AND target_organization_id = $2 AND status = 'pending_target' AND deleted_at IS NULL`,
		transferID, targetOrgID,
	).Scan(&transferType, &assetID)
	if err != nil {
		return fmt.Errorf("transfer not pending at target org")
	}
	_, err = s.pool.Exec(ctx,
		`UPDATE tab_asset_transfer SET status = 'completed', updated_at = NOW() WHERE id = $1`,
		transferID,
	)
	if err != nil {
		return err
	}
	if transferType == "permanent" && assetID > 0 {
		_, _ = s.pool.Exec(ctx,
			`UPDATE tab_asset SET organization_id = $2, updated_at = NOW() WHERE id = $1`,
			assetID, targetOrgID,
		)
	}
	return nil
}

func (s *postgresStore) ListTransferTargets(ctx context.Context, orgID int64) ([]Row, error) {
	return s.listRowsPG(ctx,
		`SELECT id, COALESCE(name,''), NULL, NULL, NULL, created_at FROM (
			SELECT id, name, created_at FROM tab_organization
			 WHERE parent_organization_id = $1 AND deleted_at IS NULL
			UNION
			SELECT p.id, p.name, p.created_at FROM tab_organization o
			JOIN tab_organization p ON p.id = o.parent_organization_id
			WHERE o.id = $1 AND o.deleted_at IS NULL AND p.deleted_at IS NULL
		) t WHERE id <> $1 ORDER BY id`,
		orgID,
	)
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
