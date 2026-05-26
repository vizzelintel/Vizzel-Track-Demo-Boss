package store

import (
	"context"
	"fmt"
	"os"
	"strings"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
	"golang.org/x/crypto/bcrypt"
)

type postgresStore struct {
	pool *pgxpool.Pool
}

func openPostgres(ctx context.Context, dbURL string) (Store, error) {
	cfg, err := pgxpool.ParseConfig(dbURL)
	if err != nil {
		return nil, err
	}
	// Supabase transaction pooler (port 6543) does not support prepared statements.
	cfg.ConnConfig.DefaultQueryExecMode = pgx.QueryExecModeSimpleProtocol
	pool, err := pgxpool.NewWithConfig(ctx, cfg)
	if err != nil {
		return nil, err
	}
	s := &postgresStore{pool: pool}
	if err := s.Ping(ctx); err != nil {
		pool.Close()
		return nil, err
	}
	return s, nil
}

func (s *postgresStore) Driver() string { return "postgres" }

func (s *postgresStore) Ping(ctx context.Context) error {
	return s.pool.Ping(ctx)
}

func (s *postgresStore) Migrate(ctx context.Context) error {
	files := []string{
		"001_schema.sql", "002_modules.sql", "003_assets_enrich.sql", "004_extended.sql", "005_production.sql",
		"006_tab_core.sql", "007_tab_asset.sql", "008_tab_structure.sql", "009_tab_ops.sql", "010_sync_demo_to_tab.sql",
		"011_lov_geo.sql", "012_elaas_split_and_reseed.sql",
		"013_asset_components.sql",
		"014_notifications.sql",
		"015_approval_workflow.sql",
		"016_multi_org.sql",
	}
	prefixes := []string{"supabase/migrations/", "vizzel-go-app/supabase/migrations/"}
	for _, name := range files {
		var data []byte
		var err error
		for _, pre := range prefixes {
			data, err = os.ReadFile(pre + name)
			if err == nil {
				break
			}
		}
		if err != nil {
			return fmt.Errorf("read migration %s: %w", name, err)
		}
		for _, stmt := range splitSQL(string(data)) {
			if _, err := s.pool.Exec(ctx, stmt); err != nil {
				return fmt.Errorf("migrate %s: %w", name, err)
			}
		}
	}
	return s.SyncDemoToTab(ctx)
}

func splitSQL(sql string) []string {
	var out []string
	var b strings.Builder
	for _, line := range strings.Split(sql, "\n") {
		trim := strings.TrimSpace(line)
		if strings.HasPrefix(trim, "--") {
			continue
		}
		b.WriteString(line)
		b.WriteString("\n")
		if strings.HasSuffix(trim, ";") {
			stmt := strings.TrimSpace(b.String())
			if stmt != "" {
				out = append(out, stmt)
			}
			b.Reset()
		}
	}
	if tail := strings.TrimSpace(b.String()); tail != "" {
		out = append(out, tail)
	}
	return out
}

func (s *postgresStore) SeedDemo(ctx context.Context, email, password string, assetCount int) error {
	var orgCount int
	if err := s.pool.QueryRow(ctx, `SELECT COUNT(*)::int FROM organizations`).Scan(&orgCount); err != nil {
		return err
	}
	if orgCount > 0 {
		_ = s.SeedModules(ctx, 1)
		_ = s.seedExtraUsers(ctx, 1)
		if err := s.ensureAssetCount(ctx, 1, assetCount); err != nil {
			return err
		}
		if err := s.EnrichAssets(ctx, 1); err != nil {
			return err
		}
		return s.SyncDemoToTab(ctx)
	}

	hash, err := bcrypt.GenerateFromPassword([]byte(password), bcrypt.DefaultCost)
	if err != nil {
		return err
	}

	tx, err := s.pool.Begin(ctx)
	if err != nil {
		return err
	}
	defer tx.Rollback(ctx)

	var orgID int64
	err = tx.QueryRow(ctx, `INSERT INTO organizations (name) VALUES ($1) RETURNING id`, "Demo Organization").Scan(&orgID)
	if err != nil {
		return err
	}

	_, err = tx.Exec(ctx,
		`INSERT INTO users (organization_id, email, password_hash, display_name) VALUES ($1, $2, $3, $4)`,
		orgID, email, string(hash), "Demo Admin",
	)
	if err != nil {
		return err
	}

	if err := insertAssetsPostgres(ctx, tx, orgID, assetCount); err != nil {
		return err
	}
	if err := tx.Commit(ctx); err != nil {
		return err
	}
	if err := s.seedExtraUsers(ctx, orgID); err != nil {
		return err
	}
	if err := s.EnrichAssets(ctx, orgID); err != nil {
		return err
	}
	return s.SyncDemoToTab(ctx)
}

func (s *postgresStore) ensureAssetCount(ctx context.Context, orgID int64, want int) error {
	var n int
	if err := s.pool.QueryRow(ctx, `SELECT COUNT(*)::int FROM assets WHERE organization_id = $1`, orgID).Scan(&n); err != nil {
		return err
	}
	if n >= want {
		return nil
	}
	tx, err := s.pool.Begin(ctx)
	if err != nil {
		return err
	}
	defer tx.Rollback(ctx)
	if err := insertAssetsPostgres(ctx, tx, orgID, want-n); err != nil {
		return err
	}
	return tx.Commit(ctx)
}

func insertAssetsPostgres(ctx context.Context, tx pgx.Tx, orgID int64, count int) error {
	var start int64
	_ = tx.QueryRow(ctx, `SELECT COALESCE(MAX(id), 0) FROM assets WHERE organization_id = $1`, orgID).Scan(&start)
	batch := &pgx.Batch{}
	for i := 1; i <= count; i++ {
		idx := int(start) + i
		val := int64((idx % 50) * 1000)
		batch.Queue(
			`INSERT INTO assets (organization_id, asset_number, asset_name, asset_value, status) VALUES ($1, $2, $3, $4, 'active')`,
			orgID, assetNumber(idx), assetName(idx), val,
		)
	}
	br := tx.SendBatch(ctx, batch)
	defer br.Close()
	for range count {
		if _, err := br.Exec(); err != nil {
			return err
		}
	}
	return nil
}

func (s *postgresStore) UserByEmail(ctx context.Context, email string) (*UserRecord, error) {
	row := s.pool.QueryRow(ctx,
		`SELECT id, organization_id, COALESCE(role_id,2), email, password_hash, display_name FROM users WHERE email = $1`, strings.ToLower(strings.TrimSpace(email)),
	)
	var u UserRecord
	if err := row.Scan(&u.ID, &u.OrganizationID, &u.RoleID, &u.Email, &u.PasswordHash, &u.DisplayName); err != nil {
		return nil, err
	}
	return &u, nil
}

func (s *postgresStore) ListAssets(ctx context.Context, orgID int64, cursor int64, limit int) ([]Asset, int64, bool, error) {
	if limit <= 0 || limit > 100 {
		limit = 20
	}
	q := `SELECT id, organization_id, asset_number, asset_name, asset_value, status, created_at
		FROM assets WHERE organization_id = $1`
	args := []any{orgID}
	n := 2
	if cursor > 0 {
		q += fmt.Sprintf(` AND id > $%d`, n)
		args = append(args, cursor)
		n++
	}
	q += fmt.Sprintf(` ORDER BY id ASC LIMIT $%d`, n)
	args = append(args, limit+1)

	rows, err := s.pool.Query(ctx, q, args...)
	if err != nil {
		return nil, 0, false, err
	}
	defer rows.Close()

	var items []Asset
	for rows.Next() {
		var a Asset
		if err := rows.Scan(&a.ID, &a.OrganizationID, &a.AssetNumber, &a.AssetName, &a.AssetValue, &a.Status, &a.CreatedAt); err != nil {
			return nil, 0, false, err
		}
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
