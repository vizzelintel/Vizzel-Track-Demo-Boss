package store

import (
	"context"
	"errors"
	"fmt"
	"strings"

	"github.com/jackc/pgx/v5"
)

// ElaasAssetRow is the pre-resolved per-row payload BulkInsertElaasAssets
// expects. Every FK id (class/status/get_by/source_fund) must already be
// looked up by the caller — the bulk path does NOT do any extra SELECTs so
// the whole import collapses into a handful of multi-row INSERT statements.
type ElaasAssetRow struct {
	AssetNumber     string
	ElaasCode       string
	AssetName       string
	AssetDetails    string
	ClassID         int64
	AssetValue      int64
	StatusID        int64
	IsDepreciation  bool
	ReceivedDate    string
	GetByID         int64
	GetFrom         string
	SourceFundID    int64
	AvailableAge    int64
	CategoryName    string
	TypeName        string
	ClassName       string
	AssetStatusName string
}

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
	// Idempotent insert: migration 027 adds a UNIQUE constraint on `name`, so
	// ON CONFLICT lets us scoop the existing id back even when a parallel
	// importer race-inserted the same label. Without this, the second insert
	// would explode with duplicate_key on either the name uq or the legacy
	// pkey (when the sequence was below the explicit ids from 007/011).
	err = s.pool.QueryRow(ctx,
		`INSERT INTO `+table+` (name) VALUES ($1)
		 ON CONFLICT (name) DO UPDATE SET name = EXCLUDED.name
		 RETURNING id`, name,
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

// BulkInsertElaasAssets bulk-loads pre-resolved ELAAS rows into tab_asset in
// chunks. We can't use pgx CopyFrom (the Supabase transaction pooler doesn't
// support it) nor SendBatch (same reason), so we build a single multi-row
// INSERT per chunk and rely on QueryExecModeSimpleProtocol to inline params
// as text. With chunk=500 a 3000-row import becomes 6 round-trips — well
// under the Fly 60s proxy idle timeout that caused the previous 502 storm.
func (s *postgresStore) BulkInsertElaasAssets(ctx context.Context, orgID int64, rows []ElaasAssetRow) (int, error) {
	if len(rows) == 0 {
		return 0, nil
	}
	if !s.tabAssetsEnabled(ctx) {
		// Fall back to the per-row CreateAsset legacy path for the old
		// `assets` table layout. We don't expect this branch to run in
		// production (Supabase has tab_asset) but keeps the importer
		// working against any postgres dev DB still on the demo schema.
		inserted := 0
		for _, r := range rows {
			in := AssetInput{
				AssetNumber:     r.AssetNumber,
				ElaasCode:       r.ElaasCode,
				AssetName:       r.AssetName,
				AssetDetails:    r.AssetDetails,
				CategoryName:    r.CategoryName,
				TypeName:        r.TypeName,
				ClassName:       r.ClassName,
				AssetStatusName: r.AssetStatusName,
				AssetValue:      r.AssetValue,
				IsDepreciation:  r.IsDepreciation,
			}
			if _, err := s.CreateAsset(ctx, orgID, in); err != nil {
				return inserted, err
			}
			inserted++
		}
		return inserted, nil
	}
	const chunkSize = 500
	total := 0
	for i := 0; i < len(rows); i += chunkSize {
		end := i + chunkSize
		if end > len(rows) {
			end = len(rows)
		}
		n, err := s.insertElaasChunk(ctx, orgID, rows[i:end])
		if err != nil {
			return total, fmt.Errorf("bulk insert chunk %d..%d: %w", i, end, err)
		}
		total += n
	}
	return total, nil
}

// insertElaasChunk builds & executes a single multi-row INSERT covering up
// to ~500 rows × 18 columns. We use SQL placeholders ($1, $2, …) so pgx's
// simple-protocol mode does the text encoding for us; no manual escaping
// is required.
func (s *postgresStore) insertElaasChunk(ctx context.Context, orgID int64, rows []ElaasAssetRow) (int, error) {
	const colsPerRow = 18
	var sb strings.Builder
	sb.WriteString(`INSERT INTO tab_asset (
		asset_number, elaas_code, rfid_num, asset_name, asset_details, asset_class_id, asset_value, organization_id,
		asset_status_id, is_check, is_depreciation, received_date, expiry_date, get_by_id, get_from, source_fund_id, available_age, created_by
	) VALUES `)
	args := make([]any, 0, len(rows)*colsPerRow)
	argIdx := 1
	for i, r := range rows {
		if i > 0 {
			sb.WriteString(",")
		}
		sb.WriteString("(")
		for j := 0; j < colsPerRow; j++ {
			if j > 0 {
				sb.WriteString(",")
			}
			sb.WriteString(fmt.Sprintf("$%d", argIdx+j))
		}
		sb.WriteString(")")
		argIdx += colsPerRow
		args = append(args,
			r.AssetNumber,
			nullStr(r.ElaasCode),
			nil, // rfid_num: ELAAS export doesn't carry RFIDs
			r.AssetName,
			nullStr(r.AssetDetails),
			nullInt64(r.ClassID),
			r.AssetValue,
			orgID,
			nullInt64(r.StatusID),
			false, // is_check
			r.IsDepreciation,
			parseInputTime(r.ReceivedDate),
			parseInputTimePtr(""), // expiry_date: never set on ELAAS import
			nullInt64(r.GetByID),
			nullStr(r.GetFrom),
			nullInt64(r.SourceFundID),
			nullInt64(r.AvailableAge),
			int64(1), // created_by — TODO: thread user id once the importer plumbs it
		)
	}
	tag, err := s.pool.Exec(ctx, sb.String(), args...)
	if err != nil {
		return 0, err
	}
	return int(tag.RowsAffected()), nil
}
