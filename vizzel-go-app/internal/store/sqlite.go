package store

import (
	"context"
	"database/sql"
	"fmt"
	"strings"
	"time"

	"golang.org/x/crypto/bcrypt"
	_ "modernc.org/sqlite"
)

type sqliteStore struct {
	db *sql.DB
}

func openSQLite(ctx context.Context, path string) (Store, error) {
	db, err := sql.Open("sqlite", path)
	if err != nil {
		return nil, err
	}
	db.SetMaxOpenConns(1)
	s := &sqliteStore{db: db}
	if err := s.Ping(ctx); err != nil {
		_ = db.Close()
		return nil, err
	}
	return s, nil
}

func (s *sqliteStore) Driver() string { return "sqlite" }

func (s *sqliteStore) Ping(ctx context.Context) error {
	return s.db.PingContext(ctx)
}

func (s *sqliteStore) Migrate(ctx context.Context) error {
	stmts := []string{
		`CREATE TABLE IF NOT EXISTS organizations (
			id INTEGER PRIMARY KEY AUTOINCREMENT,
			name TEXT NOT NULL,
			created_at TEXT NOT NULL DEFAULT (datetime('now'))
		)`,
		`CREATE TABLE IF NOT EXISTS users (
			id INTEGER PRIMARY KEY AUTOINCREMENT,
			organization_id INTEGER NOT NULL REFERENCES organizations(id),
			email TEXT NOT NULL UNIQUE,
			password_hash TEXT NOT NULL,
			display_name TEXT NOT NULL DEFAULT '',
			created_at TEXT NOT NULL DEFAULT (datetime('now'))
		)`,
		`CREATE TABLE IF NOT EXISTS assets (
			id INTEGER PRIMARY KEY AUTOINCREMENT,
			organization_id INTEGER NOT NULL REFERENCES organizations(id),
			asset_number TEXT NOT NULL,
			asset_name TEXT NOT NULL,
			asset_value INTEGER NOT NULL DEFAULT 0,
			status TEXT NOT NULL DEFAULT 'active',
			created_at TEXT NOT NULL DEFAULT (datetime('now'))
		)`,
		`CREATE INDEX IF NOT EXISTS idx_assets_org_id ON assets(organization_id)`,
		`CREATE INDEX IF NOT EXISTS idx_assets_org_created ON assets(organization_id, id)`,
	}
	for _, q := range stmts {
		if _, err := s.db.ExecContext(ctx, q); err != nil {
			return fmt.Errorf("sqlite migrate: %w", err)
		}
	}
	if err := s.migrateModules(ctx); err != nil {
		return err
	}
	if err := s.migrateAssetsEnrich(ctx); err != nil {
		return err
	}
	if err := s.migrateExtended(ctx); err != nil {
		return err
	}
	if err := s.migrateAuthTables(ctx); err != nil {
		return err
	}
	return s.migrateRBAC(ctx)
}

func (s *sqliteStore) migrateRBAC(ctx context.Context) error {
	stmts := []string{
		`CREATE TABLE IF NOT EXISTS tab_role (
			id INTEGER PRIMARY KEY AUTOINCREMENT,
			name TEXT NOT NULL,
			description TEXT NOT NULL DEFAULT '',
			is_system INTEGER NOT NULL DEFAULT 0,
			is_locked INTEGER NOT NULL DEFAULT 0,
			created_at TEXT NOT NULL DEFAULT (datetime('now')),
			updated_at TEXT
		)`,
		`CREATE TABLE IF NOT EXISTS lov_resource (
			id INTEGER PRIMARY KEY AUTOINCREMENT,
			code TEXT NOT NULL UNIQUE,
			label TEXT NOT NULL,
			sort_order INTEGER NOT NULL DEFAULT 0
		)`,
		`CREATE TABLE IF NOT EXISTS tab_role_permission (
			id INTEGER PRIMARY KEY AUTOINCREMENT,
			role_id INTEGER NOT NULL REFERENCES tab_role(id) ON DELETE CASCADE,
			resource TEXT NOT NULL,
			can_view INTEGER NOT NULL DEFAULT 0,
			can_edit INTEGER NOT NULL DEFAULT 0,
			can_delete INTEGER NOT NULL DEFAULT 0,
			UNIQUE (role_id, resource)
		)`,
		`ALTER TABLE assets ADD COLUMN asset_details TEXT`,
		`ALTER TABLE assets ADD COLUMN received_date TEXT`,
		`ALTER TABLE assets ADD COLUMN warranty_start TEXT`,
		`ALTER TABLE assets ADD COLUMN warranty_end TEXT`,
		`ALTER TABLE assets ADD COLUMN accumulated_depr REAL DEFAULT 0`,
		`ALTER TABLE assets ADD COLUMN net_book_value REAL DEFAULT 0`,
		`ALTER TABLE assets ADD COLUMN available_age INTEGER`,
		`ALTER TABLE assets ADD COLUMN condition_name TEXT`,
		`ALTER TABLE assets ADD COLUMN responsible_dept TEXT`,
		`ALTER TABLE assets ADD COLUMN get_by_label TEXT`,
		`ALTER TABLE assets ADD COLUMN source_fund_label TEXT`,
	}
	for _, q := range stmts {
		if _, err := s.db.ExecContext(ctx, q); err != nil {
			lower := strings.ToLower(err.Error())
			if strings.Contains(lower, "duplicate column") || strings.Contains(lower, "already exists") {
				continue
			}
			return fmt.Errorf("sqlite rbac migrate: %w", err)
		}
	}
	roles := []struct {
		ID     int64
		Name   string
		Desc   string
		System bool
		Locked bool
	}{
		{1, "Super Admin", "ผู้ดูแลระบบสูงสุด (ล็อก ทำได้ทุกอย่าง)", true, true},
		{2, "Admin Organization", "ผู้ดูแลองค์กร", true, false},
		{3, "Officer", "เจ้าหน้าที่", true, false},
		{4, "Member", "สมาชิก", true, false},
	}
	for _, r := range roles {
		_, _ = s.db.ExecContext(ctx,
			`INSERT OR IGNORE INTO tab_role (id, name, description, is_system, is_locked) VALUES (?, ?, ?, ?, ?)`,
			r.ID, r.Name, r.Desc, boolToInt(r.System), boolToInt(r.Locked))
	}
	resources := [][]any{
		{"assets", "สินทรัพย์/ครุภัณฑ์", 10},
		{"users", "ผู้ใช้งาน", 20},
		{"organization", "องค์กร / โครงสร้าง", 30},
		{"audit", "ตรวจนับสินทรัพย์", 40},
		{"withdrawal", "เบิก-ยืม", 50},
		{"transfer", "โอนย้าย", 60},
		{"repair", "แจ้งซ่อม", 70},
		{"sales", "จำหน่าย", 80},
		{"reports", "รายงาน", 90},
		{"settings", "ตั้งค่าระบบ", 100},
		{"super_admin", "Super Admin", 110},
	}
	for _, r := range resources {
		_, _ = s.db.ExecContext(ctx,
			`INSERT OR IGNORE INTO lov_resource (code, label, sort_order) VALUES (?, ?, ?)`, r...)
	}
	for _, r := range resources {
		code := r[0].(string)
		if code != "super_admin" {
			_, _ = s.db.ExecContext(ctx,
				`INSERT OR IGNORE INTO tab_role_permission (role_id, resource, can_view, can_edit, can_delete) VALUES (?, ?, 1, 1, 1)`,
				2, code)
		}
	}
	role3 := [][]any{
		{3, "assets", 1, 1, 0}, {3, "audit", 1, 1, 0}, {3, "withdrawal", 1, 1, 0},
		{3, "transfer", 1, 1, 0}, {3, "repair", 1, 1, 0}, {3, "sales", 1, 1, 0},
		{3, "reports", 1, 0, 0}, {3, "organization", 1, 0, 0}, {3, "users", 1, 0, 0}, {3, "settings", 1, 0, 0},
	}
	for _, p := range role3 {
		_, _ = s.db.ExecContext(ctx,
			`INSERT OR IGNORE INTO tab_role_permission (role_id, resource, can_view, can_edit, can_delete) VALUES (?, ?, ?, ?, ?)`, p...)
	}
	role4 := [][]any{
		{4, "assets", 1, 0, 0}, {4, "audit", 1, 0, 0},
		{4, "withdrawal", 1, 1, 0}, {4, "reports", 1, 0, 0},
	}
	for _, p := range role4 {
		_, _ = s.db.ExecContext(ctx,
			`INSERT OR IGNORE INTO tab_role_permission (role_id, resource, can_view, can_edit, can_delete) VALUES (?, ?, ?, ?, ?)`, p...)
	}
	return nil
}

func boolToInt(b bool) int {
	if b {
		return 1
	}
	return 0
}

func (s *sqliteStore) SeedDemo(ctx context.Context, email, password string, assetCount int) error {
	var orgCount int
	if err := s.db.QueryRowContext(ctx, `SELECT COUNT(*) FROM organizations`).Scan(&orgCount); err != nil {
		return err
	}
	if orgCount > 0 {
		_ = s.SeedModules(ctx, 1)
		if err := s.ensureAssetCount(ctx, 1, assetCount); err != nil {
			return err
		}
		return s.EnrichAssets(ctx, 1)
	}

	hash, err := bcrypt.GenerateFromPassword([]byte(password), bcrypt.DefaultCost)
	if err != nil {
		return err
	}

	tx, err := s.db.BeginTx(ctx, nil)
	if err != nil {
		return err
	}
	defer tx.Rollback()

	res, err := tx.ExecContext(ctx, `INSERT INTO organizations (name) VALUES (?)`, "Demo Organization")
	if err != nil {
		return err
	}
	orgID, err := res.LastInsertId()
	if err != nil {
		return err
	}

	_, err = tx.ExecContext(ctx,
		`INSERT INTO users (organization_id, email, password_hash, display_name) VALUES (?, ?, ?, ?)`,
		orgID, email, string(hash), "Demo Admin",
	)
	if err != nil {
		return err
	}

	if err := insertAssets(ctx, tx, orgID, assetCount, "?"); err != nil {
		return err
	}
	if err := tx.Commit(); err != nil {
		return err
	}
	if err := s.seedExtraUsers(ctx, orgID); err != nil {
		return err
	}
	return s.EnrichAssets(ctx, orgID)
}

func (s *sqliteStore) seedExtraUsers(ctx context.Context, orgID int64) error {
	hash, err := bcrypt.GenerateFromPassword([]byte("demo1234"), bcrypt.DefaultCost)
	if err != nil {
		return err
	}
	_, err = s.db.ExecContext(ctx,
		`INSERT OR IGNORE INTO users (organization_id, email, password_hash, display_name) VALUES (?, ?, ?, ?)`,
		orgID, "superadmin@demo.local", string(hash), "Super Admin",
	)
	if err != nil {
		return err
	}
	// Promote the superadmin demo account regardless of when the row landed
	// (the migrateExtended() UPDATE runs *before* the user is created the
	// first time, so we re-apply it here as well).
	if _, err := s.db.ExecContext(ctx,
		`UPDATE users SET role_id = 1 WHERE email = 'superadmin@demo.local'`); err != nil {
		return err
	}
	return s.SeedModules(ctx, orgID)
}

func (s *sqliteStore) ensureAssetCount(ctx context.Context, orgID int64, want int) error {
	var n int
	if err := s.db.QueryRowContext(ctx, `SELECT COUNT(*) FROM assets WHERE organization_id = ?`, orgID).Scan(&n); err != nil {
		return err
	}
	if n >= want {
		return nil
	}
	tx, err := s.db.BeginTx(ctx, nil)
	if err != nil {
		return err
	}
	defer tx.Rollback()
	if err := insertAssets(ctx, tx, orgID, want-n, "?"); err != nil {
		return err
	}
	return tx.Commit()
}

func insertAssets(ctx context.Context, tx *sql.Tx, orgID int64, count int, ph string) error {
	stmt := fmt.Sprintf(`INSERT INTO assets (organization_id, asset_number, asset_name, asset_value, status) VALUES (%s, %s, %s, %s, 'active')`, ph, ph, ph, ph)
	var start int64
	if err := tx.QueryRowContext(ctx, `SELECT COALESCE(MAX(id), 0) FROM assets WHERE organization_id = ?`, orgID).Scan(&start); err != nil {
		return err
	}
	for i := 1; i <= count; i++ {
		idx := int(start) + i
		val := int64((idx % 50) * 1000)
		if _, err := tx.ExecContext(ctx, stmt, orgID, assetNumber(idx), assetName(idx), val); err != nil {
			return err
		}
	}
	return nil
}

func (s *sqliteStore) UserByEmail(ctx context.Context, email string) (*UserRecord, error) {
	email = strings.ToLower(strings.TrimSpace(email))
	row := s.db.QueryRowContext(ctx,
		`SELECT id, organization_id, COALESCE(role_id,2), email, password_hash, display_name FROM users WHERE email = ?`, email,
	)
	var u UserRecord
	if err := row.Scan(&u.ID, &u.OrganizationID, &u.RoleID, &u.Email, &u.PasswordHash, &u.DisplayName); err != nil {
		return nil, err
	}
	return &u, nil
}

func (s *sqliteStore) ListAssets(ctx context.Context, orgID int64, cursor int64, limit int) ([]Asset, int64, bool, error) {
	if limit <= 0 || limit > 100 {
		limit = 20
	}
	q := `SELECT id, organization_id, asset_number, asset_name, asset_value, status, created_at
		FROM assets WHERE organization_id = ?`
	args := []any{orgID}
	if cursor > 0 {
		q += ` AND id > ?`
		args = append(args, cursor)
	}
	q += ` ORDER BY id ASC LIMIT ?`
	args = append(args, limit+1)

	rows, err := s.db.QueryContext(ctx, q, args...)
	if err != nil {
		return nil, 0, false, err
	}
	defer rows.Close()

	var items []Asset
	for rows.Next() {
		var a Asset
		var created string
		if err := rows.Scan(&a.ID, &a.OrganizationID, &a.AssetNumber, &a.AssetName, &a.AssetValue, &a.Status, &created); err != nil {
			return nil, 0, false, err
		}
		t, _ := time.Parse("2006-01-02 15:04:05", created)
		if t.IsZero() {
			t, _ = time.Parse(time.RFC3339, created)
		}
		a.CreatedAt = t
		items = append(items, a)
	}
	hasMore := len(items) > limit
	if hasMore {
		items = items[:limit]
	}
	var next int64
	if len(items) > 0 {
		next = items[len(items)-1].ID
	}
	return items, next, hasMore, rows.Err()
}
