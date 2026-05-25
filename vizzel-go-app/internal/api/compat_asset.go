package api

import (
	"strings"

	"github.com/vizzelintel/vizzel-track-demo-boss/vizzel-go-app/internal/store"
)

func toCompatAsset(a store.Asset) map[string]any {
	users := []any{}
	if a.OwnerName != "" {
		parts := strings.Fields(a.OwnerName)
		name := a.OwnerName
		surname := ""
		if len(parts) > 1 {
			name = parts[0]
			surname = strings.Join(parts[1:], " ")
		}
		users = append(users, map[string]any{
			"id":      0,
			"name":    name,
			"surname": surname,
		})
	}
	return map[string]any{
		"id":              a.ID,
		"assetName":       a.AssetName,
		"assetNumber":     a.AssetNumber,
		"rfidNum":         a.RFIDNum,
		"assetValue":      a.AssetValue,
		"isCheck":         false,
		"assetStatusID":   nil,
		"assetStatusName": a.AssetStatusName,
		"image":           nil,
		"images":          []any{},
		"roomID":          nil,
		"roomName":        a.RoomName,
		"buildingName":    a.BuildingName,
		"assetClassID":    a.ClassID,
		"className":       a.ClassName,
		"typeID":          a.CategoryID,
		"typeName":        a.TypeName,
		"categoryID":      a.CategoryID,
		"categoryName":    a.CategoryName,
		"receivedDate":    a.CreatedAt.Format("2006-01-02"),
		"expiryDate":      nil,
		"assetDetail":     "",
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

func rowsToNamed(rows []store.Row, key string) []map[string]any {
	out := make([]map[string]any, 0, len(rows))
	for _, r := range rows {
		out = append(out, map[string]any{"id": r.ID, key: r.Title})
	}
	return out
}
