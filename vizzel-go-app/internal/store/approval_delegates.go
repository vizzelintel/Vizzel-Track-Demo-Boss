package store

import (
	"context"
	"fmt"
)

type ApprovalDelegate struct {
	StepKey string `json:"stepKey"`
	UserID  int64  `json:"userId"`
	UserName string `json:"userName,omitempty"`
}

func (s *postgresStore) ListApprovalDelegates(ctx context.Context, orgID int64) ([]ApprovalDelegate, error) {
	rows, err := s.pool.Query(ctx,
		`SELECT d.step_key, d.user_id, COALESCE(NULLIF(TRIM(COALESCE(u.name,'') || ' ' || COALESCE(u.surname,'')), ''), u.email, '')
		 FROM tab_approval_delegate d
		 JOIN tab_user u ON u.id = d.user_id
		 WHERE d.organization_id = $1
		 ORDER BY d.step_key`,
		orgID,
	)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var out []ApprovalDelegate
	for rows.Next() {
		var d ApprovalDelegate
		if err := rows.Scan(&d.StepKey, &d.UserID, &d.UserName); err != nil {
			return nil, err
		}
		out = append(out, d)
	}
	return out, rows.Err()
}

func (s *postgresStore) SetApprovalDelegate(ctx context.Context, orgID int64, stepKey string, userID int64) error {
	_, err := s.pool.Exec(ctx,
		`INSERT INTO tab_approval_delegate (organization_id, step_key, user_id)
		 VALUES ($1, $2, $3)
		 ON CONFLICT (organization_id, step_key) DO UPDATE SET user_id = EXCLUDED.user_id`,
		orgID, stepKey, userID,
	)
	return err
}

func (s *postgresStore) UserCanApproveStep(ctx context.Context, orgID, userID, roleID int64, stepKey string) (bool, error) {
	if !CanActOnApprovalStep(roleID, stepKey) {
		return false, nil
	}
	var delegateUserID int64
	err := s.pool.QueryRow(ctx,
		`SELECT user_id FROM tab_approval_delegate WHERE organization_id = $1 AND step_key = $2`,
		orgID, stepKey,
	).Scan(&delegateUserID)
	if err != nil {
		// no delegate row: role-only mode
		return true, nil
	}
	return delegateUserID == userID, nil
}

func (s *postgresStore) UserCanApproveInstanceStep(ctx context.Context, orgID, instanceID, userID, roleID int64, stepKey string) (bool, error) {
	if !CanActOnApprovalStep(roleID, stepKey) {
		return false, nil
	}
	var assigneeUserID int64
	err := s.pool.QueryRow(ctx,
		`SELECT assigned_user_id FROM tab_approval_instance_step WHERE instance_id = $1 AND step_key = $2`,
		instanceID, stepKey,
	).Scan(&assigneeUserID)
	if err == nil {
		return assigneeUserID == userID, nil
	}
	return s.UserCanApproveStep(ctx, orgID, userID, roleID, stepKey)
}

func (s *postgresStore) CreateTargetTransferApproval(ctx context.Context, targetOrgID, transferID, requestedBy int64) (int64, error) {
	var id int64
	err := s.pool.QueryRow(ctx,
		`INSERT INTO tab_approval_instance (organization_id, workflow_code, ref_type, ref_id, status, current_step, requested_by, approval_side)
		 VALUES ($1, 'transfer_receive', 'transfer', $2, 'pending', 1, $3, 'target') RETURNING id`,
		targetOrgID, transferID, nullInt64(requestedBy),
	).Scan(&id)
	if err != nil {
		return 0, err
	}
	_, _ = s.pool.Exec(ctx,
		`UPDATE tab_asset_transfer SET target_approval_instance_id = $2, status = 'pending_target_approval', updated_at = NOW() WHERE id = $1`,
		transferID, id,
	)
	return id, nil
}

func (s *postgresStore) ReturnWithdrawalWithScan(ctx context.Context, orgID, withdrawalID int64, rfids []string) error {
	var assetID int64
	var componentID int64
	var wType string
	err := s.pool.QueryRow(ctx,
		`SELECT COALESCE(asset_id,0), COALESCE(component_id,0), COALESCE(withdrawal_type,'borrow')
		 FROM tab_internal_request_withdrawal
		 WHERE id = $1 AND organization_id = $2 AND status = 'borrowed'`,
		withdrawalID, orgID,
	).Scan(&assetID, &componentID, &wType)
	if err != nil {
		return fmt.Errorf("รายการยืมไม่พบหรือยังไม่ได้ออกของ")
	}
	if wType != "borrow" {
		return s.returnWithdrawalSimple(ctx, orgID, withdrawalID, rfids)
	}
	if len(rfids) == 0 {
		return fmt.Errorf("กรุณาสแกน RFID อย่างน้อย 1 รายการ")
	}
	results, err := s.BulkResolveByRFID(ctx, orgID, rfids)
	if err != nil {
		return err
	}
	if componentID > 0 {
		ok := false
		for _, r := range results {
			if r.Matched && r.ComponentID == componentID {
				ok = true
				break
			}
		}
		if !ok {
			return fmt.Errorf("RFID ไม่ตรงกับชิ้นส่วนที่ยืม")
		}
	} else if assetID > 0 {
		matchedAsset := false
		for _, r := range results {
			if r.Matched && r.AssetID == assetID {
				matchedAsset = true
				break
			}
		}
		if !matchedAsset {
			return fmt.Errorf("RFID ไม่ตรงกับครุภัณฑ์ที่ยืม")
		}
		// multi-piece: require all components scanned
		var compCount int
		_ = s.pool.QueryRow(ctx,
			`SELECT COUNT(*)::int FROM tab_asset_component WHERE asset_id = $1 AND deleted_at IS NULL`,
			assetID,
		).Scan(&compCount)
		if compCount > 1 {
			found := map[int64]bool{}
			for _, r := range results {
				if r.Matched && r.AssetID == assetID && r.ComponentID > 0 {
					found[r.ComponentID] = true
				}
			}
			if len(found) < compCount {
				return fmt.Errorf("ชุดครุภัณฑ์ต้องสแกนครบทุกชิ้น (%d/%d)", len(found), compCount)
			}
		}
	}
	rfidJoined := joinRFIDs(rfids)
	_, err = s.pool.Exec(ctx,
		`UPDATE tab_internal_request_withdrawal
		 SET status = 'returned', returned_at = NOW(), return_inspected_at = NOW(), return_scan_rfids = $3
		 WHERE id = $1 AND organization_id = $2`,
		withdrawalID, orgID, rfidJoined,
	)
	return err
}

func (s *postgresStore) returnWithdrawalSimple(ctx context.Context, orgID, withdrawalID int64, rfids []string) error {
	rfidJoined := joinRFIDs(rfids)
	_, err := s.pool.Exec(ctx,
		`UPDATE tab_internal_request_withdrawal
		 SET status = 'returned', returned_at = NOW(), return_inspected_at = NOW(),
		     return_scan_rfids = COALESCE(NULLIF($3,''), return_scan_rfids)
		 WHERE id = $1 AND organization_id = $2`,
		withdrawalID, orgID, rfidJoined,
	)
	return err
}

func joinRFIDs(rfids []string) string {
	if len(rfids) == 0 {
		return ""
	}
	out := rfids[0]
	for i := 1; i < len(rfids); i++ {
		out += "," + rfids[i]
	}
	return out
}
