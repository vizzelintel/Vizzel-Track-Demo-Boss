package api

import (
	"context"
	"encoding/json"
	"fmt"
	"net/http"
	"strconv"
	"strings"

	"github.com/go-chi/chi/v5"
	"github.com/vizzelintel/vizzel-track-demo-boss/vizzel-go-app/internal/notify"
	"github.com/vizzelintel/vizzel-track-demo-boss/vizzel-go-app/internal/store"
)

// MountProductionRoutes exposes NestJS-compatible paths (no /api/v1 prefix). Requires JWT.
func MountProductionRoutes(r chi.Router, h *Handler) {
	r.Get("/asset/initial-data/{orgID}/{page}/{pageSize}", h.CompatAssetInitialData)
	r.Get("/asset/get/{orgID}/{page}/{pageSize}", h.CompatAssetList)
	r.Get("/asset/get_one/{assetID}", h.CompatAssetOne)
	r.With(h.RequirePermission("assets", "edit")).Post("/asset/create", h.CompatAssetCreate)
	r.With(h.RequirePermission("assets", "edit")).Patch("/asset/update/{assetID}", h.CompatAssetUpdate)
	r.With(h.RequirePermission("assets", "delete")).Patch("/asset/delete/{assetID}", h.CompatAssetDelete)
	r.With(h.RequirePermission("assets", "delete")).Patch("/asset/bulk-delete", h.CompatAssetBulkDelete)
	r.Get("/asset/template", h.AssetTemplate)
	r.Post("/asset/export", h.CompatAssetExport)
	r.With(h.RequirePermission("assets", "edit")).Post("/asset/import", h.AssetImport)
	r.With(h.RequirePermission("assets", "edit")).Post("/asset/import/convert-elaas", h.ConvertElaasImport)
	r.Get("/asset/category/get_all", h.CompatCategories)
	r.Get("/asset/type/get_all", h.CompatTypes)
	r.Get("/asset/class/get_all", h.CompatClasses)
	r.Get("/asset/structure/template", h.StructureTemplate)
	r.Post("/asset/structure/export", h.StructureExport)
	r.Post("/asset/structure/import", h.StructureImport)

	r.Get("/dashboard/summary/{orgID}", h.CompatDashboardSummaryWrapped)
	r.Get("/dashboard/extended/{orgID}", h.CompatDashboardExtended)
	r.Get("/dashboard/trend/{orgID}", h.CompatDashboardTrendWrapped)
	r.Get("/dashboard/status/{orgID}", h.CompatDashboardStatusWrapped)
	r.Get("/dashboard/location/{orgID}", h.CompatDashboardLocationWrapped)
	r.Get("/dashboard/value-history/{orgID}", h.CompatDashboardValueHistory)
	r.Get("/dashboard/depreciation/{orgID}", h.CompatDashboardDepreciation)
	r.Get("/dashboard/new-assets/{orgID}", h.CompatDashboardNewAssets)
	r.Get("/dashboard/personal/summary", h.CompatPersonalSummary)
	r.Get("/dashboard/personal/status", h.CompatPersonalStatus)
	r.Get("/dashboard/personal/category", h.CompatPersonalCategory)
	r.Get("/dashboard/personal/assets", h.CompatPersonalAssets)
	r.Get("/dashboard/personal/initial-data", h.PersonalDashboard)
	r.Get("/dashboard/repair/initial-data", h.CompatRepairInitialData)
	r.Get("/dashboard/repair/monthly", h.CompatRepairMonthly)
	r.Get("/asset/component/get/{assetID}", h.GetAssetComponents)
	r.Post("/asset/component/create", h.CreateAssetComponent)
	r.Patch("/asset/component/update/{componentID}", h.UpdateAssetComponent)
	r.Delete("/asset/component/delete/{componentID}", h.DeleteAssetComponent)
	r.Post("/asset/component/bulk-replace/{assetID}", h.BulkReplaceAssetComponents)
	r.Post("/asset/scan/resolve", h.ResolveScannedRFIDs)
	r.Get("/asset/doc/get/{assetID}", h.CompatAssetDocGet)
	r.Post("/asset/doc/create", h.CompatAssetDocCreate)
	r.Patch("/asset/doc/delete", h.CompatAssetDocDelete)
	r.Get("/asset/doc/class/doc/get/{classID}", h.CompatAssetClassDocGet)
	r.Get("/checkJob/history/{assetID}", h.CompatCheckJobHistory)
	r.Post("/asset/depreciation/create", h.CompatDepreciationCreate)
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

	r.Get("/notification/list", h.ListNotifications)
	r.Get("/notification/unread-count", h.UnreadCountNotifications)
	r.Patch("/notification/read/{id}", h.MarkNotificationRead)
	r.Patch("/notification/read-all", h.MarkAllNotificationsRead)
	r.Post("/notification/test-ping", h.NotificationTestPing)

	r.Get("/notification-channel/list", h.ListNotificationChannels)
	r.Post("/notification-channel/create", h.CreateNotificationChannel)
	r.Patch("/notification-channel/update/{id}", h.UpdateNotificationChannel)
	r.Delete("/notification-channel/delete/{id}", h.DeleteNotificationChannel)
	r.Post("/notification-channel/test/{id}", h.TestNotificationChannel)

	MountCompatExtended(r, h)
}

func orgIDFromQueryOrClaims(r *http.Request) (int64, bool) {
	if id, err := strconv.ParseInt(r.URL.Query().Get("organizationID"), 10, 64); err == nil && id > 0 {
		return id, true
	}
	return orgIDFromRequest(r)
}

func (h *Handler) buildCompatReference(ctx context.Context, orgID int64) map[string]any {
	ref, _ := h.store.AssetReferenceData(ctx, orgID)
	if ref == nil {
		ref = &store.AssetReferenceData{}
	}
	cats := make([]map[string]any, 0, len(ref.Categories))
	for _, r := range ref.Categories {
		if rowIDValid(r) {
			cats = append(cats, rowToCategory(r))
		}
	}
	types := make([]map[string]any, 0, len(ref.Types))
	for _, r := range ref.Types {
		if rowIDValid(r) {
			types = append(types, rowToType(r))
		}
	}
	classes := make([]map[string]any, 0, len(ref.Classes))
	for _, r := range ref.Classes {
		if rowIDValid(r) {
			classes = append(classes, rowToClass(r))
		}
	}
	statuses := make([]map[string]any, 0, len(ref.Statuses))
	for _, r := range ref.Statuses {
		if rowIDValid(r) {
			statuses = append(statuses, rowToStatus(r))
		}
	}
	buildings, _ := h.store.ListBuildings(ctx, orgID)
	bld := make([]map[string]any, 0, len(buildings))
	for _, r := range buildings {
		if rowIDValid(r) {
			bld = append(bld, rowToBuilding(r))
		}
	}
	rooms, _ := h.store.ListRooms(ctx, orgID)
	rms := make([]map[string]any, 0, len(rooms))
	for _, r := range rooms {
		if rowIDValid(r) {
			rms = append(rms, rowToRoom(r))
		}
	}
	orgUsers, _ := h.store.ListOrgUsers(ctx, orgID)
	usr := orgUsersToMaps(orgUsers)
	depts, _ := h.store.ListDepartments(ctx, orgID)
	inst, _ := h.store.ListInstitutes(ctx, orgID)
	secs, _ := h.store.ListSections(ctx, orgID)
	return map[string]any{
		"categories":  cats,
		"types":       types,
		"classes":     classes,
		"statuses":    statuses,
		"buildings":   bld,
		"rooms":       rms,
		"users":       map[string]any{"data": usr, "total": len(usr)},
		"getBy":       lovRowsToMaps(mustLOV(h, ctx, true)),
		"sourceFund":  lovRowsToMaps(mustLOV(h, ctx, false)),
		"departments": departmentsToMaps(depts),
		"institutes":  rowsToNamed(inst, "institute_name"),
		"sections":    rowsToNamed(secs, "section_name"),
	}
}

func parseAssetListFilter(r *http.Request, orgID int64, storeInst store.Store) store.AssetFilter {
	f := store.AssetFilter{Search: r.URL.Query().Get("search")}
	if v := firstCSVInt(r.URL.Query().Get("categoryID")); v > 0 {
		f.CategoryID = v
	}
	if v := firstCSVInt(r.URL.Query().Get("assetTypeID")); v > 0 {
		f.TypeID = v
	}
	if v := firstCSVInt(r.URL.Query().Get("assetClassID")); v > 0 {
		f.ClassID = v
	}
	if sid := r.URL.Query().Get("assetStatusID"); sid != "" {
		if id, err := strconv.ParseInt(sid, 10, 64); err == nil {
			f.AssetStatusID = id
			ref, _ := storeInst.AssetReferenceData(r.Context(), orgID)
			if ref != nil {
				for _, st := range ref.Statuses {
					if st.ID == id {
						f.StatusName = st.Title
						break
					}
				}
			}
		}
	}
	if r.URL.Query().Get("include_children") == "1" || r.URL.Query().Get("includeChildren") == "true" {
		f.IncludeChildOrgs = true
	}
	return f
}

func firstCSVInt(s string) int64 {
	if s == "" {
		return 0
	}
	parts := strings.Split(s, ",")
	v, _ := strconv.ParseInt(strings.TrimSpace(parts[0]), 10, 64)
	return v
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
	refBundle := h.buildCompatReference(r.Context(), orgID)
	result, err := h.store.ListAssetsPaged(r.Context(), orgID, page, pageSize, store.AssetFilter{})
	if err != nil || result == nil {
		result = &store.AssetListResult{Data: []store.Asset{}, Total: 0}
	}
	writeJSON(w, http.StatusOK, map[string]any{
		"assets": map[string]any{
			"data":  toCompatAssets(result.Data),
			"total": result.Total,
		},
		"categories":  refBundle["categories"],
		"types":       refBundle["types"],
		"classes":     refBundle["classes"],
		"statuses":    refBundle["statuses"],
		"buildings":   refBundle["buildings"],
		"rooms":       refBundle["rooms"],
		"users":       refBundle["users"],
		"getBy":       refBundle["getBy"],
		"sourceFund":  refBundle["sourceFund"],
		"departments": refBundle["departments"],
		"institutes":  refBundle["institutes"],
		"sections":    refBundle["sections"],
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
	f := parseAssetListFilter(r, orgID, h.store)
	result, err := h.store.ListAssetsPaged(r.Context(), orgID, page, pageSize, f)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "list failed")
		return
	}
	writeJSON(w, http.StatusOK, map[string]any{"data": toCompatAssets(result.Data), "total": result.Total})
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
	writeJSON(w, http.StatusOK, map[string]any{"data": toCompatAsset(*a)})
}

func (h *Handler) CompatAssetCreate(w http.ResponseWriter, r *http.Request) {
	claims, ok := claimsFromContext(r.Context())
	if !ok {
		writeError(w, http.StatusUnauthorized, "unauthorized")
		return
	}
	in, err := decodeAssetInput(r)
	if err != nil {
		writeError(w, http.StatusBadRequest, "invalid json")
		return
	}
	h.enrichAssetInput(r.Context(), claims.OrganizationID, &in)
	a, err := h.store.CreateAsset(r.Context(), claims.OrganizationID, in)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "create failed")
		return
	}
	if h.dispatcher != nil {
		_ = h.dispatcher.Dispatch(r.Context(), notify.Event{
			OrganizationID: claims.OrganizationID,
			UserIDs:        []int64{claims.UserID},
			EventType:      "asset.created",
			Title:          "เพิ่มสินทรัพย์ใหม่",
			Body:           fmt.Sprintf("%s (%s)", a.AssetName, a.AssetNumber),
			Link:           fmt.Sprintf("/assets/list?id=%d", a.ID),
			RefType:        "asset",
			RefID:          a.ID,
		})
	}
	writeJSON(w, http.StatusOK, map[string]any{"data": toCompatAsset(*a)})
}

func (h *Handler) CompatAssetUpdate(w http.ResponseWriter, r *http.Request) {
	claims, ok := claimsFromContext(r.Context())
	if !ok {
		writeError(w, http.StatusUnauthorized, "unauthorized")
		return
	}
	id, _ := strconv.ParseInt(chi.URLParam(r, "assetID"), 10, 64)
	in, err := decodeAssetInput(r)
	if err != nil {
		writeError(w, http.StatusBadRequest, "invalid json")
		return
	}
	h.enrichAssetInput(r.Context(), claims.OrganizationID, &in)
	if err := h.store.UpdateAsset(r.Context(), claims.OrganizationID, id, in); err != nil {
		writeError(w, http.StatusInternalServerError, "update failed")
		return
	}
	if h.dispatcher != nil {
		title := in.AssetName
		if title == "" {
			title = in.AssetNumber
		}
		_ = h.dispatcher.Dispatch(r.Context(), notify.Event{
			OrganizationID: claims.OrganizationID,
			UserIDs:        []int64{claims.UserID},
			EventType:      "asset.updated",
			Title:          "อัปเดตข้อมูลสินทรัพย์",
			Body:           fmt.Sprintf("%s (%s)", title, in.AssetNumber),
			Link:           fmt.Sprintf("/assets/list?id=%d", id),
			RefType:        "asset",
			RefID:          id,
		})
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
	deleted := make([]int64, 0, len(body.AssetIDs))
	for _, id := range body.AssetIDs {
		if err := h.store.DeleteAsset(r.Context(), claims.OrganizationID, id); err == nil {
			deleted = append(deleted, id)
		}
	}
	writeJSON(w, http.StatusOK, map[string]any{"data": deleted, "errors": []any{}})
}

func (h *Handler) CompatAssetExport(w http.ResponseWriter, r *http.Request) {
	h.ExportAssets(w, r)
}

func (h *Handler) CompatCategories(w http.ResponseWriter, r *http.Request) {
	orgID, ok := orgIDFromQueryOrClaims(r)
	if !ok {
		writeError(w, http.StatusUnauthorized, "unauthorized")
		return
	}
	rows, err := h.store.ListAssetCategories(r.Context(), orgID)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "list failed")
		return
	}
	out := make([]map[string]any, 0, len(rows))
	for _, row := range rows {
		if rowIDValid(row) {
			out = append(out, rowToCategory(row))
		}
	}
	writeJSON(w, http.StatusOK, out)
}

func (h *Handler) CompatTypes(w http.ResponseWriter, r *http.Request) {
	orgID, ok := orgIDFromQueryOrClaims(r)
	if !ok {
		writeError(w, http.StatusUnauthorized, "unauthorized")
		return
	}
	catID := firstCSVInt(r.URL.Query().Get("categoryID"))
	rows, err := h.store.ListAssetTypes(r.Context(), orgID, catID)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "list failed")
		return
	}
	out := make([]map[string]any, 0, len(rows))
	for _, row := range rows {
		if rowIDValid(row) {
			out = append(out, rowToType(row))
		}
	}
	writeJSON(w, http.StatusOK, out)
}

func (h *Handler) CompatClasses(w http.ResponseWriter, r *http.Request) {
	orgID, ok := orgIDFromQueryOrClaims(r)
	if !ok {
		writeError(w, http.StatusUnauthorized, "unauthorized")
		return
	}
	typeID := firstCSVInt(r.URL.Query().Get("typeID"))
	rows, err := h.store.ListAssetClasses(r.Context(), orgID, typeID)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "list failed")
		return
	}
	out := make([]map[string]any, 0, len(rows))
	for _, row := range rows {
		if rowIDValid(row) {
			out = append(out, rowToClass(row))
		}
	}
	writeJSON(w, http.StatusOK, out)
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
