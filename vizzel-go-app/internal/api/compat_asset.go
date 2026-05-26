package api

import (
	"strings"
	"time"

	"github.com/vizzelintel/vizzel-track-demo-boss/vizzel-go-app/internal/store"
)

func toCompatAsset(a store.Asset) map[string]any {
	users := []any{}
	if a.UserID > 0 || a.OwnerName != "" {
		parts := strings.Fields(a.OwnerName)
		name := a.OwnerName
		surname := ""
		if len(parts) > 1 {
			name = parts[0]
			surname = strings.Join(parts[1:], " ")
		}
		users = append(users, map[string]any{
			"id":      a.UserID,
			"name":    name,
			"surname": surname,
		})
	}
	recv := a.ReceivedDate
	if recv.IsZero() {
		recv = a.CreatedAt
	}
	var expiry any
	if a.ExpiryDate != nil {
		expiry = a.ExpiryDate.Format(time.RFC3339)
	}
	return map[string]any{
		"id":              a.ID,
		"assetName":       a.AssetName,
		"assetNumber":     a.AssetNumber,
		"elaasCode":       a.ElaasCode,
		"rfidNum":         a.RFIDNum,
		"assetValue":      a.AssetValue,
		"isCheck":         a.IsCheck,
		"isDepreciation":  a.IsDepreciation,
		"assetStatusID":   a.AssetStatusID,
		"assetStatusName": a.AssetStatusName,
		"image":           nil,
		"images":          []any{},
		"roomID":          nil,
		"roomName":        a.RoomName,
		"buildingName":    a.BuildingName,
		"assetClassID":    a.ClassID,
		"className":       a.ClassName,
		"typeID":          a.TypeID,
		"typeName":        a.TypeName,
		"categoryID":      a.CategoryID,
		"categoryName":    a.CategoryName,
		"receivedDate":    recv.Format(time.RFC3339),
		"expiryDate":      expiry,
		"assetDetail":     a.AssetDetails,
		"getByID":         a.GetByID,
		"sourceFundID":    a.SourceFundID,
		"getFrom":         a.GetFrom,
		"availableAge":    a.AvailableAge,
		"users":           users,
	}
}

func toCompatAssets(items []store.Asset) []map[string]any {
	out := make([]map[string]any, 0, len(items))
	for _, a := range items {
		out = append(out, toCompatAsset(a))
	}
	return out
}

func rowIDValid(r store.Row) bool {
	return r.ID > 0
}

func rowToCategory(r store.Row) map[string]any {
	return map[string]any{"id": r.ID, "categoryName": r.Title}
}

func rowToType(r store.Row) map[string]any {
	return map[string]any{"id": r.ID, "typeName": r.Title, "categoryID": r.Value}
}

func rowToClass(r store.Row) map[string]any {
	return map[string]any{"id": r.ID, "className": r.Title, "typeID": r.Value}
}

func rowToStatus(r store.Row) map[string]any {
	return map[string]any{"id": r.ID, "status": r.Title}
}

func rowToBuilding(r store.Row) map[string]any {
	return map[string]any{"id": r.ID, "buildingName": r.Title}
}

func rowToRoom(r store.Row) map[string]any {
	return map[string]any{"id": r.ID, "roomName": r.Title, "buildingID": r.Value}
}

func rowToUser(r store.Row) map[string]any {
	parts := strings.Fields(r.Title)
	name := r.Title
	surname := ""
	if len(parts) > 1 {
		name = parts[0]
		surname = strings.Join(parts[1:], " ")
	}
	return map[string]any{
		"id":      r.ID,
		"name":    name,
		"surname": surname,
		"email":   r.Subtitle,
	}
}

func rowToOrgUser(o store.OrgUserRow) map[string]any {
	m := map[string]any{
		"relationID":     o.RelationID,
		"roleID":         o.RoleID,
		"verify":         o.Verify,
		"status":         o.Status,
		"organizationID": o.OrganizationID,
		"user": map[string]any{
			"id":       o.UserID,
			"username": o.Username,
			"name":     o.Name,
			"surname":  o.Surname,
			"email":    o.Email,
		},
	}
	if o.DeptID != nil {
		m["deptID"] = *o.DeptID
	}
	if o.InstituteID != nil {
		m["instituteID"] = *o.InstituteID
	}
	if o.SectionID != nil {
		m["sectionID"] = *o.SectionID
	}
	if o.DeptName != "" {
		dept := map[string]any{"name": o.DeptName}
		if o.DeptID != nil {
			dept["id"] = *o.DeptID
		}
		m["department"] = dept
	}
	if o.InstituteName != "" {
		inst := map[string]any{"name": o.InstituteName}
		if o.InstituteID != nil {
			inst["id"] = *o.InstituteID
		}
		m["institute"] = inst
	}
	if o.SectionName != "" {
		sec := map[string]any{"name": o.SectionName}
		if o.SectionID != nil {
			sec["id"] = *o.SectionID
		}
		m["section"] = sec
	}
	return m
}

func orgUsersToMaps(users []store.OrgUserRow) []map[string]any {
	out := make([]map[string]any, 0, len(users))
	for _, u := range users {
		out = append(out, rowToOrgUser(u))
	}
	return out
}

func rowToDepartment(r store.Row) map[string]any {
	m := map[string]any{
		"id":       r.ID,
		"deptName": r.Title,
		"dept_name": r.Title,
		"name":     r.Title,
	}
	if r.Value > 0 {
		m["instituteID"] = r.Value
	}
	return m
}

func departmentsToMaps(rows []store.Row) []map[string]any {
	out := make([]map[string]any, 0, len(rows))
	for _, r := range rows {
		if rowIDValid(r) {
			out = append(out, rowToDepartment(r))
		}
	}
	return out
}

func rowsToNamed(rows []store.Row, key string) []map[string]any {
	out := make([]map[string]any, 0, len(rows))
	for _, r := range rows {
		if rowIDValid(r) {
			out = append(out, map[string]any{"id": r.ID, key: r.Title})
		}
	}
	return out
}
