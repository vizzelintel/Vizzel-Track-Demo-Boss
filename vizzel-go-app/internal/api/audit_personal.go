package api

import (
	"context"
	"fmt"
	"math"
	"net/http"
	"sort"
	"strconv"
	"strings"
	"time"

	"github.com/go-chi/chi/v5"
	"github.com/vizzelintel/vizzel-track-demo-boss/vizzel-go-app/internal/store"
)

// MountAuditReportRoutes registers the rich audit-report endpoints used by
// /dashboard/audit. They override the lightweight stubs from MountCompatExtended.
func MountAuditReportRoutes(r chi.Router, h *Handler) {
	r.Get("/audit/initial-data/{orgID}", h.AuditReportInitial)
	r.Get("/audit/jobs/{orgID}", h.AuditReportJobs)
	r.Get("/audit/summary/{orgID}", h.AuditReportSummary)
	r.Get("/audit/status/{orgID}", h.AuditReportStatus)
	r.Get("/audit/assets-checked/{orgID}", h.AuditReportAssets("checked"))
	r.Get("/audit/assets-not-checked/{orgID}", h.AuditReportAssets("not_checked"))
	r.Get("/audit/assets-not-found/{orgID}", h.AuditReportAssets("not_found"))
}

// MountPersonalReportRoutes registers the rich personal-dashboard endpoints
// used by /dashboard/personal. They override the lightweight stubs in
// MountProductionRoutes.
func MountPersonalReportRoutes(r chi.Router, h *Handler) {
	r.Get("/dashboard/personal/summary", h.PersonalReportSummary)
	r.Get("/dashboard/personal/status", h.PersonalReportStatus)
	r.Get("/dashboard/personal/category", h.PersonalReportCategory)
	r.Get("/dashboard/personal/assets", h.PersonalReportAssets)
}

// ---------------------------------------------------------------------------
// Audit aggregation
// ---------------------------------------------------------------------------

type auditAggregate struct {
	checked    int
	notChecked int
	notFound   int
	total      int
}

func (a auditAggregate) checkRate() int {
	if a.total <= 0 {
		return 0
	}
	v := float64(a.checked) / float64(a.total) * 100
	return int(math.Round(v))
}

// classifyAuditAsset bucketises a single asset for the current audit cycle.
// The demo doesn't persist per-job scan results so we derive a stable bucket
// from the asset itself: the canonical "is_check" flag plus the status name.
func classifyAuditAsset(a store.Asset) string {
	status := strings.TrimSpace(a.AssetStatusName)
	if status == "" {
		status = strings.TrimSpace(a.Status)
	}
	if strings.Contains(status, "สูญหาย") || strings.EqualFold(status, "lost") || strings.EqualFold(status, "missing") {
		return "not_found"
	}
	if a.IsCheck {
		return "checked"
	}
	return "not_checked"
}

func aggregateAudit(assets []store.Asset) auditAggregate {
	var out auditAggregate
	for _, a := range assets {
		out.total++
		switch classifyAuditAsset(a) {
		case "checked":
			out.checked++
		case "not_found":
			out.notFound++
		default:
			out.notChecked++
		}
	}
	return out
}

func auditSummaryPayload(agg auditAggregate) map[string]any {
	return map[string]any{
		"checked":    agg.checked,
		"notChecked": agg.notChecked,
		"notFound":   agg.notFound,
		"checkRate":  agg.checkRate(),
	}
}

func auditStatusPayload(agg auditAggregate) []map[string]any {
	return []map[string]any{
		{"name": "ตรวจนับแล้ว", "value": agg.checked, "color": "#10b981"},
		{"name": "ยังไม่ตรวจนับ", "value": agg.notChecked, "color": "#f59e0b"},
		{"name": "ยังไม่พบ", "value": agg.notFound, "color": "#ef4444"},
	}
}

// ---------------------------------------------------------------------------
// Filter / pagination helpers
// ---------------------------------------------------------------------------

func parsePageQuery(r *http.Request) (page, pageSize int) {
	page, _ = strconv.Atoi(r.URL.Query().Get("page"))
	pageSize, _ = strconv.Atoi(r.URL.Query().Get("pageSize"))
	if page < 1 {
		page = 1
	}
	if pageSize < 1 || pageSize > 200 {
		pageSize = 10
	}
	return
}

func parseJobIDsQuery(r *http.Request) []int64 {
	raw := r.URL.Query().Get("jobIds")
	if raw == "" {
		return nil
	}
	out := make([]int64, 0, 4)
	for _, p := range strings.Split(raw, ",") {
		if v, err := strconv.ParseInt(strings.TrimSpace(p), 10, 64); err == nil && v > 0 {
			out = append(out, v)
		}
	}
	return out
}

func paginate[T any](rows []T, page, pageSize int) []T {
	if len(rows) == 0 {
		return rows
	}
	start := (page - 1) * pageSize
	if start >= len(rows) {
		return rows[:0]
	}
	end := start + pageSize
	if end > len(rows) {
		end = len(rows)
	}
	return rows[start:end]
}

func loadAuditAssets(ctx context.Context, h *Handler, orgID int64) []store.Asset {
	res, _ := h.store.ListAssetsPaged(ctx, orgID, 1, 5000, store.AssetFilter{})
	if res == nil {
		return nil
	}
	return res.Data
}

func filterAuditAssets(assets []store.Asset, bucket string, search string) []store.Asset {
	out := assets[:0:0]
	out = make([]store.Asset, 0, len(assets))
	needle := strings.ToLower(strings.TrimSpace(search))
	for _, a := range assets {
		if classifyAuditAsset(a) != bucket {
			continue
		}
		if needle != "" {
			hay := strings.ToLower(a.AssetNumber + " " + a.AssetName + " " + a.OwnerName + " " + a.BuildingName + " " + a.RoomName)
			if !strings.Contains(hay, needle) {
				continue
			}
		}
		out = append(out, a)
	}
	return out
}

func auditAssetRow(a store.Asset) map[string]any {
	location := strings.TrimSpace(strings.Join([]string{a.BuildingName, a.RoomName}, " / "))
	if location == "/" {
		location = ""
	}
	var lastChecked any
	if !a.ReceivedDate.IsZero() {
		lastChecked = a.ReceivedDate.Format("2006-01-02")
	}
	return map[string]any{
		"id":            a.ID,
		"assetNumber":   a.AssetNumber,
		"assetName":     a.AssetName,
		"category":      a.CategoryName,
		"building":      a.BuildingName,
		"room":          a.RoomName,
		"location":      location,
		"owner":         a.OwnerName,
		"status":        a.AssetStatusName,
		"value":         a.AssetValue,
		"lastChecked":   lastChecked,
		"isCheck":       a.IsCheck,
	}
}

// ---------------------------------------------------------------------------
// Audit handlers
// ---------------------------------------------------------------------------

func (h *Handler) AuditReportSummary(w http.ResponseWriter, r *http.Request) {
	orgID, ok := h.orgFromRoute(w, r, "orgID")
	if !ok {
		return
	}
	assets := loadAuditAssets(r.Context(), h, orgID)
	writeJSON(w, http.StatusOK, map[string]any{"data": auditSummaryPayload(aggregateAudit(assets))})
}

func (h *Handler) AuditReportStatus(w http.ResponseWriter, r *http.Request) {
	orgID, ok := h.orgFromRoute(w, r, "orgID")
	if !ok {
		return
	}
	assets := loadAuditAssets(r.Context(), h, orgID)
	writeJSON(w, http.StatusOK, map[string]any{"data": auditStatusPayload(aggregateAudit(assets))})
}

func (h *Handler) AuditReportJobs(w http.ResponseWriter, r *http.Request) {
	orgID, ok := h.orgFromRoute(w, r, "orgID")
	if !ok {
		return
	}
	ongoing, _ := h.store.ListAuditJobs(r.Context(), orgID, "ongoing")
	history, _ := h.store.ListAuditJobs(r.Context(), orgID, "completed")
	all := append([]store.Row{}, ongoing...)
	all = append(all, history...)
	sort.SliceStable(all, func(i, j int) bool {
		return all[i].CreatedAt.After(all[j].CreatedAt)
	})
	items := make([]map[string]any, 0, len(all))
	for _, row := range all {
		label := row.Title
		if label == "" {
			label = fmt.Sprintf("งานตรวจนับ #%d", row.ID)
		}
		var created any
		if !row.CreatedAt.IsZero() {
			created = row.CreatedAt.Format("2006-01-02")
		}
		items = append(items, map[string]any{
			"id":        row.ID,
			"title":     label,
			"label":     label,
			"name":      label,
			"status":    row.Status,
			"progress":  row.Value,
			"createdAt": created,
		})
	}
	writeJSON(w, http.StatusOK, map[string]any{"data": items, "total": len(items)})
}

// AuditReportAssets builds the handler for /audit/assets-{bucket}/{orgID}.
func (h *Handler) AuditReportAssets(bucket string) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		orgID, ok := h.orgFromRoute(w, r, "orgID")
		if !ok {
			return
		}
		assets := loadAuditAssets(r.Context(), h, orgID)
		filtered := filterAuditAssets(assets, bucket, r.URL.Query().Get("search"))
		page, pageSize := parsePageQuery(r)
		pageRows := paginate(filtered, page, pageSize)
		rows := make([]map[string]any, 0, len(pageRows))
		for _, a := range pageRows {
			rows = append(rows, auditAssetRow(a))
		}
		writeJSON(w, http.StatusOK, map[string]any{
			"data":     rows,
			"total":    len(filtered),
			"page":     page,
			"pageSize": pageSize,
		})
	}
}

func (h *Handler) AuditReportInitial(w http.ResponseWriter, r *http.Request) {
	orgID, ok := h.orgFromRoute(w, r, "orgID")
	if !ok {
		return
	}
	assets := loadAuditAssets(r.Context(), h, orgID)
	agg := aggregateAudit(assets)

	notChecked := filterAuditAssets(assets, "not_checked", "")
	page, pageSize := parsePageQuery(r)
	pageRows := paginate(notChecked, page, pageSize)
	rows := make([]map[string]any, 0, len(pageRows))
	for _, a := range pageRows {
		rows = append(rows, auditAssetRow(a))
	}

	ongoing, _ := h.store.ListAuditJobs(r.Context(), orgID, "ongoing")
	selected := make([]int64, 0, len(ongoing))
	for _, j := range ongoing {
		selected = append(selected, j.ID)
	}

	writeJSON(w, http.StatusOK, map[string]any{
		"data": map[string]any{
			"summary": auditSummaryPayload(agg),
			"status":  auditStatusPayload(agg),
			"assetsNotChecked": map[string]any{
				"data":     rows,
				"total":    len(notChecked),
				"page":     page,
				"pageSize": pageSize,
			},
			"selectedJobIds": selected,
		},
	})
}

// ---------------------------------------------------------------------------
// Personal aggregation
// ---------------------------------------------------------------------------

type personalAggregate struct {
	owned          int
	active         int
	pendingRepairs int
	totalValue     int64
	byStatus       map[string]int
	byCategory     map[string]int
}

func matchesOwner(a store.Asset, claimsName, claimsEmail string, userID int64) bool {
	if userID > 0 && a.UserID == userID {
		return true
	}
	owner := strings.ToLower(strings.TrimSpace(a.OwnerName))
	if owner == "" {
		return false
	}
	candidates := []string{claimsName, claimsEmail}
	for _, c := range candidates {
		c = strings.ToLower(strings.TrimSpace(c))
		if c != "" && (owner == c || strings.Contains(owner, c) || strings.Contains(c, owner)) {
			return true
		}
	}
	return false
}

func aggregatePersonal(assets []store.Asset, claimsName, claimsEmail string, userID int64) personalAggregate {
	out := personalAggregate{
		byStatus:   map[string]int{},
		byCategory: map[string]int{},
	}
	for _, a := range assets {
		if !matchesOwner(a, claimsName, claimsEmail, userID) {
			continue
		}
		out.owned++
		out.totalValue += a.AssetValue
		status := strings.TrimSpace(a.AssetStatusName)
		if status == "" {
			status = strings.TrimSpace(a.Status)
		}
		if status == "" {
			status = "ไม่ระบุสถานะ"
		}
		out.byStatus[status]++
		switch {
		case strings.Contains(status, "ใช้งาน"):
			out.active++
		case strings.Contains(status, "ซ่อม"):
			out.pendingRepairs++
		}
		cat := strings.TrimSpace(a.CategoryName)
		if cat == "" {
			cat = "ไม่ระบุหมวด"
		}
		out.byCategory[cat]++
	}
	return out
}

func categoryChartData(agg personalAggregate) []map[string]any {
	keys := make([]string, 0, len(agg.byCategory))
	for k := range agg.byCategory {
		keys = append(keys, k)
	}
	sort.SliceStable(keys, func(i, j int) bool {
		return agg.byCategory[keys[i]] > agg.byCategory[keys[j]]
	})
	out := make([]map[string]any, 0, len(keys))
	for _, k := range keys {
		out = append(out, map[string]any{
			"category": k,
			"label":    k,
			"value":    agg.byCategory[k],
		})
	}
	return out
}

func personalStatusChartData(agg personalAggregate) []map[string]any {
	keys := make([]string, 0, len(agg.byStatus))
	for k := range agg.byStatus {
		keys = append(keys, k)
	}
	sort.SliceStable(keys, func(i, j int) bool {
		return agg.byStatus[keys[i]] > agg.byStatus[keys[j]]
	})
	out := make([]map[string]any, 0, len(keys))
	for _, k := range keys {
		out = append(out, map[string]any{
			"status": k,
			"label":  k,
			"value":  agg.byStatus[k],
		})
	}
	return out
}

func loadPersonalAssets(ctx context.Context, h *Handler, orgID int64) []store.Asset {
	res, _ := h.store.ListAssetsPaged(ctx, orgID, 1, 5000, store.AssetFilter{})
	if res == nil {
		return nil
	}
	return res.Data
}

func resolveOwnerName(ctx context.Context, h *Handler, email string) string {
	if email == "" {
		return ""
	}
	if u, err := h.store.UserByEmail(ctx, email); err == nil && u != nil && u.DisplayName != "" {
		return u.DisplayName
	}
	return email
}

func (h *Handler) PersonalReportSummary(w http.ResponseWriter, r *http.Request) {
	claims, ok := claimsFromContext(r.Context())
	if !ok {
		writeError(w, http.StatusUnauthorized, "unauthorized")
		return
	}
	assets := loadPersonalAssets(r.Context(), h, claims.OrganizationID)
	name := resolveOwnerName(r.Context(), h, claims.Email)
	agg := aggregatePersonal(assets, name, claims.Email, claims.UserID)
	writeJSON(w, http.StatusOK, map[string]any{
		"data": map[string]any{
			"ownedAssets":    agg.owned,
			"totalAssets":    agg.owned,
			"activeAssets":   agg.active,
			"pendingRepairs": agg.pendingRepairs,
			"totalValue":     agg.totalValue,
		},
	})
}

func (h *Handler) PersonalReportStatus(w http.ResponseWriter, r *http.Request) {
	claims, ok := claimsFromContext(r.Context())
	if !ok {
		writeError(w, http.StatusUnauthorized, "unauthorized")
		return
	}
	assets := loadPersonalAssets(r.Context(), h, claims.OrganizationID)
	name := resolveOwnerName(r.Context(), h, claims.Email)
	agg := aggregatePersonal(assets, name, claims.Email, claims.UserID)
	writeJSON(w, http.StatusOK, map[string]any{"data": personalStatusChartData(agg)})
}

func (h *Handler) PersonalReportCategory(w http.ResponseWriter, r *http.Request) {
	claims, ok := claimsFromContext(r.Context())
	if !ok {
		writeError(w, http.StatusUnauthorized, "unauthorized")
		return
	}
	assets := loadPersonalAssets(r.Context(), h, claims.OrganizationID)
	name := resolveOwnerName(r.Context(), h, claims.Email)
	agg := aggregatePersonal(assets, name, claims.Email, claims.UserID)
	writeJSON(w, http.StatusOK, map[string]any{"data": categoryChartData(agg)})
}

func (h *Handler) PersonalReportAssets(w http.ResponseWriter, r *http.Request) {
	claims, ok := claimsFromContext(r.Context())
	if !ok {
		writeError(w, http.StatusUnauthorized, "unauthorized")
		return
	}
	assets := loadPersonalAssets(r.Context(), h, claims.OrganizationID)
	name := resolveOwnerName(r.Context(), h, claims.Email)
	mine := make([]store.Asset, 0, len(assets))
	for _, a := range assets {
		if matchesOwner(a, name, claims.Email, claims.UserID) {
			mine = append(mine, a)
		}
	}
	page, pageSize := parsePageQuery(r)
	pageRows := paginate(mine, page, pageSize)
	out := make([]map[string]any, 0, len(pageRows))
	for _, a := range pageRows {
		out = append(out, toCompatAsset(a))
	}
	writeJSON(w, http.StatusOK, map[string]any{
		"data": map[string]any{
			"data":     out,
			"total":    len(mine),
			"page":     page,
			"pageSize": pageSize,
		},
	})
}

// auditTimeFormat is exported for tests that may want to parse the response.
var auditTimeFormat = time.RFC3339
