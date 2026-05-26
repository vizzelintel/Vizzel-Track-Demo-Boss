package store

import (
	"strconv"
	"time"
)

type DashboardBundle struct {
	Extended              DashboardExtended
	DepreciationHistory   []DepreciationHistoryPoint
	ValueHistory          []ValueHistoryPoint
	TrendByMonth          []map[string]any // date ISO, count
	NewAssetRows          []map[string]any
	LocationRows          []map[string]any
}

func ComputeDashboardBundle(assets []DepreciationAssetInput, meta []dashboardAssetMeta, now time.Time) *DashboardBundle {
	currentYear := now.Year()
	ext := DashboardExtended{
		Trend: TrendSeries{Labels: []string{}, Values: []int{}},
	}

	var totalValue int64
	var totalAssets int
	var newThisYear int
	var accDep int64
	var currentYearDep int64
	statusMap := map[string]int{}
	locMap := map[string]struct {
		count int
		value int64
	}{}

	fyStart := time.Date(currentYear, 1, 1, 0, 0, 0, 0, time.UTC)

	for i, a := range assets {
		cost := a.AssetValue
		totalAssets++
		totalValue += cost
		accDep += AccumulatedDepreciation(a, now)
		currentYearDep += YearDepreciation(a, currentYear, now)

		if i < len(meta) {
			m := meta[i]
			if m.createdAt.Year() == currentYear {
				newThisYear++
			}
			st := m.statusName
			if st == "" {
				st = "ใช้งาน"
			}
			statusMap[st]++
			loc := m.buildingName
			if loc == "" {
				loc = "ไม่ระบุ"
			}
			e := locMap[loc]
			e.count++
			e.value += cost
			locMap[loc] = e
		}
	}

	ext.TotalAssetValue = totalValue
	ext.AccumulatedDepreciation = accDep
	ext.NetBookValue = totalValue - accDep
	if ext.NetBookValue < 0 {
		ext.NetBookValue = 0
	}
	ext.TotalAssets = totalAssets
	ext.NewAssetsThisYear = newThisYear
	ext.CurrentYearDepreciation = currentYearDep
	_ = fyStart

	for name, c := range statusMap {
		ext.StatusBreakdown = append(ext.StatusBreakdown, StatusSlice{Name: name, Count: c})
	}
	for name, e := range locMap {
		ext.LocationBreakdown = append(ext.LocationBreakdown, StatusSlice{Name: name, Count: e.count})
	}

	// Depreciation & value history — 5 ปีล่าสุด
	startY := currentYear - 4
	var depHist []DepreciationHistoryPoint
	var valHist []ValueHistoryPoint
	var runningAcc int64
	for y := startY; y <= currentYear; y++ {
		var yearDep int64
		var yearCost int64
		yEnd := time.Date(y, 12, 31, 23, 59, 59, 0, time.UTC)
		if yEnd.After(now) {
			yEnd = now
		}
		for _, a := range assets {
			yearDep += YearDepreciation(a, y, now)
			if !a.ReceivedDate.IsZero() && a.ReceivedDate.Year() <= y {
				yearCost += a.AssetValue
			}
		}
		runningAcc += yearDep
		if runningAcc > yearCost && yearCost > 0 {
			runningAcc = yearCost
		}
		nb := yearCost - runningAcc
		if yearCost > GovResidualBaht && nb < GovResidualBaht {
			nb = GovResidualBaht
		}
		depHist = append(depHist, DepreciationHistoryPoint{
			Year:         itoa(y),
			Granularity:  "year",
			Depreciation: yearDep,
			Accumulated:  runningAcc,
		})
		valHist = append(valHist, ValueHistoryPoint{
			Date:         time.Date(y, 6, 1, 0, 0, 0, 0, time.UTC).Format(time.RFC3339),
			Cost:         yearCost,
			NetBookValue: nb,
		})
	}

	// Trend — รายเดือน 6 เดือนล่าสุด (จำนวนสินทรัพย์ที่รับเข้า)
	trend := make([]map[string]any, 0, 6)
	for m := 5; m >= 0; m-- {
		t := now.AddDate(0, -m, 0)
		key := time.Date(t.Year(), t.Month(), 1, 0, 0, 0, 0, time.UTC)
		count := 0
		for _, row := range meta {
			if row.createdAt.Year() == key.Year() && row.createdAt.Month() == key.Month() {
				count++
			}
		}
		trend = append(trend, map[string]any{
			"date":  key.Format(time.RFC3339),
			"count": count,
		})
	}

	newRows := make([]map[string]any, 0, 20)
	for i, a := range assets {
		if i >= len(meta) {
			break
		}
		m := meta[i]
		if m.createdAt.Year() != currentYear {
			continue
		}
		newRows = append(newRows, map[string]any{
			"id":           m.id,
			"assetNumber":  m.assetNumber,
			"assetName":    m.assetName,
			"category":     m.categoryName,
			"cost":         a.AssetValue,
			"receivedDate": m.createdAt.Format("2006-01-02"),
		})
		if len(newRows) >= 20 {
			break
		}
	}

	locRows := make([]map[string]any, 0, len(locMap))
	for name, e := range locMap {
		locRows = append(locRows, map[string]any{
			"location": name,
			"count":    e.count,
			"value":    e.value,
		})
	}

	return &DashboardBundle{
		Extended:            ext,
		DepreciationHistory: depHist,
		ValueHistory:        valHist,
		TrendByMonth:        trend,
		NewAssetRows:        newRows,
		LocationRows:        locRows,
	}
}

type dashboardAssetMeta struct {
	id           int64
	assetNumber  string
	assetName    string
	categoryName string
	statusName   string
	buildingName string
	createdAt    time.Time
}

func itoa(y int) string {
	return strconv.Itoa(y)
}
