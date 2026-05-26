package api

import (
	"net/http"
	"strconv"
)

func (h *Handler) resolveScopedOrgID(r *http.Request, loginOrgID int64) (int64, error) {
	raw := r.URL.Query().Get("organization_id")
	if raw == "" {
		raw = r.URL.Query().Get("organizationId")
	}
	if raw == "" {
		return loginOrgID, nil
	}
	target, err := strconv.ParseInt(raw, 10, 64)
	if err != nil || target <= 0 {
		return loginOrgID, nil
	}
	if err := h.store.AssertOrgAccessible(r.Context(), loginOrgID, target); err != nil {
		return 0, err
	}
	return target, nil
}
