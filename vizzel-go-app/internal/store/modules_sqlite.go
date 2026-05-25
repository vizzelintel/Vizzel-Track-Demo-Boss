package store

import (
	"context"
	"database/sql"
	"time"
)

func (s *sqliteStore) migrateModules(ctx context.Context) error {
	stmts := []string{
		`CREATE TABLE IF NOT EXISTS departments (id INTEGER PRIMARY KEY AUTOINCREMENT, organization_id INTEGER NOT NULL, name TEXT NOT NULL, created_at TEXT NOT NULL DEFAULT (datetime('now')))`,
		`CREATE TABLE IF NOT EXISTS buildings (id INTEGER PRIMARY KEY AUTOINCREMENT, organization_id INTEGER NOT NULL, name TEXT NOT NULL, created_at TEXT NOT NULL DEFAULT (datetime('now')))`,
		`CREATE TABLE IF NOT EXISTS rooms (id INTEGER PRIMARY KEY AUTOINCREMENT, building_id INTEGER NOT NULL, room_number TEXT NOT NULL, name TEXT NOT NULL, created_at TEXT NOT NULL DEFAULT (datetime('now')))`,
		`CREATE TABLE IF NOT EXISTS asset_categories (id INTEGER PRIMARY KEY AUTOINCREMENT, organization_id INTEGER NOT NULL, name TEXT NOT NULL, created_at TEXT NOT NULL DEFAULT (datetime('now')))`,
		`CREATE TABLE IF NOT EXISTS asset_classes (id INTEGER PRIMARY KEY AUTOINCREMENT, organization_id INTEGER NOT NULL, category_id INTEGER, name TEXT NOT NULL, created_at TEXT NOT NULL DEFAULT (datetime('now')))`,
		`CREATE TABLE IF NOT EXISTS audit_jobs (id INTEGER PRIMARY KEY AUTOINCREMENT, organization_id INTEGER NOT NULL, title TEXT NOT NULL, status TEXT NOT NULL DEFAULT 'ongoing', progress INTEGER NOT NULL DEFAULT 0, created_at TEXT NOT NULL DEFAULT (datetime('now')))`,
		`CREATE TABLE IF NOT EXISTS repairs (id INTEGER PRIMARY KEY AUTOINCREMENT, organization_id INTEGER NOT NULL, asset_number TEXT NOT NULL, note TEXT NOT NULL DEFAULT '', status TEXT NOT NULL DEFAULT 'pending', created_at TEXT NOT NULL DEFAULT (datetime('now')))`,
		`CREATE TABLE IF NOT EXISTS withdrawals (id INTEGER PRIMARY KEY AUTOINCREMENT, organization_id INTEGER NOT NULL, requester TEXT NOT NULL, item_name TEXT NOT NULL, status TEXT NOT NULL DEFAULT 'pending', created_at TEXT NOT NULL DEFAULT (datetime('now')))`,
		`CREATE TABLE IF NOT EXISTS sales (id INTEGER PRIMARY KEY AUTOINCREMENT, organization_id INTEGER NOT NULL, asset_number TEXT NOT NULL, buyer TEXT NOT NULL DEFAULT '', amount INTEGER NOT NULL DEFAULT 0, status TEXT NOT NULL DEFAULT 'draft', created_at TEXT NOT NULL DEFAULT (datetime('now')))`,
		`CREATE TABLE IF NOT EXISTS organization_menus (organization_id INTEGER NOT NULL, menu_id INTEGER NOT NULL, enabled INTEGER NOT NULL DEFAULT 1, PRIMARY KEY (organization_id, menu_id))`,
	}
	for _, q := range stmts {
		if _, err := s.db.ExecContext(ctx, q); err != nil {
			return err
		}
	}
	return nil
}

func (s *sqliteStore) SeedModules(ctx context.Context, orgID int64) error {
	if err := s.migrateModules(ctx); err != nil {
		return err
	}
	var n int
	if err := s.db.QueryRowContext(ctx, `SELECT COUNT(*) FROM departments WHERE organization_id = ?`, orgID).Scan(&n); err != nil {
		return err
	}
	if n > 0 {
		return nil
	}
	seed := []struct {
		q string
		a []any
	}{
		{`INSERT INTO departments (organization_id, name) VALUES (?, ?)`, []any{orgID, "ฝ่ายบริหาร"}},
		{`INSERT INTO departments (organization_id, name) VALUES (?, ?)`, []any{orgID, "ฝ่าย IT"}},
		{`INSERT INTO buildings (organization_id, name) VALUES (?, ?)`, []any{orgID, "อาคาร A"}},
		{`INSERT INTO asset_categories (organization_id, name) VALUES (?, ?)`, []any{orgID, "ครุภัณฑ์คอมพิวเตอร์"}},
		{`INSERT INTO asset_categories (organization_id, name) VALUES (?, ?)`, []any{orgID, "เฟอร์นิเจอร์"}},
	}
	for _, row := range seed {
		if _, err := s.db.ExecContext(ctx, row.q, row.a...); err != nil {
			return err
		}
	}
	var buildingID int64
	_ = s.db.QueryRowContext(ctx, `SELECT id FROM buildings WHERE organization_id = ? LIMIT 1`, orgID).Scan(&buildingID)
	_, _ = s.db.ExecContext(ctx, `INSERT INTO rooms (building_id, room_number, name) VALUES (?, ?, ?)`, buildingID, "101", "ห้องประชุม")
	var catID int64
	_ = s.db.QueryRowContext(ctx, `SELECT id FROM asset_categories WHERE organization_id = ? LIMIT 1`, orgID).Scan(&catID)
	_, _ = s.db.ExecContext(ctx, `INSERT INTO asset_classes (organization_id, category_id, name) VALUES (?, ?, ?)`, orgID, catID, "Laptop")
	_, _ = s.db.ExecContext(ctx, `INSERT INTO audit_jobs (organization_id, title, status, progress) VALUES (?, ?, ?, ?)`, orgID, "ตรวจนับ Q2/2026", "ongoing", 45)
	_, _ = s.db.ExecContext(ctx, `INSERT INTO audit_jobs (organization_id, title, status, progress) VALUES (?, ?, ?, ?)`, orgID, "ตรวจนับ Q1/2026", "completed", 100)
	_, _ = s.db.ExecContext(ctx, `INSERT INTO repairs (organization_id, asset_number, note, status) VALUES (?, ?, ?, ?)`, orgID, "DEMO-00001", "จอภาพมีจุดบกสี", "pending")
	_, _ = s.db.ExecContext(ctx, `INSERT INTO withdrawals (organization_id, requester, item_name, status) VALUES (?, ?, ?, ?)`, orgID, "สมชาย ใจดี", "โปรเจคเตอร์", "pending")
	_, _ = s.db.ExecContext(ctx, `INSERT INTO sales (organization_id, asset_number, buyer, amount, status) VALUES (?, ?, ?, ?, ?)`, orgID, "DEMO-00010", "หน่วยงาน ก.", 15000, "draft")
	for _, mid := range []int{1, 2, 3} {
		_, _ = s.db.ExecContext(ctx, `INSERT OR IGNORE INTO organization_menus (organization_id, menu_id, enabled) VALUES (?, ?, 1)`, orgID, mid)
	}
	return nil
}

func (s *sqliteStore) DashboardSummary(ctx context.Context, orgID int64) (*DashboardSummary, error) {
	var d DashboardSummary
	q := `SELECT
		(SELECT COUNT(*) FROM assets WHERE organization_id = ?),
		(SELECT COUNT(*) FROM users WHERE organization_id = ?),
		(SELECT COUNT(*) FROM audit_jobs WHERE organization_id = ? AND status = 'ongoing'),
		(SELECT COUNT(*) FROM repairs WHERE organization_id = ? AND status = 'pending'),
		(SELECT COUNT(*) FROM withdrawals WHERE organization_id = ? AND status = 'pending')`
	err := s.db.QueryRowContext(ctx, q, orgID, orgID, orgID, orgID, orgID).Scan(
		&d.AssetCount, &d.UserCount, &d.AuditOngoing, &d.RepairPending, &d.WithdrawalPending,
	)
	return &d, err
}

func (s *sqliteStore) listRows(ctx context.Context, q string, args ...any) ([]Row, error) {
	rows, err := s.db.QueryContext(ctx, q, args...)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var out []Row
	for rows.Next() {
		var r Row
		var created string
		var sub, status sql.NullString
		var val sql.NullInt64
		if err := rows.Scan(&r.ID, &r.Title, &sub, &status, &val, &created); err != nil {
			return nil, err
		}
		r.Subtitle = sub.String
		r.Status = status.String
		r.Value = val.Int64
		t, _ := time.Parse("2006-01-02 15:04:05", created)
		r.CreatedAt = t
		out = append(out, r)
	}
	return out, rows.Err()
}

func (s *sqliteStore) ListUsers(ctx context.Context, orgID int64) ([]Row, error) {
	return s.listRows(ctx, `SELECT id, COALESCE(display_name, email), email, '', 0, created_at FROM users WHERE organization_id = ?`, orgID)
}

func (s *sqliteStore) ListDepartments(ctx context.Context, orgID int64) ([]Row, error) {
	return s.listRows(ctx, `SELECT id, name, '', '', 0, created_at FROM departments WHERE organization_id = ?`, orgID)
}

func (s *sqliteStore) ListBuildings(ctx context.Context, orgID int64) ([]Row, error) {
	return s.listRows(ctx, `SELECT id, name, '', '', 0, created_at FROM buildings WHERE organization_id = ?`, orgID)
}

func (s *sqliteStore) ListRooms(ctx context.Context, orgID int64) ([]Row, error) {
	return s.listRows(ctx, `SELECT r.id, r.name, r.room_number, '', 0, r.created_at FROM rooms r JOIN buildings b ON b.id = r.building_id WHERE b.organization_id = ?`, orgID)
}

func (s *sqliteStore) ListAssetCategories(ctx context.Context, orgID int64) ([]Row, error) {
	return s.listRows(ctx, `SELECT id, name, '', '', 0, created_at FROM asset_categories WHERE organization_id = ?`, orgID)
}

func (s *sqliteStore) ListAssetClasses(ctx context.Context, orgID int64) ([]Row, error) {
	return s.listRows(ctx, `SELECT id, name, '', '', 0, created_at FROM asset_classes WHERE organization_id = ?`, orgID)
}

func (s *sqliteStore) ListAuditJobs(ctx context.Context, orgID int64, status string) ([]Row, error) {
	if status != "" {
		return s.listRows(ctx, `SELECT id, title, '', status, progress, created_at FROM audit_jobs WHERE organization_id = ? AND status = ?`, orgID, status)
	}
	return s.listRows(ctx, `SELECT id, title, '', status, progress, created_at FROM audit_jobs WHERE organization_id = ?`, orgID)
}

func (s *sqliteStore) ListRepairs(ctx context.Context, orgID int64) ([]Row, error) {
	return s.listRows(ctx, `SELECT id, asset_number, note, status, 0, created_at FROM repairs WHERE organization_id = ?`, orgID)
}

func (s *sqliteStore) ListWithdrawals(ctx context.Context, orgID int64) ([]Row, error) {
	return s.listRows(ctx, `SELECT id, requester, item_name, status, 0, created_at FROM withdrawals WHERE organization_id = ?`, orgID)
}

func (s *sqliteStore) ListSales(ctx context.Context, orgID int64) ([]Row, error) {
	return s.listRows(ctx, `SELECT id, asset_number, buyer, status, amount, created_at FROM sales WHERE organization_id = ?`, orgID)
}

func (s *sqliteStore) ListOrganizations(ctx context.Context) ([]Row, error) {
	return s.listRows(ctx, `SELECT id, name, '', '', 0, created_at FROM organizations`)
}

func (s *sqliteStore) OrgMenus(ctx context.Context, orgID int64) ([]int, error) {
	rows, err := s.db.QueryContext(ctx, `SELECT menu_id FROM organization_menus WHERE organization_id = ? AND enabled = 1`, orgID)
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
