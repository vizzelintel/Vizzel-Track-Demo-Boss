package api

import (
	"bytes"
	"encoding/csv"
	"fmt"
	"io"
	"net/http"
	"strconv"
	"strings"

	"github.com/go-chi/chi/v5"
	"github.com/vizzelintel/vizzel-track-demo-boss/vizzel-go-app/internal/store"
	"golang.org/x/crypto/bcrypt"
)

// MountImportTemplateRoutes attaches per-module template / import / export
// endpoints for the org structure, facility (building+room), user, and
// sales/disposal flows. The frontend dialogs already POST to these paths so
// wiring them server-side is enough to enable the importers end-to-end.
func MountImportTemplateRoutes(r chi.Router, h *Handler) {
	// Org structure: institute → department → section → position
	r.Get("/organization/structure/template", h.OrgStructureTemplate)
	r.Get("/organization-structure/template", h.OrgStructureTemplate)
	r.With(h.RequirePermission("organization", "edit")).
		Post("/organization/structure/import", h.OrgStructureImport)
	r.With(h.RequirePermission("organization", "edit")).
		Post("/organization-structure/import", h.OrgStructureImport)
	r.Get("/organization/structure/export", h.OrgStructureExport)
	r.Get("/organization-structure/export", h.OrgStructureExport)

	// Facility: buildings + rooms
	r.Get("/facility/template", h.FacilityTemplate)
	r.With(h.RequirePermission("organization", "edit")).
		Post("/facility/import", h.FacilityImport)
	r.Get("/facility/export", h.FacilityExport)

	// Users
	r.Get("/user/organization/template", h.UserTemplate)
	r.With(h.RequirePermission("users", "edit")).
		Post("/user/organization/import", h.UserImport)
	r.Get("/user/organization/export/{orgID}", h.UserExport)
	r.Get("/user/organization/export", h.UserExport)

	// Sales / disposal LOT — alias for the existing handler.
	r.Get("/sales/template", h.DisposalTemplate)
	r.Get("/disposal/template", h.DisposalTemplate)
}

// -----------------------------------------------------------------------------
// Org structure (institute → department → section → position)
// -----------------------------------------------------------------------------

var orgStructureHeaders = []string{"สำนัก", "แผนก", "ฝ่าย", "ตำแหน่ง"}

// OrgStructureTemplate streams the 4-column structure_template.csv. Position
// is optional so an existing 3-column file from the legacy app still imports.
func (h *Handler) OrgStructureTemplate(w http.ResponseWriter, r *http.Request) {
	var b bytes.Buffer
	b.Write([]byte{0xEF, 0xBB, 0xBF})
	cw := csv.NewWriter(&b)
	_ = cw.Write(orgStructureHeaders)
	_ = cw.Write([]string{"สำนักบริหาร", "แผนกบุคคล", "ฝ่ายสรรหา", "เจ้าหน้าที่"})
	_ = cw.Write([]string{"สำนักบริหาร", "แผนกบุคคล", "ฝ่ายฝึกอบรม", "หัวหน้างาน"})
	_ = cw.Write([]string{"สำนักการเงิน", "แผนกบัญชี", "", ""})
	cw.Flush()
	w.Header().Set("Content-Type", "text/csv; charset=utf-8")
	w.Header().Set("Content-Disposition", `attachment; filename="organization-structure-template.csv"`)
	_, _ = w.Write(b.Bytes())
}

// OrgStructureExport emits the live institute / department / section / position
// hierarchy as a CSV that the matching importer can replay.
func (h *Handler) OrgStructureExport(w http.ResponseWriter, r *http.Request) {
	claims, ok := claimsFromContext(r.Context())
	if !ok {
		writeError(w, http.StatusUnauthorized, "unauthorized")
		return
	}
	insts, _ := h.store.ListInstitutes(r.Context(), claims.OrganizationID)
	depts, _ := h.store.ListDepartments(r.Context(), claims.OrganizationID)
	secs, _ := h.store.ListSections(r.Context(), claims.OrganizationID)
	positions, _ := h.store.ListPositions(r.Context(), claims.OrganizationID)
	var b bytes.Buffer
	b.Write([]byte{0xEF, 0xBB, 0xBF})
	cw := csv.NewWriter(&b)
	_ = cw.Write(orgStructureHeaders)
	deptsByInst := groupByParent(depts)
	secsByDept := groupByParent(secs)
	posByOrg := positions
	if len(insts) == 0 && len(depts) == 0 && len(secs) == 0 && len(posByOrg) == 0 {
		cw.Flush()
		w.Header().Set("Content-Type", "text/csv; charset=utf-8")
		w.Header().Set("Content-Disposition", `attachment; filename="organization-structure-export.csv"`)
		_, _ = w.Write(b.Bytes())
		return
	}
	for _, inst := range insts {
		instDepts := deptsByInst[inst.ID]
		if len(instDepts) == 0 {
			_ = cw.Write([]string{inst.Title, "", "", ""})
			continue
		}
		for _, dept := range instDepts {
			deptSecs := secsByDept[dept.ID]
			if len(deptSecs) == 0 {
				_ = cw.Write([]string{inst.Title, dept.Title, "", ""})
				continue
			}
			for _, sec := range deptSecs {
				_ = cw.Write([]string{inst.Title, dept.Title, sec.Title, ""})
			}
		}
	}
	// Positions don't have a parent FK in the demo schema; emit them with empty
	// preceding columns so the importer can still round-trip them.
	for _, p := range posByOrg {
		_ = cw.Write([]string{"", "", "", p.Title})
	}
	cw.Flush()
	w.Header().Set("Content-Type", "text/csv; charset=utf-8")
	w.Header().Set("Content-Disposition", `attachment; filename="organization-structure-export.csv"`)
	_, _ = w.Write(b.Bytes())
}

// OrgStructureImport accepts the structure_template.csv and creates the
// institute / department / section / position rows for the caller's
// organization. Rows are idempotent: existing names are reused so the import
// can be replayed safely.
func (h *Handler) OrgStructureImport(w http.ResponseWriter, r *http.Request) {
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
	if _, err := reader.Read(); err != nil {
		writeError(w, http.StatusBadRequest, "อ่านหัวคอลัมน์ไม่สำเร็จ")
		return
	}
	insts := lookupByName(listOrEmpty(h.store.ListInstitutes(r.Context(), claims.OrganizationID)))
	depts := lookupByName(listOrEmpty(h.store.ListDepartments(r.Context(), claims.OrganizationID)))
	secs := lookupByName(listOrEmpty(h.store.ListSections(r.Context(), claims.OrganizationID)))
	positions := lookupByName(listOrEmpty(h.store.ListPositions(r.Context(), claims.OrganizationID)))
	var (
		nInst, nDept, nSec, nPos, skipped int
		errs                              []string
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
		inst := pick(row, 0)
		dept := pick(row, 1)
		sec := pick(row, 2)
		pos := pick(row, 3)
		if inst == "" && dept == "" && sec == "" && pos == "" {
			skipped++
			continue
		}
		var instID int64
		if inst != "" {
			if id, ok := insts[inst]; ok {
				instID = id
			} else {
				id, err := h.store.EntityCreate(r.Context(), "institutes", claims.OrganizationID, inst, 0)
				if err != nil {
					errs = append(errs, fmt.Sprintf("บรรทัด %d: สำนัก %q สร้างไม่สำเร็จ: %s", line, inst, err.Error()))
				} else {
					instID = id
					insts[inst] = id
					nInst++
				}
			}
		}
		var deptID int64
		if dept != "" {
			if id, ok := depts[dept]; ok {
				deptID = id
			} else {
				id, err := h.store.EntityCreate(r.Context(), "departments", claims.OrganizationID, dept, instID)
				if err != nil {
					errs = append(errs, fmt.Sprintf("บรรทัด %d: แผนก %q สร้างไม่สำเร็จ: %s", line, dept, err.Error()))
				} else {
					deptID = id
					depts[dept] = id
					nDept++
				}
			}
		}
		if sec != "" {
			if _, ok := secs[sec]; !ok {
				id, err := h.store.EntityCreate(r.Context(), "sections", claims.OrganizationID, sec, deptID)
				if err != nil {
					errs = append(errs, fmt.Sprintf("บรรทัด %d: ฝ่าย %q สร้างไม่สำเร็จ: %s", line, sec, err.Error()))
				} else {
					secs[sec] = id
					nSec++
				}
			}
		}
		if pos != "" {
			if _, ok := positions[pos]; !ok {
				id, err := h.store.EntityCreate(r.Context(), "positions", claims.OrganizationID, pos, 0)
				if err != nil {
					errs = append(errs, fmt.Sprintf("บรรทัด %d: ตำแหน่ง %q สร้างไม่สำเร็จ: %s", line, pos, err.Error()))
				} else {
					positions[pos] = id
					nPos++
				}
			}
		}
	}
	writeJSON(w, http.StatusOK, map[string]any{
		"imported":    nInst + nDept + nSec + nPos,
		"institutes":  nInst,
		"departments": nDept,
		"sections":    nSec,
		"positions":   nPos,
		"skipped":     skipped,
		"errors":      errs,
	})
}

// -----------------------------------------------------------------------------
// Facility (buildings + rooms)
// -----------------------------------------------------------------------------

var facilityHeaders = []string{"ชื่ออาคาร", "ชื่อห้อง", "หมายเลขห้อง", "ชั้น", "แผนก", "รายละเอียด"}

// FacilityTemplate streams the canonical facility-template.csv. The importer
// accepts subset rows where any of room number / floor / department are blank.
func (h *Handler) FacilityTemplate(w http.ResponseWriter, r *http.Request) {
	var b bytes.Buffer
	b.Write([]byte{0xEF, 0xBB, 0xBF})
	cw := csv.NewWriter(&b)
	_ = cw.Write(facilityHeaders)
	_ = cw.Write([]string{"อาคาร A", "ห้องประชุมใหญ่", "101", "1", "ฝ่ายบริหาร", "รองรับ 50 คน"})
	_ = cw.Write([]string{"อาคาร A", "ห้องประชุมเล็ก", "102", "1", "ฝ่ายบริหาร", "รองรับ 10 คน"})
	_ = cw.Write([]string{"อาคาร B", "ห้องผลิต", "201", "2", "ฝ่ายผลิต", "พื้นที่ผลิต"})
	cw.Flush()
	w.Header().Set("Content-Type", "text/csv; charset=utf-8")
	w.Header().Set("Content-Disposition", `attachment; filename="facility-template.csv"`)
	_, _ = w.Write(b.Bytes())
}

// FacilityExport emits each building → rooms pair as one CSV row. Buildings
// with no rooms still get a row so they round-trip cleanly.
func (h *Handler) FacilityExport(w http.ResponseWriter, r *http.Request) {
	claims, ok := claimsFromContext(r.Context())
	if !ok {
		writeError(w, http.StatusUnauthorized, "unauthorized")
		return
	}
	buildings, _ := h.store.ListBuildings(r.Context(), claims.OrganizationID)
	rooms, _ := h.store.ListRooms(r.Context(), claims.OrganizationID)
	roomsByBuilding := groupByParent(rooms)
	var b bytes.Buffer
	b.Write([]byte{0xEF, 0xBB, 0xBF})
	cw := csv.NewWriter(&b)
	_ = cw.Write(facilityHeaders)
	for _, bd := range buildings {
		rms := roomsByBuilding[bd.ID]
		if len(rms) == 0 {
			_ = cw.Write([]string{bd.Title, "", "", "", "", ""})
			continue
		}
		for _, rm := range rms {
			_ = cw.Write([]string{bd.Title, rm.Title, rm.Subtitle, "", "", rm.Status})
		}
	}
	cw.Flush()
	w.Header().Set("Content-Type", "text/csv; charset=utf-8")
	w.Header().Set("Content-Disposition", `attachment; filename="facility-export.csv"`)
	_, _ = w.Write(b.Bytes())
}

// FacilityImport creates buildings and rooms from facility-template.csv.
// Rooms are linked to their building by name; missing buildings are
// auto-created so the import succeeds in one pass.
func (h *Handler) FacilityImport(w http.ResponseWriter, r *http.Request) {
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
	if _, err := reader.Read(); err != nil {
		writeError(w, http.StatusBadRequest, "อ่านหัวคอลัมน์ไม่สำเร็จ")
		return
	}
	buildings := lookupByName(listOrEmpty(h.store.ListBuildings(r.Context(), claims.OrganizationID)))
	rooms := listOrEmpty(h.store.ListRooms(r.Context(), claims.OrganizationID))
	// Room lookup is "<buildingID>|<title>" so the same room name in different
	// buildings doesn't clash.
	roomKey := func(buildingID int64, name string) string {
		return fmt.Sprintf("%d|%s", buildingID, strings.TrimSpace(name))
	}
	roomSeen := map[string]bool{}
	for _, rm := range rooms {
		roomSeen[roomKey(rm.Value, rm.Title)] = true
	}
	var (
		nBld, nRoom, skipped int
		errs                 []string
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
		buildingName := pick(row, 0)
		roomName := pick(row, 1)
		roomNo := pick(row, 2)
		if buildingName == "" {
			skipped++
			continue
		}
		bID, ok := buildings[buildingName]
		if !ok {
			id, err := h.store.EntityCreate(r.Context(), "buildings", claims.OrganizationID, buildingName, 0)
			if err != nil {
				errs = append(errs, fmt.Sprintf("บรรทัด %d: อาคาร %q สร้างไม่สำเร็จ: %s", line, buildingName, err.Error()))
				continue
			}
			bID = id
			buildings[buildingName] = id
			nBld++
		}
		if roomName == "" && roomNo == "" {
			continue
		}
		label := roomName
		if label == "" {
			label = roomNo
		}
		if roomSeen[roomKey(bID, label)] {
			continue
		}
		if _, err := h.store.EntityCreate(r.Context(), "rooms", claims.OrganizationID, label, bID); err != nil {
			errs = append(errs, fmt.Sprintf("บรรทัด %d: ห้อง %q สร้างไม่สำเร็จ: %s", line, label, err.Error()))
			continue
		}
		roomSeen[roomKey(bID, label)] = true
		nRoom++
	}
	writeJSON(w, http.StatusOK, map[string]any{
		"imported":  nBld + nRoom,
		"buildings": nBld,
		"rooms":     nRoom,
		"skipped":   skipped,
		"errors":    errs,
	})
}

// -----------------------------------------------------------------------------
// Users
// -----------------------------------------------------------------------------

var userTemplateHeaders = []string{
	"รหัสพนักงาน", "รหัสผ่าน", "อีเมล", "คำนำหน้า", "ชื่อ", "นามสกุล",
	"เบอร์โทร", "สำนัก", "แผนก", "ฝ่าย", "ตำแหน่ง",
}

// UserTemplate streams user_import_template (1).csv with one realistic sample
// row so demo importers see the expected shape immediately.
func (h *Handler) UserTemplate(w http.ResponseWriter, r *http.Request) {
	var b bytes.Buffer
	b.Write([]byte{0xEF, 0xBB, 0xBF})
	cw := csv.NewWriter(&b)
	_ = cw.Write(userTemplateHeaders)
	_ = cw.Write([]string{"EMP001", "Demo@1234", "somchai@example.com", "นาย", "สมชาย", "ใจดี", "0812345678", "สำนักบริหาร", "แผนกบุคคล", "ฝ่ายสรรหา", "เจ้าหน้าที่"})
	_ = cw.Write([]string{"EMP002", "Demo@1234", "siri@example.com", "นางสาว", "ศิริ", "ทองดี", "0898765432", "สำนักการเงิน", "แผนกบัญชี", "", "พนักงานบัญชี"})
	cw.Flush()
	w.Header().Set("Content-Type", "text/csv; charset=utf-8")
	w.Header().Set("Content-Disposition", `attachment; filename="user-import-template.csv"`)
	_, _ = w.Write(b.Bytes())
}

// UserImport creates user accounts from user_import_template (1).csv. Each
// row becomes a CreateUser call; password column may be left blank to default
// to "demo1234".
func (h *Handler) UserImport(w http.ResponseWriter, r *http.Request) {
	claims, ok := claimsFromContext(r.Context())
	if !ok {
		writeError(w, http.StatusUnauthorized, "unauthorized")
		return
	}
	if err := r.ParseMultipartForm(8 << 20); err != nil {
		writeError(w, http.StatusBadRequest, "อัปโหลดไฟล์ไม่สำเร็จ: "+err.Error())
		return
	}
	file, _, err := r.FormFile("file")
	if err != nil {
		writeError(w, http.StatusBadRequest, "ต้องแนบไฟล์ CSV: "+err.Error())
		return
	}
	defer file.Close()
	orgID := claims.OrganizationID
	if v, _ := strconv.ParseInt(r.FormValue("organizationID"), 10, 64); v > 0 {
		orgID = v
	}
	reader := csv.NewReader(file)
	reader.FieldsPerRecord = -1
	header, headerErr := reader.Read()
	if headerErr != nil {
		writeError(w, http.StatusBadRequest, "อ่านหัวคอลัมน์ไม่สำเร็จ")
		return
	}
	cols := mapUserHeader(header)
	var (
		imported, failed, skipped int
		errs                      []map[string]any
	)
	line := 1
	for {
		row, err := reader.Read()
		if err == io.EOF {
			break
		}
		line++
		if err != nil {
			failed++
			if len(errs) < 25 {
				errs = append(errs, map[string]any{"line": line, "error": "อ่านบรรทัดไม่สำเร็จ"})
			}
			continue
		}
		email := strings.ToLower(strings.TrimSpace(pickCol(row, cols, "email")))
		if email == "" {
			skipped++
			continue
		}
		password := strings.TrimSpace(pickCol(row, cols, "password"))
		if password == "" {
			password = "demo1234"
		}
		hash, err := bcrypt.GenerateFromPassword([]byte(password), bcrypt.DefaultCost)
		if err != nil {
			failed++
			if len(errs) < 25 {
				errs = append(errs, map[string]any{"line": line, "error": "เข้ารหัสรหัสผ่านไม่สำเร็จ"})
			}
			continue
		}
		first := strings.TrimSpace(pickCol(row, cols, "name"))
		last := strings.TrimSpace(pickCol(row, cols, "surname"))
		display := strings.TrimSpace(first + " " + last)
		if display == "" {
			display = strings.TrimSpace(pickCol(row, cols, "username"))
		}
		if display == "" {
			display = email
		}
		if _, err := h.store.CreateUser(r.Context(), orgID, email, string(hash), display, store.DemoRoleAdminOrg); err != nil {
			failed++
			if len(errs) < 25 {
				errs = append(errs, map[string]any{"line": line, "error": err.Error()})
			}
			continue
		}
		imported++
	}
	writeJSON(w, http.StatusOK, map[string]any{
		"imported":  imported,
		"failed":    failed,
		"skipped":   skipped,
		"errors":    errs,
		"successes": []any{},
		"data_rows": imported + failed + skipped,
	})
}

// UserExport streams the current org's users as the same CSV shape the
// importer accepts. The password column is omitted (left blank) so an admin
// can use the file as an idempotent backup without leaking hashes.
func (h *Handler) UserExport(w http.ResponseWriter, r *http.Request) {
	claims, ok := claimsFromContext(r.Context())
	if !ok {
		writeError(w, http.StatusUnauthorized, "unauthorized")
		return
	}
	orgID := claims.OrganizationID
	if id, _ := strconv.ParseInt(chi.URLParam(r, "orgID"), 10, 64); id > 0 {
		orgID = id
	}
	users, _ := h.store.ListOrgUsers(r.Context(), orgID)
	search := strings.ToLower(strings.TrimSpace(r.URL.Query().Get("search")))
	var b bytes.Buffer
	b.Write([]byte{0xEF, 0xBB, 0xBF})
	cw := csv.NewWriter(&b)
	_ = cw.Write(userTemplateHeaders)
	for _, u := range users {
		if search != "" {
			hay := strings.ToLower(u.Username + " " + u.Email + " " + u.Name + " " + u.Surname)
			if !strings.Contains(hay, search) {
				continue
			}
		}
		_ = cw.Write([]string{
			u.Username,
			"",
			u.Email,
			"",
			u.Name,
			u.Surname,
			"",
			u.InstituteName,
			u.DeptName,
			u.SectionName,
			"",
		})
	}
	cw.Flush()
	w.Header().Set("Content-Type", "text/csv; charset=utf-8")
	w.Header().Set("Content-Disposition", `attachment; filename="users-export.csv"`)
	_, _ = w.Write(b.Bytes())
}

// -----------------------------------------------------------------------------
// helpers
// -----------------------------------------------------------------------------

func groupByParent(rows []store.Row) map[int64][]store.Row {
	out := map[int64][]store.Row{}
	for _, row := range rows {
		out[row.Value] = append(out[row.Value], row)
	}
	return out
}

func lookupByName(rows []store.Row) map[string]int64 {
	out := make(map[string]int64, len(rows))
	for _, row := range rows {
		key := strings.TrimSpace(row.Title)
		if key == "" {
			continue
		}
		out[key] = row.ID
	}
	return out
}

// mapUserHeader maps the CSV header indexes to internal field keys. We accept
// the Thai column names used by user_import_template (1).csv and a handful of
// English aliases so spreadsheets shared across teams keep working.
func mapUserHeader(header []string) map[string]int {
	cols := map[string]int{}
	for i, raw := range header {
		t := strings.ToLower(strings.TrimSpace(raw))
		// Strip BOM on the first cell.
		t = strings.TrimPrefix(t, "\ufeff")
		switch t {
		case "":
		case "รหัสพนักงาน", "รหัส", "username", "employee id", "employeeid":
			cols["username"] = i
		case "รหัสผ่าน", "password":
			cols["password"] = i
		case "อีเมล", "email":
			cols["email"] = i
		case "คำนำหน้า", "prefix":
			cols["prefix"] = i
		case "ชื่อ", "name", "first name", "firstname":
			cols["name"] = i
		case "นามสกุล", "surname", "lastname", "last name":
			cols["surname"] = i
		case "เบอร์โทร", "mobile", "phone":
			cols["mobile"] = i
		case "สำนัก", "institute":
			cols["institute"] = i
		case "แผนก", "dept", "department":
			cols["dept"] = i
		case "ฝ่าย", "section":
			cols["section"] = i
		case "ตำแหน่ง", "position":
			cols["position"] = i
		case "สิทธิ์", "role":
			cols["role"] = i
		}
	}
	// Fall back to positional mapping for anonymous CSVs so callers that drop
	// the header row still import correctly.
	defaults := []string{"username", "password", "email", "prefix", "name", "surname", "mobile", "institute", "dept", "section", "position"}
	for i, key := range defaults {
		if _, ok := cols[key]; !ok {
			cols[key] = i
		}
	}
	return cols
}

func pickCol(row []string, cols map[string]int, key string) string {
	if idx, ok := cols[key]; ok && idx >= 0 && idx < len(row) {
		return strings.TrimSpace(row[idx])
	}
	return ""
}
