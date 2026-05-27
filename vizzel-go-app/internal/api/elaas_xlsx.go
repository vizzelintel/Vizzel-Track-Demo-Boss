package api

import (
	"bytes"
	"fmt"
	"io"
	"log"
	"net/http"
	"regexp"
	"runtime/debug"
	"strconv"
	"strings"
	"time"

	"github.com/vizzelintel/vizzel-track-demo-boss/vizzel-go-app/internal/store"
	"github.com/xuri/excelize/v2"
)

// maxImportBodyBytes caps multipart uploads so a malformed/oversized request
// can't park a Fly machine for the full proxy timeout. 32MB is comfortably
// larger than any real ELAAS export but small enough to fail fast.
const maxImportBodyBytes = 32 << 20

// ImportElaasXLSX accepts the official ELAAS asset register .xlsx export
// (รายงานทะเบียนข้อมูลสินทรัพย์) and creates assets in the user's
// organization. It is engineered against the อบต. ละหาร sample export but is
// resilient to small layout shifts because it locates the data-region by
// searching for the "ลำดับ" header row.
func (h *Handler) ImportElaasXLSX(w http.ResponseWriter, r *http.Request) {
	defer func() {
		if rec := recover(); rec != nil {
			log.Printf("elaas import panic: %v\n%s", rec, debug.Stack())
			writeError(w, http.StatusInternalServerError, "elaas import crashed")
		}
	}()
	claims, ok := claimsFromContext(r.Context())
	if !ok {
		writeError(w, http.StatusUnauthorized, "unauthorized")
		return
	}
	// Cap the request body so an oversized upload fails immediately instead
	// of holding the worker open until the Fly proxy idle-timeout (60s) and
	// returning a 502 to the client.
	r.Body = http.MaxBytesReader(w, r.Body, maxImportBodyBytes)
	file, header, err := r.FormFile("file")
	if err != nil {
		log.Printf("elaas import: FormFile failed: %v", err)
		writeError(w, http.StatusBadRequest, "file required: "+err.Error())
		return
	}
	defer file.Close()
	buf, err := io.ReadAll(file)
	if err != nil {
		log.Printf("elaas import: read body failed (size cap %d): %v", maxImportBodyBytes, err)
		writeError(w, http.StatusBadRequest, "read failed: "+err.Error())
		return
	}
	dryRun := r.FormValue("dryRun") == "true" || r.FormValue("dryRun") == "1"
	report, err := h.parseElaasXLSX(bytes.NewReader(buf))
	if err != nil {
		log.Printf("elaas import: parseElaasXLSX failed for %q (%d bytes): %v", header.Filename, len(buf), err)
		writeError(w, http.StatusBadRequest, "elaas parse failed: "+err.Error())
		return
	}

	imported, failed, skipped := 0, 0, 0
	errors := []map[string]any{}
	if !dryRun {
		for i, row := range report.Rows {
			in := store.AssetInput{
				AssetNumber:      row.AssetNumber,
				ElaasCode:        row.ElaasCode,
				AssetName:        row.AssetName,
				CategoryName:     row.Category,
				ClassName:        row.Class,
				BuildingName:     "",
				RoomName:         "",
				OwnerName:        row.OwnerName,
				AssetValue:       int64(row.PurchaseValue),
				AssetStatusName:  defaultIfEmpty(row.Status, "ใช้งาน"),
				IsDepreciation:   true,
				HasComponentList: false,
				AssetDetails:     row.Details,
			}
			if _, err := h.store.CreateAsset(r.Context(), claims.OrganizationID, in); err != nil {
				failed++
				log.Printf("elaas import: row %d (%s) create failed: %v", i+1, row.AssetNumber, err)
				if len(errors) < 25 {
					errors = append(errors, map[string]any{
						"line":  i + 1,
						"error": err.Error(),
					})
				}
				continue
			}
			imported++
		}
	}
	log.Printf("elaas import done: file=%q rows=%d imported=%d failed=%d dry_run=%v",
		header.Filename, len(report.Rows), imported, failed, dryRun)
	resp := map[string]any{
		"filename":      header.Filename,
		"sheet":         report.SheetName,
		"header_row":    report.HeaderRowIdx,
		"data_rows":     len(report.Rows),
		"imported":      imported,
		"failed":        failed,
		"skipped":       skipped,
		"dry_run":       dryRun,
		"created":       imported,
		"updated":       0,
		"errors":        errors,
		"successes":     []any{},
		"newCategories": report.CategorySet(),
		"newTypes":      []any{},
		"newClasses":    report.ClassSet(),
		"newBuildings":  []any{},
		"newRooms":      []any{},
		"newStatuses":   []any{},
		"sample":        elaasSample(report.Rows, 5),
		"summary": map[string]any{
			"total_value": report.TotalValue,
			"categories":  report.CategorySet(),
			"classes":     report.ClassSet(),
		},
	}
	writeJSON(w, http.StatusOK, resp)
}

func elaasSample(rows []ElaasRow, n int) []ElaasRow {
	if len(rows) > n {
		return rows[:n]
	}
	return rows
}

type ElaasRow struct {
	Seq            int     `json:"seq"`
	Category       string  `json:"category"`
	Class          string  `json:"class"`
	ElaasCode      string  `json:"elaas_code"`
	AssetNumber    string  `json:"asset_number"`
	AssetName      string  `json:"asset_name"`
	Details        string  `json:"details"`
	AcquireDate    string  `json:"acquire_date"`
	PurchaseValue  float64 `json:"purchase_value"`
	AccumDepr      float64 `json:"accumulated_depr"`
	NetBookValue   float64 `json:"net_book_value"`
	UsefulLife     int     `json:"useful_life"`
	Status         string  `json:"status"`
	AcquiredBy     string  `json:"acquired_by"`
	AcquiredFrom   string  `json:"acquired_from"`
	WarrantyStart  string  `json:"warranty_start"`
	WarrantyEnd    string  `json:"warranty_end"`
	OwnerName      string  `json:"owner_name"`
	Condition      string  `json:"condition"`
}

type ElaasReport struct {
	SheetName    string     `json:"sheet"`
	HeaderRowIdx int        `json:"header_row"`
	Rows         []ElaasRow `json:"rows"`
	TotalValue   float64    `json:"total_value"`
}

func (r ElaasReport) CategorySet() []string {
	seen := map[string]struct{}{}
	out := []string{}
	for _, row := range r.Rows {
		if row.Category == "" {
			continue
		}
		if _, ok := seen[row.Category]; ok {
			continue
		}
		seen[row.Category] = struct{}{}
		out = append(out, row.Category)
	}
	return out
}

func (r ElaasReport) ClassSet() []string {
	seen := map[string]struct{}{}
	out := []string{}
	for _, row := range r.Rows {
		if row.Class == "" {
			continue
		}
		if _, ok := seen[row.Class]; ok {
			continue
		}
		seen[row.Class] = struct{}{}
		out = append(out, row.Class)
	}
	return out
}

// elaasCodeRE matches "<elaas-code> (<asset_number>)" both with and without
// dashes inside the inner asset_number group.
var elaasCodeRE = regexp.MustCompile(`^\s*([\d][\d\-]*)\s*\(\s*([\d\s\-]+)\s*\)\s*$`)

func (h *Handler) parseElaasXLSX(r io.Reader) (*ElaasReport, error) {
	f, err := excelize.OpenReader(r)
	if err != nil {
		return nil, err
	}
	defer f.Close()
	if len(f.GetSheetList()) == 0 {
		return nil, fmt.Errorf("workbook has no sheets")
	}
	sheet := f.GetSheetList()[0]
	rows, err := f.GetRows(sheet)
	if err != nil {
		return nil, err
	}
	headerIdx := -1
	for i, row := range rows {
		if i > 50 {
			break
		}
		for _, cell := range row {
			if strings.TrimSpace(cell) == "ลำดับ" {
				headerIdx = i
				break
			}
		}
		if headerIdx >= 0 {
			break
		}
	}
	if headerIdx < 0 {
		return nil, fmt.Errorf("header row (ลำดับ) not found within first 50 rows")
	}
	header := rows[headerIdx]
	cols := mapElaasHeader(header)
	dataStart := headerIdx + 1
	if dataStart < len(rows) {
		// Skip second-row header sometimes used (same shape).
		next := rows[dataStart]
		if isAnotherHeader(next, header) {
			dataStart++
		}
	}
	out := &ElaasReport{SheetName: sheet, HeaderRowIdx: headerIdx + 1}
	for ri := dataStart; ri < len(rows); ri++ {
		row := rows[ri]
		if len(row) == 0 {
			continue
		}
		first := strings.TrimSpace(cellAt(row, cols["seq"]))
		if first == "" {
			continue
		}
		if strings.HasPrefix(first, "รวมชนิดสินทรัพย์") || strings.HasPrefix(first, "รวมประเภท") || strings.HasPrefix(first, "รวมทั้ง") {
			continue
		}
		seq, _ := strconv.Atoi(first)
		assetName := strings.TrimSpace(cellAt(row, cols["asset_name"]))
		if assetName == "" {
			continue
		}
		codeRaw := strings.TrimSpace(cellAt(row, cols["code"]))
		elaas, assetNum := splitElaasCode(codeRaw)
		// Resolve embedded richText (excelize already flattens, but defensive).
		if elaas == "" && assetNum == "" {
			assetNum = codeRaw
		}
		purchase := parseElaasNumber(cellAt(row, cols["purchase"]))
		accum := parseElaasNumber(cellAt(row, cols["accum_depr"]))
		net := parseElaasNumber(cellAt(row, cols["net_book"]))
		life, _ := strconv.Atoi(strings.TrimSpace(cellAt(row, cols["useful_life"])))
		out.TotalValue += purchase
		out.Rows = append(out.Rows, ElaasRow{
			Seq:           seq,
			Category:      strings.TrimSpace(cellAt(row, cols["category"])),
			Class:         strings.TrimSpace(cellAt(row, cols["class"])),
			ElaasCode:     elaas,
			AssetNumber:   assetNum,
			AssetName:     assetName,
			Details:       strings.TrimSpace(cellAt(row, cols["details"])),
			AcquireDate:   normalizeThaiDate(cellAt(row, cols["acquire_date"])),
			PurchaseValue: purchase,
			AccumDepr:     accum,
			NetBookValue:  net,
			UsefulLife:    life,
			Status:        strings.TrimSpace(cellAt(row, cols["status"])),
			AcquiredBy:    strings.TrimSpace(cellAt(row, cols["acquired_by"])),
			AcquiredFrom:  strings.TrimSpace(cellAt(row, cols["acquired_from"])),
			WarrantyStart: normalizeThaiDate(cellAt(row, cols["warranty_start"])),
			WarrantyEnd:   normalizeThaiDate(cellAt(row, cols["warranty_end"])),
			OwnerName:     strings.TrimSpace(cellAt(row, cols["owner"])),
			Condition:     strings.TrimSpace(cellAt(row, cols["condition"])),
		})
	}
	return out, nil
}

func mapElaasHeader(header []string) map[string]int {
	cols := map[string]int{
		"seq":           1,
		"category":      2,
		"class":         3,
		"code":          4,
		"asset_name":    5,
		"details":       6,
		"acquire_date":  7,
		"purchase":      8,
		"accum_depr":    9,
		"net_book":      10,
		"useful_life":   11,
		"repair_value":  12,
		"repair_count":  13,
		"status":        14,
		"acquired_by":   15,
		"acquired_from": 16,
		"warranty_start": 17,
		"warranty_end":  18,
		"condition":     27,
		"owner":         28,
	}
	for i, raw := range header {
		t := strings.ReplaceAll(strings.TrimSpace(raw), "\n", " ")
		t = strings.Join(strings.Fields(t), " ")
		switch {
		case t == "ลำดับ":
			cols["seq"] = i
		case strings.HasPrefix(t, "ประเภทสินทรัพย์") || t == "ประเภท สินทรัพย์":
			cols["category"] = i
		case strings.HasPrefix(t, "ชนิดสินทรัพย์"):
			cols["class"] = i
		case strings.Contains(t, "รหัสสินทรัพย์ในระบบ") || strings.Contains(t, "รหัสสินทรัพย์ อปท"):
			cols["code"] = i
		case t == "ชื่อสินทรัพย์":
			cols["asset_name"] = i
		case t == "รายละเอียดสินทรัพย์":
			cols["details"] = i
		case t == "วันที่ได้มา":
			cols["acquire_date"] = i
		case t == "ราคาสินทรัพย์":
			cols["purchase"] = i
		case strings.HasPrefix(t, "ค่าเสื่อมราคา"):
			cols["accum_depr"] = i
		case strings.HasPrefix(t, "มูลค่าสินทรัพย์ สุทธิ") || strings.HasPrefix(t, "มูลค่าสินทรัพย์สุทธิ"):
			cols["net_book"] = i
		case strings.HasPrefix(t, "อายุ"):
			cols["useful_life"] = i
		case t == "สถานะ":
			cols["status"] = i
		case t == "ได้มาโดย":
			cols["acquired_by"] = i
		case t == "ได้มาจาก":
			cols["acquired_from"] = i
		case strings.HasPrefix(t, "วันที่เริ่มรับ"):
			cols["warranty_start"] = i
		case strings.HasPrefix(t, "วันที่สิ้นสุด"):
			cols["warranty_end"] = i
		case t == "สภาพสินทรัพย์":
			cols["condition"] = i
		case strings.HasPrefix(t, "งานที่รับผิดชอบ"):
			cols["owner"] = i
		}
	}
	return cols
}

func isAnotherHeader(row, header []string) bool {
	// Second-row sub-headers in the ELAAS export repeat the same first-column
	// label (ลำดับ) and key columns. Treat as a continuation header.
	if len(row) < 4 {
		return false
	}
	if strings.TrimSpace(row[1]) == "ประเภท" || strings.Contains(row[1], "ประเภท") {
		// Could be either header or the legitimate first record. Only skip if
		// the row also has "ชนิดสินทรัพย์" header text.
		joined := strings.Join(row, " ")
		if strings.Contains(joined, "ชนิดสินทรัพย์") && strings.Contains(joined, "ลำดับ") {
			return true
		}
	}
	_ = header
	return false
}

func cellAt(row []string, i int) string {
	if i < 0 || i >= len(row) {
		return ""
	}
	return row[i]
}

func splitElaasCode(raw string) (elaas, number string) {
	raw = strings.TrimSpace(raw)
	if raw == "" {
		return "", ""
	}
	m := elaasCodeRE.FindStringSubmatch(raw)
	if m == nil {
		// fall back to legacy parser shared with CSV import
		return parseElaasCombined(raw)
	}
	elaas = strings.TrimSpace(m[1])
	inner := strings.TrimSpace(m[2])
	parts := strings.FieldsFunc(inner, func(r rune) bool {
		return r == ' ' || r == '-' || r == '\t'
	})
	number = strings.Join(parts, "-")
	return elaas, number
}

func parseElaasNumber(raw string) float64 {
	t := strings.TrimSpace(raw)
	if t == "" {
		return 0
	}
	t = strings.ReplaceAll(t, ",", "")
	t = strings.ReplaceAll(t, " ", "")
	v, _ := strconv.ParseFloat(t, 64)
	return v
}

// normalizeThaiDate converts dd/mm/yyyy (Buddhist or Western) to an
// ISO-8601 date string. Empty input returns "".
func normalizeThaiDate(raw string) string {
	t := strings.TrimSpace(raw)
	if t == "" {
		return ""
	}
	parts := strings.Split(t, "/")
	if len(parts) != 3 {
		return t
	}
	day, err := strconv.Atoi(parts[0])
	if err != nil {
		return t
	}
	month, err := strconv.Atoi(parts[1])
	if err != nil {
		return t
	}
	year, err := strconv.Atoi(parts[2])
	if err != nil {
		return t
	}
	if year > 2400 {
		year -= 543 // Buddhist -> Gregorian
	}
	dt := time.Date(year, time.Month(month), day, 0, 0, 0, 0, time.UTC)
	return dt.Format("2006-01-02")
}

func defaultIfEmpty(v, def string) string {
	if strings.TrimSpace(v) == "" {
		return def
	}
	return v
}
