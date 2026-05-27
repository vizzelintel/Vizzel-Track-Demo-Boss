package api

import (
	"bytes"
	"encoding/csv"
	"fmt"
	"io"
	"log"
	"net/http"
	"regexp"
	"runtime/debug"
	"strconv"
	"strings"
	"time"

	"github.com/go-chi/chi/v5"
	"github.com/vizzelintel/vizzel-track-demo-boss/vizzel-go-app/internal/store"
	"github.com/xuri/excelize/v2"
)

// assetTemplateHeaders mirrors the 19-column layout of the canonical
// asset-template (3).xlsx the original Vizzel Track app ships. Keep this list
// in lockstep with assetTemplateSample and matchAssetTemplateColumns so the
// importer can locate each field even if a user reorders columns.
var assetTemplateHeaders = []string{
	"รหัสสินทรัพย์",
	"ชื่อสินทรัพย์",
	"รายละเอียด",
	"หมวดหมู่สินทรัพย์",
	"ประเภทสินทรัพย์",
	"กลุ่มสินทรัพย์",
	"อาคาร",
	"ห้อง",
	"วิธีการได้รับ",
	"ได้มาจาก",
	"แหล่งงบประมาณ",
	"มูลค่า",
	"ค่าเสื่อมราคา",
	"วันที่รับ",
	"วันหมดอายุ",
	"อายุการใช้งาน",
	"ผู้ถือครอง",
	"สถานะ",
	"ต้องตรวจนับ (Verified)",
}

// assetTemplateSample populates row 2 of the template so demo users see a
// fully-realised example before editing.
func assetTemplateSampleRow() []any {
	today := time.Now().Format("2006-01-02")
	expiry := time.Now().AddDate(5, 0, 0).Format("2006-01-02")
	return []any{
		"MBP-M3-001",
		"MacBook Pro 14 M3",
		"Space Gray, 16GB/512GB",
		"ครุภัณฑ์",
		"ครุภัณฑ์คอมพิวเตอร์",
		"Notebook",
		"ตึก 1",
		"72301",
		"ซื้อ/จ้าง",
		"Apple Store Iconsiam",
		"เงินงบประมาณ",
		59900,
		5,
		today,
		expiry,
		5,
		"admin@demo.local",
		"ใช้งาน",
		"True",
	}
}

// assetReferenceList is the second-sheet helper that the xlsx template
// carries so users can copy known-good dropdown values into the data grid.
var assetReferenceList = []struct {
	Header string
	Values []string
}{
	{"Categories", []string{"ครุภัณฑ์", "ที่ดิน", "สิ่งปลูกสร้าง", "สินทรัพย์โครงสร้างพื้นฐาน", "สินทรัพย์ไม่มีตัวตน"}},
	{"GetByMethods", []string{"ซื้อ/จ้าง", "รับบริจาค", "รับโอน", "อื่นๆ"}},
	{"SourceFunds", []string{"เงินงบประมาณ", "เงินรายได้", "เงินอุดหนุน", "เงินสะสม", "เงินกู้"}},
	{"Statuses", []string{"ใช้งาน", "ชำรุด", "ส่งซ่อม", "ยกเลิกการใช้งาน", "รอตัดจำหน่าย", "สูญหาย", "จำหน่าย"}},
	{"Verified", []string{"True", "False"}},
}

// AssetTemplate streams the official .xlsx asset skeleton. Pass ?format=csv to
// receive a UTF-8 CSV (BOM-prefixed) with the same column layout for tools
// that cannot parse xlsx — Excel and Google Sheets both handle either fine.
func (h *Handler) AssetTemplate(w http.ResponseWriter, r *http.Request) {
	if strings.EqualFold(r.URL.Query().Get("format"), "csv") {
		var b bytes.Buffer
		b.Write([]byte{0xEF, 0xBB, 0xBF})
		cw := csv.NewWriter(&b)
		_ = cw.Write(assetTemplateHeaders)
		sample := make([]string, len(assetTemplateHeaders))
		for i, v := range assetTemplateSampleRow() {
			sample[i] = fmt.Sprint(v)
		}
		_ = cw.Write(sample)
		cw.Flush()
		w.Header().Set("Content-Type", "text/csv; charset=utf-8")
		w.Header().Set("Content-Disposition", `attachment; filename="asset-template.csv"`)
		_, _ = w.Write(b.Bytes())
		return
	}
	xlsx, err := buildAssetTemplateXLSX()
	if err != nil {
		writeError(w, http.StatusInternalServerError, "ไม่สามารถสร้างเทมเพลตได้: "+err.Error())
		return
	}
	w.Header().Set("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet")
	w.Header().Set("Content-Disposition", `attachment; filename="asset-template.xlsx"`)
	_, _ = w.Write(xlsx)
}

func buildAssetTemplateXLSX() ([]byte, error) {
	f := excelize.NewFile()
	defer func() { _ = f.Close() }()
	sheet := "Sheet1"
	if err := f.SetSheetName(f.GetSheetName(0), sheet); err != nil {
		return nil, err
	}
	for i, header := range assetTemplateHeaders {
		cell, _ := excelize.CoordinatesToCellName(i+1, 1)
		_ = f.SetCellValue(sheet, cell, header)
	}
	for i, v := range assetTemplateSampleRow() {
		cell, _ := excelize.CoordinatesToCellName(i+1, 2)
		_ = f.SetCellValue(sheet, cell, v)
	}
	if hdrStyle, err := f.NewStyle(&excelize.Style{
		Fill: excelize.Fill{Type: "pattern", Color: []string{"FFE6F1FF"}, Pattern: 1},
		Font: &excelize.Font{Bold: true},
	}); err == nil && hdrStyle > 0 {
		end, _ := excelize.CoordinatesToCellName(len(assetTemplateHeaders), 1)
		_ = f.SetCellStyle(sheet, "A1", end, hdrStyle)
	}
	_ = f.SetColWidth(sheet, "A", "S", 20)
	ref := "Reference"
	if _, err := f.NewSheet(ref); err != nil {
		return nil, err
	}
	for col, pair := range assetReferenceList {
		header, _ := excelize.CoordinatesToCellName(col+1, 1)
		_ = f.SetCellValue(ref, header, pair.Header)
		for row, v := range pair.Values {
			cell, _ := excelize.CoordinatesToCellName(col+1, row+2)
			_ = f.SetCellValue(ref, cell, v)
		}
	}
	var buf bytes.Buffer
	if err := f.Write(&buf); err != nil {
		return nil, err
	}
	return buf.Bytes(), nil
}

// elaasCombinedPattern matches "<elaas-code> (XXX YY ZZZZ)" with optional
// dashes inside the inner asset-number group. The inner group is rewritten
// with dashes in parseElaasCombined below.
var elaasCombinedPattern = regexp.MustCompile(`^\s*([\d\-]+)\s*\(([\d\s\-]+)\)\s*$`)

// parseElaasCombined splits a combined "<elaas> (XXX YY ZZZZ)" cell into the
// separate elaas_code and asset_number values. If the pattern does not match,
// the original cell is returned as the asset number with an empty elaas code.
func parseElaasCombined(cell string) (elaas, number string) {
	cell = strings.TrimSpace(cell)
	m := elaasCombinedPattern.FindStringSubmatch(cell)
	if m == nil {
		return "", cell
	}
	elaas = strings.TrimSpace(m[1])
	inner := strings.TrimSpace(m[2])
	parts := strings.FieldsFunc(inner, func(r rune) bool {
		return r == ' ' || r == '-' || r == '\t'
	})
	number = strings.Join(parts, "-")
	return elaas, number
}

// parseImportBool parses common true/false markers used in the CSV import
// (true/false, 1/0, yes/no, ใช่/ไม่ใช่). Empty values default to defaultVal.
func parseImportBool(raw string, defaultVal bool) bool {
	v := strings.TrimSpace(strings.ToLower(raw))
	switch v {
	case "":
		return defaultVal
	case "true", "1", "yes", "y", "t", "ใช่":
		return true
	case "false", "0", "no", "n", "f", "ไม่ใช่", "ไม่":
		return false
	}
	return defaultVal
}

// importedRow is the intermediate per-CSV-row shape used by AssetImport so we
// can collapse repeating asset_number rows into a single asset with N
// components.
type importedRow struct {
	AssetNumber   string
	ElaasCode     string
	AssetName     string
	RFIDNum       string
	CategoryName  string
	ClassName     string
	BuildingName  string
	RoomName      string
	OwnerName     string
	AssetValue    int64
	StatusName    string
	IsDeprec      bool
	ComponentName string
	PositionNo    int
}

func (h *Handler) AssetImport(w http.ResponseWriter, r *http.Request) {
	defer func() {
		if rec := recover(); rec != nil {
			log.Printf("asset import panic: %v\n%s", rec, debug.Stack())
			writeError(w, http.StatusInternalServerError, "asset import crashed")
		}
	}()
	// Cap the multipart body so a giant upload (or a binary file sent to the
	// CSV endpoint) can't park the worker until the Fly proxy 60s idle-timeout
	// which surfaces to the client as a 502.
	r.Body = http.MaxBytesReader(w, r.Body, maxImportBodyBytes)

	// The frontend POSTs ELAAS xlsx dry-runs to /asset/import with
	// `format=elaas`. Detect that here and delegate to the dedicated xlsx
	// parser so we never try to parse a binary .xlsx blob as CSV (which
	// previously chewed CPU + spawned thousands of garbage INSERTs and
	// triggered a 49s timeout / Fly 502).
	if strings.EqualFold(strings.TrimSpace(r.FormValue("format")), "elaas") {
		h.ImportElaasXLSX(w, r)
		return
	}

	claims, ok := claimsFromContext(r.Context())
	if !ok {
		writeError(w, http.StatusUnauthorized, "unauthorized")
		return
	}
	dryRun := r.FormValue("dryRun") == "true" || r.FormValue("dryRun") == "1"
	file, fileHeader, err := r.FormFile("file")
	if err != nil {
		log.Printf("asset import: FormFile failed: %v", err)
		writeError(w, http.StatusBadRequest, "ต้องแนบไฟล์ก่อนนำเข้า: "+err.Error())
		return
	}
	defer file.Close()
	reader := csv.NewReader(file)
	reader.FieldsPerRecord = -1
	header, headerErr := reader.Read()
	if headerErr != nil || len(header) == 0 {
		writeError(w, http.StatusBadRequest, "ไฟล์ว่างเปล่าหรือไม่มีหัวคอลัมน์")
		return
	}
	// Strip BOM that Office occasionally injects on UTF-8 csv exports so the
	// first column matches Thai header strings byte-for-byte.
	if len(header[0]) >= 3 && header[0][0] == 0xef && header[0][1] == 0xbb && header[0][2] == 0xbf {
		header[0] = header[0][3:]
	}
	hasElaasColumn := false
	if len(header) > 1 {
		h := strings.ToLower(strings.TrimSpace(header[1]))
		if strings.Contains(h, "elaas") || strings.Contains(header[1], "Elaas") || strings.Contains(header[1], "อีลาส") {
			hasElaasColumn = true
		}
	}

	// If the user uploaded the canonical 19-column template, route to a
	// dedicated parser so the demo handles every documented column instead
	// of falling back to the legacy 14-column shape.
	if cols := matchAssetTemplateColumns(header); cols != nil {
		h.importAssetTemplateCSV(w, r, reader, fileHeader, claims.OrganizationID, cols, dryRun)
		return
	}

	rows := make([]importedRow, 0, 32)
	failed := 0
	for {
		row, err := reader.Read()
		if err == io.EOF {
			break
		}
		if err != nil || len(row) < 2 {
			failed++
			continue
		}
		elaas, assetNum := parseElaasCombined(strings.TrimSpace(row[0]))
		var (
			nameIdx, rfidIdx, catIdx, classIdx, bldIdx, roomIdx, ownerIdx, valIdx, statusIdx, depIdx, compNameIdx, posIdx int
		)
		if hasElaasColumn {
			if v := strings.TrimSpace(pick(row, 1)); v != "" {
				elaas = v
			}
			nameIdx, rfidIdx, catIdx, classIdx, bldIdx, roomIdx, ownerIdx, valIdx, statusIdx, depIdx, compNameIdx, posIdx = 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13
		} else {
			nameIdx, rfidIdx, catIdx, classIdx, bldIdx, roomIdx, ownerIdx, valIdx, statusIdx, depIdx, compNameIdx, posIdx = 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12
		}
		val, _ := strconv.ParseInt(strings.TrimSpace(pick(row, valIdx)), 10, 64)
		pos, _ := strconv.Atoi(strings.TrimSpace(pick(row, posIdx)))
		rows = append(rows, importedRow{
			AssetNumber:   assetNum,
			ElaasCode:     elaas,
			AssetName:     pick(row, nameIdx),
			RFIDNum:       pick(row, rfidIdx),
			CategoryName:  pick(row, catIdx),
			ClassName:     pick(row, classIdx),
			BuildingName:  pick(row, bldIdx),
			RoomName:      pick(row, roomIdx),
			OwnerName:     pick(row, ownerIdx),
			AssetValue:    val,
			StatusName:    pickDefault(row, statusIdx, "ใช้งาน"),
			IsDeprec:      parseImportBool(pick(row, depIdx), true),
			ComponentName: pick(row, compNameIdx),
			PositionNo:    pos,
		})
	}

	// Group rows by (asset_number|elaas_code). First row in a group seeds the
	// asset; subsequent rows become extra components.
	type group struct {
		key    string
		header importedRow
		comps  []store.AssetComponentInput
	}
	order := make([]string, 0, len(rows))
	groups := map[string]*group{}
	for _, row := range rows {
		key := strings.TrimSpace(row.AssetNumber) + "|" + strings.TrimSpace(row.ElaasCode)
		g, exists := groups[key]
		if !exists {
			g = &group{key: key, header: row}
			groups[key] = g
			order = append(order, key)
		}
		comp := store.AssetComponentInput{
			ComponentName: strings.TrimSpace(row.ComponentName),
			RFIDNum:       strings.TrimSpace(row.RFIDNum),
			PositionNo:    row.PositionNo,
		}
		if comp.ComponentName == "" {
			comp.ComponentName = strings.TrimSpace(row.AssetName)
		}
		if comp.ComponentName != "" || comp.RFIDNum != "" {
			g.comps = append(g.comps, comp)
		}
	}

	imported := 0
	errorsOut := []map[string]any{}
	if !dryRun {
		for _, key := range order {
			g := groups[key]
			hd := g.header
			var (
				compList []store.AssetComponentInput
				hasComp  bool
			)
			if len(g.comps) > 1 || (len(g.comps) == 1 && strings.TrimSpace(hd.ComponentName) != "") {
				compList = g.comps
				hasComp = true
			}
			in := store.AssetInput{
				AssetNumber:      hd.AssetNumber,
				ElaasCode:        hd.ElaasCode,
				AssetName:        hd.AssetName,
				RFIDNum:          hd.RFIDNum,
				CategoryName:     hd.CategoryName,
				ClassName:        hd.ClassName,
				BuildingName:     hd.BuildingName,
				RoomName:         hd.RoomName,
				OwnerName:        hd.OwnerName,
				AssetValue:       hd.AssetValue,
				AssetStatusName:  hd.StatusName,
				IsDepreciation:   hd.IsDeprec,
				Components:       compList,
				HasComponentList: hasComp,
			}
			if _, err := h.store.CreateAsset(r.Context(), claims.OrganizationID, in); err != nil {
				failed++
				if len(errorsOut) < 25 {
					errorsOut = append(errorsOut, map[string]any{
						"line":  imported + failed,
						"error": err.Error(),
					})
				}
				continue
			}
			imported++
		}
	}
	filename := ""
	if fileHeader != nil {
		filename = fileHeader.Filename
	}
	log.Printf("asset import done: file=%q rows=%d imported=%d failed=%d dry_run=%v",
		filename, len(rows), imported, failed, dryRun)
	resp := map[string]any{
		"imported":      imported,
		"failed":        failed,
		"created":       imported,
		"updated":       0,
		"errors":        errorsOut,
		"successes":     []any{},
		"newCategories": []any{},
		"newTypes":      []any{},
		"newClasses":    []any{},
		"newBuildings":  []any{},
		"newRooms":      []any{},
		"newStatuses":   []any{},
		"data_rows":     len(rows),
		"dry_run":       dryRun,
	}
	if dryRun {
		resp["imported"] = 0
	}
	writeJSON(w, http.StatusOK, resp)
}

// assetTemplateColumnIdx tells importAssetTemplateCSV which CSV column maps to
// each AssetInput field. Indexes default to -1 ("not present") so handlers can
// safely skip missing optional columns.
type assetTemplateColumnIdx struct {
	AssetNumber  int
	AssetName    int
	AssetDetails int
	Category     int
	Type         int
	Class        int
	Building     int
	Room         int
	GetBy        int
	GetFrom      int
	SourceFund   int
	Value        int
	Depreciation int
	ReceivedDate int
	ExpiryDate   int
	UsefulLife   int
	Owner        int
	Status       int
	Verified     int
}

// matchAssetTemplateColumns returns column indexes when the header matches the
// canonical asset-template (3).xlsx shape. It accepts Thai and English aliases
// so end-users can rename columns to taste without breaking the importer.
func matchAssetTemplateColumns(header []string) *assetTemplateColumnIdx {
	cols := &assetTemplateColumnIdx{
		AssetNumber: -1, AssetName: -1, AssetDetails: -1, Category: -1, Type: -1, Class: -1,
		Building: -1, Room: -1, GetBy: -1, GetFrom: -1, SourceFund: -1, Value: -1,
		Depreciation: -1, ReceivedDate: -1, ExpiryDate: -1, UsefulLife: -1, Owner: -1,
		Status: -1, Verified: -1,
	}
	for i, raw := range header {
		t := strings.ToLower(strings.TrimSpace(raw))
		switch {
		case t == "":
		case strings.Contains(t, "รหัสสินทรัพย์") || t == "assetnumber" || t == "asset number" || t == "asset_number" || strings.Contains(t, "เลขครุภัณฑ์"):
			cols.AssetNumber = i
		case strings.Contains(t, "ชื่อสินทรัพย์") || strings.Contains(t, "ชื่อครุภัณฑ์") || t == "assetname" || t == "asset name":
			cols.AssetName = i
		case t == "รายละเอียด" || t == "details" || t == "assetdetails" || t == "asset details":
			cols.AssetDetails = i
		case strings.Contains(t, "หมวดหมู่สินทรัพย์") || t == "category" || t == "categoryname":
			cols.Category = i
		case strings.HasPrefix(t, "ประเภทสินทรัพย์") || t == "type" || t == "typename":
			cols.Type = i
		case strings.HasPrefix(t, "กลุ่มสินทรัพย์") || t == "class" || t == "classname" || strings.Contains(t, "ชนิดสินทรัพย์"):
			cols.Class = i
		case t == "อาคาร" || t == "building" || t == "buildingname":
			cols.Building = i
		case t == "ห้อง" || t == "room" || t == "roomname":
			cols.Room = i
		case strings.Contains(t, "วิธีการได้รับ") || t == "getby" || t == "get by":
			cols.GetBy = i
		case t == "ได้มาจาก" || t == "getfrom" || t == "get from":
			cols.GetFrom = i
		case strings.Contains(t, "แหล่งงบประมาณ") || strings.Contains(t, "แหล่งเงิน") || t == "sourcefund" || t == "source fund":
			cols.SourceFund = i
		case t == "มูลค่า" || t == "value" || t == "assetvalue" || t == "asset value":
			cols.Value = i
		case strings.HasPrefix(t, "ค่าเสื่อม") || t == "depreciation":
			cols.Depreciation = i
		case strings.HasPrefix(t, "วันที่รับ") || t == "receiveddate" || t == "received date":
			cols.ReceivedDate = i
		case strings.HasPrefix(t, "วันหมดอายุ") || strings.HasPrefix(t, "วันที่หมดอายุ") || t == "expirydate" || t == "expiry date":
			cols.ExpiryDate = i
		case strings.Contains(t, "อายุการใช้งาน") || t == "usefullife" || t == "useful life" || t == "availableage":
			cols.UsefulLife = i
		case strings.Contains(t, "ผู้ถือครอง") || t == "owner" || t == "ownername" || strings.Contains(t, "เจ้าของ"):
			cols.Owner = i
		case t == "สถานะ" || t == "status" || t == "statusname":
			cols.Status = i
		case strings.Contains(t, "ตรวจนับ") || strings.Contains(t, "verified") || t == "ischeck":
			cols.Verified = i
		}
	}
	// We treat the file as the new template only when the two anchor columns
	// (asset number + asset name) plus at least one classification column are
	// present. This avoids hijacking the legacy 14-column CSV shape.
	if cols.AssetNumber < 0 || cols.AssetName < 0 {
		return nil
	}
	if cols.Category < 0 && cols.Class < 0 && cols.Type < 0 {
		return nil
	}
	return cols
}

// importAssetTemplateCSV consumes the remainder of the CSV using the
// 19-column layout. Errors are returned per line so the frontend confirmation
// dialog can render them in Thai.
func (h *Handler) importAssetTemplateCSV(
	w http.ResponseWriter,
	r *http.Request,
	reader *csv.Reader,
	_ any,
	orgID int64,
	cols *assetTemplateColumnIdx,
	dryRun bool,
) {
	type rowIn struct {
		line  int
		input store.AssetInput
	}
	var queued []rowIn
	skipped := 0
	failed := 0
	errorsOut := []map[string]any{}
	newCats := map[string]struct{}{}
	newTypes := map[string]struct{}{}
	newClasses := map[string]struct{}{}
	newBldgs := map[string]struct{}{}
	newRooms := map[string]struct{}{}
	newStatuses := map[string]struct{}{}
	line := 1
	for {
		row, err := reader.Read()
		if err == io.EOF {
			break
		}
		line++
		if err != nil {
			failed++
			if len(errorsOut) < 25 {
				errorsOut = append(errorsOut, map[string]any{"line": line, "error": "อ่านบรรทัดไม่สำเร็จ: " + err.Error()})
			}
			continue
		}
		assetNumber := strings.TrimSpace(pick(row, cols.AssetNumber))
		assetName := strings.TrimSpace(pick(row, cols.AssetName))
		if assetNumber == "" && assetName == "" {
			skipped++
			continue
		}
		if assetNumber == "" {
			failed++
			if len(errorsOut) < 25 {
				errorsOut = append(errorsOut, map[string]any{"line": line, "error": "ขาดรหัสสินทรัพย์"})
			}
			continue
		}
		if assetName == "" {
			failed++
			if len(errorsOut) < 25 {
				errorsOut = append(errorsOut, map[string]any{"line": line, "error": "ขาดชื่อสินทรัพย์"})
			}
			continue
		}
		assetValue, _ := strconv.ParseInt(stripDigitNoise(pick(row, cols.Value)), 10, 64)
		usefulLife, _ := strconv.ParseInt(stripDigitNoise(pick(row, cols.UsefulLife)), 10, 64)
		depYears := strings.TrimSpace(pick(row, cols.Depreciation))
		isDeprec := true
		if depYears == "0" || strings.EqualFold(depYears, "false") || depYears == "ไม่" || depYears == "ไม่ใช่" {
			isDeprec = false
		}
		in := store.AssetInput{
			AssetNumber:     assetNumber,
			AssetName:       assetName,
			AssetDetails:    strings.TrimSpace(pick(row, cols.AssetDetails)),
			CategoryName:    strings.TrimSpace(pick(row, cols.Category)),
			TypeName:        strings.TrimSpace(pick(row, cols.Type)),
			ClassName:       strings.TrimSpace(pick(row, cols.Class)),
			BuildingName:    strings.TrimSpace(pick(row, cols.Building)),
			RoomName:        strings.TrimSpace(pick(row, cols.Room)),
			GetFrom:         strings.TrimSpace(pick(row, cols.GetFrom)),
			AssetValue:      assetValue,
			AvailableAge:    usefulLife,
			ReceivedDate:    normalizeImportDate(pick(row, cols.ReceivedDate)),
			ExpiryDate:      normalizeImportDate(pick(row, cols.ExpiryDate)),
			OwnerName:       strings.TrimSpace(pick(row, cols.Owner)),
			AssetStatusName: pickDefault(row, cols.Status, "ใช้งาน"),
			IsDepreciation:  isDeprec,
			IsCheck:         parseImportBool(pick(row, cols.Verified), false),
		}
		if in.CategoryName != "" {
			newCats[in.CategoryName] = struct{}{}
		}
		if in.TypeName != "" {
			newTypes[in.TypeName] = struct{}{}
		}
		if in.ClassName != "" {
			newClasses[in.ClassName] = struct{}{}
		}
		if in.BuildingName != "" {
			newBldgs[in.BuildingName] = struct{}{}
		}
		if in.RoomName != "" {
			newRooms[in.RoomName] = struct{}{}
		}
		if in.AssetStatusName != "" {
			newStatuses[in.AssetStatusName] = struct{}{}
		}
		queued = append(queued, rowIn{line: line, input: in})
	}
	imported := 0
	if !dryRun {
		for _, q := range queued {
			if _, err := h.store.CreateAsset(r.Context(), orgID, q.input); err != nil {
				failed++
				if len(errorsOut) < 25 {
					errorsOut = append(errorsOut, map[string]any{"line": q.line, "error": err.Error()})
				}
				continue
			}
			imported++
		}
	}
	resp := map[string]any{
		"imported":      imported,
		"failed":        failed,
		"skipped":       skipped,
		"created":       imported,
		"updated":       0,
		"errors":        errorsOut,
		"successes":     []any{},
		"data_rows":     len(queued),
		"dry_run":       dryRun,
		"newCategories": setToSlice(newCats),
		"newTypes":      setToSlice(newTypes),
		"newClasses":    setToSlice(newClasses),
		"newBuildings":  setToSlice(newBldgs),
		"newRooms":      setToSlice(newRooms),
		"newStatuses":   setToSlice(newStatuses),
	}
	if dryRun {
		resp["imported"] = 0
		resp["created"] = 0
	}
	writeJSON(w, http.StatusOK, resp)
}

func setToSlice(m map[string]struct{}) []string {
	out := make([]string, 0, len(m))
	for k := range m {
		out = append(out, k)
	}
	return out
}

// stripDigitNoise removes thousand separators and stray whitespace so int
// parsers can run against locale-formatted numbers like "59,900" or "1 234".
func stripDigitNoise(raw string) string {
	t := strings.TrimSpace(raw)
	t = strings.ReplaceAll(t, ",", "")
	t = strings.ReplaceAll(t, " ", "")
	return t
}

// normalizeImportDate accepts dd/mm/yyyy (with Buddhist or Western years) and
// yyyy-mm-dd, returning the ISO-8601 form expected by store.AssetInput. Empty
// input returns "" so the column stays NULL in the DB.
func normalizeImportDate(raw string) string {
	t := strings.TrimSpace(raw)
	if t == "" {
		return ""
	}
	if len(t) >= 10 {
		if _, err := time.Parse("2006-01-02", t[:10]); err == nil {
			return t[:10]
		}
	}
	parts := strings.Split(t, "/")
	if len(parts) != 3 {
		return t
	}
	d, errD := strconv.Atoi(parts[0])
	m, errM := strconv.Atoi(parts[1])
	y, errY := strconv.Atoi(parts[2])
	if errD != nil || errM != nil || errY != nil {
		return t
	}
	if y > 2400 {
		y -= 543
	}
	return time.Date(y, time.Month(m), d, 0, 0, 0, 0, time.UTC).Format("2006-01-02")
}

// ConvertElaasImport accepts an ELAAS xlsx upload and returns the standard
// 14-column CSV text that the existing AssetImport pipeline understands. The
// real xlsx parsing lives in elaas_xlsx.go (parseElaasXLSX).
func (h *Handler) ConvertElaasImport(w http.ResponseWriter, r *http.Request) {
	file, _, err := r.FormFile("file")
	if err != nil {
		writeError(w, http.StatusBadRequest, "file required")
		return
	}
	defer file.Close()
	report, err := h.parseElaasXLSX(file)
	if err != nil {
		writeError(w, http.StatusBadRequest, "elaas parse failed: "+err.Error())
		return
	}
	var b strings.Builder
	b.WriteString("เลขครุภัณฑ์,รหัส Elaas,ชื่อ,RFID,หมวด,ชนิด,อาคาร,ห้อง,เจ้าของ,มูลค่า,สถานะ,คิดค่าเสื่อม,ชื่อชิ้นย่อย,ลำดับชิ้น\n")
	cw := csv.NewWriter(&b)
	for _, row := range report.Rows {
		assetNum := row.AssetNumber
		if assetNum == "" {
			assetNum = row.ElaasCode
		}
		status := row.Status
		if status == "" {
			status = "ใช้งาน"
		}
		depr := "ไม่ใช่"
		if row.AccumDepr > 0 {
			depr = "ใช่"
		}
		_ = cw.Write([]string{
			assetNum,
			row.ElaasCode,
			row.AssetName,
			"",
			row.Category,
			row.Class,
			"",
			"",
			row.OwnerName,
			formatElaasMoney(row.PurchaseValue),
			status,
			depr,
			"",
			"",
		})
	}
	cw.Flush()
	writeJSON(w, http.StatusOK, map[string]any{
		"csv":           b.String(),
		"rows_detected": len(report.Rows),
		"total_value":   report.TotalValue,
	})
}

func formatElaasMoney(v float64) string {
	if v == 0 {
		return ""
	}
	return strconv.FormatFloat(v, 'f', 2, 64)
}

func pick(row []string, i int) string {
	if i < 0 || i >= len(row) {
		return ""
	}
	return strings.TrimSpace(row[i])
}

func pickDefault(row []string, i int, d string) string {
	if v := pick(row, i); v != "" {
		return v
	}
	return d
}

// StructureTemplate streams the 3-column asset structure CSV
// (หมวดหมู่,ประเภท,กลุ่ม) the original Vizzel Track app ships. Importers can
// leave the ประเภท / กลุ่ม cells blank to register a category-only row.
func (h *Handler) StructureTemplate(w http.ResponseWriter, r *http.Request) {
	var b bytes.Buffer
	b.Write([]byte{0xEF, 0xBB, 0xBF})
	cw := csv.NewWriter(&b)
	_ = cw.Write([]string{"หมวดหมู่", "ประเภท", "กลุ่ม"})
	_ = cw.Write([]string{"ครุภัณฑ์", "คอมพิวเตอร์", "Notebook"})
	_ = cw.Write([]string{"ครุภัณฑ์", "คอมพิวเตอร์", "Desktop"})
	_ = cw.Write([]string{"ครุภัณฑ์", "เครื่องพิมพ์", ""})
	_ = cw.Write([]string{"อุปกรณ์สำนักงาน", "", ""})
	cw.Flush()
	w.Header().Set("Content-Type", "text/csv; charset=utf-8")
	w.Header().Set("Content-Disposition", `attachment; filename="asset-structure-template.csv"`)
	_, _ = w.Write(b.Bytes())
}

// StructureExport emits the live category / type / class tree as a 3-column
// CSV that can be re-imported verbatim.
func (h *Handler) StructureExport(w http.ResponseWriter, r *http.Request) {
	claims, ok := claimsFromContext(r.Context())
	if !ok {
		writeError(w, http.StatusUnauthorized, "unauthorized")
		return
	}
	cats, _ := h.store.ListAssetCategories(r.Context(), claims.OrganizationID)
	typesByCat := make(map[int64][]store.Row, len(cats))
	for _, c := range cats {
		ts, _ := h.store.ListAssetTypes(r.Context(), claims.OrganizationID, c.ID)
		typesByCat[c.ID] = ts
	}
	classesByType := map[int64][]store.Row{}
	for _, ts := range typesByCat {
		for _, t := range ts {
			cls, _ := h.store.ListAssetClasses(r.Context(), claims.OrganizationID, t.ID)
			classesByType[t.ID] = cls
		}
	}
	var b bytes.Buffer
	b.Write([]byte{0xEF, 0xBB, 0xBF})
	cw := csv.NewWriter(&b)
	_ = cw.Write([]string{"หมวดหมู่", "ประเภท", "กลุ่ม"})
	for _, c := range cats {
		ts := typesByCat[c.ID]
		if len(ts) == 0 {
			_ = cw.Write([]string{c.Title, "", ""})
			continue
		}
		for _, t := range ts {
			cls := classesByType[t.ID]
			if len(cls) == 0 {
				_ = cw.Write([]string{c.Title, t.Title, ""})
				continue
			}
			for _, cl := range cls {
				_ = cw.Write([]string{c.Title, t.Title, cl.Title})
			}
		}
	}
	cw.Flush()
	w.Header().Set("Content-Type", "text/csv; charset=utf-8")
	w.Header().Set("Content-Disposition", `attachment; filename="asset-structure-export.csv"`)
	_, _ = w.Write(b.Bytes())
}

// StructureImport reads the 3-column template and builds the
// category → type → class hierarchy idempotently. It is safe to re-run.
func (h *Handler) StructureImport(w http.ResponseWriter, r *http.Request) {
	claims, ok := claimsFromContext(r.Context())
	if !ok {
		writeError(w, http.StatusUnauthorized, "unauthorized")
		return
	}
	file, _, err := r.FormFile("file")
	if err != nil {
		writeError(w, http.StatusBadRequest, "ต้องแนบไฟล์ CSV: "+err.Error())
		return
	}
	defer file.Close()
	reader := csv.NewReader(file)
	reader.FieldsPerRecord = -1
	header, headerErr := reader.Read()
	if headerErr != nil {
		writeError(w, http.StatusBadRequest, "อ่านหัวคอลัมน์ไม่สำเร็จ")
		return
	}
	if len(header) < 1 || strings.TrimSpace(header[0]) == "" {
		writeError(w, http.StatusBadRequest, "ต้องมีคอลัมน์อย่างน้อย 1 คอลัมน์: หมวดหมู่,ประเภท,กลุ่ม")
		return
	}
	catIDs := map[string]int64{}
	for _, row := range listOrEmpty(h.store.ListAssetCategories(r.Context(), claims.OrganizationID)) {
		catIDs[strings.TrimSpace(row.Title)] = row.ID
	}
	typeIDs := map[string]int64{}
	classSeen := map[string]bool{}
	var (
		createdCats    int
		createdTypes   int
		createdClasses int
		skipped        int
		errs           []string
	)
	line := 1
	for {
		row, err := reader.Read()
		if err == io.EOF {
			break
		}
		line++
		if err != nil {
			errs = append(errs, fmt.Sprintf("บรรทัด %d: %s", line, err.Error()))
			continue
		}
		cat := strings.TrimSpace(pick(row, 0))
		typ := strings.TrimSpace(pick(row, 1))
		cls := strings.TrimSpace(pick(row, 2))
		if cat == "" {
			skipped++
			continue
		}
		catID, ok := catIDs[cat]
		if !ok {
			id, err := h.store.EntityCreate(r.Context(), "categories", claims.OrganizationID, cat, 0)
			if err != nil {
				errs = append(errs, fmt.Sprintf("บรรทัด %d: หมวดหมู่ %q สร้างไม่สำเร็จ: %s", line, cat, err.Error()))
				continue
			}
			catID = id
			catIDs[cat] = id
			createdCats++
		}
		if typ == "" {
			continue
		}
		tKey := cat + "|" + typ
		typID, ok := typeIDs[tKey]
		if !ok {
			id, err := h.store.EntityCreate(r.Context(), "types", claims.OrganizationID, typ, catID)
			if err != nil {
				errs = append(errs, fmt.Sprintf("บรรทัด %d: ประเภท %q สร้างไม่สำเร็จ: %s", line, typ, err.Error()))
				continue
			}
			typID = id
			typeIDs[tKey] = id
			createdTypes++
		}
		if cls == "" {
			continue
		}
		cKey := tKey + "|" + cls
		if classSeen[cKey] {
			continue
		}
		if _, err := h.store.EntityCreate(r.Context(), "classes", claims.OrganizationID, cls, typID); err != nil {
			errs = append(errs, fmt.Sprintf("บรรทัด %d: กลุ่ม %q สร้างไม่สำเร็จ: %s", line, cls, err.Error()))
			continue
		}
		classSeen[cKey] = true
		createdClasses++
	}
	writeJSON(w, http.StatusOK, map[string]any{
		"imported":   createdCats + createdTypes + createdClasses,
		"categories": createdCats,
		"types":      createdTypes,
		"classes":    createdClasses,
		"skipped":    skipped,
		"errors":     errs,
	})
}

func listOrEmpty(rows []store.Row, err error) []store.Row {
	if err != nil {
		return nil
	}
	return rows
}

func (h *Handler) RepairDashboard(w http.ResponseWriter, r *http.Request) {
	orgID, ok := orgIDFromRequest(r)
	if !ok {
		writeError(w, http.StatusUnauthorized, "unauthorized")
		return
	}
	repairs, _ := h.store.ListRepairs(r.Context(), orgID)
	writeJSON(w, http.StatusOK, map[string]any{
		"pending": len(repairs),
		"repairs": repairs,
		"monthly": []map[string]any{{"month": "ม.ค.", "count": 2}, {"month": "ก.พ.", "count": 1}},
	})
}

func (h *Handler) WarrantyInitialData(w http.ResponseWriter, r *http.Request) {
	orgID, _ := strconv.ParseInt(chi.URLParam(r, "orgID"), 10, 64)
	claims, ok := claimsFromContext(r.Context())
	if !ok {
		writeError(w, http.StatusUnauthorized, "unauthorized")
		return
	}
	if orgID == 0 {
		orgID = claims.OrganizationID
	}
	warranties, summary, _ := h.store.ListWarranties(r.Context(), orgID)
	writeJSON(w, http.StatusOK, map[string]any{"warranties": warranties, "summary": summary})
}

func (h *Handler) WarrantySummary(w http.ResponseWriter, r *http.Request) {
	h.WarrantyInitialData(w, r)
}

func (h *Handler) AuditInitialData(w http.ResponseWriter, r *http.Request) {
	orgID, _ := strconv.ParseInt(chi.URLParam(r, "orgID"), 10, 64)
	claims, ok := claimsFromContext(r.Context())
	if !ok {
		writeError(w, http.StatusUnauthorized, "unauthorized")
		return
	}
	if orgID == 0 {
		orgID = claims.OrganizationID
	}
	ongoing, _ := h.store.ListAuditJobs(r.Context(), orgID, "ongoing")
	history, _ := h.store.ListAuditJobs(r.Context(), orgID, "completed")
	writeJSON(w, http.StatusOK, map[string]any{"ongoing": ongoing, "history": history})
}

func (h *Handler) WithdrawalDashboardStats(w http.ResponseWriter, r *http.Request) {
	orgID, _ := strconv.ParseInt(chi.URLParam(r, "orgID"), 10, 64)
	claims, ok := claimsFromContext(r.Context())
	if !ok {
		writeError(w, http.StatusUnauthorized, "unauthorized")
		return
	}
	if orgID == 0 {
		orgID = claims.OrganizationID
	}
	all, _ := h.store.ListWithdrawals(r.Context(), orgID, "")
	pending, _ := h.store.ListWithdrawals(r.Context(), orgID, "pending")
	writeJSON(w, http.StatusOK, map[string]any{
		"total":    len(all),
		"pending":  len(pending),
		"approved": len(all) - len(pending),
	})
}

func (h *Handler) UserInitialData(w http.ResponseWriter, r *http.Request) {
	orgID, _ := strconv.ParseInt(chi.URLParam(r, "orgID"), 10, 64)
	claims, ok := claimsFromContext(r.Context())
	if !ok {
		writeError(w, http.StatusUnauthorized, "unauthorized")
		return
	}
	if orgID == 0 {
		orgID = claims.OrganizationID
	}
	orgUsers, _ := h.store.ListOrgUsers(r.Context(), orgID)
	usr := orgUsersToMaps(orgUsers)
	writeJSON(w, http.StatusOK, map[string]any{"data": usr, "users": map[string]any{"data": usr}})
}

func (h *Handler) OrgInitialData(w http.ResponseWriter, r *http.Request) {
	orgID, _ := strconv.ParseInt(chi.URLParam(r, "orgID"), 10, 64)
	claims, ok := claimsFromContext(r.Context())
	if !ok {
		writeError(w, http.StatusUnauthorized, "unauthorized")
		return
	}
	if orgID == 0 {
		orgID = claims.OrganizationID
	}
	b, _ := h.store.ListBuildings(r.Context(), orgID)
	rms, _ := h.store.ListRooms(r.Context(), orgID)
	inst, _ := h.store.ListInstitutes(r.Context(), orgID)
	dept, _ := h.store.ListDepartments(r.Context(), orgID)
	sec, _ := h.store.ListSections(r.Context(), orgID)
	pos, _ := h.store.ListPositions(r.Context(), orgID)
	writeJSON(w, http.StatusOK, map[string]any{
		"buildings": b, "rooms": rms, "institutes": inst,
		"departments": dept, "sections": sec, "positions": pos,
	})
}
