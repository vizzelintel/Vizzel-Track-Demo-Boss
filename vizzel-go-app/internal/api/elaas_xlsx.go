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

// elaasStatusAlias maps the labels ELAAS exports into the canonical asset
// status names the app uses. ELAAS uses "ใช้งาน" for healthy assets but the
// demo's preferred display word is "ปกติ", so we translate on import. Any name
// not present here is passed through verbatim and the importer will ensure
// the status row exists.
var elaasStatusAlias = map[string]string{
	"ใช้งาน": "ปกติ",
}

// ImportElaasXLSX accepts the official ELAAS asset register .xlsx export
// (รายงานทะเบียนข้อมูลสินทรัพย์) and creates assets in the user's
// organization. It is engineered against the อบต. ละหาร sample export but
// resilient to layout shifts because column detection is fuzzy: we locate the
// header by searching for "ลำดับ" plus a couple of mandatory Thai labels and
// then learn the source-fund column layout from the sub-header underneath.
//
// On dryRun=true the handler reports back the row count + summary so the
// frontend confirmation dialog can render the "ยืนยันนำเข้า N รายการ" CTA.
// On dryRun=false it resolves taxonomy / status / LOV ids and inserts every
// valid row through store.CreateAsset.
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
		log.Printf("elaas import: read body failed (cap %d): %v", maxImportBodyBytes, err)
		writeError(w, http.StatusBadRequest, "read failed: "+err.Error())
		return
	}
	dryRun := r.FormValue("dryRun") == "true" || r.FormValue("dryRun") == "1"

	report, err := parseElaasXLSX(bytes.NewReader(buf))
	if err != nil {
		log.Printf("elaas import: parse failed for %q (%d bytes): %v", header.Filename, len(buf), err)
		writeError(w, http.StatusBadRequest, "elaas parse failed: "+err.Error())
		return
	}

	categories := report.CategorySet()
	types := report.TypeSet()
	sourceFunds := report.SourceFundSet()
	statuses := report.StatusSet()

	imported, failed := 0, 0
	errorsOut := []map[string]any{}
	if !dryRun {
		imported, failed, errorsOut = h.persistElaasRows(r, claims.OrganizationID, report.Rows)
	}

	importable := len(report.Rows)
	log.Printf("elaas import: file=%q parsed=%d importable=%d imported=%d failed=%d skipped=%d dry_run=%v",
		header.Filename, len(report.Rows), importable, imported, failed, report.Skipped, dryRun)

	resp := map[string]any{
		"filename":       header.Filename,
		"sheet":          report.SheetName,
		"header_row":     report.HeaderRowIdx,
		"data_rows":      len(report.Rows),
		"valid_rows":     importable,
		"validRows":      importable,
		"importableRows": importable,
		"dry_run":        dryRun,
		"failed":         failed,
		"skipped":        report.Skipped,
		"errors":         errorsOut,
		"successes":      []any{},
		"newCategories":  categories,
		"newTypes":       types,
		"newClasses":     types, // ELAAS only carries 2 taxonomy levels; reuse type as the class leaf.
		"newBuildings":   []any{},
		"newRooms":       []any{},
		"newStatuses":    statuses,
		"newSourceFunds": sourceFunds,
		"sample":         elaasSample(report.Rows, 5),
		"summary": map[string]any{
			"total_value":  report.TotalValue,
			"categories":   categories,
			"types":        types,
			"classes":      types,
			"statuses":     statuses,
			"source_funds": sourceFunds,
		},
	}
	if dryRun {
		// Surface the importable count via `imported` so the unchanged confirm
		// dialog (`{data.imported > 0 && "ยืนยันนำเข้า {data.imported}"}`) renders
		// the CTA. The dedicated `validRows` field is the new contract for
		// any future UI that wants to distinguish "would import" from "did
		// import".
		resp["imported"] = importable
		resp["created"] = 0
		resp["updated"] = 0
	} else {
		resp["imported"] = imported
		resp["created"] = imported
		resp["updated"] = 0
	}
	writeJSON(w, http.StatusOK, resp)
}

// persistElaasRows resolves the taxonomy / status / LOV ids once per distinct
// value (each ELAAS export only references a handful of unique categories
// even when it ships ~3k rows) and then calls store.CreateAsset for every
// row. It returns the totals + the first ≤25 errors for the UI.
func (h *Handler) persistElaasRows(r *http.Request, orgID int64, rows []ElaasRow) (imported, failed int, errs []map[string]any) {
	statusCache := map[string]int64{}
	getByCache := map[string]int64{}
	sourceFundCache := map[string]int64{}
	classCache := map[string]int64{}

	resolveStatus := func(name string) (string, int64) {
		canonical := canonicalElaasStatus(name)
		if id, ok := statusCache[canonical]; ok {
			return canonical, id
		}
		id, err := h.store.EnsureTabAssetStatus(r.Context(), canonical)
		if err != nil {
			log.Printf("elaas import: ensure status %q failed: %v", canonical, err)
		}
		statusCache[canonical] = id
		return canonical, id
	}
	resolveGetBy := func(name string) int64 {
		if name == "" {
			return 0
		}
		if id, ok := getByCache[name]; ok {
			return id
		}
		id, err := h.store.EnsureLovGetBy(r.Context(), name)
		if err != nil {
			log.Printf("elaas import: ensure get_by %q failed: %v", name, err)
		}
		getByCache[name] = id
		return id
	}
	resolveFund := func(name string) int64 {
		if name == "" {
			return 0
		}
		if id, ok := sourceFundCache[name]; ok {
			return id
		}
		id, err := h.store.EnsureLovSourceFund(r.Context(), name)
		if err != nil {
			log.Printf("elaas import: ensure source_fund %q failed: %v", name, err)
		}
		sourceFundCache[name] = id
		return id
	}
	resolveClass := func(category, typ string) int64 {
		key := category + "||" + typ
		if id, ok := classCache[key]; ok {
			return id
		}
		id, err := h.store.EnsureTabTaxonomy(r.Context(), orgID, category, typ, typ)
		if err != nil {
			log.Printf("elaas import: ensure taxonomy (%q / %q) failed: %v", category, typ, err)
		}
		classCache[key] = id
		return id
	}

	for i, row := range rows {
		statusName, statusID := resolveStatus(row.Status)
		in := store.AssetInput{
			AssetNumber:     row.AssetNumber,
			ElaasCode:       row.ElaasCode,
			AssetName:       row.AssetName,
			AssetDetails:    row.Details,
			CategoryName:    row.Category,
			TypeName:        row.Type,
			ClassName:       row.Type, // ELAAS has only 2 levels; reuse type as the class leaf so listings join cleanly.
			ClassID:         resolveClass(row.Category, row.Type),
			AssetStatusName: statusName,
			AssetStatusID:   statusID,
			AssetValue:      int64(row.PurchaseValue),
			ReceivedDate:    row.AcquireDate,
			GetByID:         resolveGetBy(row.AcquiredBy),
			GetFrom:         row.AcquiredFrom,
			SourceFundID:    resolveFund(row.SourceFund),
			AvailableAge:    int64(row.UsefulLife),
			IsDepreciation:  true,
		}
		if _, err := h.store.CreateAsset(r.Context(), orgID, in); err != nil {
			failed++
			log.Printf("elaas import: row %d (%s) create failed: %v", i+1, displayCode(row), err)
			if len(errs) < 25 {
				errs = append(errs, map[string]any{
					"line":  i + 1,
					"error": err.Error(),
				})
			}
			continue
		}
		imported++
	}
	return imported, failed, errs
}

// canonicalElaasStatus maps the Excel status value into the canonical name
// stored in tab_asset_status. Empty input becomes the default "ปกติ".
func canonicalElaasStatus(raw string) string {
	s := strings.TrimSpace(raw)
	if s == "" {
		return "ปกติ"
	}
	if mapped, ok := elaasStatusAlias[s]; ok {
		return mapped
	}
	return s
}

func displayCode(row ElaasRow) string {
	if row.AssetNumber != "" {
		return row.AssetNumber
	}
	return row.ElaasCode
}

func elaasSample(rows []ElaasRow, n int) []ElaasRow {
	if len(rows) > n {
		return rows[:n]
	}
	return rows
}

// ----- model types --------------------------------------------------------

// ElaasRow is one parsed ELAAS row aligned with store.AssetInput field
// semantics. We intentionally drop the depreciation columns the spec marks
// SKIP because they are derived numbers the app re-computes itself.
type ElaasRow struct {
	Seq           int     `json:"seq"`
	Category      string  `json:"category"`      // ประเภทสินทรัพย์ → categoryName
	Type          string  `json:"type"`          // ชนิดสินทรัพย์ → typeName
	Class         string  `json:"class"`         // legacy alias of Type kept for CSV-conversion path
	ElaasCode     string  `json:"elaas_code"`    // 101-630926-00001
	AssetNumber   string  `json:"asset_number"`  // 001-43-0001
	AssetName     string  `json:"asset_name"`
	Details       string  `json:"details"`
	AcquireDate   string  `json:"acquire_date"`  // ISO yyyy-mm-dd
	PurchaseValue float64 `json:"purchase_value"`
	UsefulLife    int     `json:"useful_life"`
	Status        string  `json:"status"`        // raw ELAAS value (UI maps via canonicalElaasStatus)
	AcquiredBy    string  `json:"acquired_by"`   // ได้มาโดย
	AcquiredFrom  string  `json:"acquired_from"` // ได้มาจาก
	SourceFund    string  `json:"source_fund"`   // header name of the first non-zero แหล่งเงิน column
	// Owner/Condition are not part of the column spec but the convert-CSV path
	// still references OwnerName, so keep them populated when present.
	OwnerName string `json:"owner_name"`
	Condition string `json:"condition"`
}

// ElaasReport is the side-channel summary surfaced via the import response.
type ElaasReport struct {
	SheetName    string     `json:"sheet"`
	HeaderRowIdx int        `json:"header_row"` // 1-based row number of the header
	Rows         []ElaasRow `json:"rows"`
	TotalValue   float64    `json:"total_value"`
	Skipped      int        `json:"skipped"` // total/blank rows that were filtered out
}

func (r ElaasReport) distinctBy(field func(ElaasRow) string) []string {
	seen := map[string]struct{}{}
	out := []string{}
	for _, row := range r.Rows {
		v := strings.TrimSpace(field(row))
		if v == "" {
			continue
		}
		if _, ok := seen[v]; ok {
			continue
		}
		seen[v] = struct{}{}
		out = append(out, v)
	}
	return out
}

func (r ElaasReport) CategorySet() []string {
	return r.distinctBy(func(row ElaasRow) string { return row.Category })
}

func (r ElaasReport) TypeSet() []string {
	return r.distinctBy(func(row ElaasRow) string { return row.Type })
}

// ClassSet is retained for callers that still call the legacy method name
// (e.g. import_export.go's CSV-conversion path).
func (r ElaasReport) ClassSet() []string {
	return r.TypeSet()
}

func (r ElaasReport) SourceFundSet() []string {
	return r.distinctBy(func(row ElaasRow) string { return row.SourceFund })
}

func (r ElaasReport) StatusSet() []string {
	return r.distinctBy(func(row ElaasRow) string { return canonicalElaasStatus(row.Status) })
}

// ----- parser -------------------------------------------------------------

// elaasColumns records the resolved 0-based column index for every field we
// extract. -1 means "missing" so callers can degrade gracefully.
type elaasColumns struct {
	Seq         int
	Category    int
	Type        int
	Code        int
	AssetName   int
	Details     int
	AcquireDate int
	Price       int
	UsefulLife  int
	Status      int
	GetBy       int
	GetFrom     int
	Owner       int
	Condition   int
	SourceFunds []elaasSourceFundCol
}

// elaasSourceFundCol pairs a column index with the human-readable แหล่งเงิน
// label that lives in the sub-header above it. The importer uses Name as
// sourceFund whenever the cell below has a non-zero value.
type elaasSourceFundCol struct {
	Col  int
	Name string
}

// elaasCodeRE matches "<elaas-code> (<asset_number>)" – ELAAS exports the
// combined value in a single cell. Both halves are digit-only with dashes or
// spaces inside the inner group; we normalise the inner spaces to dashes.
var elaasCodeRE = regexp.MustCompile(`^\s*([\d][\d\-]*)\s*\(\s*([\d\s\-]+)\s*\)\s*$`)

func parseElaasXLSX(r io.Reader) (*ElaasReport, error) {
	f, err := excelize.OpenReader(r)
	if err != nil {
		return nil, err
	}
	defer func() { _ = f.Close() }()
	sheets := f.GetSheetList()
	if len(sheets) == 0 {
		return nil, fmt.Errorf("workbook has no sheets")
	}
	sheet := sheets[0]
	rows, err := f.GetRows(sheet)
	if err != nil {
		return nil, err
	}

	headerIdx, cols, err := findElaasHeader(rows)
	if err != nil {
		return nil, err
	}

	dataStart := headerIdx + 1
	if dataStart < len(rows) {
		// The 8 แหล่งเงิน sub-columns live in a second header row directly
		// underneath. We detect them by scanning that row for the recognised
		// fund labels; if 2+ match we treat the row as a continuation header
		// and advance dataStart past it.
		if funds := detectSourceFundSubheader(rows[dataStart]); len(funds) > 0 {
			cols.SourceFunds = funds
			dataStart++
		}
	}

	out := &ElaasReport{SheetName: sheet, HeaderRowIdx: headerIdx + 1}
	for ri := dataStart; ri < len(rows); ri++ {
		row := rows[ri]
		if len(row) == 0 {
			continue
		}
		first := strings.TrimSpace(cellAt(row, cols.Seq))
		category := strings.TrimSpace(cellAt(row, cols.Category))
		assetName := strings.TrimSpace(cellAt(row, cols.AssetName))
		codeRaw := strings.TrimSpace(cellAt(row, cols.Code))

		// Skip totals rows ("รวมชนิดสินทรัพย์ : …", "รวมประเภทสินทรัพย์ : …",
		// or the final grand total "รวม"). These rows put the label in either
		// the seq column OR the category column depending on which level of
		// total it represents, so check both.
		if isElaasTotalsRow(first) || isElaasTotalsRow(category) {
			out.Skipped++
			continue
		}

		elaas, assetNum := splitElaasAssetCode(codeRaw)
		// Skip rows that don't have any identifying info at all. Such rows
		// are page-break artifacts or stray blanks that excelize occasionally
		// emits as a sparse cell.
		if elaas == "" && assetNum == "" && assetName == "" {
			out.Skipped++
			continue
		}
		if first == "" {
			// Some exports leave the seq blank on continuation rows; that's
			// fine for our purposes, we still keep the data.
		}
		seq, _ := strconv.Atoi(first)
		purchase := parseElaasNumber(cellAt(row, cols.Price))
		life, _ := strconv.Atoi(strings.TrimSpace(cellAt(row, cols.UsefulLife)))
		out.TotalValue += purchase
		out.Rows = append(out.Rows, ElaasRow{
			Seq:           seq,
			Category:      category,
			Type:          strings.TrimSpace(cellAt(row, cols.Type)),
			Class:         strings.TrimSpace(cellAt(row, cols.Type)),
			ElaasCode:     elaas,
			AssetNumber:   assetNum,
			AssetName:     assetName,
			Details:       strings.TrimSpace(cellAt(row, cols.Details)),
			AcquireDate:   normalizeThaiDate(cellAt(row, cols.AcquireDate)),
			PurchaseValue: purchase,
			UsefulLife:    life,
			Status:        strings.TrimSpace(cellAt(row, cols.Status)),
			AcquiredBy:    strings.TrimSpace(cellAt(row, cols.GetBy)),
			AcquiredFrom:  strings.TrimSpace(cellAt(row, cols.GetFrom)),
			SourceFund:    pickElaasSourceFund(row, cols.SourceFunds),
			OwnerName:     strings.TrimSpace(cellAt(row, cols.Owner)),
			Condition:     strings.TrimSpace(cellAt(row, cols.Condition)),
		})
	}
	return out, nil
}

// findElaasHeader scans up to the first 60 rows looking for the canonical
// header (it must contain "ลำดับ" plus several other key Thai labels) and
// returns the resolved column map. The fuzzy match keeps the importer
// resilient to small layout changes between e-LAAS versions / municipalities.
func findElaasHeader(rows [][]string) (int, elaasColumns, error) {
	type matcher struct {
		match func(t string) bool
		set   func(c *elaasColumns, i int)
	}
	matchers := []matcher{
		{func(t string) bool { return t == "ลำดับ" }, func(c *elaasColumns, i int) { c.Seq = i }},
		{func(t string) bool {
			return strings.HasPrefix(t, "ประเภทสินทรัพย์") || strings.HasPrefix(t, "ประเภท สินทรัพย์")
		}, func(c *elaasColumns, i int) { c.Category = i }},
		{func(t string) bool {
			return strings.HasPrefix(t, "ชนิดสินทรัพย์") || strings.HasPrefix(t, "ชนิด สินทรัพย์")
		}, func(c *elaasColumns, i int) { c.Type = i }},
		{func(t string) bool {
			return strings.Contains(t, "รหัสสินทรัพย์ในระบบ") || strings.Contains(t, "รหัสสินทรัพย์ อปท")
		}, func(c *elaasColumns, i int) { c.Code = i }},
		{func(t string) bool { return strings.HasPrefix(t, "ชื่อสินทรัพย์") }, func(c *elaasColumns, i int) { c.AssetName = i }},
		{func(t string) bool { return strings.HasPrefix(t, "รายละเอียดสินทรัพย์") }, func(c *elaasColumns, i int) { c.Details = i }},
		{func(t string) bool { return t == "วันที่ได้มา" }, func(c *elaasColumns, i int) { c.AcquireDate = i }},
		{func(t string) bool { return t == "ราคาสินทรัพย์" }, func(c *elaasColumns, i int) { c.Price = i }},
		{func(t string) bool { return strings.HasPrefix(t, "อายุ") }, func(c *elaasColumns, i int) { c.UsefulLife = i }},
		{func(t string) bool { return t == "สถานะ" }, func(c *elaasColumns, i int) { c.Status = i }},
		{func(t string) bool { return t == "ได้มาโดย" }, func(c *elaasColumns, i int) { c.GetBy = i }},
		{func(t string) bool { return t == "ได้มาจาก" }, func(c *elaasColumns, i int) { c.GetFrom = i }},
		{func(t string) bool { return strings.HasPrefix(t, "สภาพสินทรัพย์") }, func(c *elaasColumns, i int) { c.Condition = i }},
		{func(t string) bool { return strings.HasPrefix(t, "งานที่รับผิดชอบ") }, func(c *elaasColumns, i int) { c.Owner = i }},
	}

	limit := len(rows)
	if limit > 60 {
		limit = 60
	}
	for ri := 0; ri < limit; ri++ {
		row := rows[ri]
		hasSeq := false
		for _, raw := range row {
			if collapseInlineWhitespace(raw) == "ลำดับ" {
				hasSeq = true
				break
			}
		}
		if !hasSeq {
			continue
		}
		cols := elaasColumns{
			Seq: -1, Category: -1, Type: -1, Code: -1, AssetName: -1, Details: -1,
			AcquireDate: -1, Price: -1, UsefulLife: -1, Status: -1,
			GetBy: -1, GetFrom: -1, Owner: -1, Condition: -1,
		}
		for ci, raw := range row {
			t := collapseInlineWhitespace(raw)
			if t == "" {
				continue
			}
			for _, m := range matchers {
				if m.match(t) {
					m.set(&cols, ci)
					break
				}
			}
		}
		// Require the absolutely essential columns. Without these we can't
		// pull out anything useful, so keep scanning further down the sheet.
		if cols.Seq >= 0 && cols.Category >= 0 && cols.Type >= 0 && cols.Code >= 0 && cols.AssetName >= 0 {
			return ri, cols, nil
		}
	}
	return -1, elaasColumns{}, fmt.Errorf("ELAAS header row not found")
}

// elaasFundLabels lists prefixes/substrings that identify each of the 8
// แหล่งเงิน sub-columns the ELAAS export emits. We use Contains rather than
// equality so trailing-newline shrapnel from Excel doesn't break detection.
var elaasFundLabels = []string{
	"เงินงบประมาณ",
	"เงินสะสม",     // matches "เงินสะสม/เงินทุนสำรองเงินสะสม"
	"เงินอุดหนุน",  // matches "เงินอุดหนุนระบุวัตถุประสงค์/เฉพาะกิจ"
	"เงินรับฝาก",
	"รับโอน",       // matches "รับโอน/รับบริจาค"
	"เงินกู้",
	"รายได้สะสม",
	"ทุนดำเนินการ",
}

// detectSourceFundSubheader returns the indexes + labels of the 8 fund
// columns when the supplied row is a source-fund sub-header. It returns nil
// when fewer than 2 fund labels are recognised so we don't accidentally skip
// real data rows.
func detectSourceFundSubheader(row []string) []elaasSourceFundCol {
	var out []elaasSourceFundCol
	for ci, raw := range row {
		t := collapseInlineWhitespace(raw)
		if t == "" {
			continue
		}
		for _, lab := range elaasFundLabels {
			if strings.Contains(t, lab) {
				out = append(out, elaasSourceFundCol{Col: ci, Name: t})
				break
			}
		}
	}
	if len(out) < 2 {
		return nil
	}
	return out
}

// pickElaasSourceFund returns the header name of the first source-fund column
// where the row has a non-zero value, falling back to the empty string when
// every fund column is zero / blank.
func pickElaasSourceFund(row []string, funds []elaasSourceFundCol) string {
	for _, f := range funds {
		if parseElaasNumber(cellAt(row, f.Col)) > 0 {
			return f.Name
		}
	}
	return ""
}

// isElaasTotalsRow recognises the three flavours of totals row ELAAS injects
// between/at the end of the data:
//
//	"รวมชนิดสินทรัพย์ : <ชนิด>"
//	"รวมประเภทสินทรัพย์ : <ประเภท>"
//	"รวม" (the final grand total)
func isElaasTotalsRow(s string) bool {
	s = strings.TrimSpace(s)
	return strings.HasPrefix(s, "รวมชนิดสินทรัพย์") ||
		strings.HasPrefix(s, "รวมประเภทสินทรัพย์") ||
		strings.HasPrefix(s, "รวมประเภท") ||
		strings.HasPrefix(s, "รวมทั้ง") ||
		s == "รวม"
}

func collapseInlineWhitespace(raw string) string {
	s := strings.ReplaceAll(strings.TrimSpace(raw), "\n", " ")
	return strings.Join(strings.Fields(s), " ")
}

func cellAt(row []string, i int) string {
	if i < 0 || i >= len(row) {
		return ""
	}
	return row[i]
}

// splitElaasAssetCode pulls the ELAAS code and อปท. asset number out of the
// combined "101-630926-00001 (001 43 0001)" form. When the cell only carries
// one half (no parenthesis) we keep it as the asset number, which is the most
// common single-form layout in the demo dataset.
func splitElaasAssetCode(raw string) (elaas, number string) {
	raw = strings.TrimSpace(raw)
	if raw == "" {
		return "", ""
	}
	m := elaasCodeRE.FindStringSubmatch(raw)
	if m == nil {
		// Fall back to the looser legacy parser in import_export.go so we
		// stay compatible with any CSV-converted variants that ship a
		// slightly different format.
		return parseElaasCombined(raw)
	}
	elaas = strings.TrimSpace(m[1])
	inner := strings.TrimSpace(m[2])
	parts := strings.FieldsFunc(inner, func(r rune) bool {
		return r == ' ' || r == '-' || r == '\t'
	})
	return elaas, strings.Join(parts, "-")
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

// normalizeThaiDate converts "dd/mm/yyyy" (Buddhist or Western year) into the
// ISO-8601 yyyy-mm-dd form store.AssetInput.ReceivedDate expects. Empty input
// returns "" so the column stays NULL in the DB.
func normalizeThaiDate(raw string) string {
	t := strings.TrimSpace(raw)
	if t == "" {
		return ""
	}
	parts := strings.Split(t, "/")
	if len(parts) != 3 {
		return ""
	}
	day, errD := strconv.Atoi(parts[0])
	month, errM := strconv.Atoi(parts[1])
	year, errY := strconv.Atoi(parts[2])
	if errD != nil || errM != nil || errY != nil {
		return ""
	}
	if year > 2400 {
		year -= 543 // Buddhist → Gregorian
	}
	return time.Date(year, time.Month(month), day, 0, 0, 0, 0, time.UTC).Format("2006-01-02")
}

func defaultIfEmpty(v, def string) string {
	if strings.TrimSpace(v) == "" {
		return def
	}
	return v
}
