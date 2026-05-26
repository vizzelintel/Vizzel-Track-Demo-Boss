package api

import (
	"encoding/json"
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
	b, ok2 := h.writeDashboardBundle(w, r, orgID)
	if !ok2 {
		return
	}
	writeJSON(w, http.StatusOK, map[string]any{"data": summaryPayload(&b.Extended)})
}

func (h *Handler) CompatDashboardTrendWrapped(w http.ResponseWriter, r *http.Request) {
	orgID, ok := h.compatOrgID(w, r)
	if !ok {
		return
	}
	b, ok2 := h.writeDashboardBundle(w, r, orgID)
	if !ok2 {
		return
	}
	writeJSON(w, http.StatusOK, map[string]any{"data": b.TrendByMonth})
}

func (h *Handler) CompatDashboardStatusWrapped(w http.ResponseWriter, r *http.Request) {
	orgID, ok := h.compatOrgID(w, r)
	if !ok {
		return
	}
	b, ok2 := h.writeDashboardBundle(w, r, orgID)
	if !ok2 {
		return
	}
	writeJSON(w, http.StatusOK, map[string]any{"data": statusChartData(&b.Extended)})
}

func (h *Handler) CompatDashboardLocationWrapped(w http.ResponseWriter, r *http.Request) {
	orgID, ok := h.compatOrgID(w, r)
	if !ok {
		return
	}
	b, ok2 := h.writeDashboardBundle(w, r, orgID)
	if !ok2 {
		return
	}
	writeJSON(w, http.StatusOK, map[string]any{"data": b.LocationRows})
}

func (h *Handler) CompatDashboardValueHistory(w http.ResponseWriter, r *http.Request) {
	orgID, ok := h.compatOrgID(w, r)
	if !ok {
		return
	}
	b, ok2 := h.writeDashboardBundle(w, r, orgID)
	if !ok2 {
		return
	}
	writeJSON(w, http.StatusOK, map[string]any{"data": valueHistoryJSON(b.ValueHistory)})
}

func (h *Handler) CompatDashboardDepreciation(w http.ResponseWriter, r *http.Request) {
	orgID, ok := h.compatOrgID(w, r)
	if !ok {
		return
	}
	b, ok2 := h.writeDashboardBundle(w, r, orgID)
	if !ok2 {
		return
	}
	writeJSON(w, http.StatusOK, map[string]any{"data": depreciationHistoryJSON(b.DepreciationHistory)})
}

func (h *Handler) CompatDashboardNewAssets(w http.ResponseWriter, r *http.Request) {
	orgID, ok := h.compatOrgID(w, r)
	if !ok {
		return
	}
	b, ok2 := h.writeDashboardBundle(w, r, orgID)
	if !ok2 {
		return
	}
	writeJSON(w, http.StatusOK, map[string]any{"data": b.NewAssetRows})
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
	claims, ok := claimsFromContext(r.Context())
	if !ok {
		writeError(w, http.StatusUnauthorized, "unauthorized")
		return
	}
	cats, _ := h.store.ListAssetCategories(r.Context(), claims.OrganizationID)
	items := make([]map[string]any, 0, len(cats))
	for _, c := range cats {
		items = append(items, map[string]any{"category": c.Title, "value": 1, "label": c.Title})
	}
	writeJSON(w, http.StatusOK, map[string]any{"data": items})
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
	assetID, _ := strconv.ParseInt(chi.URLParam(r, "assetID"), 10, 64)
	docs, err := h.store.ListAssetDocs(r.Context(), assetID)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "list failed")
		return
	}
	writeJSON(w, http.StatusOK, map[string]any{"data": docs})
}

func (h *Handler) CompatAssetDocCreate(w http.ResponseWriter, r *http.Request) {
	var body struct {
		AssetID int64  `json:"assetID"`
		Name    string `json:"name"`
		URL     string `json:"url"`
		FileURL string `json:"fileUrl"`
	}
	_ = json.NewDecoder(r.Body).Decode(&body)
	url := body.URL
	if url == "" {
		url = body.FileURL
	}
	if url == "" {
		url = "/uploads/demo-doc.pdf"
	}
	id, err := h.store.CreateAssetDoc(r.Context(), body.AssetID, body.Name, url)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "create failed")
		return
	}
	writeJSON(w, http.StatusOK, map[string]any{"data": map[string]int64{"id": id}})
}

func (h *Handler) CompatAssetDocDelete(w http.ResponseWriter, r *http.Request) {
	var body struct {
		ID int64 `json:"id"`
	}
	_ = json.NewDecoder(r.Body).Decode(&body)
	_ = h.store.DeleteAssetDoc(r.Context(), body.ID)
	writeJSON(w, http.StatusOK, map[string]any{"data": map[string]string{"status": "ok"}})
}

func (h *Handler) CompatAssetClassDocGet(w http.ResponseWriter, r *http.Request) {
	writeJSON(w, http.StatusOK, map[string]any{"data": []any{}})
}

func (h *Handler) CompatCheckJobHistory(w http.ResponseWriter, r *http.Request) {
	writeJSON(w, http.StatusOK, map[string]any{"data": []any{}})
}
