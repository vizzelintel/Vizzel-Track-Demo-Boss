package api

import (
	"net/http"
	"strconv"
	"time"

	"github.com/go-chi/chi/v5"
	"github.com/vizzelintel/vizzel-track-demo-boss/vizzel-go-app/internal/store"
)

func (h *Handler) compatOrgID(w http.ResponseWriter, r *http.Request) (int64, bool) {
	orgID, _ := strconv.ParseInt(chi.URLParam(r, "orgID"), 10, 64)
	claims, ok := claimsFromContext(r.Context())
	if !ok {
		writeError(w, http.StatusUnauthorized, "unauthorized")
		return 0, false
	}
	if orgID == 0 {
		orgID = claims.OrganizationID
	}
	return orgID, true
}

func summaryPayload(ext *store.DashboardExtended) map[string]any {
	if ext == nil {
		ext = &store.DashboardExtended{}
	}
	year := time.Now().Year()
	return map[string]any{
		"totalAssetValue":            ext.TotalAssetValue,
		"totalAssetValueTrend":       "+0%",
		"accumulatedDepreciation":    ext.AccumulatedDepreciation,
		"accumulatedDepreciationTrend": "+0%",
		"netBookValue":               ext.NetBookValue,
		"netBookValueTrend":          "+0%",
		"totalAssets":                ext.TotalAssets,
		"totalAssetsTrend":           "+0%",
		"newAssetsThisYear":          ext.NewAssetsThisYear,
		"newAssetsTrend":             "+0%",
		"currentYearDepreciation":    ext.CurrentYearDepreciation,
		"currentYear":                year,
		"monthlyAverage":             ext.CurrentYearDepreciation / 12,
		"depreciationTrend":          "+0%",
	}
}

func trendPoints(ext *store.DashboardExtended) []map[string]any {
	out := make([]map[string]any, 0, len(ext.Trend.Labels))
	for i, label := range ext.Trend.Labels {
		count := 0
		if i < len(ext.Trend.Values) {
			count = ext.Trend.Values[i]
		}
		out = append(out, map[string]any{"date": label, "count": count})
	}
	return out
}

func statusChartData(ext *store.DashboardExtended) []map[string]any {
	out := make([]map[string]any, 0, len(ext.StatusBreakdown))
	for _, s := range ext.StatusBreakdown {
		out = append(out, map[string]any{
			"status": s.Name,
			"value":  s.Count,
			"label":  s.Name,
		})
	}
	return out
}

func (h *Handler) CompatDashboardSummaryWrapped(w http.ResponseWriter, r *http.Request) {
	orgID, ok := h.compatOrgID(w, r)
	if !ok {
		return
	}
	ext, err := h.store.DashboardExtended(r.Context(), orgID)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "failed")
		return
	}
	writeJSON(w, http.StatusOK, map[string]any{"data": summaryPayload(ext)})
}

func (h *Handler) CompatDashboardTrendWrapped(w http.ResponseWriter, r *http.Request) {
	orgID, ok := h.compatOrgID(w, r)
	if !ok {
		return
	}
	ext, _ := h.store.DashboardExtended(r.Context(), orgID)
	writeJSON(w, http.StatusOK, map[string]any{"data": trendPoints(ext)})
}

func (h *Handler) CompatDashboardStatusWrapped(w http.ResponseWriter, r *http.Request) {
	orgID, ok := h.compatOrgID(w, r)
	if !ok {
		return
	}
	ext, _ := h.store.DashboardExtended(r.Context(), orgID)
	writeJSON(w, http.StatusOK, map[string]any{"data": statusChartData(ext)})
}

func (h *Handler) CompatDashboardLocationWrapped(w http.ResponseWriter, r *http.Request) {
	orgID, ok := h.compatOrgID(w, r)
	if !ok {
		return
	}
	ext, _ := h.store.DashboardExtended(r.Context(), orgID)
	items := make([]map[string]any, 0, len(ext.LocationBreakdown))
	for _, loc := range ext.LocationBreakdown {
		items = append(items, map[string]any{
			"buildingName": loc.Name,
			"count":        loc.Count,
			"rooms":        []any{},
		})
	}
	writeJSON(w, http.StatusOK, map[string]any{"data": items})
}

func (h *Handler) CompatDashboardValueHistory(w http.ResponseWriter, r *http.Request) {
	orgID, ok := h.compatOrgID(w, r)
	if !ok {
		return
	}
	ext, _ := h.store.DashboardExtended(r.Context(), orgID)
	points := make([]map[string]any, 0, len(ext.Trend.Labels))
	for i, label := range ext.Trend.Labels {
		val := int64(0)
		if i < len(ext.Trend.Values) {
			val = int64(ext.Trend.Values[i]) * 10000
		}
		points = append(points, map[string]any{"date": label, "value": val})
	}
	writeJSON(w, http.StatusOK, map[string]any{"data": points})
}

func (h *Handler) CompatDashboardDepreciation(w http.ResponseWriter, r *http.Request) {
	orgID, ok := h.compatOrgID(w, r)
	if !ok {
		return
	}
	ext, _ := h.store.DashboardExtended(r.Context(), orgID)
	writeJSON(w, http.StatusOK, map[string]any{
		"data": []map[string]any{
			{"year": time.Now().Year(), "value": ext.AccumulatedDepreciation},
			{"year": time.Now().Year() - 1, "value": ext.AccumulatedDepreciation / 2},
		},
	})
}

func (h *Handler) CompatDashboardNewAssets(w http.ResponseWriter, r *http.Request) {
	orgID, ok := h.compatOrgID(w, r)
	if !ok {
		return
	}
	ext, _ := h.store.DashboardExtended(r.Context(), orgID)
	writeJSON(w, http.StatusOK, map[string]any{
		"data": map[string]any{
			"year":  time.Now().Year(),
			"total": ext.NewAssetsThisYear,
			"items": []map[string]any{},
		},
	})
}

func (h *Handler) CompatPersonalSummary(w http.ResponseWriter, r *http.Request) {
	claims, ok := claimsFromContext(r.Context())
	if !ok {
		writeError(w, http.StatusUnauthorized, "unauthorized")
		return
	}
	name := claims.Email
	if u, err := h.store.UserByEmail(r.Context(), claims.Email); err == nil && u.DisplayName != "" {
		name = u.DisplayName
	}
	pd, _ := h.store.PersonalDashboard(r.Context(), claims.OrganizationID, name)
	writeJSON(w, http.StatusOK, map[string]any{
		"data": map[string]any{
			"ownedAssets": pd.OwnedAssets,
			"totalValue":  pd.TotalValue,
		},
	})
}

func (h *Handler) CompatPersonalStatus(w http.ResponseWriter, r *http.Request) {
	claims, ok := claimsFromContext(r.Context())
	if !ok {
		writeError(w, http.StatusUnauthorized, "unauthorized")
		return
	}
	pd, _ := h.store.PersonalDashboard(r.Context(), claims.OrganizationID, claims.Email)
	items := make([]map[string]any, 0, len(pd.StatusBreakdown))
	for _, s := range pd.StatusBreakdown {
		items = append(items, map[string]any{"status": s.Name, "value": s.Count, "label": s.Name})
	}
	writeJSON(w, http.StatusOK, map[string]any{"data": items})
}

func (h *Handler) CompatPersonalCategory(w http.ResponseWriter, r *http.Request) {
	writeJSON(w, http.StatusOK, map[string]any{"data": []any{}})
}

func (h *Handler) CompatPersonalAssets(w http.ResponseWriter, r *http.Request) {
	claims, ok := claimsFromContext(r.Context())
	if !ok {
		writeError(w, http.StatusUnauthorized, "unauthorized")
		return
	}
	page, _ := strconv.Atoi(r.URL.Query().Get("page"))
	pageSize, _ := strconv.Atoi(r.URL.Query().Get("pageSize"))
	if page < 1 {
		page = 1
	}
	if pageSize < 1 {
		pageSize = 10
	}
	res, _ := h.store.ListAssetsPaged(r.Context(), claims.OrganizationID, page, pageSize, store.AssetFilter{})
	writeJSON(w, http.StatusOK, map[string]any{
		"data": map[string]any{
			"data":  toCompatAssets(res.Data),
			"total": res.Total,
		},
	})
}

func (h *Handler) CompatRepairMonthly(w http.ResponseWriter, r *http.Request) {
	writeJSON(w, http.StatusOK, map[string]any{
		"data": []map[string]any{
			{"month": "ม.ค.", "count": 2},
			{"month": "ก.พ.", "count": 4},
			{"month": "มี.ค.", "count": 1},
		},
	})
}

func (h *Handler) CompatRepairInitialData(w http.ResponseWriter, r *http.Request) {
	claims, ok := claimsFromContext(r.Context())
	if !ok {
		writeError(w, http.StatusUnauthorized, "unauthorized")
		return
	}
	repairs, _ := h.store.ListRepairs(r.Context(), claims.OrganizationID)
	pending := len(repairs)
	writeJSON(w, http.StatusOK, map[string]any{
		"data": map[string]any{
			"summary": map[string]any{
				"pending":   pending,
				"completed": 0,
				"total":     pending,
				"thisMonth": pending,
			},
			"status": []map[string]any{
				{"status": "รอดำเนินการ", "value": pending, "label": "รอดำเนินการ"},
			},
			"monthly": []map[string]any{
				{"month": "ม.ค.", "count": pending},
				{"month": "ก.พ.", "count": 0},
			},
			"pendingRepairs": map[string]any{"data": repairs, "total": len(repairs)},
		},
	})
}

func (h *Handler) CompatAssetDocGet(w http.ResponseWriter, r *http.Request) {
	writeJSON(w, http.StatusOK, map[string]any{"data": []any{}})
}

func (h *Handler) CompatAssetDocCreate(w http.ResponseWriter, r *http.Request) {
	writeJSON(w, http.StatusOK, map[string]any{"data": map[string]string{"status": "ok"}})
}

func (h *Handler) CompatAssetDocDelete(w http.ResponseWriter, r *http.Request) {
	writeJSON(w, http.StatusOK, map[string]any{"data": map[string]string{"status": "ok"}})
}

func (h *Handler) CompatAssetClassDocGet(w http.ResponseWriter, r *http.Request) {
	writeJSON(w, http.StatusOK, map[string]any{"data": []any{}})
}

func (h *Handler) CompatCheckJobHistory(w http.ResponseWriter, r *http.Request) {
	writeJSON(w, http.StatusOK, map[string]any{"data": []any{}})
}
