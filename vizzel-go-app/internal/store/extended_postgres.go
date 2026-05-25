package store

import (
	"context"
	"fmt"
	"strings"
	"time"
)

func (s *postgresStore) seedExtendedPG(ctx context.Context, orgID int64) error {
	var n int
	_ = s.pool.QueryRow(ctx, `SELECT COUNT(*)::int FROM institutes WHERE organization_id = $1`, orgID).Scan(&n)
	if n > 0 {
		return nil
	}
	_, _ = s.pool.Exec(ctx, `INSERT INTO institutes (organization_id, name) VALUES ($1, $2)`, orgID, "สถาบันหลัก")
	_, _ = s.pool.Exec(ctx, `INSERT INTO sections (organization_id, name) VALUES ($1, $2)`, orgID, "แผนกบัญชี")
	_, _ = s.pool.Exec(ctx, `INSERT INTO positions (organization_id, name) VALUES ($1, $2), ($1, $3)`, orgID, "เจ้าหน้าที่", "หัวหน้าแผนก")
	var catID int64
	_ = s.pool.QueryRow(ctx, `SELECT id FROM asset_categories WHERE organization_id = $1 LIMIT 1`, orgID).Scan(&catID)
	_, _ = s.pool.Exec(ctx, `INSERT INTO asset_types (organization_id, category_id, name) VALUES ($1, $2, $3), ($1, $2, $4)`, orgID, catID, "IT", "General")
	var uid int64
	_ = s.pool.QueryRow(ctx, `SELECT id FROM users WHERE email = 'admin@demo.local'`).Scan(&uid)
	_, _ = s.pool.Exec(ctx, `INSERT INTO org_access (user_id, organization_id, role_id) VALUES ($1, $2, 2) ON CONFLICT DO NOTHING`, uid, orgID)
	_, _ = s.pool.Exec(ctx, `UPDATE users SET role_id = 1 WHERE email = 'superadmin@demo.local'`)
	return nil
}

func (s *postgresStore) ListInstitutes(ctx context.Context, orgID int64) ([]Row, error) {
	return s.listRowsPG(ctx, `SELECT id, name, NULL, NULL, NULL, created_at FROM institutes WHERE organization_id = $1`, orgID)
}

func (s *postgresStore) ListSections(ctx context.Context, orgID int64) ([]Row, error) {
	return s.listRowsPG(ctx, `SELECT id, name, NULL, NULL, NULL, created_at FROM sections WHERE organization_id = $1`, orgID)
}

func (s *postgresStore) ListPositions(ctx context.Context, orgID int64) ([]Row, error) {
	return s.listRowsPG(ctx, `SELECT id, name, NULL, NULL, NULL, created_at FROM positions WHERE organization_id = $1`, orgID)
}

func (s *postgresStore) ListAssetTypes(ctx context.Context, orgID int64, categoryID int64) ([]Row, error) {
	if categoryID > 0 {
		return s.listRowsPG(ctx, `SELECT id, name, NULL, NULL, NULL, created_at FROM asset_types WHERE organization_id = $1 AND category_id = $2`, orgID, categoryID)
	}
	return s.listRowsPG(ctx, `SELECT id, name, NULL, NULL, NULL, created_at FROM asset_types WHERE organization_id = $1`, orgID)
}

func (s *postgresStore) ListAssetClasses(ctx context.Context, orgID int64, typeID int64) ([]Row, error) {
	if typeID > 0 {
		return s.listRowsPG(ctx, `SELECT id, name, NULL, NULL, NULL, created_at FROM asset_classes WHERE organization_id = $1 AND type_id = $2`, orgID, typeID)
	}
	return s.listRowsPG(ctx, `SELECT id, name, NULL, NULL, NULL, created_at FROM asset_classes WHERE organization_id = $1`, orgID)
}

func (s *postgresStore) ListWithdrawals(ctx context.Context, orgID int64, status string) ([]Row, error) {
	if status != "" {
		return s.listRowsPG(ctx, `SELECT id, requester, item_name, status, NULL, created_at FROM withdrawals WHERE organization_id = $1 AND status = $2`, orgID, status)
	}
	return s.listRowsPG(ctx, `SELECT id, requester, item_name, status, NULL, created_at FROM withdrawals WHERE organization_id = $1`, orgID)
}

func (s *postgresStore) GetAuditJob(ctx context.Context, orgID, id int64) (*Row, error) {
	rows, err := s.listRowsPG(ctx, `SELECT id, title, COALESCE(description,''), status, progress::bigint, created_at FROM audit_jobs WHERE organization_id = $1 AND id = $2`, orgID, id)
	if err != nil || len(rows) == 0 {
		return nil, err
	}
	return &rows[0], nil
}

func (s *postgresStore) DashboardExtended(ctx context.Context, orgID int64) (*DashboardExtended, error) {
	var totalValue int64
	var count int
	_ = s.pool.QueryRow(ctx, `SELECT COALESCE(SUM(asset_value),0)::bigint, COUNT(*)::int FROM assets WHERE organization_id = $1 AND status != 'deleted'`, orgID).Scan(&totalValue, &count)
	dep := totalValue / 5
	d := &DashboardExtended{
		TotalAssetValue: totalValue, AccumulatedDepreciation: dep, NetBookValue: totalValue - dep,
		TotalAssets: count, NewAssetsThisYear: count / 10, CurrentYearDepreciation: dep / 12,
		Trend: TrendSeries{Labels: []string{"ม.ค.", "ก.พ.", "มี.ค.", "เม.ย.", "พ.ค.", "มิ.ย."}, Values: []int{count / 6, count / 5, count / 4, count / 3, count / 2, count}},
	}
	rows, _ := s.pool.Query(ctx, `SELECT asset_status_name, COUNT(*)::int FROM assets WHERE organization_id = $1 AND status != 'deleted' GROUP BY asset_status_name`, orgID)
	if rows != nil {
		defer rows.Close()
		for rows.Next() {
			var name string
			var c int
			_ = rows.Scan(&name, &c)
			d.StatusBreakdown = append(d.StatusBreakdown, StatusSlice{Name: name, Count: c})
		}
	}
	rows2, _ := s.pool.Query(ctx, `SELECT building_name, COUNT(*)::int FROM assets WHERE organization_id = $1 AND status != 'deleted' AND building_name != '' GROUP BY building_name`, orgID)
	if rows2 != nil {
		defer rows2.Close()
		for rows2.Next() {
			var name string
			var c int
			_ = rows.Scan(&name, &c)
			d.LocationBreakdown = append(d.LocationBreakdown, StatusSlice{Name: name, Count: c})
		}
	}
	return d, nil
}

func (s *postgresStore) PersonalDashboard(ctx context.Context, orgID int64, ownerName string) (*PersonalDashboard, error) {
	var count int
	var val int64
	_ = s.pool.QueryRow(ctx, `SELECT COUNT(*)::int, COALESCE(SUM(asset_value),0)::bigint FROM assets WHERE organization_id = $1 AND owner_name = $2 AND status != 'deleted'`, orgID, ownerName).Scan(&count, &val)
	pd := &PersonalDashboard{OwnedAssets: count, TotalValue: val}
	rows, _ := s.pool.Query(ctx, `SELECT asset_status_name, COUNT(*)::int FROM assets WHERE organization_id = $1 AND owner_name = $2 GROUP BY asset_status_name`, orgID, ownerName)
	if rows != nil {
		defer rows.Close()
		for rows.Next() {
			var name string
			var c int
			_ = rows.Scan(&name, &c)
			pd.StatusBreakdown = append(pd.StatusBreakdown, StatusSlice{Name: name, Count: c})
		}
	}
	res, _ := s.ListAssetsPaged(ctx, orgID, 1, 5, AssetFilter{})
	if res != nil {
		for _, a := range res.Data {
			if a.OwnerName == ownerName {
				pd.RecentAssets = append(pd.RecentAssets, a)
			}
		}
	}
	return pd, nil
}

func (s *postgresStore) SuperAdminStats(ctx context.Context) (*SuperAdminStats, error) {
	st := &SuperAdminStats{}
	_ = s.pool.QueryRow(ctx, `SELECT COUNT(*)::int FROM organizations`).Scan(&st.OrgCount)
	_ = s.pool.QueryRow(ctx, `SELECT COUNT(*)::int FROM users`).Scan(&st.UserCount)
	_ = s.pool.QueryRow(ctx, `SELECT COUNT(*)::int FROM assets WHERE status != 'deleted'`).Scan(&st.AssetCount)
	rows, _ := s.pool.Query(ctx, `SELECT o.name, COUNT(a.id)::int FROM organizations o LEFT JOIN assets a ON a.organization_id = o.id GROUP BY o.id ORDER BY COUNT(a.id) DESC LIMIT 5`)
	if rows != nil {
		defer rows.Close()
		for rows.Next() {
			var name string
			var c int
			_ = rows.Scan(&name, &c)
			st.TopOrgs = append(st.TopOrgs, StatusSlice{Name: name, Count: c})
		}
	}
	return st, nil
}

func (s *postgresStore) ListMenuToggles(ctx context.Context, orgID int64) ([]MenuToggle, error) {
	names := map[int]string{1: "เอกสาร", 2: "เบิก/ยืม Pro", 3: "รายงานขั้นสูง"}
	var out []MenuToggle
	for id, name := range names {
		var enabled bool
		_ = s.pool.QueryRow(ctx, `SELECT COALESCE(enabled,true) FROM organization_menus WHERE organization_id = $1 AND menu_id = $2`, orgID, id).Scan(&enabled)
		out = append(out, MenuToggle{MenuID: id, Name: name, Enabled: enabled})
	}
	return out, nil
}

func (s *postgresStore) SetOrgMenu(ctx context.Context, orgID int64, menuID int, enabled bool) error {
	_, err := s.pool.Exec(ctx, `INSERT INTO organization_menus (organization_id, menu_id, enabled) VALUES ($1, $2, $3) ON CONFLICT (organization_id, menu_id) DO UPDATE SET enabled = $3`, orgID, menuID, enabled)
	return err
}

func (s *postgresStore) ListOrgAccess(ctx context.Context) ([]OrgAccessRow, error) {
	rows, err := s.pool.Query(ctx, `SELECT oa.id, oa.user_id, COALESCE(NULLIF(u.display_name,''), u.email), oa.organization_id, org.name, oa.role_id
		FROM org_access oa JOIN users u ON u.id = oa.user_id JOIN organizations org ON org.id = oa.organization_id`)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var out []OrgAccessRow
	for rows.Next() {
		var r OrgAccessRow
		if err := rows.Scan(&r.ID, &r.UserID, &r.UserName, &r.OrganizationID, &r.OrgName, &r.RoleID); err != nil {
			return nil, err
		}
		out = append(out, r)
	}
	return out, rows.Err()
}

func (s *postgresStore) CreateOrgAccess(ctx context.Context, userID, orgID int64, roleID int) error {
	_, err := s.pool.Exec(ctx, `INSERT INTO org_access (user_id, organization_id, role_id) VALUES ($1, $2, $3)`, userID, orgID, roleID)
	return err
}

func (s *postgresStore) DeleteOrgAccess(ctx context.Context, id int64) error {
	_, err := s.pool.Exec(ctx, `DELETE FROM org_access WHERE id = $1`, id)
	return err
}

func (s *postgresStore) CreateOrganization(ctx context.Context, name string) (*Row, error) {
	var id int64
	err := s.pool.QueryRow(ctx, `INSERT INTO organizations (name) VALUES ($1) RETURNING id`, name).Scan(&id)
	if err != nil {
		return nil, err
	}
	return &Row{ID: id, Title: name, CreatedAt: time.Now()}, nil
}

func (s *postgresStore) DeleteOrganization(ctx context.Context, id int64) error {
	if id == 1 {
		return fmt.Errorf("cannot delete demo org")
	}
	_, err := s.pool.Exec(ctx, `DELETE FROM organizations WHERE id = $1`, id)
	return err
}

func (s *postgresStore) EntityCreate(ctx context.Context, kind string, orgID int64, name string, parentID int64) (int64, error) {
	var id int64
	var err error
	switch kind {
	case "types":
		err = s.pool.QueryRow(ctx, `INSERT INTO asset_types (organization_id, category_id, name) VALUES ($1, $2, $3) RETURNING id`, orgID, parentID, name).Scan(&id)
	case "classes":
		err = s.pool.QueryRow(ctx, `INSERT INTO asset_classes (organization_id, type_id, name) VALUES ($1, $2, $3) RETURNING id`, orgID, parentID, name).Scan(&id)
	case "sections":
		err = s.pool.QueryRow(ctx, `INSERT INTO sections (organization_id, department_id, name) VALUES ($1, $2, $3) RETURNING id`, orgID, parentID, name).Scan(&id)
	case "rooms":
		err = s.pool.QueryRow(ctx, `INSERT INTO rooms (building_id, room_number, name) VALUES ($1, $2, $3) RETURNING id`, parentID, name, name).Scan(&id)
	case "audit-jobs":
		err = s.pool.QueryRow(ctx, `INSERT INTO audit_jobs (organization_id, title, status, progress) VALUES ($1, $2, 'ongoing', 0) RETURNING id`, orgID, name).Scan(&id)
	case "repairs":
		err = s.pool.QueryRow(ctx, `INSERT INTO repairs (organization_id, asset_number, note, status) VALUES ($1, $2, '', 'pending') RETURNING id`, orgID, name).Scan(&id)
	case "withdrawals":
		err = s.pool.QueryRow(ctx, `INSERT INTO withdrawals (organization_id, requester, item_name, status) VALUES ($1, 'ผู้ขอ', $2, 'pending') RETURNING id`, orgID, name).Scan(&id)
	case "sales":
		err = s.pool.QueryRow(ctx, `INSERT INTO sales (organization_id, asset_number, status) VALUES ($1, $2, 'draft') RETURNING id`, orgID, name).Scan(&id)
	case "departments":
		err = s.pool.QueryRow(ctx, `INSERT INTO departments (organization_id, name) VALUES ($1, $2) RETURNING id`, orgID, name).Scan(&id)
	case "institutes":
		err = s.pool.QueryRow(ctx, `INSERT INTO institutes (organization_id, name) VALUES ($1, $2) RETURNING id`, orgID, name).Scan(&id)
	case "positions":
		err = s.pool.QueryRow(ctx, `INSERT INTO positions (organization_id, name) VALUES ($1, $2) RETURNING id`, orgID, name).Scan(&id)
	case "categories":
		err = s.pool.QueryRow(ctx, `INSERT INTO asset_categories (organization_id, name) VALUES ($1, $2) RETURNING id`, orgID, name).Scan(&id)
	case "buildings":
		err = s.pool.QueryRow(ctx, `INSERT INTO buildings (organization_id, name) VALUES ($1, $2) RETURNING id`, orgID, name).Scan(&id)
	default:
		return 0, fmt.Errorf("unknown entity kind")
	}
	return id, err
}

func (s *postgresStore) EntityUpdate(ctx context.Context, kind string, orgID, id int64, name string) error {
	table, orgCol, err := entityTable(kind)
	if err != nil {
		return err
	}
	if kind == "rooms" {
		_, err = s.pool.Exec(ctx, `UPDATE rooms SET name = $1, room_number = $2 WHERE id = $3`, name, name, id)
		return err
	}
	if orgCol != "" {
		_, err = s.pool.Exec(ctx, fmt.Sprintf(`UPDATE %s SET name = $1 WHERE id = $2 AND %s = $3`, table, orgCol), name, id, orgID)
		return err
	}
	_, err = s.pool.Exec(ctx, fmt.Sprintf(`UPDATE %s SET name = $1 WHERE id = $2`, table), name, id)
	return err
}

func (s *postgresStore) EntityDelete(ctx context.Context, kind string, orgID, id int64) error {
	table, orgCol, err := entityTable(kind)
	if err != nil {
		return err
	}
	if orgCol != "" {
		_, err = s.pool.Exec(ctx, fmt.Sprintf(`DELETE FROM %s WHERE id = $1 AND %s = $2`, table, orgCol), id, orgID)
		return err
	}
	_, err = s.pool.Exec(ctx, fmt.Sprintf(`DELETE FROM %s WHERE id = $1`, table), id)
	return err
}

func (s *postgresStore) GetAsset(ctx context.Context, orgID, id int64) (*Asset, error) {
	row := s.pool.QueryRow(ctx, `SELECT id, organization_id, asset_number, asset_name, COALESCE(rfid_num,''), COALESCE(category_id,0), COALESCE(class_id,0),
		COALESCE(category_name,''), COALESCE(class_name,''), COALESCE(type_name,''), COALESCE(building_name,''), COALESCE(room_name,''),
		COALESCE(owner_name,''), COALESCE(asset_status_name,'ใช้งาน'), asset_value, status, created_at
		FROM assets WHERE organization_id = $1 AND id = $2`, orgID, id)
	var a Asset
	if err := row.Scan(&a.ID, &a.OrganizationID, &a.AssetNumber, &a.AssetName, &a.RFIDNum, &a.CategoryID, &a.ClassID,
		&a.CategoryName, &a.ClassName, &a.TypeName, &a.BuildingName, &a.RoomName, &a.OwnerName, &a.AssetStatusName,
		&a.AssetValue, &a.Status, &a.CreatedAt); err != nil {
		return nil, err
	}
	return &a, nil
}

func (s *postgresStore) CreateAsset(ctx context.Context, orgID int64, in AssetInput) (*Asset, error) {
	if in.AssetStatusName == "" {
		in.AssetStatusName = "ใช้งาน"
	}
	var id int64
	err := s.pool.QueryRow(ctx, `INSERT INTO assets (organization_id, asset_number, asset_name, rfid_num, category_id, class_id, category_name, class_name, type_name, building_name, room_name, owner_name, asset_status_name, asset_value, status)
		VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,'active') RETURNING id`,
		orgID, in.AssetNumber, in.AssetName, in.RFIDNum, in.CategoryID, in.ClassID, in.CategoryName, in.ClassName, in.TypeName, in.BuildingName, in.RoomName, in.OwnerName, in.AssetStatusName, in.AssetValue).Scan(&id)
	if err != nil {
		return nil, err
	}
	return s.GetAsset(ctx, orgID, id)
}

func (s *postgresStore) UpdateAsset(ctx context.Context, orgID, id int64, in AssetInput) error {
	_, err := s.pool.Exec(ctx, `UPDATE assets SET asset_number=$3, asset_name=$4, rfid_num=$5, category_id=$6, class_id=$7, category_name=$8, class_name=$9, type_name=$10, building_name=$11, room_name=$12, owner_name=$13, asset_status_name=$14, asset_value=$15 WHERE id=$1 AND organization_id=$2`,
		id, orgID, in.AssetNumber, in.AssetName, in.RFIDNum, in.CategoryID, in.ClassID, in.CategoryName, in.ClassName, in.TypeName, in.BuildingName, in.RoomName, in.OwnerName, in.AssetStatusName, in.AssetValue)
	return err
}

func (s *postgresStore) DeleteAsset(ctx context.Context, orgID, id int64) error {
	_, err := s.pool.Exec(ctx, `UPDATE assets SET status='deleted' WHERE id=$1 AND organization_id=$2`, id, orgID)
	return err
}

func (s *postgresStore) UpdateWithdrawalStatus(ctx context.Context, orgID, id int64, status string) error {
	_, err := s.pool.Exec(ctx, `UPDATE withdrawals SET status = $1 WHERE id = $2 AND organization_id = $3`, status, id, orgID)
	return err
}

func (s *postgresStore) ExportAssetsCSV(ctx context.Context, orgID int64, f AssetFilter) ([]byte, error) {
	res, err := s.ListAssetsPaged(ctx, orgID, 1, 10000, f)
	if err != nil {
		return nil, err
	}
	var b strings.Builder
	b.WriteString("เลขที่,RFID,ชื่อ,หมวด,ชนิด,อาคาร,ห้อง,เจ้าของ,มูลค่า,สถานะ\n")
	for _, a := range res.Data {
		b.WriteString(fmt.Sprintf("%s,%s,%s,%s,%s,%s,%s,%s,%d,%s\n", a.AssetNumber, a.RFIDNum, a.AssetName, a.CategoryName, a.ClassName, a.BuildingName, a.RoomName, a.OwnerName, a.AssetValue, a.AssetStatusName))
	}
	return []byte(b.String()), nil
}
