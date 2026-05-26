package api

import (
	"context"
	"net/http"
	"strconv"
	"time"

	"github.com/vizzelintel/vizzel-track-demo-boss/vizzel-go-app/internal/store"
)

func (h *Handler) loadDashboardBundle(ctx context.Context, orgID int64) (*store.DashboardBundle, error) {
	return h.store.DashboardBundle(ctx, orgID)
}

func depreciationHistoryJSON(points []store.DepreciationHistoryPoint) []map[string]any {
	out := make([]map[string]any, 0, len(points))
	for _, p := range points {
		out = append(out, map[string]any{
			"year":           p.Year,
			"granularity":    p.Granularity,
			"depreciation":   p.Depreciation,
			"accumulated":    p.Accumulated,
		})
	}
	return out
}

func valueHistoryJSON(points []store.ValueHistoryPoint) []map[string]any {
	out := make([]map[string]any, 0, len(points))
	for _, p := range points {
		year := ""
		if t, err := time.Parse(time.RFC3339, p.Date); err == nil {
			year = strconv.Itoa(t.Year())
		}
		out = append(out, map[string]any{
			"date":         p.Date,
			"year":         year,
			"cost":         p.Cost,
			"netBookValue": p.NetBookValue,
		})
	}
	return out
}

func dashboardInitialPayload(b *store.DashboardBundle) map[string]any {
	if b == nil {
		b = &store.DashboardBundle{}
	}
	return map[string]any{
		"summary":      summaryPayload(&b.Extended),
		"trend":        b.TrendByMonth,
		"valueHistory": valueHistoryJSON(b.ValueHistory),
		"status":       statusChartData(&b.Extended),
		"depreciation": depreciationHistoryJSON(b.DepreciationHistory),
		"newAssets":    b.NewAssetRows,
		"location":     b.LocationRows,
	}
}

func (h *Handler) writeDashboardBundle(w http.ResponseWriter, r *http.Request, orgID int64) (*store.DashboardBundle, bool) {
	b, err := h.loadDashboardBundle(r.Context(), orgID)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "failed")
		return nil, false
	}
	return b, true
}
