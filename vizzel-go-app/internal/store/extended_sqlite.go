package store

import (
	"context"
	"fmt"
	"strings"
	"time"
)

func (s *sqliteStore) migrateExtended(ctx context.Context) error {
	stmts := []string{
		`ALTER TABLE users ADD COLUMN role_id INTEGER NOT NULL DEFAULT 2`,
		`ALTER TABLE users ADD COLUMN is_active INTEGER NOT NULL DEFAULT 1`,
		`CREATE TABLE IF NOT EXISTS institutes (id INTEGER PRIMARY KEY AUTOINCREMENT, organization_id INTEGER NOT NULL, name TEXT NOT NULL, created_at TEXT NOT NULL DEFAULT (datetime('now')))`,
		`CREATE TABLE IF NOT EXISTS sections (id INTEGER PRIMARY KEY AUTOINCREMENT, organization_id INTEGER NOT NULL, department_id INTEGER, name TEXT NOT NULL, created_at TEXT NOT NULL DEFAULT (datetime('now')))`,
		`CREATE TABLE IF NOT EXISTS positions (id INTEGER PRIMARY KEY AUTOINCREMENT, organization_id INTEGER NOT NULL, name TEXT NOT NULL, created_at TEXT NOT NULL DEFAULT (datetime('now')))`,
		`CREATE TABLE IF NOT EXISTS asset_types (id INTEGER PRIMARY KEY AUTOINCREMENT, organization_id INTEGER NOT NULL, category_id INTEGER, name TEXT NOT NULL, created_at TEXT NOT NULL DEFAULT (datetime('now')))`,
		`ALTER TABLE asset_classes ADD COLUMN type_id INTEGER`,
		`CREATE TABLE IF NOT EXISTS org_access (id INTEGER PRIMARY KEY AUTOINCREMENT, user_id INTEGER NOT NULL, organization_id INTEGER NOT NULL, role_id INTEGER NOT NULL DEFAULT 2, created_at TEXT NOT NULL DEFAULT (datetime('now')))`,
		`ALTER TABLE audit_jobs ADD COLUMN description TEXT NOT NULL DEFAULT ''`,
	}
	for _, q := range stmts {
		_, _ = s.db.ExecContext(ctx, q)
	}
	_, _ = s.db.ExecContext(ctx, `UPDATE users SET role_id = 1 WHERE email = 'superadmin@demo.local'`)
	return nil
}

func (s *sqliteStore) ListInstitutes(ctx context.Context, orgID int64) ([]Row, error) {
	return s.listRows(ctx, `SELECT id, name, '', '', 0, created_at FROM institutes WHERE organization_id = ?`, orgID)
}

func (s *sqliteStore) ListSections(ctx context.Context, orgID int64) ([]Row, error) {
	return s.listRows(ctx, `SELECT id, name, '', '', 0, created_at FROM sections WHERE organization_id = ?`, orgID)
}

func (s *sqliteStore) ListPositions(ctx context.Context, orgID int64) ([]Row, error) {
	return s.listRows(ctx, `SELECT id, name, '', '', 0, created_at FROM positions WHERE organization_id = ?`, orgID)
}

func (s *sqliteStore) ListAssetTypes(ctx context.Context, orgID int64, categoryID int64) ([]Row, error) {
	if categoryID > 0 {
		return s.listRows(ctx, `SELECT id, name, '', '', 0, created_at FROM asset_types WHERE organization_id = ? AND category_id = ?`, orgID, categoryID)
	}
	return s.listRows(ctx, `SELECT id, name, '', '', 0, created_at FROM asset_types WHERE organization_id = ?`, orgID)
}

func (s *sqliteStore) ListAssetClasses(ctx context.Context, orgID int64, typeID int64) ([]Row, error) {
	if typeID > 0 {
		return s.listRows(ctx, `SELECT id, name, '', '', 0, created_at FROM asset_classes WHERE organization_id = ? AND type_id = ?`, orgID, typeID)
	}
	return s.listRows(ctx, `SELECT id, name, '', '', 0, created_at FROM asset_classes WHERE organization_id = ?`, orgID)
}

func (s *sqliteStore) ListWithdrawals(ctx context.Context, orgID int64, status string) ([]Row, error) {
	if status != "" {
		return s.listRows(ctx, `SELECT id, requester, item_name, status, 0, created_at FROM withdrawals WHERE organization_id = ? AND status = ?`, orgID, status)
	}
	return s.listRows(ctx, `SELECT id, requester, item_name, status, 0, created_at FROM withdrawals WHERE organization_id = ?`, orgID)
}

func (s *sqliteStore) GetAuditJob(ctx context.Context, orgID, id int64) (*Row, error) {
	rows, err := s.listRows(ctx, `SELECT id, title, COALESCE(description,''), status, progress, created_at FROM audit_jobs WHERE organization_id = ? AND id = ?`, orgID, id)
	if err != nil || len(rows) == 0 {
		return nil, err
	}
	return &rows[0], nil
}

func (s *sqliteStore) DashboardExtended(ctx context.Context, orgID int64) (*DashboardExtended, error) {
	var totalValue int64
	var count int
	_ = s.db.QueryRowContext(ctx, `SELECT COALESCE(SUM(asset_value),0), COUNT(*) FROM assets WHERE organization_id = ? AND status != 'deleted'`, orgID).Scan(&totalValue, &count)
	dep := totalValue / 5
	net := totalValue - dep
	d := &DashboardExtended{
		TotalAssetValue:         totalValue,
		AccumulatedDepreciation: dep,
		NetBookValue:            net,
		TotalAssets:             count,
		NewAssetsThisYear:       count / 10,
		CurrentYearDepreciation: dep / 12,
		Trend:                   TrendSeries{Labels: []string{"ม.ค.", "ก.พ.", "มี.ค.", "เม.ย.", "พ.ค.", "มิ.ย."}, Values: []int{count / 6, count / 5, count / 4, count / 3, count / 2, count}},
	}
	rows, _ := s.db.QueryContext(ctx, `SELECT asset_status_name, COUNT(*) FROM assets WHERE organization_id = ? AND status != 'deleted' GROUP BY asset_status_name`, orgID)
	if rows != nil {
		defer rows.Close()
		for rows.Next() {
			var name string
			var c int
			_ = rows.Scan(&name, &c)
			d.StatusBreakdown = append(d.StatusBreakdown, StatusSlice{Name: name, Count: c})
		}
	}
	rows2, _ := s.db.QueryContext(ctx, `SELECT building_name, COUNT(*) FROM assets WHERE organization_id = ? AND status != 'deleted' AND building_name != '' GROUP BY building_name`, orgID)
	if rows2 != nil {
		defer rows2.Close()
		for rows2.Next() {
			var name string
			var c int
			_ = rows2.Scan(&name, &c)
			d.LocationBreakdown = append(d.LocationBreakdown, StatusSlice{Name: name, Count: c})
		}
	}
	return d, nil
}

func (s *sqliteStore) PersonalDashboard(ctx context.Context, orgID int64, ownerName string) (*PersonalDashboard, error) {
	var count int
	var val int64
	_ = s.db.QueryRowContext(ctx, `SELECT COUNT(*), COALESCE(SUM(asset_value),0) FROM assets WHERE organization_id = ? AND owner_name = ? AND status != 'deleted'`, orgID, ownerName).Scan(&count, &val)
	pd := &PersonalDashboard{OwnedAssets: count, TotalValue: val}
	rows, _ := s.db.QueryContext(ctx, `SELECT asset_status_name, COUNT(*) FROM assets WHERE organization_id = ? AND owner_name = ? GROUP BY asset_status_name`, orgID, ownerName)
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

func (s *sqliteStore) SuperAdminStats(ctx context.Context) (*SuperAdminStats, error) {
	st := &SuperAdminStats{}
	_ = s.db.QueryRowContext(ctx, `SELECT COUNT(*) FROM organizations`).Scan(&st.OrgCount)
	_ = s.db.QueryRowContext(ctx, `SELECT COUNT(*) FROM users`).Scan(&st.UserCount)
	_ = s.db.QueryRowContext(ctx, `SELECT COUNT(*) FROM assets WHERE status != 'deleted'`).Scan(&st.AssetCount)
	rows, _ := s.db.QueryContext(ctx, `SELECT o.name, COUNT(a.id) FROM organizations o LEFT JOIN assets a ON a.organization_id = o.id GROUP BY o.id ORDER BY COUNT(a.id) DESC LIMIT 5`)
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

func (s *sqliteStore) ListMenuToggles(ctx context.Context, orgID int64) ([]MenuToggle, error) {
	names := map[int]string{1: "เอกสาร", 2: "เบิก/ยืม Pro", 3: "รายงานขั้นสูง"}
	var out []MenuToggle
	for id, name := range names {
		var enabled int
		_ = s.db.QueryRowContext(ctx, `SELECT COALESCE(enabled,1) FROM organization_menus WHERE organization_id = ? AND menu_id = ?`, orgID, id).Scan(&enabled)
		out = append(out, MenuToggle{MenuID: id, Name: name, Enabled: enabled == 1})
	}
	return out, nil
}

func (s *sqliteStore) SetOrgMenu(ctx context.Context, orgID int64, menuID int, enabled bool) error {
	e := 0
	if enabled {
		e = 1
	}
	_, err := s.db.ExecContext(ctx, `INSERT INTO organization_menus (organization_id, menu_id, enabled) VALUES (?, ?, ?) ON CONFLICT(organization_id, menu_id) DO UPDATE SET enabled = ?`, orgID, menuID, e, e)
	return err
}

func (s *sqliteStore) ListOrgAccess(ctx context.Context) ([]OrgAccessRow, error) {
	rows, err := s.db.QueryContext(ctx, `SELECT oa.id, oa.user_id, COALESCE(u.display_name,u.email), oa.organization_id, org.name, oa.role_id
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

func (s *sqliteStore) CreateOrgAccess(ctx context.Context, userID, orgID int64, roleID int) error {
	_, err := s.db.ExecContext(ctx, `INSERT INTO org_access (user_id, organization_id, role_id) VALUES (?, ?, ?)`, userID, orgID, roleID)
	return err
}

func (s *sqliteStore) DeleteOrgAccess(ctx context.Context, id int64) error {
	_, err := s.db.ExecContext(ctx, `DELETE FROM org_access WHERE id = ?`, id)
	return err
}

func (s *sqliteStore) CreateOrganization(ctx context.Context, name string) (*Row, error) {
	res, err := s.db.ExecContext(ctx, `INSERT INTO organizations (name) VALUES (?)`, name)
	if err != nil {
		return nil, err
	}
	id, _ := res.LastInsertId()
	return &Row{ID: id, Title: name, CreatedAt: time.Now()}, nil
}

func (s *sqliteStore) DeleteOrganization(ctx context.Context, id int64) error {
	if id == 1 {
		return fmt.Errorf("cannot delete demo org")
	}
	_, err := s.db.ExecContext(ctx, `DELETE FROM organizations WHERE id = ?`, id)
	return err
}

func entityTable(kind string) (table, orgScoped string, err error) {
	switch kind {
	case "departments":
		return "departments", "organization_id", nil
	case "institutes":
		return "institutes", "organization_id", nil
	case "sections":
		return "sections", "organization_id", nil
	case "positions":
		return "positions", "organization_id", nil
	case "categories":
		return "asset_categories", "organization_id", nil
	case "types":
		return "asset_types", "organization_id", nil
	case "classes":
		return "asset_classes", "organization_id", nil
	case "buildings":
		return "buildings", "organization_id", nil
	case "rooms":
		return "rooms", "", nil
	case "audit-jobs":
		return "audit_jobs", "organization_id", nil
	case "repairs":
		return "repairs", "organization_id", nil
	case "withdrawals":
		return "withdrawals", "organization_id", nil
	case "sales":
		return "sales", "organization_id", nil
	default:
		return "", "", fmt.Errorf("unknown entity kind")
	}
}

func (s *sqliteStore) EntityCreate(ctx context.Context, kind string, orgID int64, name string, parentID int64) (int64, error) {
	table, orgCol, err := entityTable(kind)
	if err != nil {
		return 0, err
	}
	switch kind {
	case "types":
		res, err := s.db.ExecContext(ctx, `INSERT INTO asset_types (organization_id, category_id, name) VALUES (?, ?, ?)`, orgID, parentID, name)
		if err != nil {
			return 0, err
		}
		return res.LastInsertId()
	case "classes":
		res, err := s.db.ExecContext(ctx, `INSERT INTO asset_classes (organization_id, category_id, type_id, name) VALUES (?, 0, ?, ?)`, orgID, parentID, name)
		if err != nil {
			return 0, err
		}
		return res.LastInsertId()
	case "sections":
		res, err := s.db.ExecContext(ctx, `INSERT INTO sections (organization_id, department_id, name) VALUES (?, ?, ?)`, orgID, parentID, name)
		if err != nil {
			return 0, err
		}
		return res.LastInsertId()
	case "rooms":
		res, err := s.db.ExecContext(ctx, `INSERT INTO rooms (building_id, room_number, name) VALUES (?, ?, ?)`, parentID, name, name)
		if err != nil {
			return 0, err
		}
		return res.LastInsertId()
	case "audit-jobs":
		res, err := s.db.ExecContext(ctx, `INSERT INTO audit_jobs (organization_id, title, status, progress, description) VALUES (?, ?, 'ongoing', 0, ?)`, orgID, name, "")
		if err != nil {
			return 0, err
		}
		return res.LastInsertId()
	case "repairs":
		res, err := s.db.ExecContext(ctx, `INSERT INTO repairs (organization_id, asset_number, note, status) VALUES (?, ?, ?, 'pending')`, orgID, name, "")
		if err != nil {
			return 0, err
		}
		return res.LastInsertId()
	case "withdrawals":
		res, err := s.db.ExecContext(ctx, `INSERT INTO withdrawals (organization_id, requester, item_name, status) VALUES (?, ?, ?, 'pending')`, orgID, "ผู้ขอ", name)
		if err != nil {
			return 0, err
		}
		return res.LastInsertId()
	case "sales":
		res, err := s.db.ExecContext(ctx, `INSERT INTO sales (organization_id, asset_number, buyer, amount, status) VALUES (?, ?, '', 0, 'draft')`, orgID, name)
		if err != nil {
			return 0, err
		}
		return res.LastInsertId()
	default:
		q := fmt.Sprintf(`INSERT INTO %s (%s, name) VALUES (?, ?)`, table, orgCol)
		res, err := s.db.ExecContext(ctx, q, orgID, name)
		if err != nil {
			return 0, err
		}
		return res.LastInsertId()
	}
}

func (s *sqliteStore) EntityUpdate(ctx context.Context, kind string, orgID, id int64, name string) error {
	table, orgCol, err := entityTable(kind)
	if err != nil {
		return err
	}
	if kind == "rooms" {
		_, err = s.db.ExecContext(ctx, `UPDATE rooms SET name = ?, room_number = ? WHERE id = ?`, name, name, id)
		return err
	}
	if orgCol != "" {
		_, err = s.db.ExecContext(ctx, fmt.Sprintf(`UPDATE %s SET name = ? WHERE id = ? AND %s = ?`, table, orgCol), name, id, orgID)
		return err
	}
	_, err = s.db.ExecContext(ctx, fmt.Sprintf(`UPDATE %s SET name = ? WHERE id = ?`, table), name, id)
	return err
}

func (s *sqliteStore) EntityDelete(ctx context.Context, kind string, orgID, id int64) error {
	table, orgCol, err := entityTable(kind)
	if err != nil {
		return err
	}
	if orgCol != "" {
		_, err = s.db.ExecContext(ctx, fmt.Sprintf(`DELETE FROM %s WHERE id = ? AND %s = ?`, table, orgCol), id, orgID)
		return err
	}
	_, err = s.db.ExecContext(ctx, fmt.Sprintf(`DELETE FROM %s WHERE id = ?`, table), id)
	return err
}

func (s *sqliteStore) seedExtended(ctx context.Context, orgID int64) error {
	var n int
	_ = s.db.QueryRowContext(ctx, `SELECT COUNT(*) FROM institutes WHERE organization_id = ?`, orgID).Scan(&n)
	if n > 0 {
		return nil
	}
	_, _ = s.db.ExecContext(ctx, `INSERT INTO institutes (organization_id, name) VALUES (?, ?)`, orgID, "สถาบันหลัก")
	_, _ = s.db.ExecContext(ctx, `INSERT INTO sections (organization_id, name) VALUES (?, ?)`, orgID, "แผนกบัญชี")
	_, _ = s.db.ExecContext(ctx, `INSERT INTO positions (organization_id, name) VALUES (?, ?)`, orgID, "เจ้าหน้าที่")
	_, _ = s.db.ExecContext(ctx, `INSERT INTO positions (organization_id, name) VALUES (?, ?)`, orgID, "หัวหน้าแผนก")
	var catID int64
	_ = s.db.QueryRowContext(ctx, `SELECT id FROM asset_categories WHERE organization_id = ? LIMIT 1`, orgID).Scan(&catID)
	_, _ = s.db.ExecContext(ctx, `INSERT INTO asset_types (organization_id, category_id, name) VALUES (?, ?, ?)`, orgID, catID, "IT")
	_, _ = s.db.ExecContext(ctx, `INSERT INTO asset_types (organization_id, category_id, name) VALUES (?, ?, ?)`, orgID, catID, "General")
	var uid int64
	_ = s.db.QueryRowContext(ctx, `SELECT id FROM users WHERE email = 'admin@demo.local'`).Scan(&uid)
	_, _ = s.db.ExecContext(ctx, `INSERT OR IGNORE INTO org_access (user_id, organization_id, role_id) VALUES (?, ?, 2)`, uid, orgID)
	return nil
}

// asset CRUD sqlite
func (s *sqliteStore) GetAsset(ctx context.Context, orgID, id int64) (*Asset, error) {
	res, err := s.ListAssetsPaged(ctx, orgID, 1, 1, AssetFilter{})
	if err != nil {
		return nil, err
	}
	row := s.db.QueryRowContext(ctx, `SELECT id, organization_id, asset_number, asset_name, COALESCE(rfid_num,''), COALESCE(category_id,0), COALESCE(class_id,0),
		category_name, class_name, type_name, building_name, room_name, owner_name, asset_status_name, asset_value, status, created_at
		FROM assets WHERE organization_id = ? AND id = ?`, orgID, id)
	var a Asset
	var created string
	if err := row.Scan(&a.ID, &a.OrganizationID, &a.AssetNumber, &a.AssetName, &a.RFIDNum, &a.CategoryID, &a.ClassID,
		&a.CategoryName, &a.ClassName, &a.TypeName, &a.BuildingName, &a.RoomName, &a.OwnerName, &a.AssetStatusName,
		&a.AssetValue, &a.Status, &created); err != nil {
		return nil, err
	}
	a.CreatedAt, _ = parseSQLiteTime(created)
	_ = res
	return &a, nil
}

func (s *sqliteStore) CreateAsset(ctx context.Context, orgID int64, in AssetInput) (*Asset, error) {
	if in.AssetStatusName == "" {
		in.AssetStatusName = "ใช้งาน"
	}
	res, err := s.db.ExecContext(ctx, `INSERT INTO assets (organization_id, asset_number, asset_name, rfid_num, category_id, class_id, category_name, class_name, type_name, building_name, room_name, owner_name, asset_status_name, asset_value, status)
		VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'active')`,
		orgID, in.AssetNumber, in.AssetName, in.RFIDNum, in.CategoryID, in.ClassID, in.CategoryName, in.ClassName, in.TypeName, in.BuildingName, in.RoomName, in.OwnerName, in.AssetStatusName, in.AssetValue)
	if err != nil {
		return nil, err
	}
	id, _ := res.LastInsertId()
	return s.GetAsset(ctx, orgID, id)
}

func (s *sqliteStore) UpdateAsset(ctx context.Context, orgID, id int64, in AssetInput) error {
	_, err := s.db.ExecContext(ctx, `UPDATE assets SET asset_number=?, asset_name=?, rfid_num=?, category_id=?, class_id=?, category_name=?, class_name=?, type_name=?, building_name=?, room_name=?, owner_name=?, asset_status_name=?, asset_value=? WHERE id=? AND organization_id=?`,
		in.AssetNumber, in.AssetName, in.RFIDNum, in.CategoryID, in.ClassID, in.CategoryName, in.ClassName, in.TypeName, in.BuildingName, in.RoomName, in.OwnerName, in.AssetStatusName, in.AssetValue, id, orgID)
	return err
}

func (s *sqliteStore) DeleteAsset(ctx context.Context, orgID, id int64) error {
	_, err := s.db.ExecContext(ctx, `UPDATE assets SET status='deleted' WHERE id=? AND organization_id=?`, id, orgID)
	return err
}

func (s *sqliteStore) UpdateWithdrawalStatus(ctx context.Context, orgID, id int64, status string) error {
	_, err := s.db.ExecContext(ctx, `UPDATE withdrawals SET status = ? WHERE id = ? AND organization_id = ?`, status, id, orgID)
	return err
}

func (s *sqliteStore) ExportAssetsCSV(ctx context.Context, orgID int64, f AssetFilter) ([]byte, error) {
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

