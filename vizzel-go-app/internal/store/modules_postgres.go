package store

import (
	"context"
	"fmt"

	"golang.org/x/crypto/bcrypt"
)

func (s *postgresStore) SeedModules(ctx context.Context, orgID int64) error {
	var n int
	if err := s.pool.QueryRow(ctx, `SELECT COUNT(*)::int FROM departments WHERE organization_id = $1`, orgID).Scan(&n); err != nil {
		return err
	}
	if n > 0 {
		return s.seedExtendedPG(ctx, orgID)
	}
	_, _ = s.pool.Exec(ctx, `INSERT INTO departments (organization_id, name) VALUES ($1, $2), ($1, $3)`, orgID, "ฝ่ายบริหาร", "ฝ่าย IT")
	_, _ = s.pool.Exec(ctx, `INSERT INTO buildings (organization_id, name) VALUES ($1, $2)`, orgID, "อาคาร A")
	_, _ = s.pool.Exec(ctx, `INSERT INTO asset_categories (organization_id, name) VALUES ($1, $2), ($1, $3)`, orgID, "ครุภัณฑ์คอมพิวเตอร์", "เฟอร์นิเจอร์")
	var buildingID, catID int64
	_ = s.pool.QueryRow(ctx, `SELECT id FROM buildings WHERE organization_id = $1 LIMIT 1`, orgID).Scan(&buildingID)
	_ = s.pool.QueryRow(ctx, `SELECT id FROM asset_categories WHERE organization_id = $1 LIMIT 1`, orgID).Scan(&catID)
	_, _ = s.pool.Exec(ctx, `INSERT INTO rooms (building_id, room_number, name) VALUES ($1, $2, $3)`, buildingID, "101", "ห้องประชุม")
	_, _ = s.pool.Exec(ctx, `INSERT INTO asset_classes (organization_id, category_id, name) VALUES ($1, $2, $3)`, orgID, catID, "Laptop")
	_, _ = s.pool.Exec(ctx, `INSERT INTO audit_jobs (organization_id, title, status, progress) VALUES ($1, $2, $3, $4), ($1, $5, $6, $7)`,
		orgID, "ตรวจนับ Q2/2026", "ongoing", 45, "ตรวจนับ Q1/2026", "completed", 100)
	_, _ = s.pool.Exec(ctx, `INSERT INTO repairs (organization_id, asset_number, note, status) VALUES ($1, $2, $3, $4)`,
		orgID, "DEMO-00001", "จอภาพมีจุดบกสี", "pending")
	_, _ = s.pool.Exec(ctx, `INSERT INTO withdrawals (organization_id, requester, item_name, status) VALUES ($1, $2, $3, $4)`,
		orgID, "สมชาย ใจดี", "โปรเจคเตอร์", "pending")
	_, _ = s.pool.Exec(ctx, `INSERT INTO sales (organization_id, asset_number, buyer, amount, status) VALUES ($1, $2, $3, $4, $5)`,
		orgID, "DEMO-00010", "หน่วยงาน ก.", 15000, "draft")
	for _, mid := range []int{1, 2, 3} {
		_, _ = s.pool.Exec(ctx, `INSERT INTO organization_menus (organization_id, menu_id, enabled) VALUES ($1, $2, true) ON CONFLICT DO NOTHING`, orgID, mid)
	}
	return s.seedExtendedPG(ctx, orgID)
}

func (s *postgresStore) seedExtraUsers(ctx context.Context, orgID int64) error {
	hash, err := bcrypt.GenerateFromPassword([]byte("demo1234"), bcrypt.DefaultCost)
	if err != nil {
		return err
	}
	_, err = s.pool.Exec(ctx,
		`INSERT INTO users (organization_id, email, password_hash, display_name) VALUES ($1, $2, $3, $4) ON CONFLICT (email) DO NOTHING`,
		orgID, "superadmin@demo.local", string(hash), "Super Admin",
	)
	if err != nil {
		return err
	}
	return s.SeedModules(ctx, orgID)
}

func (s *postgresStore) DashboardSummary(ctx context.Context, orgID int64) (*DashboardSummary, error) {
	var d DashboardSummary
	err := s.pool.QueryRow(ctx, `SELECT
		(SELECT COUNT(*)::int FROM assets WHERE organization_id = $1),
		(SELECT COUNT(*)::int FROM users WHERE organization_id = $1),
		(SELECT COUNT(*)::int FROM audit_jobs WHERE organization_id = $1 AND status = 'ongoing'),
		(SELECT COUNT(*)::int FROM repairs WHERE organization_id = $1 AND status = 'pending'),
		(SELECT COUNT(*)::int FROM withdrawals WHERE organization_id = $1 AND status = 'pending')`, orgID).Scan(
		&d.AssetCount, &d.UserCount, &d.AuditOngoing, &d.RepairPending, &d.WithdrawalPending,
	)
	return &d, err
}

func (s *postgresStore) listRowsPG(ctx context.Context, q string, args ...any) ([]Row, error) {
	rows, err := s.pool.Query(ctx, q, args...)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var out []Row
	for rows.Next() {
		var r Row
		var sub, status *string
		var val *int64
		if err := rows.Scan(&r.ID, &r.Title, &sub, &status, &val, &r.CreatedAt); err != nil {
			return nil, err
		}
		if sub != nil {
			r.Subtitle = *sub
		}
		if status != nil {
			r.Status = *status
		}
		if val != nil {
			r.Value = *val
		}
		out = append(out, r)
	}
	return out, rows.Err()
}

func (s *postgresStore) ListUsers(ctx context.Context, orgID int64) ([]Row, error) {
	return s.listRowsPG(ctx, `SELECT id, COALESCE(NULLIF(display_name,''), email), email, NULL, NULL, created_at FROM users WHERE organization_id = $1`, orgID)
}

func (s *postgresStore) ListAssetCategories(ctx context.Context, orgID int64) ([]Row, error) {
	if s.tabAssetsEnabled(ctx) {
		return s.listTabCategories(ctx, orgID)
	}
	return s.listRowsPG(ctx, `SELECT id, name, NULL, NULL, NULL, created_at FROM asset_categories WHERE organization_id = $1`, orgID)
}

func (s *postgresStore) ListSales(ctx context.Context, orgID int64) ([]Row, error) {
	lots, err := s.ListDisposalLots(ctx, orgID)
	if err != nil {
		return nil, err
	}
	if len(lots) > 0 {
		rows := make([]Row, 0, len(lots))
		for _, lot := range lots {
			sub := lot.Buyer
			if lot.AssetCount > 0 {
				sub = fmt.Sprintf("%d รายการ · %s", lot.AssetCount, lot.Buyer)
			}
			rows = append(rows, Row{
				ID:        lot.ID,
				Title:     lot.Lot,
				Subtitle:  sub,
				Status:    lot.Status,
				Value:     int(lot.Amount),
				CreatedAt: lot.CreatedAt,
			})
		}
		return rows, nil
	}
	return s.listRowsPG(ctx, `SELECT id, asset_number, buyer, status, amount, created_at FROM sales WHERE organization_id = $1`, orgID)
}

func (s *postgresStore) ListOrganizations(ctx context.Context) ([]Row, error) {
	return s.listRowsPG(ctx, `SELECT id, name, NULL, NULL, NULL, created_at FROM organizations`)
}

func (s *postgresStore) OrgMenus(ctx context.Context, orgID int64) ([]int, error) {
	rows, err := s.pool.Query(ctx, `SELECT menu_id FROM organization_menus WHERE organization_id = $1 AND enabled = true`, orgID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var ids []int
	for rows.Next() {
		var id int
		if err := rows.Scan(&id); err != nil {
			return nil, err
		}
		ids = append(ids, id)
	}
	return ids, rows.Err()
}
