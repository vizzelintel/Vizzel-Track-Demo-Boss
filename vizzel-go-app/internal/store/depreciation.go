package store

import "time"

// GovResidualBaht — มูลค่าคงเหลือตามหลักบัญชีราชการ (สินทรัพย์ − ค่าเสื่อม ≥ 1 บาท)
const GovResidualBaht int64 = 1

// DepreciationAssetInput ข้อมูลขั้นต่ำสำหรับคำนวณค่าเสื่อม
type DepreciationAssetInput struct {
	AssetValue    int64
	AvailableAge  int // ปีอายุการใช้งาน
	ReceivedDate  time.Time
}

func maxDepreciable(cost int64) int64 {
	if cost <= GovResidualBaht {
		return 0
	}
	return cost - GovResidualBaht
}

func monthsBetween(start, end time.Time) int {
	sy, sm := start.Year(), int(start.Month())
	ey, em := end.Year(), int(end.Month())
	return (ey-sy)*12 + (em - sm)
}

// AccumulatedDepreciation ค่าเสื่อมสะสม ณ วันที่ asOf (ไม่เกิน cost−1)
func AccumulatedDepreciation(a DepreciationAssetInput, asOf time.Time) int64 {
	cost := a.AssetValue
	if cost <= GovResidualBaht || a.AvailableAge <= 0 || a.ReceivedDate.IsZero() {
		return 0
	}
	cap := maxDepreciable(cost)
	usefulMonths := a.AvailableAge * 12
	if usefulMonths <= 0 {
		return 0
	}
	monthly := float64(cap) / float64(usefulMonths)
	start := time.Date(a.ReceivedDate.Year(), a.ReceivedDate.Month(), 1, 0, 0, 0, 0, time.UTC)
	end := time.Date(asOf.Year(), asOf.Month(), 1, 0, 0, 0, 0, time.UTC)
	months := monthsBetween(start, end)
	if months < 0 {
		months = 0
	}
	dep := int64(monthly * float64(months))
	if dep > cap {
		dep = cap
	}
	return dep
}

// NetBookValue มูลค่าสุทธิ = ต้นทุน − ค่าเสื่อมสะสม (ขั้นต่ำ 1 บาทเมื่อ cost > 1)
func NetBookValue(a DepreciationAssetInput, asOf time.Time) int64 {
	cost := a.AssetValue
	if cost <= GovResidualBaht {
		return cost
	}
	nb := cost - AccumulatedDepreciation(a, asOf)
	if nb < GovResidualBaht {
		return GovResidualBaht
	}
	return nb
}

// YearDepreciation ค่าเสื่อมของปีปฏิทิน y (หยุดเมื่อสะสมถึง cost−1)
func YearDepreciation(a DepreciationAssetInput, year int, now time.Time) int64 {
	if a.AssetValue <= GovResidualBaht || a.AvailableAge <= 0 || a.ReceivedDate.IsZero() {
		return 0
	}
	yEnd := time.Date(year, 12, 31, 23, 59, 59, 0, time.UTC)
	if yEnd.After(now) {
		yEnd = now
	}
	yStart := time.Date(year, 1, 1, 0, 0, 0, 0, time.UTC)
	if yStart.Before(a.ReceivedDate) {
		yStart = a.ReceivedDate
	}
	if yEnd.Before(yStart) {
		return 0
	}
	accEnd := AccumulatedDepreciation(a, yEnd)
	accBefore := int64(0)
	if year > a.ReceivedDate.Year() {
		dayBefore := time.Date(year, 1, 1, 0, 0, 0, 0, time.UTC).Add(-time.Second)
		accBefore = AccumulatedDepreciation(a, dayBefore)
	}
	dep := accEnd - accBefore
	if dep < 0 {
		return 0
	}
	return dep
}

type DepreciationHistoryPoint struct {
	Year           string
	Granularity    string
	Depreciation   int64
	Accumulated    int64
}

type ValueHistoryPoint struct {
	Date         string
	Cost         int64
	NetBookValue int64
}
