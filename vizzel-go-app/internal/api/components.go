package api

import (
	"encoding/json"
	"net/http"
	"strconv"
	"strings"

	"github.com/go-chi/chi/v5"
	"github.com/vizzelintel/vizzel-track-demo-boss/vizzel-go-app/internal/store"
)

// componentToMap renders an AssetComponent in the same camelCase shape the
// frontend uses for assets, so it can be dropped straight into JSON.
func componentToMap(c store.AssetComponent) map[string]any {
	return map[string]any{
		"id":            c.ID,
		"assetID":       c.AssetID,
		"componentName": c.ComponentName,
		"rfidNum":       c.RFIDNum,
		"serialNo":      c.SerialNo,
		"positionNo":    c.PositionNo,
		"note":          c.Note,
		"currentStatus": c.CurrentStatus,
	}
}

func componentsToMaps(items []store.AssetComponent) []map[string]any {
	out := make([]map[string]any, 0, len(items))
	for _, c := range items {
		out = append(out, componentToMap(c))
	}
	return out
}

// GetAssetComponents — GET /asset/component/get/{assetID}
func (h *Handler) GetAssetComponents(w http.ResponseWriter, r *http.Request) {
	id, _ := strconv.ParseInt(chi.URLParam(r, "assetID"), 10, 64)
	items, err := h.store.ListAssetComponents(r.Context(), id)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "list failed")
		return
	}
	writeJSON(w, http.StatusOK, map[string]any{"data": componentsToMaps(items)})
}

type componentBody struct {
	AssetID       int64  `json:"assetID"`
	ComponentName string `json:"componentName"`
	RFIDNum       string `json:"rfidNum"`
	SerialNo      string `json:"serialNo"`
	PositionNo    int    `json:"positionNo"`
	Note          string `json:"note"`
}

func (b componentBody) toModel() store.AssetComponent {
	return store.AssetComponent{
		AssetID:       b.AssetID,
		ComponentName: b.ComponentName,
		RFIDNum:       b.RFIDNum,
		SerialNo:      b.SerialNo,
		PositionNo:    b.PositionNo,
		Note:          b.Note,
	}
}

// CreateAssetComponent — POST /asset/component/create
func (h *Handler) CreateAssetComponent(w http.ResponseWriter, r *http.Request) {
	var body componentBody
	if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
		writeError(w, http.StatusBadRequest, "invalid json")
		return
	}
	if body.AssetID <= 0 || strings.TrimSpace(body.ComponentName) == "" {
		writeError(w, http.StatusBadRequest, "assetID and componentName required")
		return
	}
	id, err := h.store.CreateAssetComponent(r.Context(), body.toModel())
	if err != nil {
		writeError(w, http.StatusInternalServerError, "create failed")
		return
	}
	writeJSON(w, http.StatusOK, map[string]any{"id": id})
}

// UpdateAssetComponent — PATCH /asset/component/update/{componentID}
func (h *Handler) UpdateAssetComponent(w http.ResponseWriter, r *http.Request) {
	id, _ := strconv.ParseInt(chi.URLParam(r, "componentID"), 10, 64)
	var body componentBody
	if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
		writeError(w, http.StatusBadRequest, "invalid json")
		return
	}
	if err := h.store.UpdateAssetComponent(r.Context(), id, body.toModel()); err != nil {
		writeError(w, http.StatusInternalServerError, "update failed")
		return
	}
	writeJSON(w, http.StatusOK, map[string]string{"status": "ok"})
}

// DeleteAssetComponent — DELETE /asset/component/delete/{componentID}
func (h *Handler) DeleteAssetComponent(w http.ResponseWriter, r *http.Request) {
	id, _ := strconv.ParseInt(chi.URLParam(r, "componentID"), 10, 64)
	if err := h.store.DeleteAssetComponent(r.Context(), id); err != nil {
		writeError(w, http.StatusInternalServerError, "delete failed")
		return
	}
	writeJSON(w, http.StatusOK, map[string]string{"status": "ok"})
}

// BulkReplaceAssetComponents — POST /asset/component/bulk-replace/{assetID}
func (h *Handler) BulkReplaceAssetComponents(w http.ResponseWriter, r *http.Request) {
	assetID, _ := strconv.ParseInt(chi.URLParam(r, "assetID"), 10, 64)
	var body struct {
		Components []componentBody `json:"components"`
	}
	if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
		writeError(w, http.StatusBadRequest, "invalid json")
		return
	}
	items := make([]store.AssetComponent, 0, len(body.Components))
	for i, c := range body.Components {
		m := c.toModel()
		m.AssetID = assetID
		if m.PositionNo <= 0 {
			m.PositionNo = i + 1
		}
		items = append(items, m)
	}
	if err := h.store.ReplaceAssetComponents(r.Context(), assetID, items); err != nil {
		writeError(w, http.StatusInternalServerError, "replace failed")
		return
	}
	writeJSON(w, http.StatusOK, map[string]any{"replaced": len(items)})
}

// ResolveScannedRFIDs — POST /asset/scan/resolve
// Body: { "rfids": ["..", ".."] }
// Returns a grouped summary so the UI can render the audit panel without
// re-fetching per-asset data.
func (h *Handler) ResolveScannedRFIDs(w http.ResponseWriter, r *http.Request) {
	claims, ok := claimsFromContext(r.Context())
	if !ok {
		writeError(w, http.StatusUnauthorized, "unauthorized")
		return
	}
	var body struct {
		Rfids []string `json:"rfids"`
	}
	if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
		writeError(w, http.StatusBadRequest, "invalid json")
		return
	}
	results, err := h.store.BulkResolveByRFID(r.Context(), claims.OrganizationID, body.Rfids)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "resolve failed")
		return
	}

	// Group matched scans by parent asset; collect unmatched separately.
	type assetSummary struct {
		AssetID       int64            `json:"assetID"`
		AssetNumber   string           `json:"assetNumber"`
		AssetName     string           `json:"assetName"`
		Total         int              `json:"total"`
		Matched       int              `json:"matched"`
		MatchedRFIDs  []string         `json:"matchedRfids"`
		Components    []map[string]any `json:"components"`
		MissingNames  []string         `json:"missingNames"`
		MissingRFIDs  []string         `json:"missingRfids"`
		Status        string           `json:"status"`
	}
	byAsset := map[int64]*assetSummary{}
	var unmatched []map[string]any
	for _, r := range results {
		if !r.Matched {
			unmatched = append(unmatched, map[string]any{"rfid": r.RFID})
			continue
		}
		sum, ok := byAsset[r.AssetID]
		if !ok {
			sum = &assetSummary{
				AssetID:     r.AssetID,
				AssetNumber: r.AssetNumber,
				AssetName:   r.AssetName,
			}
			byAsset[r.AssetID] = sum
		}
		sum.Matched++
		sum.MatchedRFIDs = append(sum.MatchedRFIDs, r.RFID)
	}

	// Enrich each matched asset with its full component list so the UI can
	// compute missing pieces. Single-piece assets (no rows) are treated as 1/1.
	complete := make([]assetSummary, 0)
	partial := make([]assetSummary, 0)
	for _, sum := range byAsset {
		comps, _ := h.store.ListAssetComponents(r.Context(), sum.AssetID)
		sum.Total = len(comps)
		if sum.Total == 0 {
			sum.Total = 1
		}
		matchedSet := map[string]bool{}
		for _, m := range sum.MatchedRFIDs {
			matchedSet[m] = true
		}
		for _, c := range comps {
			sum.Components = append(sum.Components, componentToMap(c))
			if c.RFIDNum != "" && !matchedSet[c.RFIDNum] {
				sum.MissingNames = append(sum.MissingNames, c.ComponentName)
				sum.MissingRFIDs = append(sum.MissingRFIDs, c.RFIDNum)
			}
		}
		if sum.Matched >= sum.Total && len(sum.MissingNames) == 0 {
			sum.Status = "complete"
			complete = append(complete, *sum)
		} else {
			sum.Status = "partial"
			partial = append(partial, *sum)
		}
	}

	writeJSON(w, http.StatusOK, map[string]any{
		"total":     len(results),
		"complete":  complete,
		"partial":   partial,
		"unmatched": unmatched,
	})
}
