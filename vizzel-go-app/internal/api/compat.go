package api

import (
	"encoding/json"
	"net/http"
	"strconv"

	"github.com/go-chi/chi/v5"
	"github.com/vizzelintel/vizzel-track-demo-boss/vizzel-go-app/internal/store"
)

// MountProductionRoutes exposes NestJS-compatible paths (no /api/v1 prefix). Requires JWT.
func MountProductionRoutes(r chi.Router, h *Handler) {
	r.Get("/asset/initial-data/{orgID}/{page}/{pageSize}", h.CompatAssetInitialData)
	r.Get("/asset/get/{orgID}/{page}/{pageSize}", h.CompatAssetList)
	r.Get("/asset/get_one/{assetID}", h.CompatAssetOne)
	r.Post("/asset/create", h.CompatAssetCreate)
	r.Patch("/asset/update/{assetID}", h.CompatAssetUpdate)
	r.Patch("/asset/delete/{assetID}", h.CompatAssetDelete)
	r.Patch("/asset/bulk-delete", h.CompatAssetBulkDelete)
	r.Get("/asset/template", h.AssetTemplate)
	r.Post("/asset/export", h.CompatAssetExport)
	r.Post("/asset/import", h.AssetImport)
	r.Get("/asset/category/get_all", h.CompatCategories)
	r.Get("/asset/type/get_all", h.CompatTypes)
	r.Get("/asset/class/get_all", h.CompatClasses)
	r.Get("/asset/structure/template", h.StructureTemplate)
	r.Post("/asset/structure/export", h.StructureExport)
	r.Post("/asset/structure/import", h.StructureImport)

	r.Get("/dashboard/summary/{orgID}", h.CompatDashboardSummary)
	r.Get("/dashboard/extended/{orgID}", h.CompatDashboardExtended)
	r.Get("/dashboard/trend/{orgID}", h.CompatDashboardTrend)
	r.Get("/dashboard/status/{orgID}", h.CompatDashboardStatus)
	r.Get("/dashboard/location/{orgID}", h.CompatDashboardLocation)
	r.Get("/dashboard/personal/summary", h.PersonalDashboard)
	r.Get("/dashboard/personal/initial-data", h.PersonalDashboard)
	r.Get("/dashboard/repair/initial-data", h.RepairDashboard)
	r.Get("/warranty/initial-data/{orgID}", h.WarrantyInitialData)
	r.Get("/warranty/summary/{orgID}", h.WarrantySummary)

	r.Get("/audit/initial-data/{orgID}", h.AuditInitialData)
	r.Get("/audit/job-detail/{jobID}", h.CompatAuditJob)
	r.Get("/checkJob/list/get/{orgID}", h.ListAuditOngoing)

	r.Get("/withdrawal/dashboard-stats/{orgID}", h.WithdrawalDashboardStats)
	r.Get("/user/initial-data/{orgID}", h.UserInitialData)
	r.Get("/organization/initial-data/{orgID}", h.OrgInitialData)
	r.Get("/facility/building/get", h.ListBuildings)
	r.Get("/superAdmin/dashboard/overview", h.SuperAdminStats)
}

func orgIDFromQueryOrClaims(r *http.Request) (int64, bool) {
	if id, err := strconv.ParseInt(r.URL.Query().Get("organizationID"), 10, 64); err == nil && id > 0 {
		return id, true
	}
	return orgIDFromRequest(r)
}

func (h *Handler) CompatAssetInitialData(w http.ResponseWriter, r *http.Request) {
	orgID, _ := strconv.ParseInt(chi.URLParam(r, "orgID"), 10, 64)
	page, _ := strconv.Atoi(chi.URLParam(r, "page"))
	pageSize, _ := strconv.Atoi(chi.URLParam(r, "pageSize"))
	claims, ok := claimsFromContext(r.Context())
	if !ok {
		writeError(w, http.StatusUnauthorized, "unauthorized")
		return
	}
	if orgID == 0 {
		orgID = claims.OrganizationID
	}
	ref, _ := h.store.AssetReferenceData(r.Context(), orgID)
	result, _ := h.store.ListAssetsPaged(r.Context(), orgID, page, pageSize, store.AssetFilter{})
	writeJSON(w, http.StatusOK, map[string]any{
		"data":           result.Data,
		"total":          result.Total,
		"page":           result.Page,
		"pageSize":       result.PageSize,
		"categories":     ref.Categories,
		"types":          ref.Types,
		"classes":        ref.Classes,
		"statuses":       ref.Statuses,
		"referenceData":  ref,
	})
}

func (h *Handler) CompatAssetList(w http.ResponseWriter, r *http.Request) {
	orgID, _ := strconv.ParseInt(chi.URLParam(r, "orgID"), 10, 64)
	page, _ := strconv.Atoi(chi.URLParam(r, "page"))
	pageSize, _ := strconv.Atoi(chi.URLParam(r, "pageSize"))
	claims, ok := claimsFromContext(r.Context())
	if !ok {
		writeError(w, http.StatusUnauthorized, "unauthorized")
		return
	}
	if orgID == 0 {
		orgID = claims.OrganizationID
	}
	f := store.AssetFilter{
		Search:     r.URL.Query().Get("search"),
		StatusName: r.URL.Query().Get("status"),
	}
	if v, err := strconv.ParseInt(r.URL.Query().Get("categoryID"), 10, 64); err == nil {
		f.CategoryID = v
	}
	if v, err := strconv.ParseInt(r.URL.Query().Get("assetClassID"), 10, 64); err == nil {
		f.ClassID = v
	}
	result, err := h.store.ListAssetsPaged(r.Context(), orgID, page, pageSize, f)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "list failed")
		return
	}
	writeJSON(w, http.StatusOK, map[string]any{"data": result.Data, "total": result.Total})
}

func (h *Handler) CompatAssetOne(w http.ResponseWriter, r *http.Request) {
	claims, ok := claimsFromContext(r.Context())
	if !ok {
		writeError(w, http.StatusUnauthorized, "unauthorized")
		return
	}
	id, _ := strconv.ParseInt(chi.URLParam(r, "assetID"), 10, 64)
	a, err := h.store.GetAsset(r.Context(), claims.OrganizationID, id)
	if err != nil {
		writeError(w, http.StatusNotFound, "not found")
		return
	}
	writeJSON(w, http.StatusOK, a)
}

func (h *Handler) CompatAssetCreate(w http.ResponseWriter, r *http.Request) {
	claims, ok := claimsFromContext(r.Context())
	if !ok {
		writeError(w, http.StatusUnauthorized, "unauthorized")
		return
	}
	var in store.AssetInput
	if err := json.NewDecoder(r.Body).Decode(&in); err != nil {
		writeError(w, http.StatusBadRequest, "invalid json")
		return
	}
	a, err := h.store.CreateAsset(r.Context(), claims.OrganizationID, in)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "create failed")
		return
	}
	writeJSON(w, http.StatusOK, a)
}

func (h *Handler) CompatAssetUpdate(w http.ResponseWriter, r *http.Request) {
	claims, ok := claimsFromContext(r.Context())
	if !ok {
		writeError(w, http.StatusUnauthorized, "unauthorized")
		return
	}
	id, _ := strconv.ParseInt(chi.URLParam(r, "assetID"), 10, 64)
	var in store.AssetInput
	if err := json.NewDecoder(r.Body).Decode(&in); err != nil {
		writeError(w, http.StatusBadRequest, "invalid json")
		return
	}
	if err := h.store.UpdateAsset(r.Context(), claims.OrganizationID, id, in); err != nil {
		writeError(w, http.StatusInternalServerError, "update failed")
		return
	}
	writeJSON(w, http.StatusOK, map[string]string{"status": "ok"})
}

func (h *Handler) CompatAssetDelete(w http.ResponseWriter, r *http.Request) {
	claims, ok := claimsFromContext(r.Context())
	if !ok {
		writeError(w, http.StatusUnauthorized, "unauthorized")
		return
	}
	id, _ := strconv.ParseInt(chi.URLParam(r, "assetID"), 10, 64)
	_ = h.store.DeleteAsset(r.Context(), claims.OrganizationID, id)
	writeJSON(w, http.StatusOK, map[string]string{"status": "ok"})
}

func (h *Handler) CompatAssetBulkDelete(w http.ResponseWriter, r *http.Request) {
	claims, ok := claimsFromContext(r.Context())
	if !ok {
		writeError(w, http.StatusUnauthorized, "unauthorized")
		return
	}
	var body struct {
		AssetIDs []int64 `json:"assetIDs"`
	}
	_ = json.NewDecoder(r.Body).Decode(&body)
	for _, id := range body.AssetIDs {
		_ = h.store.DeleteAsset(r.Context(), claims.OrganizationID, id)
	}
	writeJSON(w, http.StatusOK, map[string]any{"deleted": len(body.AssetIDs)})
}

func (h *Handler) CompatAssetExport(w http.ResponseWriter, r *http.Request) {
	h.ExportAssets(w, r)
}

func (h *Handler) CompatCategories(w http.ResponseWriter, r *http.Request) {
	h.ListAssetCategories(w, r)
}

func (h *Handler) CompatTypes(w http.ResponseWriter, r *http.Request) {
	h.ListAssetTypes(w, r)
}

func (h *Handler) CompatClasses(w http.ResponseWriter, r *http.Request) {
	h.ListAssetClassesFiltered(w, r)
}

func (h *Handler) CompatDashboardSummary(w http.ResponseWriter, r *http.Request) {
	orgID, _ := strconv.ParseInt(chi.URLParam(r, "orgID"), 10, 64)
	claims, ok := claimsFromContext(r.Context())
	if !ok {
		writeError(w, http.StatusUnauthorized, "unauthorized")
		return
	}
	if orgID == 0 {
		orgID = claims.OrganizationID
	}
	ext, err := h.store.DashboardExtended(r.Context(), orgID)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "failed")
		return
	}
	writeJSON(w, http.StatusOK, map[string]any{
		"totalAssetValue":         ext.TotalAssetValue,
		"accumulatedDepreciation": ext.AccumulatedDepreciation,
		"netBookValue":            ext.NetBookValue,
		"totalAssets":             ext.TotalAssets,
		"newAssetsThisYear":       ext.NewAssetsThisYear,
	})
}

func (h *Handler) CompatDashboardExtended(w http.ResponseWriter, r *http.Request) {
	orgID, _ := strconv.ParseInt(chi.URLParam(r, "orgID"), 10, 64)
	claims, ok := claimsFromContext(r.Context())
	if !ok {
		writeError(w, http.StatusUnauthorized, "unauthorized")
		return
	}
	if orgID == 0 {
		orgID = claims.OrganizationID
	}
	d, err := h.store.DashboardExtended(r.Context(), orgID)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "failed")
		return
	}
	writeJSON(w, http.StatusOK, d)
}

func (h *Handler) CompatDashboardTrend(w http.ResponseWriter, r *http.Request) {
	h.CompatDashboardExtended(w, r)
}

func (h *Handler) CompatDashboardStatus(w http.ResponseWriter, r *http.Request) {
	orgID, _ := strconv.ParseInt(chi.URLParam(r, "orgID"), 10, 64)
	claims, ok := claimsFromContext(r.Context())
	if !ok {
		writeError(w, http.StatusUnauthorized, "unauthorized")
		return
	}
	if orgID == 0 {
		orgID = claims.OrganizationID
	}
	d, _ := h.store.DashboardExtended(r.Context(), orgID)
	writeJSON(w, http.StatusOK, d.StatusBreakdown)
}

func (h *Handler) CompatDashboardLocation(w http.ResponseWriter, r *http.Request) {
	orgID, _ := strconv.ParseInt(chi.URLParam(r, "orgID"), 10, 64)
	claims, ok := claimsFromContext(r.Context())
	if !ok {
		writeError(w, http.StatusUnauthorized, "unauthorized")
		return
	}
	if orgID == 0 {
		orgID = claims.OrganizationID
	}
	d, _ := h.store.DashboardExtended(r.Context(), orgID)
	writeJSON(w, http.StatusOK, d.LocationBreakdown)
}

func (h *Handler) CompatAuditJob(w http.ResponseWriter, r *http.Request) {
	jobID := chi.URLParam(r, "jobID")
	id, _ := strconv.ParseInt(jobID, 10, 64)
	claims, ok := claimsFromContext(r.Context())
	if !ok {
		writeError(w, http.StatusUnauthorized, "unauthorized")
		return
	}
	row, err := h.store.GetAuditJob(r.Context(), claims.OrganizationID, id)
	if err != nil {
		writeError(w, http.StatusNotFound, "not found")
		return
	}
	writeJSON(w, http.StatusOK, row)
}
