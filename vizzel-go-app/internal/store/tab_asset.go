package store

import (
	"context"
	"encoding/json"
	"fmt"
	"os"
	"time"
)

const assetListFromTab = `
SELECT a.id, a.organization_id, a.asset_number, a.asset_name, COALESCE(a.rfid_num, ''),
       COALESCE(cat.id, 0), COALESCE(a.asset_class_id, 0),
       COALESCE(cat.category_name, ''), COALESCE(cl.class_name, ''), COALESCE(ty.type_name, ''),
       COALESCE(ty.id, 0),
       COALESCE(a.asset_status_id, 0),
       COALESCE(a.is_check, false),
       a.received_date,
       a.expiry_date,
       COALESCE(a.get_by_id, 0),
       COALESCE(a.get_from, ''),
       COALESCE(a.source_fund_id, 0),
       COALESCE(a.available_age, 0),
       COALESCE(a.asset_details, ''),
       COALESCE(o.user_id, 0),
       COALESCE(addr.building_name, ''), COALESCE(addr.room_name, ''),
       COALESCE(o.owner_name, ''), COALESCE(st.status, 'ใช้งาน'),
       COALESCE(a.asset_value, 0),
       CASE WHEN a.deleted_at IS NULL THEN 'active' ELSE 'deleted' END,
       a.created_at
FROM tab_asset a
LEFT JOIN tab_asset_class cl ON cl.id = a.asset_class_id AND cl.deleted_at IS NULL
LEFT JOIN tab_asset_type ty ON ty.id = cl.asset_type_id AND ty.deleted_at IS NULL
LEFT JOIN tab_asset_category cat ON cat.id = ty.category_id AND cat.deleted_at IS NULL
LEFT JOIN tab_asset_status st ON st.id = a.asset_status_id
LEFT JOIN LATERAL (
    SELECT building_name, room_name FROM tab_asset_address
    WHERE asset_id = a.id AND deleted_at IS NULL ORDER BY id LIMIT 1
) addr ON TRUE
LEFT JOIN LATERAL (
    SELECT owner_name, user_id FROM tab_asset_owner
    WHERE asset_id = a.id AND deleted_at IS NULL ORDER BY id LIMIT 1
) o ON TRUE
`

func scanAssetTabRow(sc interface {
	Scan(dest ...any) error
}) (Asset, error) {
	var a Asset
	var expiry *time.Time
	err := sc.Scan(
		&a.ID, &a.OrganizationID, &a.AssetNumber, &a.AssetName, &a.RFIDNum,
		&a.CategoryID, &a.ClassID, &a.CategoryName, &a.ClassName, &a.TypeName,
		&a.TypeID, &a.AssetStatusID, &a.IsCheck, &a.ReceivedDate, &expiry,
		&a.GetByID, &a.GetFrom, &a.SourceFundID, &a.AvailableAge, &a.AssetDetails,
		&a.UserID, &a.BuildingName, &a.RoomName, &a.OwnerName, &a.AssetStatusName,
		&a.AssetValue, &a.Status, &a.CreatedAt,
	)
	if err != nil {
		return Asset{}, err
	}
	a.ExpiryDate = expiry
	if a.ReceivedDate.IsZero() {
		a.ReceivedDate = a.CreatedAt
	}
	return a, nil
}

func (s *postgresStore) tabAssetsEnabled(ctx context.Context) bool {
	var ok bool
	_ = s.pool.QueryRow(ctx,
		`SELECT EXISTS (
			SELECT 1 FROM information_schema.tables
			WHERE table_schema = 'public' AND table_name = 'tab_asset'
		)`,
	).Scan(&ok)
	return ok
}

func (s *postgresStore) SyncDemoToTab(ctx context.Context) error {
	data, err := readMigrationFile("010_sync_demo_to_tab.sql")
	if err != nil {
		return err
	}
	for _, stmt := range splitSQL(string(data)) {
		if _, err := s.pool.Exec(ctx, stmt); err != nil {
			return fmt.Errorf("sync tab: %w", err)
		}
	}
	return nil
}

func readMigrationFile(name string) ([]byte, error) {
	prefixes := []string{"supabase/migrations/", "vizzel-go-app/supabase/migrations/"}
	for _, pre := range prefixes {
		if data, err := os.ReadFile(pre + name); err == nil {
			return data, nil
		}
	}
	return nil, fmt.Errorf("migration %s not found", name)
}

func ParseAssetInputJSON(body []byte) (AssetInput, error) {
	var raw map[string]json.RawMessage
	if err := json.Unmarshal(body, &raw); err != nil {
		return AssetInput{}, err
	}
	getStr := func(keys ...string) string {
		for _, k := range keys {
			if v, ok := raw[k]; ok {
				var s string
				if json.Unmarshal(v, &s) == nil {
					return s
				}
			}
		}
		return ""
	}
	getInt := func(keys ...string) int64 {
		for _, k := range keys {
			if v, ok := raw[k]; ok {
				var n int64
				if json.Unmarshal(v, &n) == nil {
					return n
				}
				var f float64
				if json.Unmarshal(v, &f) == nil {
					return int64(f)
				}
			}
		}
		return 0
	}
	getBool := func(keys ...string) bool {
		s := getStr(keys...)
		return s == "true" || s == "1"
	}
	return AssetInput{
		AssetNumber:     getStr("asset_number", "assetNumber"),
		AssetName:       getStr("asset_name", "assetName"),
		RFIDNum:         getStr("rfid_num", "rfidNum"),
		AssetDetails:    getStr("asset_details", "assetDetails"),
		CategoryID:      getInt("category_id", "categoryID"),
		ClassID:         getInt("class_id", "assetClassID"),
		CategoryName:    getStr("category_name", "categoryName"),
		ClassName:       getStr("class_name", "className"),
		TypeName:        getStr("type_name", "typeName"),
		BuildingName:    getStr("building_name", "buildingName"),
		RoomName:        getStr("room_name", "roomName"),
		OwnerName:       getStr("owner_name", "ownerName"),
		AssetStatusName: getStr("asset_status_name", "assetStatusName"),
		AssetValue:      getInt("asset_value", "assetValue"),
		AssetStatusID:   getInt("asset_status_id", "assetStatusID"),
		UserID:          getInt("user_id", "userID"),
		GetByID:         getInt("get_by_id", "getByID"),
		SourceFundID:    getInt("source_fund_id", "sourceFundID"),
		GetFrom:         getStr("get_from", "getFrom"),
		AvailableAge:    getInt("available_age", "availableAge"),
		ReceivedDate:    getStr("received_date", "receivedDate"),
		ExpiryDate:      getStr("expiry_date", "expiryDate"),
		IsCheck:         getBool("is_check", "isCheck"),
	}, nil
}

func (s *postgresStore) listAssetsTab(ctx context.Context, orgID int64, page, pageSize int, f AssetFilter) (*AssetListResult, error) {
	if page < 1 {
		page = 1
	}
	if pageSize <= 0 || pageSize > 100 {
		pageSize = 10
	}
	where := ` WHERE a.organization_id = $1 AND a.deleted_at IS NULL`
	args := []any{orgID}
	n := 2
	if f.Search != "" {
		where += fmt.Sprintf(` AND (a.asset_name ILIKE $%d OR a.asset_number ILIKE $%d OR COALESCE(a.rfid_num,'') ILIKE $%d)`, n, n, n)
		args = append(args, "%"+f.Search+"%")
		n++
	}
	if f.CategoryID > 0 {
		where += fmt.Sprintf(` AND cat.id = $%d`, n)
		args = append(args, f.CategoryID)
		n++
	}
	if f.TypeID > 0 {
		where += fmt.Sprintf(` AND ty.id = $%d`, n)
		args = append(args, f.TypeID)
		n++
	}
	if f.ClassID > 0 {
		where += fmt.Sprintf(` AND a.asset_class_id = $%d`, n)
		args = append(args, f.ClassID)
		n++
	}
	if f.StatusName != "" {
		where += fmt.Sprintf(` AND st.status = $%d`, n)
		args = append(args, f.StatusName)
		n++
	}
	var total int
	countQ := `SELECT COUNT(*)::int FROM tab_asset a
		LEFT JOIN tab_asset_class cl ON cl.id = a.asset_class_id
		LEFT JOIN tab_asset_type ty ON ty.id = cl.asset_type_id
		LEFT JOIN tab_asset_category cat ON cat.id = ty.category_id
		LEFT JOIN tab_asset_status st ON st.id = a.asset_status_id` + where
	if err := s.pool.QueryRow(ctx, countQ, args...).Scan(&total); err != nil {
		return nil, err
	}
	offset := (page - 1) * pageSize
	q := assetListFromTab + where + fmt.Sprintf(` ORDER BY a.id DESC LIMIT $%d OFFSET $%d`, n, n+1)
	args = append(args, pageSize, offset)
	rows, err := s.pool.Query(ctx, q, args...)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var data []Asset
	for rows.Next() {
		a, err := scanAssetTabRow(rows)
		if err != nil {
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

func (s *postgresStore) statusIDByName(ctx context.Context, orgID int64, name string) int64 {
	if name == "" {
		name = "ใช้งาน"
	}
	var id int64
	_ = s.pool.QueryRow(ctx,
		`SELECT id FROM tab_asset_status WHERE status = $1 AND (organization_id IS NULL OR organization_id = $2) ORDER BY id LIMIT 1`,
		name, orgID,
	).Scan(&id)
	return id
}

func (s *postgresStore) createAssetTab(ctx context.Context, orgID int64, in AssetInput) (*Asset, error) {
	stID := in.AssetStatusID
	if stID == 0 {
		stID = s.statusIDByName(ctx, orgID, in.AssetStatusName)
	}
	recv := parseInputTime(in.ReceivedDate)
	exp := parseInputTimePtr(in.ExpiryDate)
	var id int64
	err := s.pool.QueryRow(ctx,
		`INSERT INTO tab_asset (
			asset_number, rfid_num, asset_name, asset_details, asset_class_id, asset_value, organization_id,
			asset_status_id, is_check, received_date, expiry_date, get_by_id, get_from, source_fund_id, available_age, created_by
		) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,1) RETURNING id`,
		in.AssetNumber, nullStr(in.RFIDNum), in.AssetName, nullStr(in.AssetDetails),
		nullInt64(in.ClassID), in.AssetValue, orgID, nullInt64(stID), in.IsCheck,
		recv, exp, nullInt64(int64(in.GetByID)), nullStr(in.GetFrom),
		nullInt64(int64(in.SourceFundID)), nullInt64(in.AvailableAge),
	).Scan(&id)
	if err != nil {
		return nil, err
	}
	if in.BuildingName != "" || in.RoomName != "" {
		_, _ = s.pool.Exec(ctx,
			`INSERT INTO tab_asset_address (asset_id, building_name, room_name, created_by) VALUES ($1,$2,$3,1)`,
			id, in.BuildingName, in.RoomName,
		)
	}
	if in.UserID > 0 || in.OwnerName != "" {
		_, _ = s.pool.Exec(ctx,
			`INSERT INTO tab_asset_owner (asset_id, user_id, owner_name, created_by) VALUES ($1,$2,$3,1)`,
			id, nullInt64(in.UserID), nullStr(in.OwnerName),
		)
	}
	return s.getAssetTab(ctx, orgID, id)
}

func (s *postgresStore) getAssetTab(ctx context.Context, orgID, id int64) (*Asset, error) {
	row := s.pool.QueryRow(ctx, assetListFromTab+` WHERE a.organization_id = $1 AND a.id = $2`, orgID, id)
	a, err := scanAssetTabRow(row)
	if err != nil {
		return nil, err
	}
	return &a, nil
}

func (s *postgresStore) updateAssetTab(ctx context.Context, orgID, id int64, in AssetInput) error {
	stID := in.AssetStatusID
	if stID == 0 {
		stID = s.statusIDByName(ctx, orgID, in.AssetStatusName)
	}
	recv := parseInputTime(in.ReceivedDate)
	exp := parseInputTimePtr(in.ExpiryDate)
	_, err := s.pool.Exec(ctx,
		`UPDATE tab_asset SET asset_number=$3, rfid_num=$4, asset_name=$5, asset_details=$6, asset_class_id=$7,
		 asset_value=$8, asset_status_id=$9, is_check=$10, received_date=$11, expiry_date=$12,
		 get_by_id=$13, get_from=$14, source_fund_id=$15, available_age=$16, updated_at=NOW()
		 WHERE id=$1 AND organization_id=$2`,
		id, orgID, in.AssetNumber, nullStr(in.RFIDNum), in.AssetName, nullStr(in.AssetDetails),
		nullInt64(in.ClassID), in.AssetValue, nullInt64(stID), in.IsCheck,
		recv, exp, nullInt64(int64(in.GetByID)), nullStr(in.GetFrom),
		nullInt64(int64(in.SourceFundID)), nullInt64(in.AvailableAge),
	)
	if err != nil {
		return err
	}
	_, _ = s.pool.Exec(ctx, `DELETE FROM tab_asset_address WHERE asset_id=$1`, id)
	if in.BuildingName != "" || in.RoomName != "" {
		_, _ = s.pool.Exec(ctx,
			`INSERT INTO tab_asset_address (asset_id, building_name, room_name, created_by) VALUES ($1,$2,$3,1)`,
			id, in.BuildingName, in.RoomName,
		)
	}
	_, _ = s.pool.Exec(ctx, `DELETE FROM tab_asset_owner WHERE asset_id=$1`, id)
	if in.UserID > 0 || in.OwnerName != "" {
		_, _ = s.pool.Exec(ctx,
			`INSERT INTO tab_asset_owner (asset_id, user_id, owner_name, created_by) VALUES ($1,$2,$3,1)`,
			id, nullInt64(in.UserID), nullStr(in.OwnerName),
		)
	}
	return nil
}

func parseInputTime(s string) time.Time {
	if s == "" {
		return time.Now()
	}
	if t, err := time.Parse(time.RFC3339, s); err == nil {
		return t
	}
	if t, err := time.Parse("2006-01-02", s); err == nil {
		return t
	}
	return time.Now()
}

func parseInputTimePtr(s string) *time.Time {
	if s == "" {
		return nil
	}
	if t, err := time.Parse(time.RFC3339, s); err == nil {
		return &t
	}
	if t, err := time.Parse("2006-01-02", s); err == nil {
		return &t
	}
	return nil
}

func (s *postgresStore) deleteAssetTab(ctx context.Context, orgID, id int64) error {
	_, err := s.pool.Exec(ctx,
		`UPDATE tab_asset SET deleted_at = NOW() WHERE id = $1 AND organization_id = $2`,
		id, orgID,
	)
	return err
}

func nullStr(s string) any {
	if s == "" {
		return nil
	}
	return s
}

func nullInt64(v int64) any {
	if v == 0 {
		return nil
	}
	return v
}

func (s *postgresStore) assetReferenceTab(ctx context.Context, orgID int64) (*AssetReferenceData, error) {
	cats, _ := s.listTabCategories(ctx, orgID)
	types, _ := s.listTabTypes(ctx, orgID, 0)
	classes, _ := s.listTabClasses(ctx, orgID, 0)
	statuses, _ := s.listTabStatuses(ctx, orgID)
	return &AssetReferenceData{Categories: cats, Types: types, Classes: classes, Statuses: statuses}, nil
}

func (s *postgresStore) listTabCategories(ctx context.Context, orgID int64) ([]Row, error) {
	return s.listRowsPG(ctx,
		`SELECT id, category_name, NULL, NULL, NULL, created_at FROM tab_asset_category
		 WHERE (organization_id = $1 OR organization_id IS NULL) AND deleted_at IS NULL ORDER BY id`,
		orgID,
	)
}

func (s *postgresStore) listTabTypes(ctx context.Context, orgID int64, categoryID int64) ([]Row, error) {
	if categoryID > 0 {
		return s.listRowsPG(ctx,
			`SELECT ty.id, ty.type_name, NULL, NULL, ty.category_id, ty.created_at
			 FROM tab_asset_type ty JOIN tab_asset_category cat ON cat.id = ty.category_id
			 WHERE cat.organization_id = $1 AND ty.category_id = $2 AND ty.deleted_at IS NULL`,
			orgID, categoryID,
		)
	}
	return s.listRowsPG(ctx,
		`SELECT ty.id, ty.type_name, NULL, NULL, ty.category_id, ty.created_at
		 FROM tab_asset_type ty JOIN tab_asset_category cat ON cat.id = ty.category_id
		 WHERE cat.organization_id = $1 AND ty.deleted_at IS NULL`,
		orgID,
	)
}

func (s *postgresStore) listTabClasses(ctx context.Context, orgID int64, typeID int64) ([]Row, error) {
	if typeID > 0 {
		return s.listRowsPG(ctx,
			`SELECT cl.id, cl.class_name, NULL, NULL, cl.asset_type_id, cl.created_at
			 FROM tab_asset_class cl JOIN tab_asset_type ty ON ty.id = cl.asset_type_id
			 JOIN tab_asset_category cat ON cat.id = ty.category_id
			 WHERE cat.organization_id = $1 AND cl.asset_type_id = $2 AND cl.deleted_at IS NULL`,
			orgID, typeID,
		)
	}
	return s.listRowsPG(ctx,
		`SELECT cl.id, cl.class_name, NULL, NULL, cl.asset_type_id, cl.created_at
		 FROM tab_asset_class cl JOIN tab_asset_type ty ON ty.id = cl.asset_type_id
		 JOIN tab_asset_category cat ON cat.id = ty.category_id
		 WHERE cat.organization_id = $1 AND cl.deleted_at IS NULL`,
		orgID,
	)
}

func (s *postgresStore) listTabStatuses(ctx context.Context, orgID int64) ([]Row, error) {
	return s.listRowsPG(ctx,
		`SELECT id, status, NULL, NULL, NULL, created_at FROM tab_asset_status
		 WHERE organization_id IS NULL OR organization_id = $1 ORDER BY id`,
		orgID,
	)
}
