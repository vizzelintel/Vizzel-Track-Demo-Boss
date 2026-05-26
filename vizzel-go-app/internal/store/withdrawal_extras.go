package store

import (
	"context"
	"crypto/rand"
	"encoding/hex"
	"fmt"
	"time"
)

type WithdrawalReminderRow struct {
	ID             int64
	OrganizationID int64
	UserID         int64
	RequesterName  string
	ItemName       string
	DueDate        time.Time
}

func randomIssueToken() (string, error) {
	b := make([]byte, 16)
	if _, err := rand.Read(b); err != nil {
		return "", err
	}
	return hex.EncodeToString(b), nil
}

func (s *postgresStore) IssueWithdrawal(ctx context.Context, orgID, id int64) (string, error) {
	token, err := randomIssueToken()
	if err != nil {
		return "", err
	}
	tag, err := s.pool.Exec(ctx,
		`UPDATE tab_internal_request_withdrawal
		 SET status = 'borrowed', issue_token = $3, issued_at = NOW()
		 WHERE id = $1 AND organization_id = $2 AND status IN ('approved', 'taken')
		   AND deleted_at IS NULL`,
		id, orgID, token,
	)
	if err != nil {
		return "", err
	}
	if tag.RowsAffected() == 0 {
		return "", fmt.Errorf("withdrawal not ready to issue")
	}
	return token, nil
}

func (s *postgresStore) GetWithdrawalByIssueToken(ctx context.Context, token string) (map[string]any, error) {
	row := s.pool.QueryRow(ctx,
		`SELECT w.id, w.organization_id, w.requester_name, w.item_name, w.status,
		        w.due_date::text, COALESCE(a.asset_number,''), COALESCE(a.asset_name,'')
		 FROM tab_internal_request_withdrawal w
		 LEFT JOIN tab_asset a ON a.id = w.asset_id
		 WHERE w.issue_token = $1 AND w.deleted_at IS NULL`,
		token,
	)
	var id, orgID int64
	var requester, item, status, due, assetNum, assetName string
	if err := row.Scan(&id, &orgID, &requester, &item, &status, &due, &assetNum, &assetName); err != nil {
		return nil, err
	}
	return map[string]any{
		"id": id, "organizationId": orgID, "requesterName": requester, "itemName": item,
		"status": status, "dueDate": due, "assetNumber": assetNum, "assetName": assetName,
		"issueToken": token,
	}, nil
}

func (s *postgresStore) CountActiveBorrowsForAsset(ctx context.Context, orgID, assetID int64) (int, error) {
	if assetID <= 0 {
		return 0, nil
	}
	var n int
	err := s.pool.QueryRow(ctx,
		`SELECT COUNT(*)::int FROM tab_internal_request_withdrawal
		 WHERE organization_id = $1 AND asset_id = $2 AND deleted_at IS NULL
		   AND status IN ('approved', 'taken', 'borrowed')
		   AND returned_at IS NULL`,
		orgID, assetID,
	).Scan(&n)
	return n, err
}

func (s *postgresStore) CountActiveBorrowsForRepair(ctx context.Context, orgID, assetID int64) (int, error) {
	n, err := s.CountActiveBorrowsForAsset(ctx, orgID, assetID)
	if err != nil || n > 0 || assetID <= 0 {
		return n, err
	}
	err = s.pool.QueryRow(ctx,
		`SELECT COUNT(*)::int FROM tab_internal_request_withdrawal w
		 JOIN tab_asset_component c ON c.id = w.component_id AND c.asset_id = $2
		 WHERE w.organization_id = $1 AND w.deleted_at IS NULL
		   AND w.status IN ('approved', 'taken', 'borrowed') AND w.returned_at IS NULL`,
		orgID, assetID,
	).Scan(&n)
	return n, err
}

func (s *postgresStore) CompleteRepair(ctx context.Context, orgID, repairID int64) error {
	var assetID int64
	var status string
	err := s.pool.QueryRow(ctx,
		`SELECT COALESCE(asset_id,0), COALESCE(status,'')
		 FROM tab_asset_repair r
		 LEFT JOIN tab_asset a ON a.id = r.asset_id
		 WHERE r.id = $1 AND (r.organization_id = $2 OR a.organization_id = $2)`,
		repairID, orgID,
	).Scan(&assetID, &status)
	if err != nil {
		return fmt.Errorf("repair not found")
	}
	if status != "in_progress" && status != "approved" {
		return fmt.Errorf("repair not in progress")
	}
	n, err := s.CountActiveBorrowsForRepair(ctx, orgID, assetID)
	if err != nil {
		return err
	}
	if n > 0 {
		return fmt.Errorf("ยังมีครุภัณฑ์หรือชิ้นส่วนที่อยู่ระหว่างการยืม ไม่สามารถปิดงานซ่อมได้")
	}
	_, err = s.pool.Exec(ctx,
		`UPDATE tab_asset_repair SET status = 'completed', updated_at = NOW(), return_date = CURRENT_DATE WHERE id = $1`,
		repairID,
	)
	return err
}

func (s *postgresStore) ListWithdrawalRemindersDue(ctx context.Context) ([]WithdrawalReminderRow, error) {
	rows, err := s.pool.Query(ctx,
		`SELECT id, organization_id, COALESCE(user_id,0), COALESCE(requester_name,''),
		        COALESCE(item_name,''), due_date
		 FROM tab_internal_request_withdrawal
		 WHERE deleted_at IS NULL
		   AND withdrawal_type = 'borrow'
		   AND due_date IS NOT NULL
		   AND due_date = CURRENT_DATE + 1
		   AND status IN ('approved', 'taken', 'borrowed')
		   AND returned_at IS NULL
		   AND reminder_sent_at IS NULL
		 LIMIT 50`,
	)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var out []WithdrawalReminderRow
	for rows.Next() {
		var r WithdrawalReminderRow
		if err := rows.Scan(&r.ID, &r.OrganizationID, &r.UserID, &r.RequesterName, &r.ItemName, &r.DueDate); err != nil {
			return nil, err
		}
		out = append(out, r)
	}
	return out, rows.Err()
}

func (s *postgresStore) MarkWithdrawalReminderSent(ctx context.Context, id int64) error {
	_, err := s.pool.Exec(ctx,
		`UPDATE tab_internal_request_withdrawal SET reminder_sent_at = NOW() WHERE id = $1`, id,
	)
	return err
}
