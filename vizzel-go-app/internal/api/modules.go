package api

import (
	"net/http"
	"strconv"

	"github.com/vizzelintel/vizzel-track-demo-boss/vizzel-go-app/internal/store"
)

func orgIDFromRequest(r *http.Request) (int64, bool) {
	claims, ok := claimsFromContext(r.Context())
	if !ok {
		return 0, false
	}
	return claims.OrganizationID, true
}

func (h *Handler) DashboardSummary(w http.ResponseWriter, r *http.Request) {
	orgID, ok := orgIDFromRequest(r)
	if !ok {
		writeError(w, http.StatusUnauthorized, "unauthorized")
		return
	}
	d, err := h.store.DashboardSummary(r.Context(), orgID)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "dashboard failed")
		return
	}
	writeJSON(w, http.StatusOK, d)
}

func (h *Handler) listModule(w http.ResponseWriter, r *http.Request, fn func(orgID int64) ([]store.Row, error)) {
	orgID, ok := orgIDFromRequest(r)
	if !ok {
		writeError(w, http.StatusUnauthorized, "unauthorized")
		return
	}
	rows, err := fn(orgID)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "list failed")
		return
	}
	writeJSON(w, http.StatusOK, map[string]any{"data": rows})
}

func (h *Handler) ListUsers(w http.ResponseWriter, r *http.Request) {
	h.listModule(w, r, func(orgID int64) ([]store.Row, error) {
		return h.store.ListUsers(r.Context(), orgID)
	})
}

func (h *Handler) ListDepartments(w http.ResponseWriter, r *http.Request) {
	h.listModule(w, r, func(orgID int64) ([]store.Row, error) {
		return h.store.ListDepartments(r.Context(), orgID)
	})
}

func (h *Handler) ListBuildings(w http.ResponseWriter, r *http.Request) {
	h.listModule(w, r, func(orgID int64) ([]store.Row, error) {
		return h.store.ListBuildings(r.Context(), orgID)
	})
}

func (h *Handler) ListRooms(w http.ResponseWriter, r *http.Request) {
	h.listModule(w, r, func(orgID int64) ([]store.Row, error) {
		return h.store.ListRooms(r.Context(), orgID)
	})
}

func (h *Handler) ListAssetCategories(w http.ResponseWriter, r *http.Request) {
	h.listModule(w, r, func(orgID int64) ([]store.Row, error) {
		return h.store.ListAssetCategories(r.Context(), orgID)
	})
}

func (h *Handler) ListAssetClasses(w http.ResponseWriter, r *http.Request) {
	h.ListAssetClassesFiltered(w, r)
}

func (h *Handler) ListAuditOngoing(w http.ResponseWriter, r *http.Request) {
	orgID, ok := orgIDFromRequest(r)
	if !ok {
		writeError(w, http.StatusUnauthorized, "unauthorized")
		return
	}
	rows, err := h.store.ListAuditJobs(r.Context(), orgID, "ongoing")
	if err != nil {
		writeError(w, http.StatusInternalServerError, "list failed")
		return
	}
	writeJSON(w, http.StatusOK, map[string]any{"data": rows})
}

func (h *Handler) ListAuditHistory(w http.ResponseWriter, r *http.Request) {
	orgID, ok := orgIDFromRequest(r)
	if !ok {
		writeError(w, http.StatusUnauthorized, "unauthorized")
		return
	}
	rows, err := h.store.ListAuditJobs(r.Context(), orgID, "completed")
	if err != nil {
		writeError(w, http.StatusInternalServerError, "list failed")
		return
	}
	writeJSON(w, http.StatusOK, map[string]any{"data": rows})
}

func (h *Handler) ListRepairs(w http.ResponseWriter, r *http.Request) {
	h.listModule(w, r, func(orgID int64) ([]store.Row, error) {
		return h.store.ListRepairs(r.Context(), orgID)
	})
}

func (h *Handler) ListWithdrawals(w http.ResponseWriter, r *http.Request) {
	h.ListWithdrawalsFiltered(w, r)
}

func (h *Handler) ListSales(w http.ResponseWriter, r *http.Request) {
	h.listModule(w, r, func(orgID int64) ([]store.Row, error) {
		return h.store.ListSales(r.Context(), orgID)
	})
}

func (h *Handler) ListSuperAdminOrgs(w http.ResponseWriter, r *http.Request) {
	claims, ok := claimsFromContext(r.Context())
	if !ok || claims.RoleID != 1 {
		writeError(w, http.StatusForbidden, "super admin only")
		return
	}
	rows, err := h.store.ListOrganizations(r.Context())
	if err != nil {
		writeError(w, http.StatusInternalServerError, "list failed")
		return
	}
	writeJSON(w, http.StatusOK, map[string]any{"data": rows})
}

func (h *Handler) OrgMenus(w http.ResponseWriter, r *http.Request) {
	orgID, ok := orgIDFromRequest(r)
	if !ok {
		writeError(w, http.StatusUnauthorized, "unauthorized")
		return
	}
	ids, err := h.store.OrgMenus(r.Context(), orgID)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "menus failed")
		return
	}
	names, _ := h.store.ListMenuNames(r.Context())
	rows := make([]store.Row, 0, len(ids))
	for _, id := range ids {
		title := names[id]
		if title == "" {
			title = "เมนู #" + strconv.Itoa(id)
		}
		rows = append(rows, store.Row{ID: int64(id), Title: title})
	}
	writeJSON(w, http.StatusOK, map[string]any{"data": rows})
}
