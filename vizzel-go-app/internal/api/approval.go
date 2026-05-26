package api

import (
	"context"
	"encoding/json"
	"fmt"
	"net/http"
	"strconv"
	"time"

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
	for i := range list {
		ok, _ := h.store.UserCanApproveInstanceStep(r.Context(), claims.OrganizationID, list[i].ID, claims.UserID, claims.RoleID, list[i].CurrentStepKey)
		list[i].CanAct = ok
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
	if err := h.store.ApprovalAction(r.Context(), claims.OrganizationID, id, claims.UserID, claims.RoleID, body.Action, body.Branch, body.Note); err != nil {
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
	var body struct {
		StepAssignees map[string]int64 `json:"stepAssignees"`
	}
	_ = json.NewDecoder(r.Body).Decode(&body)
	if err := h.store.SubmitRepairForApproval(r.Context(), claims.OrganizationID, id, claims.UserID, body.StepAssignees); err != nil {
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
		AssetNumber   string            `json:"assetNumber"`
		Note          string            `json:"note"`
		Symptom       string            `json:"symptom"`
		Submit        bool              `json:"submit"`
		StepAssignees map[string]int64  `json:"stepAssignees"`
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
		_ = h.store.SubmitRepairForApproval(r.Context(), orgID, id, claims.UserID, body.StepAssignees)
		h.dispatchApprovalSubmitted(r, claims, "repair", id)
	}
	writeJSON(w, http.StatusOK, map[string]any{"data": map[string]int64{"id": id}})
}

func (h *Handler) RepairComplete(w http.ResponseWriter, r *http.Request) {
	claims, ok := claimsFromContext(r.Context())
	if !ok {
		writeError(w, http.StatusUnauthorized, "unauthorized")
		return
	}
	id, _ := strconv.ParseInt(chi.URLParam(r, "id"), 10, 64)
	if err := h.store.CompleteRepair(r.Context(), claims.OrganizationID, id); err != nil {
		writeError(w, http.StatusBadRequest, err.Error())
		return
	}
	if h.dispatcher != nil {
		_ = h.dispatcher.Dispatch(r.Context(), notify.Event{
			OrganizationID: claims.OrganizationID,
			UserIDs:        []int64{claims.UserID},
			EventType:      "repair.completed",
			Title:          "ปิดงานซ่อมแล้ว",
			Body:           "แจ้งซ่อม #" + strconv.FormatInt(id, 10),
			Link:           "/repair",
			RefType:        "repair",
			RefID:          id,
		})
	}
	writeJSON(w, http.StatusOK, map[string]string{"status": "completed"})
}

func (h *Handler) WithdrawalIssue(w http.ResponseWriter, r *http.Request) {
	claims, ok := claimsFromContext(r.Context())
	if !ok {
		writeError(w, http.StatusUnauthorized, "unauthorized")
		return
	}
	idStr := chi.URLParam(r, "id")
	if idStr == "" {
		idStr = chi.URLParam(r, "approveID")
	}
	id, _ := strconv.ParseInt(idStr, 10, 64)
	token, err := h.store.IssueWithdrawal(r.Context(), claims.OrganizationID, id)
	if err != nil {
		writeError(w, http.StatusBadRequest, err.Error())
		return
	}
	qrPayload := "/withdrawal/verify/" + token
	writeJSON(w, http.StatusOK, map[string]any{
		"data": map[string]string{
			"status":     "borrowed",
			"issueToken": token,
			"qrPayload":  qrPayload,
		},
	})
}

func (h *Handler) WithdrawalVerifyByToken(w http.ResponseWriter, r *http.Request) {
	token := chi.URLParam(r, "token")
	row, err := h.store.GetWithdrawalByIssueToken(r.Context(), token)
	if err != nil {
		writeError(w, http.StatusNotFound, "not found")
		return
	}
	writeJSON(w, http.StatusOK, map[string]any{"data": row})
}

func (h *Handler) StartBackgroundJobs(ctx context.Context) {
	if h.dispatcher == nil {
		return
	}
	go func() {
		time.Sleep(30 * time.Second)
		h.runWithdrawalReminders(ctx)
		ticker := time.NewTicker(6 * time.Hour)
		for range ticker.C {
			h.runWithdrawalReminders(ctx)
		}
	}()
}

func (h *Handler) runWithdrawalReminders(ctx context.Context) {
	list, err := h.store.ListWithdrawalRemindersDue(ctx)
	if err != nil || len(list) == 0 {
		return
	}
	for _, row := range list {
		var users []int64
		if row.UserID > 0 {
			users = append(users, row.UserID)
		}
		_ = h.dispatcher.Dispatch(ctx, notify.Event{
			OrganizationID: row.OrganizationID,
			UserIDs:        users,
			EventType:      "withdrawal.due_soon",
			Title:          "แจ้งเตือนคืนครุภัณฑ์",
			Body:           fmt.Sprintf("%s ครบกำหนดคืน %s", row.ItemName, row.DueDate.Format("2006-01-02")),
			Link:           "/withdrawal",
			RefType:        "withdrawal",
			RefID:          row.ID,
		})
		_ = h.store.MarkWithdrawalReminderSent(ctx, row.ID)
	}
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
