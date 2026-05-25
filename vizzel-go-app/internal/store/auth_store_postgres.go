package store

import (
	"context"
	"errors"
	"time"

	"github.com/vizzelintel/vizzel-track-demo-boss/vizzel-go-app/internal/auth"
)

func (s *postgresStore) CreateUser(ctx context.Context, orgID int64, email, hash, display string, roleID int64) (*User, error) {
	var id int64
	err := s.pool.QueryRow(ctx, `INSERT INTO users (organization_id, email, password_hash, display_name, role_id) VALUES ($1,$2,$3,$4,$5) RETURNING id`,
		orgID, email, hash, display, roleID).Scan(&id)
	if err != nil {
		return nil, err
	}
	return &User{ID: id, OrganizationID: orgID, RoleID: roleID, Email: email, DisplayName: display}, nil
}

func (s *postgresStore) UpdateUserPassword(ctx context.Context, userID int64, hash string) error {
	_, err := s.pool.Exec(ctx, `UPDATE users SET password_hash = $1 WHERE id = $2`, hash, userID)
	return err
}

func (s *postgresStore) IssueRefreshToken(ctx context.Context, userID int64) (string, error) {
	tok, err := auth.RandomToken()
	if err != nil {
		return "", err
	}
	_, err = s.pool.Exec(ctx, `INSERT INTO refresh_tokens (user_id, token_hash, expires_at) VALUES ($1,$2,$3)`,
		userID, hashToken(tok), time.Now().Add(7*24*time.Hour))
	return tok, err
}

func (s *postgresStore) ValidateRefreshToken(ctx context.Context, token string) (*RefreshClaims, error) {
	row := s.pool.QueryRow(ctx, `SELECT u.id, u.organization_id, COALESCE(u.role_id,2), u.email FROM refresh_tokens rt JOIN users u ON u.id = rt.user_id WHERE rt.token_hash = $1 AND rt.expires_at > NOW()`, hashToken(token))
	var c RefreshClaims
	if err := row.Scan(&c.UserID, &c.OrganizationID, &c.RoleID, &c.Email); err != nil {
		return nil, errors.New("invalid refresh")
	}
	return &c, nil
}

func (s *postgresStore) ListWarranties(ctx context.Context, orgID int64) ([]Row, map[string]int, error) {
	rows, err := s.listRowsPG(ctx, `SELECT id, asset_number, asset_name, status, NULL, created_at FROM warranties WHERE organization_id = $1`, orgID)
	if err != nil {
		return nil, nil, err
	}
	if len(rows) == 0 {
		_, _ = s.pool.Exec(ctx, `INSERT INTO warranties (organization_id, asset_number, asset_name, status) VALUES ($1,$2,$3,$4),($1,$5,$6,$7) ON CONFLICT DO NOTHING`,
			orgID, "DEMO-00001", "Laptop Unit 1", "active", "DEMO-00002", "Desktop PC Unit 2", "expiring")
		rows, _ = s.listRowsPG(ctx, `SELECT id, asset_number, asset_name, status, NULL, created_at FROM warranties WHERE organization_id = $1`, orgID)
	}
	summary := map[string]int{"active": 0, "expiring": 0, "expired": 0}
	for _, r := range rows {
		summary[r.Status]++
	}
	return rows, summary, nil
}
