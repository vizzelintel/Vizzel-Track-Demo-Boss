package store

import (
	"context"
	"errors"
	"strings"

	"github.com/jackc/pgx/v5"
)

// EnsureTabTaxonomy walks the (category, type, class) chain for `orgID`,
// creating missing rows so the resolved class_id can be used as an
// `asset_class_id` foreign key. Empty class falls back to the type name so the
// chain stays joinable; ELAAS reports only carry two levels in practice.
//
// Returns 0 + nil on stores without a tab_asset_* taxonomy (the sqlite dev
// store) so callers can defer to denormalized name columns instead.
func (s *postgresStore) EnsureTabTaxonomy(ctx context.Context, orgID int64, category, typ, class string) (int64, error) {
	category = strings.TrimSpace(category)
	typ = strings.TrimSpace(typ)
	class = strings.TrimSpace(class)
	if class == "" {
		class = typ
	}
	if !s.tabAssetsEnabled(ctx) {
		return 0, nil
	}
	if category == "" && typ == "" && class == "" {
		return 0, nil
	}
	catID, err := s.ensureTabCategory(ctx, orgID, defaultName(category, "ไม่ระบุหมวดหมู่"))
	if err != nil {
		return 0, err
	}
	typeID, err := s.ensureTabType(ctx, catID, defaultName(typ, "ไม่ระบุประเภท"))
	if err != nil {
		return 0, err
	}
	classID, err := s.ensureTabClass(ctx, typeID, defaultName(class, "ไม่ระบุกลุ่ม"))
	if err != nil {
		return 0, err
	}
	return classID, nil
}

func (s *postgresStore) ensureTabCategory(ctx context.Context, orgID int64, name string) (int64, error) {
	var id int64
	err := s.pool.QueryRow(ctx,
		`SELECT id FROM tab_asset_category
		 WHERE category_name = $1 AND (organization_id = $2 OR organization_id IS NULL)
		   AND deleted_at IS NULL
		 ORDER BY (organization_id = $2) DESC, id LIMIT 1`,
		name, orgID,
	).Scan(&id)
	if err == nil {
		return id, nil
	}
	if !errors.Is(err, pgx.ErrNoRows) {
		return 0, err
	}
	err = s.pool.QueryRow(ctx,
		`INSERT INTO tab_asset_category (organization_id, category_name, created_by)
		 VALUES ($1, $2, 1) RETURNING id`,
		orgID, name,
	).Scan(&id)
	return id, err
}

func (s *postgresStore) ensureTabType(ctx context.Context, categoryID int64, name string) (int64, error) {
	var id int64
	err := s.pool.QueryRow(ctx,
		`SELECT id FROM tab_asset_type
		 WHERE category_id = $1 AND type_name = $2 AND deleted_at IS NULL
		 ORDER BY id LIMIT 1`,
		categoryID, name,
	).Scan(&id)
	if err == nil {
		return id, nil
	}
	if !errors.Is(err, pgx.ErrNoRows) {
		return 0, err
	}
	err = s.pool.QueryRow(ctx,
		`INSERT INTO tab_asset_type (category_id, type_name, created_by)
		 VALUES ($1, $2, 1) RETURNING id`,
		categoryID, name,
	).Scan(&id)
	return id, err
}

func (s *postgresStore) ensureTabClass(ctx context.Context, typeID int64, name string) (int64, error) {
	var id int64
	err := s.pool.QueryRow(ctx,
		`SELECT id FROM tab_asset_class
		 WHERE asset_type_id = $1 AND class_name = $2 AND deleted_at IS NULL
		 ORDER BY id LIMIT 1`,
		typeID, name,
	).Scan(&id)
	if err == nil {
		return id, nil
	}
	if !errors.Is(err, pgx.ErrNoRows) {
		return 0, err
	}
	err = s.pool.QueryRow(ctx,
		`INSERT INTO tab_asset_class (asset_type_id, class_name, created_by)
		 VALUES ($1, $2, 1) RETURNING id`,
		typeID, name,
	).Scan(&id)
	return id, err
}

// EnsureTabAssetStatus returns the asset_status_id for the named status,
// creating the row when missing. Empty input falls back to "ปกติ" which is the
// canonical name we map ELAAS "ใช้งาน" to.
func (s *postgresStore) EnsureTabAssetStatus(ctx context.Context, name string) (int64, error) {
	name = strings.TrimSpace(name)
	if name == "" {
		name = "ปกติ"
	}
	if !s.tabAssetsEnabled(ctx) {
		return 0, nil
	}
	var id int64
	err := s.pool.QueryRow(ctx,
		`SELECT id FROM tab_asset_status
		 WHERE status = $1 AND deleted_at IS NULL
		 ORDER BY (organization_id IS NULL) DESC, id LIMIT 1`,
		name,
	).Scan(&id)
	if err == nil {
		return id, nil
	}
	if !errors.Is(err, pgx.ErrNoRows) {
		return 0, err
	}
	err = s.pool.QueryRow(ctx,
		`INSERT INTO tab_asset_status (status, organization_id, created_by)
		 VALUES ($1, NULL, 1) RETURNING id`,
		name,
	).Scan(&id)
	return id, err
}

// EnsureLovGetBy / EnsureLovSourceFund mirror EnsureTabAssetStatus for the
// global LOV tables. Both tables are tiny (<10 rows in production) so an
// up-front SELECT-then-INSERT is fine.
func (s *postgresStore) EnsureLovGetBy(ctx context.Context, name string) (int64, error) {
	return s.ensureLov(ctx, "lov_get_by", name)
}

func (s *postgresStore) EnsureLovSourceFund(ctx context.Context, name string) (int64, error) {
	return s.ensureLov(ctx, "lov_source_fund", name)
}

func (s *postgresStore) ensureLov(ctx context.Context, table, name string) (int64, error) {
	name = strings.TrimSpace(name)
	if name == "" {
		return 0, nil
	}
	var id int64
	err := s.pool.QueryRow(ctx,
		`SELECT id FROM `+table+` WHERE name = $1 LIMIT 1`, name,
	).Scan(&id)
	if err == nil {
		return id, nil
	}
	if !errors.Is(err, pgx.ErrNoRows) {
		return 0, err
	}
	err = s.pool.QueryRow(ctx,
		`INSERT INTO `+table+` (name) VALUES ($1) RETURNING id`, name,
	).Scan(&id)
	return id, err
}

func defaultName(v, def string) string {
	v = strings.TrimSpace(v)
	if v == "" {
		return def
	}
	return v
}
