package store

import (
	"context"
	"crypto/sha256"
	"encoding/hex"
	"errors"
	"time"

	"github.com/vizzelintel/vizzel-track-demo-boss/vizzel-go-app/internal/auth"
)

type RefreshClaims struct {
	UserID         int64
	OrganizationID int64
	RoleID         int64
	Email          string
}

func hashToken(t string) string {
	h := sha256.Sum256([]byte(t))
	return hex.EncodeToString(h[:])
}

func (s *sqliteStore) migrateAuthTables(ctx context.Context) error {
	stmts := []string{
		`CREATE TABLE IF NOT EXISTS refresh_tokens (id INTEGER PRIMARY KEY AUTOINCREMENT, user_id INTEGER NOT NULL, token_hash TEXT NOT NULL UNIQUE, expires_at TEXT NOT NULL, created_at TEXT NOT NULL DEFAULT (datetime('now')))`,
		`CREATE TABLE IF NOT EXISTS warranties (id INTEGER PRIMARY KEY AUTOINCREMENT, organization_id INTEGER NOT NULL, asset_number TEXT NOT NULL, asset_name TEXT NOT NULL DEFAULT '', warranty_end TEXT, status TEXT NOT NULL DEFAULT 'active', created_at TEXT NOT NULL DEFAULT (datetime('now')))`,
		`CREATE TABLE IF NOT EXISTS asset_docs (id INTEGER PRIMARY KEY AUTOINCREMENT, asset_id INTEGER NOT NULL, doc_name TEXT NOT NULL, doc_type TEXT NOT NULL DEFAULT 'file', doc_url TEXT NOT NULL DEFAULT '', created_at TEXT NOT NULL DEFAULT (datetime('now')))`,
		`ALTER TABLE assets ADD COLUMN image_url TEXT NOT NULL DEFAULT ''`,
	}
	for _, q := range stmts {
		_, _ = s.db.ExecContext(ctx, q)
	}
	return nil
}

func (s *sqliteStore) CreateUser(ctx context.Context, orgID int64, email, hash, display string, roleID int64) (*User, error) {
	res, err := s.db.ExecContext(ctx, `INSERT INTO users (organization_id, email, password_hash, display_name, role_id) VALUES (?, ?, ?, ?, ?)`,
		orgID, email, hash, display, roleID)
	if err != nil {
		return nil, err
	}
	id, _ := res.LastInsertId()
	return &User{ID: id, OrganizationID: orgID, RoleID: roleID, Email: email, DisplayName: display}, nil
}

func (s *sqliteStore) UpdateUserPassword(ctx context.Context, userID int64, hash string) error {
	_, err := s.db.ExecContext(ctx, `UPDATE users SET password_hash = ? WHERE id = ?`, hash, userID)
	return err
}

func (s *sqliteStore) IssueRefreshToken(ctx context.Context, userID int64) (string, error) {
	tok, err := auth.RandomToken()
	if err != nil {
		tok = hashToken(time.Now().String())
	}
	exp := time.Now().Add(7 * 24 * time.Hour).Format("2006-01-02 15:04:05")
	_, err = s.db.ExecContext(ctx, `INSERT INTO refresh_tokens (user_id, token_hash, expires_at) VALUES (?, ?, ?)`, userID, hashToken(tok), exp)
	return tok, err
}

func (s *sqliteStore) ValidateRefreshToken(ctx context.Context, token string) (*RefreshClaims, error) {
	row := s.db.QueryRowContext(ctx, `SELECT u.id, u.organization_id, COALESCE(u.role_id,2), u.email FROM refresh_tokens rt JOIN users u ON u.id = rt.user_id WHERE rt.token_hash = ? AND rt.expires_at > datetime('now')`, hashToken(token))
	var c RefreshClaims
	if err := row.Scan(&c.UserID, &c.OrganizationID, &c.RoleID, &c.Email); err != nil {
		return nil, errors.New("invalid refresh")
	}
	return &c, nil
}

func (s *sqliteStore) ListWarranties(ctx context.Context, orgID int64) ([]Row, map[string]int, error) {
	rows, err := s.listRows(ctx, `SELECT id, asset_number, asset_name, status, 0, created_at FROM warranties WHERE organization_id = ?`, orgID)
	if err != nil {
		return nil, nil, err
	}
	if len(rows) == 0 {
		_ = s.seedWarranties(ctx, orgID)
		rows, _ = s.listRows(ctx, `SELECT id, asset_number, asset_name, status, 0, created_at FROM warranties WHERE organization_id = ?`, orgID)
	}
	summary := map[string]int{"active": 0, "expiring": 0, "expired": 0}
	for _, r := range rows {
		summary[r.Status]++
	}
	return rows, summary, nil
}

func (s *sqliteStore) seedWarranties(ctx context.Context, orgID int64) error {
	var n int
	_ = s.db.QueryRowContext(ctx, `SELECT COUNT(*) FROM warranties WHERE organization_id = ?`, orgID).Scan(&n)
	if n > 0 {
		return nil
	}
	_, _ = s.db.ExecContext(ctx, `INSERT INTO warranties (organization_id, asset_number, asset_name, status) VALUES (?, ?, ?, ?), (?, ?, ?, ?)`,
		orgID, "DEMO-00001", "Laptop Unit 1", "active",
		orgID, "DEMO-00002", "Desktop PC Unit 2", "expiring")
	return nil
}
