package api

import (
	"net/http"
	"strconv"

	"github.com/vizzelintel/vizzel-track-demo-boss/vizzel-go-app/internal/store"
)

func (h *Handler) ListAssets(w http.ResponseWriter, r *http.Request) {
	claims, ok := claimsFromContext(r.Context())
	if !ok {
		writeError(w, http.StatusUnauthorized, "unauthorized")
		return
	}

	if r.URL.Query().Get("page") != "" || r.URL.Query().Get("page_size") != "" {
		h.listAssetsPaged(w, r, claims.OrganizationID)
		return
	}

	limit, _ := strconv.Atoi(r.URL.Query().Get("limit"))
	cursor, _ := strconv.ParseInt(r.URL.Query().Get("cursor"), 10, 64)
	items, next, hasMore, err := h.store.ListAssets(r.Context(), claims.OrganizationID, cursor, limit)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "list assets failed")
		return
	}
	var nextCursor any
	if hasMore && next > 0 {
		nextCursor = strconv.FormatInt(next, 10)
	}
	writeJSON(w, http.StatusOK, map[string]any{
		"data":        items,
		"next_cursor": nextCursor,
		"has_more":    hasMore,
	})
}

func (h *Handler) listAssetsPaged(w http.ResponseWriter, r *http.Request, orgID int64) {
	page, _ := strconv.Atoi(r.URL.Query().Get("page"))
	pageSize, _ := strconv.Atoi(r.URL.Query().Get("page_size"))
	if pageSize == 0 {
		pageSize, _ = strconv.Atoi(r.URL.Query().Get("limit"))
	}
	f := store.AssetFilter{
		Search:     r.URL.Query().Get("search"),
		StatusName: r.URL.Query().Get("status"),
	}
	if v, err := strconv.ParseInt(r.URL.Query().Get("category_id"), 10, 64); err == nil && v > 0 {
		f.CategoryID = v
	}
	if v, err := strconv.ParseInt(r.URL.Query().Get("class_id"), 10, 64); err == nil && v > 0 {
		f.ClassID = v
	}
	if r.URL.Query().Get("include_children") == "1" || r.URL.Query().Get("includeChildren") == "true" {
		f.IncludeChildOrgs = true
	}
	result, err := h.store.ListAssetsPaged(r.Context(), orgID, page, pageSize, f)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "list assets failed")
		return
	}
	writeJSON(w, http.StatusOK, result)
}

func (h *Handler) AssetsInitialData(w http.ResponseWriter, r *http.Request) {
	claims, ok := claimsFromContext(r.Context())
	if !ok {
		writeError(w, http.StatusUnauthorized, "unauthorized")
		return
	}
	ref, err := h.store.AssetReferenceData(r.Context(), claims.OrganizationID)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "initial data failed")
		return
	}
	writeJSON(w, http.StatusOK, ref)
}
