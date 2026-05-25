package api

import (
	"encoding/json"
	"net/http"
	"strconv"

	"github.com/go-chi/chi/v5"
	"github.com/vizzelintel/vizzel-track-demo-boss/vizzel-go-app/internal/store"
)

func (h *Handler) GetAsset(w http.ResponseWriter, r *http.Request) {
	orgID, ok := orgIDFromRequest(r)
	if !ok {
		writeError(w, http.StatusUnauthorized, "unauthorized")
		return
	}
	id, _ := strconv.ParseInt(chi.URLParam(r, "id"), 10, 64)
	a, err := h.store.GetAsset(r.Context(), orgID, id)
	if err != nil {
		writeError(w, http.StatusNotFound, "not found")
		return
	}
	writeJSON(w, http.StatusOK, a)
}

func (h *Handler) CreateAsset(w http.ResponseWriter, r *http.Request) {
	orgID, ok := orgIDFromRequest(r)
	if !ok {
		writeError(w, http.StatusUnauthorized, "unauthorized")
		return
	}
	var in store.AssetInput
	if err := json.NewDecoder(r.Body).Decode(&in); err != nil {
		writeError(w, http.StatusBadRequest, "invalid json")
		return
	}
	a, err := h.store.CreateAsset(r.Context(), orgID, in)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "create failed")
		return
	}
	writeJSON(w, http.StatusCreated, a)
}

func (h *Handler) UpdateAsset(w http.ResponseWriter, r *http.Request) {
	orgID, ok := orgIDFromRequest(r)
	if !ok {
		writeError(w, http.StatusUnauthorized, "unauthorized")
		return
	}
	id, _ := strconv.ParseInt(chi.URLParam(r, "id"), 10, 64)
	var in store.AssetInput
	if err := json.NewDecoder(r.Body).Decode(&in); err != nil {
		writeError(w, http.StatusBadRequest, "invalid json")
		return
	}
	if err := h.store.UpdateAsset(r.Context(), orgID, id, in); err != nil {
		writeError(w, http.StatusInternalServerError, "update failed")
		return
	}
	writeJSON(w, http.StatusOK, map[string]string{"status": "ok"})
}

func (h *Handler) DeleteAsset(w http.ResponseWriter, r *http.Request) {
	orgID, ok := orgIDFromRequest(r)
	if !ok {
		writeError(w, http.StatusUnauthorized, "unauthorized")
		return
	}
	id, _ := strconv.ParseInt(chi.URLParam(r, "id"), 10, 64)
	if err := h.store.DeleteAsset(r.Context(), orgID, id); err != nil {
		writeError(w, http.StatusInternalServerError, "delete failed")
		return
	}
	writeJSON(w, http.StatusOK, map[string]string{"status": "ok"})
}

func (h *Handler) ExportAssets(w http.ResponseWriter, r *http.Request) {
	orgID, ok := orgIDFromRequest(r)
	if !ok {
		writeError(w, http.StatusUnauthorized, "unauthorized")
		return
	}
	f := store.AssetFilter{Search: r.URL.Query().Get("search"), StatusName: r.URL.Query().Get("status")}
	if v, err := strconv.ParseInt(r.URL.Query().Get("category_id"), 10, 64); err == nil {
		f.CategoryID = v
	}
	data, err := h.store.ExportAssetsCSV(r.Context(), orgID, f)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "export failed")
		return
	}
	w.Header().Set("Content-Type", "text/csv; charset=utf-8")
	w.Header().Set("Content-Disposition", "attachment; filename=assets.csv")
	w.Write(data)
}

func (h *Handler) ListAssetTypes(w http.ResponseWriter, r *http.Request) {
	orgID, ok := orgIDFromRequest(r)
	if !ok {
		writeError(w, http.StatusUnauthorized, "unauthorized")
		return
	}
	catID, _ := strconv.ParseInt(r.URL.Query().Get("category_id"), 10, 64)
	rows, err := h.store.ListAssetTypes(r.Context(), orgID, catID)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "list failed")
		return
	}
	writeJSON(w, http.StatusOK, map[string]any{"data": rows})
}

func (h *Handler) ListAssetClassesFiltered(w http.ResponseWriter, r *http.Request) {
	orgID, ok := orgIDFromRequest(r)
	if !ok {
		writeError(w, http.StatusUnauthorized, "unauthorized")
		return
	}
	typeID, _ := strconv.ParseInt(r.URL.Query().Get("type_id"), 10, 64)
	rows, err := h.store.ListAssetClasses(r.Context(), orgID, typeID)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "list failed")
		return
	}
	writeJSON(w, http.StatusOK, map[string]any{"data": rows})
}

func (h *Handler) EntityCreate(w http.ResponseWriter, r *http.Request) {
	orgID, ok := orgIDFromRequest(r)
	if !ok {
		writeError(w, http.StatusUnauthorized, "unauthorized")
		return
	}
	kind := chi.URLParam(r, "kind")
	var body struct {
		Name     string `json:"name"`
		ParentID int64  `json:"parent_id"`
	}
	if err := json.NewDecoder(r.Body).Decode(&body); err != nil || body.Name == "" {
		writeError(w, http.StatusBadRequest, "name required")
		return
	}
	id, err := h.store.EntityCreate(r.Context(), kind, orgID, body.Name, body.ParentID)
	if err != nil {
		writeError(w, http.StatusBadRequest, err.Error())
		return
	}
	writeJSON(w, http.StatusCreated, map[string]any{"id": id})
}

func (h *Handler) EntityUpdate(w http.ResponseWriter, r *http.Request) {
	orgID, ok := orgIDFromRequest(r)
	if !ok {
		writeError(w, http.StatusUnauthorized, "unauthorized")
		return
	}
	kind := chi.URLParam(r, "kind")
	id, _ := strconv.ParseInt(chi.URLParam(r, "id"), 10, 64)
	var body struct {
		Name string `json:"name"`
	}
	if err := json.NewDecoder(r.Body).Decode(&body); err != nil || body.Name == "" {
		writeError(w, http.StatusBadRequest, "name required")
		return
	}
	if err := h.store.EntityUpdate(r.Context(), kind, orgID, id, body.Name); err != nil {
		writeError(w, http.StatusInternalServerError, "update failed")
		return
	}
	writeJSON(w, http.StatusOK, map[string]string{"status": "ok"})
}

func (h *Handler) EntityDelete(w http.ResponseWriter, r *http.Request) {
	orgID, ok := orgIDFromRequest(r)
	if !ok {
		writeError(w, http.StatusUnauthorized, "unauthorized")
		return
	}
	kind := chi.URLParam(r, "kind")
	id, _ := strconv.ParseInt(chi.URLParam(r, "id"), 10, 64)
	if err := h.store.EntityDelete(r.Context(), kind, orgID, id); err != nil {
		writeError(w, http.StatusInternalServerError, "delete failed")
		return
	}
	writeJSON(w, http.StatusOK, map[string]string{"status": "ok"})
}

func (h *Handler) ListInstitutes(w http.ResponseWriter, r *http.Request) {
	h.listModule(w, r, func(orgID int64) ([]store.Row, error) {
		return h.store.ListInstitutes(r.Context(), orgID)
	})
}

func (h *Handler) ListSections(w http.ResponseWriter, r *http.Request) {
	h.listModule(w, r, func(orgID int64) ([]store.Row, error) {
		return h.store.ListSections(r.Context(), orgID)
	})
}

func (h *Handler) ListPositions(w http.ResponseWriter, r *http.Request) {
	h.listModule(w, r, func(orgID int64) ([]store.Row, error) {
		return h.store.ListPositions(r.Context(), orgID)
	})
}

func (h *Handler) GetAuditJob(w http.ResponseWriter, r *http.Request) {
	orgID, ok := orgIDFromRequest(r)
	if !ok {
		writeError(w, http.StatusUnauthorized, "unauthorized")
		return
	}
	id, _ := strconv.ParseInt(chi.URLParam(r, "id"), 10, 64)
	row, err := h.store.GetAuditJob(r.Context(), orgID, id)
	if err != nil || row == nil {
		writeError(w, http.StatusNotFound, "not found")
		return
	}
	writeJSON(w, http.StatusOK, row)
}

func (h *Handler) ListWithdrawalsFiltered(w http.ResponseWriter, r *http.Request) {
	orgID, ok := orgIDFromRequest(r)
	if !ok {
		writeError(w, http.StatusUnauthorized, "unauthorized")
		return
	}
	rows, err := h.store.ListWithdrawals(r.Context(), orgID, r.URL.Query().Get("status"))
	if err != nil {
		writeError(w, http.StatusInternalServerError, "list failed")
		return
	}
	writeJSON(w, http.StatusOK, map[string]any{"data": rows})
}

func (h *Handler) DashboardExtended(w http.ResponseWriter, r *http.Request) {
	orgID, ok := orgIDFromRequest(r)
	if !ok {
		writeError(w, http.StatusUnauthorized, "unauthorized")
		return
	}
	d, err := h.store.DashboardExtended(r.Context(), orgID)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "dashboard failed")
		return
	}
	writeJSON(w, http.StatusOK, d)
}

func (h *Handler) PersonalDashboard(w http.ResponseWriter, r *http.Request) {
	claims, ok := claimsFromContext(r.Context())
	if !ok {
		writeError(w, http.StatusUnauthorized, "unauthorized")
		return
	}
	name := claims.Email
	if u, err := h.store.UserByEmail(r.Context(), claims.Email); err == nil {
		name = u.DisplayName
	}
	d, err := h.store.PersonalDashboard(r.Context(), claims.OrganizationID, name)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "dashboard failed")
		return
	}
	writeJSON(w, http.StatusOK, d)
}

func (h *Handler) SuperAdminStats(w http.ResponseWriter, r *http.Request) {
	claims, ok := claimsFromContext(r.Context())
	if !ok || claims.RoleID != 1 {
		writeError(w, http.StatusForbidden, "super admin only")
		return
	}
	d, err := h.store.SuperAdminStats(r.Context())
	if err != nil {
		writeError(w, http.StatusInternalServerError, "stats failed")
		return
	}
	writeJSON(w, http.StatusOK, d)
}

func (h *Handler) ListMenuToggles(w http.ResponseWriter, r *http.Request) {
	orgID, ok := orgIDFromRequest(r)
	if !ok {
		writeError(w, http.StatusUnauthorized, "unauthorized")
		return
	}
	rows, err := h.store.ListMenuToggles(r.Context(), orgID)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "menus failed")
		return
	}
	writeJSON(w, http.StatusOK, map[string]any{"data": rows})
}

func (h *Handler) SetOrgMenu(w http.ResponseWriter, r *http.Request) {
	claims, ok := claimsFromContext(r.Context())
	if !ok || claims.RoleID != 1 {
		writeError(w, http.StatusForbidden, "super admin only")
		return
	}
	var body struct {
		OrgID   int64 `json:"organization_id"`
		MenuID  int   `json:"menu_id"`
		Enabled bool  `json:"enabled"`
	}
	if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
		writeError(w, http.StatusBadRequest, "invalid json")
		return
	}
	orgID := body.OrgID
	if orgID == 0 {
		orgID = claims.OrganizationID
	}
	if err := h.store.SetOrgMenu(r.Context(), orgID, body.MenuID, body.Enabled); err != nil {
		writeError(w, http.StatusInternalServerError, "update failed")
		return
	}
	writeJSON(w, http.StatusOK, map[string]string{"status": "ok"})
}

func (h *Handler) ListOrgAccess(w http.ResponseWriter, r *http.Request) {
	claims, ok := claimsFromContext(r.Context())
	if !ok || claims.RoleID != 1 {
		writeError(w, http.StatusForbidden, "super admin only")
		return
	}
	rows, err := h.store.ListOrgAccess(r.Context())
	if err != nil {
		writeError(w, http.StatusInternalServerError, "list failed")
		return
	}
	writeJSON(w, http.StatusOK, map[string]any{"data": rows})
}

func (h *Handler) CreateOrgAccess(w http.ResponseWriter, r *http.Request) {
	claims, ok := claimsFromContext(r.Context())
	if !ok || claims.RoleID != 1 {
		writeError(w, http.StatusForbidden, "super admin only")
		return
	}
	var body struct {
		UserID         int64 `json:"user_id"`
		OrganizationID int64 `json:"organization_id"`
		RoleID         int   `json:"role_id"`
	}
	if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
		writeError(w, http.StatusBadRequest, "invalid json")
		return
	}
	if err := h.store.CreateOrgAccess(r.Context(), body.UserID, body.OrganizationID, body.RoleID); err != nil {
		writeError(w, http.StatusInternalServerError, "create failed")
		return
	}
	writeJSON(w, http.StatusCreated, map[string]string{"status": "ok"})
}

func (h *Handler) DeleteOrgAccess(w http.ResponseWriter, r *http.Request) {
	claims, ok := claimsFromContext(r.Context())
	if !ok || claims.RoleID != 1 {
		writeError(w, http.StatusForbidden, "super admin only")
		return
	}
	id, _ := strconv.ParseInt(chi.URLParam(r, "id"), 10, 64)
	if err := h.store.DeleteOrgAccess(r.Context(), id); err != nil {
		writeError(w, http.StatusInternalServerError, "delete failed")
		return
	}
	writeJSON(w, http.StatusOK, map[string]string{"status": "ok"})
}

func (h *Handler) CreateOrganization(w http.ResponseWriter, r *http.Request) {
	claims, ok := claimsFromContext(r.Context())
	if !ok || claims.RoleID != 1 {
		writeError(w, http.StatusForbidden, "super admin only")
		return
	}
	var body struct {
		Name string `json:"name"`
	}
	if err := json.NewDecoder(r.Body).Decode(&body); err != nil || body.Name == "" {
		writeError(w, http.StatusBadRequest, "name required")
		return
	}
	row, err := h.store.CreateOrganization(r.Context(), body.Name)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "create failed")
		return
	}
	writeJSON(w, http.StatusCreated, row)
}

func (h *Handler) DeleteOrganization(w http.ResponseWriter, r *http.Request) {
	claims, ok := claimsFromContext(r.Context())
	if !ok || claims.RoleID != 1 {
		writeError(w, http.StatusForbidden, "super admin only")
		return
	}
	id, _ := strconv.ParseInt(chi.URLParam(r, "id"), 10, 64)
	if err := h.store.DeleteOrganization(r.Context(), id); err != nil {
		writeError(w, http.StatusBadRequest, err.Error())
		return
	}
	writeJSON(w, http.StatusOK, map[string]string{"status": "ok"})
}

func (h *Handler) PatchWithdrawalStatus(w http.ResponseWriter, r *http.Request) {
	orgID, ok := orgIDFromRequest(r)
	if !ok {
		writeError(w, http.StatusUnauthorized, "unauthorized")
		return
	}
	id, _ := strconv.ParseInt(chi.URLParam(r, "id"), 10, 64)
	var body struct {
		Status string `json:"status"`
	}
	_ = json.NewDecoder(r.Body).Decode(&body)
	_ = h.store.UpdateWithdrawalStatus(r.Context(), orgID, id, body.Status)
	writeJSON(w, http.StatusOK, map[string]string{"status": "ok"})
}
