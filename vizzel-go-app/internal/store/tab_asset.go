package store

import (
	"context"
	"encoding/json"
	"fmt"
	"os"
	"time"
)

const assetListFromTab = `
SELECT a.id, a.organization_id, a.asset_number, COALESCE(a.elaas_code, ''),
       a.asset_name, COALESCE(a.rfid_num, ''),
       COALESCE(cat.id, 0), COALESCE(a.asset_class_id, 0),
       COALESCE(cat.category_name, ''), COALESCE(cl.class_name, ''), COALESCE(ty.type_name, ''),
       COALESCE(ty.id, 0),
       COALESCE(a.asset_status_id, 0),
       COALESCE(a.is_check, false),
       COALESCE(a.is_depreciation, true),
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
       a.created_at,
       COALESCE(comp.cnt, 0)
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
LEFT JOIN LATERAL (
    SELECT COUNT(*)::int AS cnt FROM tab_asset_component c
    WHERE c.asset_id = a.id AND c.deleted_at IS NULL
) comp ON TRUE
`

func scanAssetTabRow(sc interface {
	Scan(dest ...any) error
}) (Asset, error) {
	var a Asset
	var expiry *time.Time
	err := sc.Scan(
		&a.ID, &a.OrganizationID, &a.AssetNumber, &a.ElaasCode, &a.AssetName, &a.RFIDNum,
		&a.CategoryID, &a.ClassID, &a.CategoryName, &a.ClassName, &a.TypeName,
		&a.TypeID, &a.AssetStatusID, &a.IsCheck, &a.IsDepreciation, &a.ReceivedDate, &expiry,
		&a.GetByID, &a.GetFrom, &a.SourceFundID, &a.AvailableAge, &a.AssetDetails,
		&a.UserID, &a.BuildingName, &a.RoomName, &a.OwnerName, &a.AssetStatusName,
		&a.AssetValue, &a.Status, &a.CreatedAt, &a.ComponentCount,
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
	fix, err := readMigrationFile("021_org_admin_verify.sql")
	if err != nil {
		return err
	}
	for _, stmt := range splitSQL(string(fix)) {
		if _, err := s.pool.Exec(ctx, stmt); err != nil {
			return fmt.Errorf("sync tab admin verify: %w", err)
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
	// hasKey reports whether any of the listed JSON keys appeared at all
	// (regardless of value). Used to distinguish "default true" from explicit false.
	hasKey := func(keys ...string) bool {
		for _, k := range keys {
			if _, ok := raw[k]; ok {
				return true
			}
		}
		return false
	}
	isDep := true
	if hasKey("is_depreciation", "isDepreciation") {
		s := getStr("is_depreciation", "isDepreciation")
		isDep = !(s == "false" || s == "0")
	}
	components, hasComp := parseComponentsRaw(raw["components"])
	return AssetInput{
		AssetNumber:     getStr("asset_number", "assetNumber"),
		ElaasCode:       getStr("elaas_code", "elaasCode"),
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
		IsCheck:          getBool("is_check", "isCheck"),
		IsDepreciation:   isDep,
		Components:       components,
		HasComponentList: hasComp,
	}, nil
}

// parseComponentsRaw decodes the `components` JSON value (an array of
// objects) into AssetComponentInput. It tolerates camelCase and snake_case
// keys and reports whether the caller sent the field at all.
func parseComponentsRaw(raw json.RawMessage) ([]AssetComponentInput, bool) {
	if len(raw) == 0 {
		return nil, false
	}
	// Allow a JSON-encoded string (multipart forms send it that way).
	var asStr string
	if json.Unmarshal(raw, &asStr) == nil && asStr != "" {
		raw = json.RawMessage(asStr)
	}
	var arr []map[string]any
	if err := json.Unmarshal(raw, &arr); err != nil {
		return nil, false
	}
	out := make([]AssetComponentInput, 0, len(arr))
	for _, m := range arr {
		ci := componentFromMap(m)
		if ci.ComponentName == "" && ci.RFIDNum == "" {
			continue
		}
		out = append(out, ci)
	}
	return out, true
}

func componentFromMap(m map[string]any) AssetComponentInput {
	getStr := func(keys ...string) string {
		for _, k := range keys {
			if v, ok := m[k]; ok && v != nil {
				if s, ok := v.(string); ok {
					return s
				}
			}
		}
		return ""
	}
	getInt := func(keys ...string) int64 {
		for _, k := range keys {
			if v, ok := m[k]; ok && v != nil {
				switch t := v.(type) {
				case float64:
					return int64(t)
				case string:
					var n int64
					_, _ = fmt.Sscanf(t, "%d", &n)
					return n
				}
			}
		}
		return 0
	}
	return AssetComponentInput{
		ID:            getInt("id"),
		ComponentName: getStr("component_name", "componentName", "name"),
		RFIDNum:       getStr("rfid_num", "rfidNum", "rfid"),
		SerialNo:      getStr("serial_no", "serialNo"),
		PositionNo:    int(getInt("position_no", "positionNo", "pos")),
		Note:          getStr("note"),
	}
}

func (s *postgresStore) listAssetsTab(ctx context.Context, orgID int64, page, pageSize int, f AssetFilter) (*AssetListResult, error) {
	if page < 1 {
		page = 1
	}
	if pageSize <= 0 || pageSize > 100 {
		pageSize = 10
	}
	orgIDs, err := s.ResolveOrgScope(ctx, orgID, f.IncludeChildOrgs)
	if err != nil {
		return nil, err
	}
	where := ` WHERE a.organization_id = ANY($1) AND a.deleted_at IS NULL`
	args := []any{orgIDs}
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
			asset_number, elaas_code, rfid_num, asset_name, asset_details, asset_class_id, asset_value, organization_id,
			asset_status_id, is_check, is_depreciation, received_date, expiry_date, get_by_id, get_from, source_fund_id, available_age, created_by
		) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,1) RETURNING id`,
		in.AssetNumber, nullStr(in.ElaasCode), nullStr(in.RFIDNum), in.AssetName, nullStr(in.AssetDetails),
		nullInt64(in.ClassID), in.AssetValue, orgID, nullInt64(stID), in.IsCheck, in.IsDepreciation,
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
	s.syncComponentsFromInput(ctx, id, in)
	return s.getAssetTab(ctx, orgID, id)
}

// syncComponentsFromInput is shared by create/update to keep the
// tab_asset_component rows in sync with the supplied input:
//   - if the caller sent an explicit components list, replace atomically
//   - otherwise, when the asset has an RFID and no components yet, create one
//     default component so single-piece assets keep working seamlessly.
func (s *postgresStore) syncComponentsFromInput(ctx context.Context, assetID int64, in AssetInput) {
	if in.HasComponentList {
		items := make([]AssetComponent, 0, len(in.Components))
		for i, c := range in.Components {
			pos := c.PositionNo
			if pos <= 0 {
				pos = i + 1
			}
			items = append(items, AssetComponent{
				ComponentName: c.ComponentName,
				RFIDNum:       c.RFIDNum,
				SerialNo:      c.SerialNo,
				PositionNo:    pos,
				Note:          c.Note,
			})
		}
		_ = s.ReplaceAssetComponents(ctx, assetID, items)
		return
	}
	if in.RFIDNum == "" {
		return
	}
	var existing int
	_ = s.pool.QueryRow(ctx,
		`SELECT COUNT(*)::int FROM tab_asset_component WHERE asset_id = $1 AND deleted_at IS NULL`,
		assetID,
	).Scan(&existing)
	if existing > 0 {
		return
	}
	name := in.AssetName
	if name == "" {
		name = "ชิ้นหลัก"
	}
	_, _ = s.pool.Exec(ctx,
		`INSERT INTO tab_asset_component (asset_id, component_name, rfid_num, position_no, created_by)
		 VALUES ($1,$2,$3,1,1)`,
		assetID, name, in.RFIDNum,
	)
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
		`UPDATE tab_asset SET asset_number=$3, elaas_code=$4, rfid_num=$5, asset_name=$6, asset_details=$7, asset_class_id=$8,
		 asset_value=$9, asset_status_id=$10, is_check=$11, is_depreciation=$12, received_date=$13, expiry_date=$14,
		 get_by_id=$15, get_from=$16, source_fund_id=$17, available_age=$18, updated_at=NOW()
		 WHERE id=$1 AND organization_id=$2`,
		id, orgID, in.AssetNumber, nullStr(in.ElaasCode), nullStr(in.RFIDNum), in.AssetName, nullStr(in.AssetDetails),
		nullInt64(in.ClassID), in.AssetValue, nullInt64(stID), in.IsCheck, in.IsDepreciation,
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
	s.syncComponentsFromInput(ctx, id, in)
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
