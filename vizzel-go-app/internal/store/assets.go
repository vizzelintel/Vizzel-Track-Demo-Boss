package store

import "fmt"

type AssetFilter struct {
	Search            string
	CategoryID        int64
	TypeID            int64
	ClassID           int64
	StatusName        string
	AssetStatusID     int64
	IncludeChildOrgs  bool
}

type AssetListResult struct {
	Page       int     `json:"page"`
	PageSize   int     `json:"page_size"`
	Total      int     `json:"total"`
	TotalPages int     `json:"total_pages"`
	Data       []Asset `json:"data"`
}

type AssetReferenceData struct {
	Categories []Row `json:"categories"`
	Types      []Row `json:"types"`
	Classes    []Row `json:"classes"`
	Statuses   []Row `json:"statuses"`
}

func assetMeta(idx int) (cat, class, typ, building, room, owner, status string) {
	cats := []string{"ครุภัณฑ์คอมพิวเตอร์", "เฟอร์นิเจอร์", "ยานพาหนะ"}
	classes := []string{"Laptop", "Desktop", "Monitor", "Printer", "Desk", "Chair"}
	types := []string{"IT", "General", "Office"}
	buildings := []string{"อาคาร A", "อาคาร B"}
	owners := []string{"สมชาย ใจดี", "สมหญิง รักงาน", "ฝ่าย IT"}
	statuses := []string{"ใช้งาน", "ใช้งาน", "ใช้งาน", "ซ่อมบำรุง", "จำหน่ายแล้ว"}
	ci := idx % len(cats)
	cli := idx % len(classes)
	return cats[ci], classes[cli], types[ci%len(types)], buildings[idx%len(buildings)],
		fmt.Sprintf("ห้อง %d", 100+(idx%20)), owners[idx%len(owners)], statuses[idx%len(statuses)]
}
