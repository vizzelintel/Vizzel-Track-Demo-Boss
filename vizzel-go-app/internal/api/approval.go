package api

import (
	"encoding/json"
	"net/http"
	"strconv"

	"github.com/go-chi/chi/v5"
	"github.com/vizzelintel/vizzel-track-demo-boss/vizzel-go-app/internal/auth"
	"github.com/vizzelintel/vizzel-track-demo-boss/vizzel-go-app/internal/notify"
	"github.com/vizzelintel/vizzel-track-demo-boss/vizzel-go-app/internal/store"
)

func (h *Handler) ListPendingApprovals(w http.ResponseWriter, r *http.Request) {
	claims, ok := claimsFromContext(r.Context())
	if !ok {
		writeError(w, http.StatusUnauthorized, "unauthorized")
		return
	}
	list, err := h.store.ListPendingApprovals(r.Context(), claims.OrganizationID)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "list failed")
		return
	}
	writeJSON(w, http.StatusOK, map[string]any{"data": list})
}

func (h *Handler) GetApprovalInstance(w http.ResponseWriter, r *http.Request) {
	claims, ok := claimsFromContext(r.Context())
	if !ok {
		writeError(w, http.StatusUnauthorized, "unauthorized")
		return
	}
	id, _ := strconv.ParseInt(chi.URLParam(r, "id"), 10, 64)
	inst, err := h.store.GetApprovalInstance(r.Context(), claims.OrganizationID, id)
	if err != nil {
		writeError(w, http.StatusNotFound, "not found")
		return
	}
	writeJSON(w, http.StatusOK, map[string]any{"data": inst})
}

func (h *Handler) ApprovalAction(w http.ResponseWriter, r *http.Request) {
	claims, ok := claimsFromContext(r.Context())
	if !ok {
		writeError(w, http.StatusUnauthorized, "unauthorized")
		return
	}
	id, _ := strconv.ParseInt(chi.URLParam(r, "id"), 10, 64)
	var body struct {
		Action string `json:"action"`
		Branch string `json:"branch"`
		Note   string `json:"note"`
	}
	_ = json.NewDecoder(r.Body).Decode(&body)
	if body.Action == "" {
		body.Action = "approve"
	}
	instBefore, _ := h.store.GetApprovalInstance(r.Context(), claims.OrganizationID, id)
	if err := h.store.ApprovalAction(r.Context(), claims.OrganizationID, id, claims.UserID, body.Action, body.Branch, body.Note); err != nil {
		writeError(w, http.StatusBadRequest, err.Error())
		return
	}
	if h.dispatcher != nil && instBefore != nil {
		ev := "approval.rejected"
		title := "คำขอถูกปฏิเสธ"
		if body.Action != "reject" {
			ev = "approval.approved_step"
			title = "อนุมัติขั้นตอนแล้ว"
		}
		_ = h.dispatcher.Dispatch(r.Context(), notify.Event{
			OrganizationID: claims.OrganizationID,
			UserIDs:        []int64{instBefore.RequestedBy},
			EventType:      ev,
			Title:          title,
			Body:           instBefore.WorkflowCode + " #" + strconv.FormatInt(instBefore.RefID, 10),
			Link:           "/approval-queue",
			RefType:        "approval",
			RefID:          id,
		})
	}
	writeJSON(w, http.StatusOK, map[string]string{"status": "ok"})
}

func (h *Handler) RepairSubmitApproval(w http.ResponseWriter, r *http.Request) {
	claims, ok := claimsFromContext(r.Context())
	if !ok {
		writeError(w, http.StatusUnauthorized, "unauthorized")
		return
	}
	id, _ := strconv.ParseInt(chi.URLParam(r, "id"), 10, 64)
	if err := h.store.SubmitRepairForApproval(r.Context(), claims.OrganizationID, id, claims.UserID); err != nil {
		writeError(w, http.StatusBadRequest, err.Error())
		return
	}
	h.dispatchApprovalSubmitted(r, claims, "repair", id)
	writeJSON(w, http.StatusOK, map[string]string{"status": "pending_approval"})
}

func (h *Handler) RepairCreateWithApproval(w http.ResponseWriter, r *http.Request) {
	orgID, ok := orgIDFromQueryOrClaims(r)
	if !ok {
		writeError(w, http.StatusUnauthorized, "unauthorized")
		return
	}
	claims, _ := claimsFromContext(r.Context())
	var body struct {
		AssetNumber string `json:"assetNumber"`
		Note        string `json:"note"`
		Symptom     string `json:"symptom"`
		Submit      bool   `json:"submit"`
	}
	_ = json.NewDecoder(r.Body).Decode(&body)
	reqBy := int64(0)
	if claims != nil {
		reqBy = claims.UserID
	}
	id, err := h.store.CreateRepairEx(r.Context(), orgID, store.RepairInput{
		AssetNumber: body.AssetNumber,
		Note:        body.Note,
		Symptom:     body.Symptom,
		RequestedBy: reqBy,
	})
	if err != nil {
		writeError(w, http.StatusInternalServerError, "create failed")
		return
	}
	if body.Submit && claims != nil {
		_ = h.store.SubmitRepairForApproval(r.Context(), orgID, id, claims.UserID)
		h.dispatchApprovalSubmitted(r, claims, "repair", id)
	}
	writeJSON(w, http.StatusOK, map[string]any{"data": map[string]int64{"id": id}})
}

func (h *Handler) dispatchApprovalSubmitted(r *http.Request, claims *auth.Claims, workflow string, refID int64) {
	if h.dispatcher == nil || claims == nil {
		return
	}
	_ = h.dispatcher.Dispatch(r.Context(), notify.Event{
		OrganizationID: claims.OrganizationID,
		UserIDs:        []int64{claims.UserID},
		EventType:      workflow + ".submitted",
		Title:          "ส่งคำขออนุมัติแล้ว",
		Body:           workflow + " #" + strconv.FormatInt(refID, 10),
		Link:           "/approval-queue",
		RefType:        workflow,
		RefID:          refID,
	})
}
