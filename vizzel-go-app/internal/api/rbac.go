package api

import (
	"encoding/json"
	"net/http"
	"strconv"
	"strings"

	"github.com/go-chi/chi/v5"
	"github.com/vizzelintel/vizzel-track-demo-boss/vizzel-go-app/internal/store"
)

// RequirePermission returns a middleware that enforces (resource, action) on the
// authenticated user's role. Super admin (role_id = 1) bypasses all checks.
func (h *Handler) RequirePermission(resource, action string) func(http.Handler) http.Handler {
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			claims, ok := claimsFromContext(r.Context())
			if !ok {
				writeError(w, http.StatusUnauthorized, "unauthorized")
				return
			}
			if claims.RoleID == store.RoleSuperAdmin {
				next.ServeHTTP(w, r)
				return
			}
			ok2, err := h.store.HasPermission(r.Context(), claims.RoleID, resource, action)
			if err != nil {
				writeError(w, http.StatusInternalServerError, "permission check failed")
				return
			}
			if !ok2 {
				writeError(w, http.StatusForbidden, "permission denied: "+resource+":"+action)
				return
			}
			next.ServeHTTP(w, r)
		})
	}
}

func (h *Handler) ListResources(w http.ResponseWriter, r *http.Request) {
	rows, err := h.store.ListResources(r.Context())
	if err != nil {
		writeError(w, http.StatusInternalServerError, "list resources failed")
		return
	}
	writeJSON(w, http.StatusOK, rows)
}

func (h *Handler) ListRoles(w http.ResponseWriter, r *http.Request) {
	rows, err := h.store.ListRoles(r.Context())
	if err != nil {
		writeError(w, http.StatusInternalServerError, "list roles failed")
		return
	}
	writeJSON(w, http.StatusOK, rows)
}

func (h *Handler) GetRole(w http.ResponseWriter, r *http.Request) {
	id, _ := strconv.ParseInt(chi.URLParam(r, "id"), 10, 64)
	role, err := h.store.GetRole(r.Context(), id)
	if err != nil {
		writeError(w, http.StatusNotFound, "role not found")
		return
	}
	writeJSON(w, http.StatusOK, role)
}

func (h *Handler) CreateRole(w http.ResponseWriter, r *http.Request) {
	var in store.RoleInput
	if err := json.NewDecoder(r.Body).Decode(&in); err != nil {
		writeError(w, http.StatusBadRequest, "invalid json")
		return
	}
	in.Name = strings.TrimSpace(in.Name)
	if in.Name == "" {
		writeError(w, http.StatusBadRequest, "name required")
		return
	}
	role, err := h.store.CreateRole(r.Context(), in)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "create role failed: "+err.Error())
		return
	}
	writeJSON(w, http.StatusOK, role)
}

func (h *Handler) UpdateRole(w http.ResponseWriter, r *http.Request) {
	id, _ := strconv.ParseInt(chi.URLParam(r, "id"), 10, 64)
	if id == store.RoleSuperAdmin {
		writeError(w, http.StatusForbidden, "role admin is locked")
		return
	}
	var in store.RoleInput
	if err := json.NewDecoder(r.Body).Decode(&in); err != nil {
		writeError(w, http.StatusBadRequest, "invalid json")
		return
	}
	role, err := h.store.UpdateRole(r.Context(), id, in)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "update role failed: "+err.Error())
		return
	}
	writeJSON(w, http.StatusOK, role)
}

func (h *Handler) DeleteRole(w http.ResponseWriter, r *http.Request) {
	id, _ := strconv.ParseInt(chi.URLParam(r, "id"), 10, 64)
	if id == store.RoleSuperAdmin {
		writeError(w, http.StatusForbidden, "role admin is locked")
		return
	}
	if err := h.store.DeleteRole(r.Context(), id); err != nil {
		writeError(w, http.StatusInternalServerError, "delete role failed: "+err.Error())
		return
	}
	writeJSON(w, http.StatusOK, map[string]string{"status": "ok"})
}

// MyPermissions returns the permission map for the current user's role, so the
// frontend can hide buttons / disable actions accordingly. Super admin always
// returns can_view/can_edit/can_delete = true for every known resource.
func (h *Handler) MyPermissions(w http.ResponseWriter, r *http.Request) {
	claims, ok := claimsFromContext(r.Context())
	if !ok {
		writeError(w, http.StatusUnauthorized, "unauthorized")
		return
	}
	resources, err := h.store.ListResources(r.Context())
	if err != nil {
		writeError(w, http.StatusInternalServerError, "permissions failed")
		return
	}
	out := make([]map[string]any, 0, len(resources))
	if claims.RoleID == store.RoleSuperAdmin {
		for _, res := range resources {
			out = append(out, map[string]any{
				"resource":   res.Code,
				"label":      res.Label,
				"can_view":   true,
				"can_edit":   true,
				"can_delete": true,
			})
		}
		writeJSON(w, http.StatusOK, map[string]any{
			"role_id":     claims.RoleID,
			"is_super":    true,
			"permissions": out,
		})
		return
	}
	role, err := h.store.GetRole(r.Context(), claims.RoleID)
	if err != nil {
		// Unknown role -> empty permission set
		writeJSON(w, http.StatusOK, map[string]any{
			"role_id":     claims.RoleID,
			"is_super":    false,
			"permissions": []any{},
		})
		return
	}
	permMap := map[string]store.Permission{}
	for _, p := range role.Permissions {
		permMap[p.Resource] = p
	}
	for _, res := range resources {
		p := permMap[res.Code]
		out = append(out, map[string]any{
			"resource":   res.Code,
			"label":      res.Label,
			"can_view":   p.CanView,
			"can_edit":   p.CanEdit,
			"can_delete": p.CanDelete,
		})
	}
	writeJSON(w, http.StatusOK, map[string]any{
		"role_id":     claims.RoleID,
		"role_name":   role.Name,
		"is_super":    false,
		"permissions": out,
	})
}
