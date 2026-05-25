package store

import (
	"context"
	"fmt"
	"time"
)

func (s *sqliteStore) migrateAssetsEnrich(ctx context.Context) error {
	cols := []string{
		`ALTER TABLE assets ADD COLUMN rfid_num TEXT`,
		`ALTER TABLE assets ADD COLUMN category_id INTEGER`,
		`ALTER TABLE assets ADD COLUMN class_id INTEGER`,
		`ALTER TABLE assets ADD COLUMN category_name TEXT NOT NULL DEFAULT ''`,
		`ALTER TABLE assets ADD COLUMN class_name TEXT NOT NULL DEFAULT ''`,
		`ALTER TABLE assets ADD COLUMN type_name TEXT NOT NULL DEFAULT ''`,
		`ALTER TABLE assets ADD COLUMN building_name TEXT NOT NULL DEFAULT ''`,
		`ALTER TABLE assets ADD COLUMN room_name TEXT NOT NULL DEFAULT ''`,
		`ALTER TABLE assets ADD COLUMN owner_name TEXT NOT NULL DEFAULT ''`,
		`ALTER TABLE assets ADD COLUMN asset_status_name TEXT NOT NULL DEFAULT 'ใช้งาน'`,
	}
	for _, q := range cols {
		_, _ = s.db.ExecContext(ctx, q) // ignore duplicate column
	}
	return nil
}

func (s *sqliteStore) EnrichAssets(ctx context.Context, orgID int64) error {
	if err := s.migrateAssetsEnrich(ctx); err != nil {
		return err
	}
	rows, err := s.db.QueryContext(ctx, `SELECT id FROM assets WHERE organization_id = ? AND (category_name = '' OR category_name IS NULL)`, orgID)
	if err != nil {
		return err
	}
	defer rows.Close()
	var ids []int64
	for rows.Next() {
		var id int64
		_ = rows.Scan(&id)
		ids = append(ids, id)
	}
	cats, _ := s.ListAssetCategories(ctx, orgID)
	classes, _ := s.ListAssetClasses(ctx, orgID, 0)
	for _, id := range ids {
		cat, class, typ, bld, room, owner, st := assetMeta(int(id))
		var catID, classID int64
		if len(cats) > 0 {
			catID = cats[int(id)%len(cats)].ID
		}
		if len(classes) > 0 {
			classID = classes[int(id)%len(classes)].ID
		}
		_, _ = s.db.ExecContext(ctx, `UPDATE assets SET rfid_num=?, category_id=?, class_id=?, category_name=?, class_name=?, type_name=?, building_name=?, room_name=?, owner_name=?, asset_status_name=? WHERE id=?`,
			fmt.Sprintf("RFID-%05d", id), catID, classID, cat, class, typ, bld, room, owner, st, id)
	}
	return nil
}

func (s *sqliteStore) ListAssetsPaged(ctx context.Context, orgID int64, page, pageSize int, f AssetFilter) (*AssetListResult, error) {
	if page < 1 {
		page = 1
	}
	if pageSize <= 0 || pageSize > 100 {
		pageSize = 10
	}
	where := `WHERE organization_id = ? AND status != 'deleted'`
	args := []any{orgID}
	if f.Search != "" {
		where += ` AND (asset_name LIKE ? OR asset_number LIKE ? OR rfid_num LIKE ?)`
		like := "%" + f.Search + "%"
		args = append(args, like, like, like)
	}
	if f.CategoryID > 0 {
		where += ` AND category_id = ?`
		args = append(args, f.CategoryID)
	}
	if f.ClassID > 0 {
		where += ` AND class_id = ?`
		args = append(args, f.ClassID)
	}
	if f.StatusName != "" {
		where += ` AND asset_status_name = ?`
		args = append(args, f.StatusName)
	}
	var total int
	if err := s.db.QueryRowContext(ctx, `SELECT COUNT(*) FROM assets `+where, args...).Scan(&total); err != nil {
		return nil, err
	}
	offset := (page - 1) * pageSize
	q := `SELECT id, organization_id, asset_number, asset_name, COALESCE(rfid_num,''), COALESCE(category_id,0), COALESCE(class_id,0),
		category_name, class_name, type_name, building_name, room_name, owner_name, asset_status_name, asset_value, status, created_at
		FROM assets ` + where + ` ORDER BY id DESC LIMIT ? OFFSET ?`
	args = append(args, pageSize, offset)
	rows, err := s.db.QueryContext(ctx, q, args...)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var data []Asset
	for rows.Next() {
		var a Asset
		var created string
		if err := rows.Scan(&a.ID, &a.OrganizationID, &a.AssetNumber, &a.AssetName, &a.RFIDNum, &a.CategoryID, &a.ClassID,
			&a.CategoryName, &a.ClassName, &a.TypeName, &a.BuildingName, &a.RoomName, &a.OwnerName, &a.AssetStatusName,
			&a.AssetValue, &a.Status, &created); err != nil {
			return nil, err
		}
		a.CreatedAt, _ = parseSQLiteTime(created)
		data = append(data, a)
	}
	pages := total / pageSize
	if total%pageSize > 0 {
		pages++
	}
	return &AssetListResult{Page: page, PageSize: pageSize, Total: total, TotalPages: pages, Data: data}, rows.Err()
}

func (s *sqliteStore) AssetReferenceData(ctx context.Context, orgID int64) (*AssetReferenceData, error) {
	cats, err := s.ListAssetCategories(ctx, orgID)
	if err != nil {
		return nil, err
	}
	types, err := s.ListAssetTypes(ctx, orgID, 0)
	if err != nil {
		return nil, err
	}
	classes, err := s.ListAssetClasses(ctx, orgID, 0)
	if err != nil {
		return nil, err
	}
	statuses := []Row{
		{ID: 1, Title: "ใช้งาน"},
		{ID: 2, Title: "ซ่อมบำรุง"},
		{ID: 3, Title: "จำหน่ายแล้ว"},
	}
	return &AssetReferenceData{Categories: cats, Types: types, Classes: classes, Statuses: statuses}, nil
}

func parseSQLiteTime(created string) (time.Time, error) {
	t, err := time.Parse("2006-01-02 15:04:05", created)
	if err == nil {
		return t, nil
	}
	return time.Parse(time.RFC3339, created)
}
