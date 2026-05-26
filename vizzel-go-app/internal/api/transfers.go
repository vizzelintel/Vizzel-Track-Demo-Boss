package api

import (
	"encoding/json"
	"net/http"
	"strconv"

	"github.com/go-chi/chi/v5"
	"github.com/vizzelintel/vizzel-track-demo-boss/vizzel-go-app/internal/notify"
	"github.com/vizzelintel/vizzel-track-demo-boss/vizzel-go-app/internal/store"
)

func (h *Handler) ListTransfers(w http.ResponseWriter, r *http.Request) {
	claims, ok := claimsFromContext(r.Context())
	if !ok {
		writeError(w, http.StatusUnauthorized, "unauthorized")
		return
	}
	list, err := h.store.ListTransfers(r.Context(), claims.OrganizationID)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "list failed")
		return
	}
	writeJSON(w, http.StatusOK, map[string]any{"data": list})
}

func (h *Handler) CreateTransfer(w http.ResponseWriter, r *http.Request) {
	claims, ok := claimsFromContext(r.Context())
	if !ok {
		writeError(w, http.StatusUnauthorized, "unauthorized")
		return
	}
	var body struct {
		AssetID              int64  `json:"assetId"`
		ComponentID          int64  `json:"componentId"`
		TransferType         string `json:"transferType"`
		TargetOrganizationID int64  `json:"targetOrganizationId"`
		ToInstituteID        int64  `json:"toInstituteId"`
		ToDeptID             int64  `json:"toDeptId"`
		ToSectionID          int64  `json:"toSectionId"`
		ToUserID             int64  `json:"toUserId"`
		Reason               string `json:"reason"`
		Submit               bool   `json:"submit"`
	}
	_ = json.NewDecoder(r.Body).Decode(&body)
	id, err := h.store.CreateTransfer(r.Context(), claims.OrganizationID, store.TransferInput{
		AssetID:              body.AssetID,
		ComponentID:          body.ComponentID,
		TransferType:         body.TransferType,
		TargetOrganizationID: body.TargetOrganizationID,
		ToInstituteID:        body.ToInstituteID,
		ToDeptID:      body.ToDeptID,
		ToSectionID:   body.ToSectionID,
		ToUserID:      body.ToUserID,
		Reason:        body.Reason,
		RequestedBy:   claims.UserID,
	})
	if err != nil {
		writeError(w, http.StatusInternalServerError, "create failed")
		return
	}
	if body.Submit {
		_ = h.store.SubmitTransferForApproval(r.Context(), claims.OrganizationID, id, claims.UserID)
		h.dispatchApprovalSubmitted(r, claims, "transfer", id)
	}
	writeJSON(w, http.StatusOK, map[string]any{"data": map[string]int64{"id": id}})
}

func (h *Handler) TransferSubmitApproval(w http.ResponseWriter, r *http.Request) {
	claims, ok := claimsFromContext(r.Context())
	if !ok {
		writeError(w, http.StatusUnauthorized, "unauthorized")
		return
	}
	id, _ := strconv.ParseInt(chi.URLParam(r, "id"), 10, 64)
	if err := h.store.SubmitTransferForApproval(r.Context(), claims.OrganizationID, id, claims.UserID); err != nil {
		writeError(w, http.StatusBadRequest, err.Error())
		return
	}
	h.dispatchApprovalSubmitted(r, claims, "transfer", id)
	writeJSON(w, http.StatusOK, map[string]string{"status": "pending_approval"})
}

func (h *Handler) WithdrawalSubmitApproval(w http.ResponseWriter, r *http.Request) {
	claims, ok := claimsFromContext(r.Context())
	if !ok {
		writeError(w, http.StatusUnauthorized, "unauthorized")
		return
	}
	id, _ := strconv.ParseInt(chi.URLParam(r, "id"), 10, 64)
	if err := h.store.SubmitWithdrawalForApproval(r.Context(), claims.OrganizationID, id, claims.UserID); err != nil {
		writeError(w, http.StatusBadRequest, err.Error())
		return
	}
	if h.dispatcher != nil {
		_ = h.dispatcher.Dispatch(r.Context(), notify.Event{
			OrganizationID: claims.OrganizationID,
			UserIDs:        []int64{claims.UserID},
			EventType:      "withdrawal.submitted",
			Title:          "ส่งคำขอเบิก/ยืมเพื่ออนุมัติ",
			Body:           "คำขอ #" + strconv.FormatInt(id, 10),
			Link:           "/approval-queue",
			RefType:        "withdrawal",
			RefID:          id,
		})
	}
	writeJSON(w, http.StatusOK, map[string]string{"status": "pending_approval"})
}

func (h *Handler) WithdrawalReturn(w http.ResponseWriter, r *http.Request) {
	claims, ok := claimsFromContext(r.Context())
	if !ok {
		writeError(w, http.StatusUnauthorized, "unauthorized")
		return
	}
	id, _ := strconv.ParseInt(chi.URLParam(r, "id"), 10, 64)
	if err := h.store.ReturnWithdrawal(r.Context(), claims.OrganizationID, id); err != nil {
		writeError(w, http.StatusBadRequest, err.Error())
		return
	}
	writeJSON(w, http.StatusOK, map[string]string{"status": "returned"})
}

func (h *Handler) ListChildOrganizations(w http.ResponseWriter, r *http.Request) {
	claims, ok := claimsFromContext(r.Context())
	if !ok {
		writeError(w, http.StatusUnauthorized, "unauthorized")
		return
	}
	rows, err := h.store.ListChildOrganizations(r.Context(), claims.OrganizationID)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "list failed")
		return
	}
	writeJSON(w, http.StatusOK, map[string]any{"data": rows})
}

func (h *Handler) ListTransferTargets(w http.ResponseWriter, r *http.Request) {
	claims, ok := claimsFromContext(r.Context())
	if !ok {
		writeError(w, http.StatusUnauthorized, "unauthorized")
		return
	}
	rows, err := h.store.ListTransferTargets(r.Context(), claims.OrganizationID)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "list failed")
		return
	}
	writeJSON(w, http.StatusOK, map[string]any{"data": rows})
}

func (h *Handler) AcceptTransferAtTarget(w http.ResponseWriter, r *http.Request) {
	claims, ok := claimsFromContext(r.Context())
	if !ok {
		writeError(w, http.StatusUnauthorized, "unauthorized")
		return
	}
	if claims.RoleID > 2 {
		writeError(w, http.StatusForbidden, "admin only")
		return
	}
	id, _ := strconv.ParseInt(chi.URLParam(r, "id"), 10, 64)
	if err := h.store.AcceptTransferAtTarget(r.Context(), claims.OrganizationID, id); err != nil {
		writeError(w, http.StatusBadRequest, err.Error())
		return
	}
	if h.dispatcher != nil {
		_ = h.dispatcher.Dispatch(r.Context(), notify.Event{
			OrganizationID: claims.OrganizationID,
			UserIDs:        []int64{claims.UserID},
			EventType:      "transfer.accepted",
			Title:          "รับโอนครุภัณฑ์แล้ว",
			Body:           "คำขอโอน #" + strconv.FormatInt(id, 10),
			Link:           "/transfer",
			RefType:        "transfer",
			RefID:          id,
		})
	}
	writeJSON(w, http.StatusOK, map[string]string{"status": "completed"})
}
