package api

import (
	"encoding/csv"
	"io"
	"net/http"
	"regexp"
	"strconv"
	"strings"

	"github.com/go-chi/chi/v5"
	"github.com/vizzelintel/vizzel-track-demo-boss/vizzel-go-app/internal/store"
)

func (h *Handler) AssetTemplate(w http.ResponseWriter, r *http.Request) {
	csv := "เลขครุภัณฑ์,รหัส Elaas,ชื่อ,RFID,หมวด,ชนิด,อาคาร,ห้อง,เจ้าของ,มูลค่า,สถานะ,คิดค่าเสื่อม\n" +
		"001-43-0001,101-630926-00001,ตัวอย่างครุภัณฑ์,RFID-00001,ครุภัณฑ์คอมพิวเตอร์,Laptop,อาคาร A,ห้อง 101,สมชาย,50000,ใช้งาน,ใช่\n"
	w.Header().Set("Content-Type", "text/csv; charset=utf-8")
	w.Header().Set("Content-Disposition", "attachment; filename=asset-template.csv")
	_, _ = w.Write([]byte(csv))
}

// elaasCombinedPattern matches "<elaas-code> (XXX YY ZZZZ)" with optional dashes
// inside the inner asset-number group. The inner group is rewritten with dashes
// in parseElaasCombined below.
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
	// Normalise the inner XXX YY ZZZZ form to XXX-YY-ZZZZ.
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

func (h *Handler) AssetImport(w http.ResponseWriter, r *http.Request) {
	claims, ok := claimsFromContext(r.Context())
	if !ok {
		writeError(w, http.StatusUnauthorized, "unauthorized")
		return
	}
	file, _, err := r.FormFile("file")
	if err != nil {
		writeError(w, http.StatusBadRequest, "file required")
		return
	}
	defer file.Close()
	reader := csv.NewReader(file)
	reader.FieldsPerRecord = -1
	header, _ := reader.Read()
	// Detect whether the new template (with explicit รหัส Elaas column at index 1)
	// is being used. Old template: index 1 is the asset name.
	hasElaasColumn := false
	if len(header) > 1 {
		h := strings.ToLower(strings.TrimSpace(header[1]))
		if strings.Contains(h, "elaas") || strings.Contains(header[1], "Elaas") || strings.Contains(header[1], "อีลาส") {
			hasElaasColumn = true
		}
	}
	imported, failed := 0, 0
	for {
		row, err := reader.Read()
		if err == io.EOF {
			break
		}
		if err != nil || len(row) < 2 {
			failed++
			continue
		}
		// First column may contain a combined "elaas (XXX YY ZZZZ)" cell; split it.
		elaas, assetNum := parseElaasCombined(strings.TrimSpace(row[0]))
		var (
			nameIdx, rfidIdx, catIdx, classIdx, bldIdx, roomIdx, ownerIdx, valIdx, statusIdx, depIdx int
		)
		if hasElaasColumn {
			// Explicit elaas column overrides whatever we parsed out of column 0
			// (the combined cell is still split so the user gets sensible behaviour
			// either way).
			if v := strings.TrimSpace(pick(row, 1)); v != "" {
				elaas = v
			}
			nameIdx, rfidIdx, catIdx, classIdx, bldIdx, roomIdx, ownerIdx, valIdx, statusIdx, depIdx = 2, 3, 4, 5, 6, 7, 8, 9, 10, 11
		} else {
			nameIdx, rfidIdx, catIdx, classIdx, bldIdx, roomIdx, ownerIdx, valIdx, statusIdx, depIdx = 1, 2, 3, 4, 5, 6, 7, 8, 9, 10
		}
		val, _ := strconv.ParseInt(strings.TrimSpace(pick(row, valIdx)), 10, 64)
		in := store.AssetInput{
			AssetNumber:     assetNum,
			ElaasCode:       elaas,
			AssetName:       pick(row, nameIdx),
			RFIDNum:         pick(row, rfidIdx),
			CategoryName:    pick(row, catIdx),
			ClassName:       pick(row, classIdx),
			BuildingName:    pick(row, bldIdx),
			RoomName:        pick(row, roomIdx),
			OwnerName:       pick(row, ownerIdx),
			AssetValue:      val,
			AssetStatusName: pickDefault(row, statusIdx, "ใช้งาน"),
			IsDepreciation:  parseImportBool(pick(row, depIdx), true),
		}
		if _, err := h.store.CreateAsset(r.Context(), claims.OrganizationID, in); err != nil {
			failed++
		} else {
			imported++
		}
	}
	dryRun := r.FormValue("dryRun") == "true"
	resp := map[string]any{
		"imported":       imported,
		"failed":         failed,
		"created":        imported,
		"updated":        0,
		"errors":         []any{},
		"successes":      []any{},
		"newCategories":  []any{},
		"newTypes":       []any{},
		"newClasses":     []any{},
		"newBuildings":   []any{},
		"newRooms":       []any{},
		"newStatuses":    []any{},
	}
	if dryRun {
		resp["imported"] = 0
	}
	writeJSON(w, http.StatusOK, resp)
}

func (h *Handler) ConvertElaasImport(w http.ResponseWriter, r *http.Request) {
	file, _, err := r.FormFile("file")
	if err != nil {
		writeError(w, http.StatusBadRequest, "file required")
		return
	}
	defer file.Close()
	data, err := io.ReadAll(file)
	if err != nil {
		writeError(w, http.StatusBadRequest, "read failed")
		return
	}
	writeJSON(w, http.StatusOK, map[string]any{"csv": string(data)})
}

func pick(row []string, i int) string {
	if i < len(row) {
		return strings.TrimSpace(row[i])
	}
	return ""
}

func pickDefault(row []string, i int, d string) string {
	if v := pick(row, i); v != "" {
		return v
	}
	return d
}

func (h *Handler) StructureTemplate(w http.ResponseWriter, r *http.Request) {
	csv := "หมวด,ประเภท,ชนิด\nครุภัณฑ์คอมพิวเตอร์,IT,Laptop\n"
	w.Header().Set("Content-Type", "text/csv")
	w.Header().Set("Content-Disposition", "attachment; filename=structure-template.csv")
	_, _ = w.Write([]byte(csv))
}

func (h *Handler) StructureExport(w http.ResponseWriter, r *http.Request) {
	claims, ok := claimsFromContext(r.Context())
	if !ok {
		writeError(w, http.StatusUnauthorized, "unauthorized")
		return
	}
	cats, _ := h.store.ListAssetCategories(r.Context(), claims.OrganizationID)
	types, _ := h.store.ListAssetTypes(r.Context(), claims.OrganizationID, 0)
	classes, _ := h.store.ListAssetClasses(r.Context(), claims.OrganizationID, 0)
	var b strings.Builder
	b.WriteString("หมวด,ประเภท,ชนิด\n")
	for _, c := range classes {
		b.WriteString(c.Title + "\n")
	}
	_ = cats
	_ = types
	w.Header().Set("Content-Type", "text/csv")
	_, _ = w.Write([]byte(b.String()))
}

func (h *Handler) StructureImport(w http.ResponseWriter, r *http.Request) {
	claims, ok := claimsFromContext(r.Context())
	if !ok {
		writeError(w, http.StatusUnauthorized, "unauthorized")
		return
	}
	file, _, err := r.FormFile("file")
	if err != nil {
		writeError(w, http.StatusBadRequest, "file required")
		return
	}
	defer file.Close()
	reader := csv.NewReader(file)
	_, _ = reader.Read()
	n := 0
	for {
		row, err := reader.Read()
		if err == io.EOF {
			break
		}
		if len(row) < 1 || row[0] == "" {
			continue
		}
		_, _ = h.store.EntityCreate(r.Context(), "categories", claims.OrganizationID, row[0], 0)
		n++
	}
	writeJSON(w, http.StatusOK, map[string]any{"imported": n})
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
		"total":   len(all),
		"pending": len(pending),
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
