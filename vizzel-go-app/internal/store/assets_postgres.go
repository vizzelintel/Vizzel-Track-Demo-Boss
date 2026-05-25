package store

import (
	"context"
	"fmt"
)

func (s *postgresStore) EnrichAssets(ctx context.Context, orgID int64) error {
	rows, err := s.pool.Query(ctx, `SELECT id FROM assets WHERE organization_id = $1 AND (category_name = '' OR category_name IS NULL)`, orgID)
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
		_, err := s.pool.Exec(ctx, `UPDATE assets SET rfid_num=$1, category_id=$2, class_id=$3, category_name=$4, class_name=$5, type_name=$6, building_name=$7, room_name=$8, owner_name=$9, asset_status_name=$10 WHERE id=$11`,
			fmt.Sprintf("RFID-%05d", id), catID, classID, cat, class, typ, bld, room, owner, st, id)
		if err != nil {
			return err
		}
	}
	return s.SyncDemoToTab(ctx)
}

func (s *postgresStore) ListAssetsPaged(ctx context.Context, orgID int64, page, pageSize int, f AssetFilter) (*AssetListResult, error) {
	if s.tabAssetsEnabled(ctx) {
		return s.listAssetsTab(ctx, orgID, page, pageSize, f)
	}
	if page < 1 {
		page = 1
	}
	if pageSize <= 0 || pageSize > 100 {
		pageSize = 10
	}
	where := `WHERE organization_id = $1 AND status != 'deleted'`
	args := []any{orgID}
	n := 2
	if f.Search != "" {
		where += fmt.Sprintf(` AND (asset_name ILIKE $%d OR asset_number ILIKE $%d OR rfid_num ILIKE $%d)`, n, n, n)
		args = append(args, "%"+f.Search+"%")
		n++
	}
	if f.CategoryID > 0 {
		where += fmt.Sprintf(` AND category_id = $%d`, n)
		args = append(args, f.CategoryID)
		n++
	}
	if f.TypeID > 0 {
		where += fmt.Sprintf(` AND category_id = $%d`, n)
		args = append(args, f.TypeID)
		n++
	}
	if f.ClassID > 0 {
		where += fmt.Sprintf(` AND class_id = $%d`, n)
		args = append(args, f.ClassID)
		n++
	}
	if f.StatusName != "" {
		where += fmt.Sprintf(` AND asset_status_name = $%d`, n)
		args = append(args, f.StatusName)
		n++
	}
	var total int
	if err := s.pool.QueryRow(ctx, `SELECT COUNT(*)::int FROM assets `+where, args...).Scan(&total); err != nil {
		return nil, err
	}
	offset := (page - 1) * pageSize
	q := fmt.Sprintf(`SELECT id, organization_id, asset_number, asset_name, COALESCE(rfid_num,''), COALESCE(category_id,0), COALESCE(class_id,0),
		COALESCE(category_name,''), COALESCE(class_name,''), COALESCE(type_name,''), COALESCE(building_name,''), COALESCE(room_name,''),
		COALESCE(owner_name,''), COALESCE(asset_status_name,'ใช้งาน'), asset_value, status, created_at
		FROM assets %s ORDER BY id DESC LIMIT $%d OFFSET $%d`, where, n, n+1)
	args = append(args, pageSize, offset)
	rows, err := s.pool.Query(ctx, q, args...)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var data []Asset
	for rows.Next() {
		var a Asset
		if err := rows.Scan(&a.ID, &a.OrganizationID, &a.AssetNumber, &a.AssetName, &a.RFIDNum, &a.CategoryID, &a.ClassID,
			&a.CategoryName, &a.ClassName, &a.TypeName, &a.BuildingName, &a.RoomName, &a.OwnerName, &a.AssetStatusName,
			&a.AssetValue, &a.Status, &a.CreatedAt); err != nil {
			return nil, err
		}
		data = append(data, a)
	}
	pages := total / pageSize
	if total%pageSize > 0 {
		pages++
	}
	return &AssetListResult{Page: page, PageSize: pageSize, Total: total, TotalPages: pages, Data: data}, rows.Err()
}

func (s *postgresStore) AssetReferenceData(ctx context.Context, orgID int64) (*AssetReferenceData, error) {
	if s.tabAssetsEnabled(ctx) {
		return s.assetReferenceTab(ctx, orgID)
	}
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
