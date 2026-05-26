package api

import (
	"context"
	"encoding/json"
	"fmt"
	"net/http"
	"strconv"
	"time"

	"github.com/go-chi/chi/v5"
	"github.com/vizzelintel/vizzel-track-demo-boss/vizzel-go-app/internal/notify"
	"github.com/vizzelintel/vizzel-track-demo-boss/vizzel-go-app/internal/store"
)

// MountCompatExtended registers remaining NestJS-compatible routes.
func MountCompatExtended(r chi.Router, h *Handler) {
	// Audit
	r.Get("/audit/jobs/{orgID}", h.AuditJobs)
	r.Get("/audit/summary/{orgID}", h.AuditSummary)
	r.Get("/audit/status/{orgID}", h.AuditStatus)
	r.Get("/audit/assets-checked/{orgID}", h.AuditAssetsChecked)
	r.Get("/audit/assets-not-checked/{orgID}", h.AuditAssetsNotChecked)
	r.Get("/audit/assets-not-found/{orgID}", h.AuditAssetsNotFound)
	r.Get("/audit/start-data/{orgID}", h.AuditStartData)
	r.Get("/audit/ongoing-data/{orgID}", h.AuditOngoingData)
	r.Get("/audit/history-data/{orgID}", h.AuditHistoryData)

	// Check job
	r.Post("/checkJob/start/{organizationID}", h.CheckJobStart)
	r.Get("/checkJob/asset/get/{jobID}", h.CheckJobAssets)
	r.Patch("/checkJob/isCount/{rfid}/{jobID}", h.CheckJobIsCount)
	r.Post("/checkJob/image/store/{checkID}", h.CheckJobImageStore)
	r.Post("/checkJob/note/{checkID}", h.CheckJobNote)
	r.Patch("/checkJob/stop/{jobID}", h.CheckJobStop)
	r.Patch("/checkJob/update/{jobID}", h.CheckJobUpdate)
	r.Patch("/checkJob/delete/{jobID}", h.CheckJobDelete)
	r.Get("/checkJob/export/{jobID}", h.CheckJobExport)

	// Withdrawal
	r.Get("/withdrawal/asset/list", h.WithdrawalAssetList)
	r.Post("/withdrawal/internal/request", h.WithdrawalInternalRequest)
	r.Post("/withdrawal/external/request", h.WithdrawalExternalRequest)
	r.Get("/withdrawal/internal/get/{orgID}", h.WithdrawalInternalGet)
	r.Get("/withdrawal/external/get/{orgID}", h.WithdrawalExternalGet)
	r.Get("/withdrawal/history/{orgID}", h.WithdrawalHistory)
	r.Post("/withdrawal/internal/confirm/{requestID}", h.WithdrawalInternalConfirm)
	r.Post("/withdrawal/external/confirm/{requestID}", h.WithdrawalExternalConfirm)
	r.Post("/withdrawal/take/{approveID}", h.WithdrawalTake)
	r.Post("/withdrawal/{id}/submit", h.WithdrawalSubmitApproval)
	r.Post("/withdrawal/{id}/return", h.WithdrawalReturn)
	r.Get("/withdrawal/get/{orgID}", h.WithdrawalGet)
	r.Get("/withdrawal/get/detail/{withdrawalID}", h.WithdrawalDetail)

	r.Get("/approval/pending", h.ListPendingApprovals)
	r.Get("/approval/get/{id}", h.GetApprovalInstance)
	r.Post("/approval/action/{id}", h.ApprovalAction)
	r.Get("/transfer/list", h.ListTransfers)
	r.Post("/transfer/create", h.CreateTransfer)
	r.Post("/transfer/submit/{id}", h.TransferSubmitApproval)
	r.Post("/transfer/accept/{id}", h.AcceptTransferAtTarget)
	r.Get("/organization/transfer-targets", h.ListTransferTargets)
	r.Get("/organization/children", h.ListChildOrganizations)

	// Asset LOV & repair
	r.Get("/asset/get_by/get", h.AssetGetByList)
	r.Get("/asset/source_fund/get", h.AssetSourceFundList)
	r.Get("/asset/repair/get", h.AssetRepairGet)
	r.Post("/asset/repair/create", h.AssetRepairCreate)
	r.Post("/asset/repair/submit/{id}", h.RepairSubmitApproval)
	r.Post("/asset/repair/complete/{id}", h.RepairComplete)
	r.Post("/withdrawal/issue/{id}", h.WithdrawalIssue)
	r.Get("/withdrawal/verify/{token}", h.WithdrawalVerifyByToken)
	r.Patch("/asset/repair/update/{id}", h.AssetRepairUpdate)
	r.Patch("/asset/repair/delete/{id}", h.AssetRepairDelete)
	r.Get("/asset/status/get_all", h.CompatCategories) // alias statuses via reference

	// Organization limits & menu
	r.Get("/organization/record_limit/get/{orgID}", h.OrgRecordLimit)
	r.Get("/organization/storage_limit/get/{orgID}", h.OrgStorageLimit)
	r.Get("/organization/user_limit/get/{orgID}", h.OrgUserLimit)
	r.Get("/organization/officer_limit/get/{orgID}", h.OrgOfficerLimit)
	r.Get("/organization/menu/get/{orgID}", h.OrgMenuGet)
	r.Get("/organization/get_dept_position/{orgID}", h.OrgDeptPosition)
	r.Post("/organization/assign_role", h.OrgAssignRole)
	r.Post("/organization/verify", h.OrgVerify)
	r.Get("/organization/get/{page}/{pageSize}", h.OrgListPaged)
	r.Get("/organization/department/get", h.OrgDepartmentsGet)
	r.Get("/organization/institute/get", h.OrgInstitutesGet)
	r.Get("/organization/section/get", h.OrgSectionsGet)

	// Facility
	r.Get("/facility/building/get/{orgID}", h.FacilityBuildings)
	r.Get("/facility/room/get", h.FacilityRooms)

	// Master geo
	r.Get("/master/prefix", h.MasterPrefix)
	r.Get("/master/province", h.MasterProvince)
	r.Get("/master/district/{provinceID}", h.MasterDistrict)
	r.Get("/master/subdistrict/{districtID}", h.MasterSubdistrict)

	// User
	r.Get("/user/search", h.UserSearch)
	r.Get("/user/get_one/{userID}", h.UserGetOne)
	r.Patch("/user/update/{userID}", h.UserUpdate)
	r.Get("/user/organization/{orgID}/{page}/{pageSize}", h.UserOrgList)
	r.Get("/user/role/{orgID}", h.UserRoles)
	r.Patch("/user/organization/update/{relationID}", h.UserOrgUpdate)
	r.Patch("/user/organization/toggle_active", h.UserOrgToggle)
	r.Patch("/user/organization/delete", h.UserOrgDelete)
	r.Post("/user/organization/create", h.UserOrgCreate)

	// Dashboard extras
	r.Get("/dashboard/initial-data/{orgID}", h.DashboardInitialData)
	r.Get("/dashboard/repair/summary", h.DashboardRepairSummary)

	// Auth
	r.Post("/auth/switch-organization", h.AuthSwitchOrg)

	// Super admin
	r.Get("/superAdmin/general/stats", h.SuperAdminStats)
	r.Get("/superAdmin/orgMenu/all", h.SuperAdminOrgMenuAll)
	r.Get("/superAdmin/orgMenu/get", h.SuperAdminOrgMenuGet)

	// Live session stub
	r.Get("/live-sessions/count", h.LiveSessionCount)
}

func (h *Handler) orgFromRoute(w http.ResponseWriter, r *http.Request, param string) (int64, bool) {
	orgID, _ := strconv.ParseInt(chi.URLParam(r, param), 10, 64)
	if orgID == 0 {
		return orgIDFromQueryOrClaims(r)
	}
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

func auditJobsPayload(h *Handler, r *http.Request, orgID int64, status string) map[string]any {
	ongoing, _ := h.store.ListAuditJobs(r.Context(), orgID, status)
	if status == "" {
		ongoing, _ = h.store.ListAuditJobs(r.Context(), orgID, "ongoing")
	}
	return map[string]any{"data": ongoing, "total": len(ongoing)}
}

func (h *Handler) AuditJobs(w http.ResponseWriter, r *http.Request) {
	orgID, ok := h.orgFromRoute(w, r, "orgID")
	if !ok {
		return
	}
	writeJSON(w, http.StatusOK, auditJobsPayload(h, r, orgID, ""))
}

func (h *Handler) AuditSummary(w http.ResponseWriter, r *http.Request) {
	orgID, ok := h.orgFromRoute(w, r, "orgID")
	if !ok {
		return
	}
	jobs, _ := h.store.ListAuditJobs(r.Context(), orgID, "ongoing")
	writeJSON(w, http.StatusOK, map[string]any{
		"data": map[string]any{
			"totalJobs":     len(jobs),
			"checkedAssets": 0,
			"totalAssets":   0,
			"progress":      0,
		},
	})
}

func (h *Handler) AuditStatus(w http.ResponseWriter, r *http.Request) {
	orgID, ok := h.orgFromRoute(w, r, "orgID")
	if !ok {
		return
	}
	ongoing, _ := h.store.ListAuditJobs(r.Context(), orgID, "ongoing")
	items := make([]map[string]any, 0, len(ongoing))
	for _, j := range ongoing {
		items = append(items, map[string]any{"status": j.Status, "count": 1, "label": j.Title})
	}
	writeJSON(w, http.StatusOK, map[string]any{"data": items})
}

func (h *Handler) AuditAssetsChecked(w http.ResponseWriter, r *http.Request) {
	h.auditAssetTable(w, r, "checked")
}

func (h *Handler) AuditAssetsNotChecked(w http.ResponseWriter, r *http.Request) {
	h.auditAssetTable(w, r, "not_checked")
}

func (h *Handler) AuditAssetsNotFound(w http.ResponseWriter, r *http.Request) {
	h.auditAssetTable(w, r, "not_found")
}

func (h *Handler) auditAssetTable(w http.ResponseWriter, r *http.Request, kind string) {
	orgID, ok := h.orgFromRoute(w, r, "orgID")
	if !ok {
		return
	}
	res, _ := h.store.ListAssetsPaged(r.Context(), orgID, 1, 50, store.AssetFilter{})
	items := make([]map[string]any, 0)
	if res != nil {
		for _, a := range res.Data {
			items = append(items, toCompatAsset(a))
		}
	}
	_ = kind
	writeJSON(w, http.StatusOK, map[string]any{"data": items, "total": len(items)})
}

func (h *Handler) AuditStartData(w http.ResponseWriter, r *http.Request) {
	orgID, ok := h.orgFromRoute(w, r, "orgID")
	if !ok {
		return
	}
	ref := h.buildCompatReference(r.Context(), orgID)
	writeJSON(w, http.StatusOK, map[string]any{
		"data": map[string]any{
			"categories": ref["categories"],
			"buildings":  ref["buildings"],
			"rooms":      ref["rooms"],
		},
	})
}

func (h *Handler) AuditOngoingData(w http.ResponseWriter, r *http.Request) {
	orgID, ok := h.orgFromRoute(w, r, "orgID")
	if !ok {
		return
	}
	ongoing, _ := h.store.ListAuditJobs(r.Context(), orgID, "ongoing")
	writeJSON(w, http.StatusOK, map[string]any{"data": ongoing})
}

func (h *Handler) AuditHistoryData(w http.ResponseWriter, r *http.Request) {
	orgID, ok := h.orgFromRoute(w, r, "orgID")
	if !ok {
		return
	}
	history, _ := h.store.ListAuditJobs(r.Context(), orgID, "completed")
	writeJSON(w, http.StatusOK, map[string]any{"data": history})
}

func (h *Handler) CheckJobStart(w http.ResponseWriter, r *http.Request) {
	orgID, _ := strconv.ParseInt(chi.URLParam(r, "organizationID"), 10, 64)
	claims, ok := claimsFromContext(r.Context())
	if !ok {
		writeError(w, http.StatusUnauthorized, "unauthorized")
		return
	}
	if orgID == 0 {
		orgID = claims.OrganizationID
	}
	var body struct {
		JobName string `json:"jobName"`
	}
	_ = json.NewDecoder(r.Body).Decode(&body)
	if body.JobName == "" {
		body.JobName = "งานตรวจนับ"
	}
	id, err := h.store.CreateCheckJob(r.Context(), orgID, body.JobName)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "start failed")
		return
	}
	writeJSON(w, http.StatusOK, map[string]any{"data": map[string]any{"id": id, "jobName": body.JobName, "status": "ongoing"}})
}

func (h *Handler) CheckJobAssets(w http.ResponseWriter, r *http.Request) {
	claims, ok := claimsFromContext(r.Context())
	if !ok {
		writeError(w, http.StatusUnauthorized, "unauthorized")
		return
	}
	jobID, _ := strconv.ParseInt(chi.URLParam(r, "jobID"), 10, 64)
	res, _ := h.store.ListAssetsPaged(r.Context(), claims.OrganizationID, 1, 500, store.AssetFilter{})
	items := make([]map[string]any, 0)
	if res != nil {
		for _, a := range res.Data {
			items = append(items, map[string]any{
				"assetID": a.ID, "assetNumber": a.AssetNumber, "assetName": a.AssetName,
				"rfidNum": a.RFIDNum, "isChecked": false, "jobID": jobID,
			})
		}
	}
	writeJSON(w, http.StatusOK, map[string]any{"data": items})
}

func (h *Handler) CheckJobIsCount(w http.ResponseWriter, r *http.Request) {
	jobID, _ := strconv.ParseInt(chi.URLParam(r, "jobID"), 10, 64)
	claims, ok := claimsFromContext(r.Context())
	if !ok {
		writeError(w, http.StatusUnauthorized, "unauthorized")
		return
	}
	_ = h.store.UpdateCheckJob(r.Context(), claims.OrganizationID, jobID, "ongoing", 50)
	writeJSON(w, http.StatusOK, map[string]any{"data": map[string]string{"status": "ok"}, "rfid": chi.URLParam(r, "rfid")})
}

func (h *Handler) CheckJobImageStore(w http.ResponseWriter, r *http.Request) {
	writeJSON(w, http.StatusOK, map[string]any{"data": map[string]string{"status": "ok"}})
}

func (h *Handler) CheckJobNote(w http.ResponseWriter, r *http.Request) {
	writeJSON(w, http.StatusOK, map[string]any{"data": map[string]string{"status": "ok"}})
}

func (h *Handler) CheckJobStop(w http.ResponseWriter, r *http.Request) {
	jobID, _ := strconv.ParseInt(chi.URLParam(r, "jobID"), 10, 64)
	claims, ok := claimsFromContext(r.Context())
	if !ok {
		writeError(w, http.StatusUnauthorized, "unauthorized")
		return
	}
	_ = h.store.UpdateCheckJob(r.Context(), claims.OrganizationID, jobID, "completed", 100)
	writeJSON(w, http.StatusOK, map[string]any{"data": map[string]string{"status": "ok"}})
}

func (h *Handler) CheckJobUpdate(w http.ResponseWriter, r *http.Request) {
	jobID, _ := strconv.ParseInt(chi.URLParam(r, "jobID"), 10, 64)
	claims, ok := claimsFromContext(r.Context())
	if !ok {
		writeError(w, http.StatusUnauthorized, "unauthorized")
		return
	}
	var body struct {
		JobName  string `json:"jobName"`
		Status   string `json:"status"`
		Progress int    `json:"progress"`
	}
	_ = json.NewDecoder(r.Body).Decode(&body)
	_ = h.store.UpdateCheckJob(r.Context(), claims.OrganizationID, jobID, body.Status, body.Progress)
	writeJSON(w, http.StatusOK, map[string]string{"status": "ok"})
}

func (h *Handler) CheckJobDelete(w http.ResponseWriter, r *http.Request) {
	jobID, _ := strconv.ParseInt(chi.URLParam(r, "jobID"), 10, 64)
	claims, ok := claimsFromContext(r.Context())
	if !ok {
		writeError(w, http.StatusUnauthorized, "unauthorized")
		return
	}
	_ = h.store.DeleteCheckJob(r.Context(), claims.OrganizationID, jobID)
	writeJSON(w, http.StatusOK, map[string]string{"status": "ok"})
}

func (h *Handler) CheckJobExport(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "text/csv")
	w.Write([]byte("job_id,asset_number,status\n"))
}

func (h *Handler) WithdrawalAssetList(w http.ResponseWriter, r *http.Request) {
	orgID, ok := orgIDFromQueryOrClaims(r)
	if !ok {
		writeError(w, http.StatusUnauthorized, "unauthorized")
		return
	}
	res, _ := h.store.ListAssetsPaged(r.Context(), orgID, 1, 200, store.AssetFilter{})
	writeJSON(w, http.StatusOK, map[string]any{"data": toCompatAssets(res.Data), "total": res.Total})
}

func (h *Handler) withdrawalRequest(w http.ResponseWriter, r *http.Request, internal bool) {
	orgID, ok := orgIDFromQueryOrClaims(r)
	if !ok {
		writeError(w, http.StatusUnauthorized, "unauthorized")
		return
	}
	var body struct {
		RequesterName string `json:"requesterName"`
		ItemName      string `json:"itemName"`
		AssetID       int64  `json:"assetID"`
		ComponentID   int64  `json:"componentID"`
		UserID        int64  `json:"userID"`
		Type          any    `json:"type"`
		DesireReturn  string `json:"desireReturn"`
		Note          string `json:"note"`
		Submit        bool   `json:"submit"`
	}
	_ = json.NewDecoder(r.Body).Decode(&body)
	wType := "borrow"
	if t, ok := body.Type.(float64); ok && int(t) == 0 {
		wType = "withdraw"
	}
	if t, ok := body.Type.(string); ok && t == "withdraw" {
		wType = "withdraw"
	}
	itemName := body.ItemName
	if itemName == "" && body.AssetID > 0 {
		itemName = fmt.Sprintf("asset:%d", body.AssetID)
	}
	var due *time.Time
	if body.DesireReturn != "" {
		if t, err := time.Parse(time.RFC3339, body.DesireReturn); err == nil {
			due = &t
		}
	}
	claims, _ := claimsFromContext(r.Context())
	reqBy := int64(0)
	if claims != nil {
		reqBy = claims.UserID
	}
	id, err := h.store.CreateWithdrawalEx(r.Context(), orgID, store.WithdrawalInput{
		RequesterName: body.RequesterName,
		ItemName:      itemName,
		AssetID:       body.AssetID,
		ComponentID:   body.ComponentID,
		UserID:        body.UserID,
		Type:          wType,
		DueDate:       due,
		Note:          body.Note,
		Internal:      internal,
	})
	if err != nil {
		writeError(w, http.StatusInternalServerError, "request failed")
		return
	}
	submit := body.Submit
	if !submit {
		submit = true
	}
	if submit && claims != nil {
		_ = h.store.SubmitWithdrawalForApproval(r.Context(), orgID, id, reqBy)
	}
	if h.dispatcher != nil {
		var recipients []int64
		if claims != nil {
			recipients = []int64{claims.UserID}
		}
		_ = h.dispatcher.Dispatch(r.Context(), notify.Event{
			OrganizationID: orgID,
			UserIDs:        recipients,
			EventType:      "withdrawal.requested",
			Title:          "คำขอเบิก/ยืมใหม่",
			Body:           fmt.Sprintf("%s ขอเบิก %s", body.RequesterName, itemName),
			Link:           "/approval-queue",
			RefType:        "withdrawal",
			RefID:          id,
		})
	}
	writeJSON(w, http.StatusOK, map[string]any{"data": map[string]int64{"id": id}})
}

func (h *Handler) WithdrawalInternalRequest(w http.ResponseWriter, r *http.Request) {
	h.withdrawalRequest(w, r, true)
}

func (h *Handler) WithdrawalExternalRequest(w http.ResponseWriter, r *http.Request) {
	h.withdrawalRequest(w, r, false)
}

func (h *Handler) withdrawalList(w http.ResponseWriter, r *http.Request, orgID int64) {
	rows, _ := h.store.ListWithdrawals(r.Context(), orgID, "")
	out := make([]map[string]any, 0, len(rows))
	for _, row := range rows {
		out = append(out, map[string]any{
			"id":            row.ID,
			"requesterName": row.Title,
			"itemName":      row.Subtitle,
			"status":        row.Status,
			"createdAt":     row.CreatedAt,
			"assetNumber":   row.Subtitle,
		})
	}
	writeJSON(w, http.StatusOK, map[string]any{"data": out})
}

func (h *Handler) WithdrawalInternalGet(w http.ResponseWriter, r *http.Request) {
	orgID, ok := h.orgFromRoute(w, r, "orgID")
	if !ok {
		return
	}
	h.withdrawalList(w, r, orgID)
}

func (h *Handler) WithdrawalExternalGet(w http.ResponseWriter, r *http.Request) {
	h.WithdrawalInternalGet(w, r)
}

func (h *Handler) WithdrawalHistory(w http.ResponseWriter, r *http.Request) {
	h.WithdrawalInternalGet(w, r)
}

func (h *Handler) withdrawalConfirm(w http.ResponseWriter, r *http.Request, approve bool) {
	claims, ok := claimsFromContext(r.Context())
	if !ok {
		writeError(w, http.StatusUnauthorized, "unauthorized")
		return
	}
	id, _ := strconv.ParseInt(chi.URLParam(r, "requestID"), 10, 64)
	status := "approved"
	if !approve {
		status = "rejected"
	}
	_ = h.store.UpdateWithdrawalStatus(r.Context(), claims.OrganizationID, id, status)
	if h.dispatcher != nil && approve {
		_ = h.dispatcher.Dispatch(r.Context(), notify.Event{
			OrganizationID: claims.OrganizationID,
			UserIDs:        []int64{claims.UserID},
			EventType:      "withdrawal.approved",
			Title:          "อนุมัติคำขอเบิก/ยืมแล้ว",
			Body:           fmt.Sprintf("คำขอ #%d ได้รับการอนุมัติ", id),
			Link:           "/withdrawal-approval",
			RefType:        "withdrawal",
			RefID:          id,
		})
	}
	writeJSON(w, http.StatusOK, map[string]any{"data": map[string]string{"status": status}})
}

func (h *Handler) WithdrawalInternalConfirm(w http.ResponseWriter, r *http.Request) {
	h.withdrawalConfirm(w, r, true)
}

func (h *Handler) WithdrawalExternalConfirm(w http.ResponseWriter, r *http.Request) {
	h.withdrawalConfirm(w, r, true)
}

func (h *Handler) WithdrawalTake(w http.ResponseWriter, r *http.Request) {
	h.WithdrawalIssue(w, r)
}

func (h *Handler) WithdrawalGet(w http.ResponseWriter, r *http.Request) {
	h.WithdrawalInternalGet(w, r)
}

func (h *Handler) WithdrawalDetail(w http.ResponseWriter, r *http.Request) {
	claims, ok := claimsFromContext(r.Context())
	if !ok {
		writeError(w, http.StatusUnauthorized, "unauthorized")
		return
	}
	id, _ := strconv.ParseInt(chi.URLParam(r, "withdrawalID"), 10, 64)
	rows, _ := h.store.ListWithdrawals(r.Context(), claims.OrganizationID, "")
	for _, row := range rows {
		if row.ID == id {
			writeJSON(w, http.StatusOK, map[string]any{"data": row})
			return
		}
	}
	writeError(w, http.StatusNotFound, "not found")
}

func mustLOV(h *Handler, ctx context.Context, getBy bool) []store.Row {
	if getBy {
		rows, _ := h.store.ListLOVGetBy(ctx)
		return rows
	}
	rows, _ := h.store.ListLOVSourceFund(ctx)
	return rows
}

func lovRowsToMaps(rows []store.Row) []map[string]any {
	out := make([]map[string]any, 0, len(rows))
	for _, r := range rows {
		if !rowIDValid(r) {
			continue
		}
		out = append(out, map[string]any{"id": r.ID, "name": r.Title, "label": r.Title})
	}
	return out
}

func (h *Handler) AssetGetByList(w http.ResponseWriter, r *http.Request) {
	rows, _ := h.store.ListLOVGetBy(r.Context())
	writeJSON(w, http.StatusOK, map[string]any{"data": lovRowsToMaps(rows)})
}

func (h *Handler) AssetSourceFundList(w http.ResponseWriter, r *http.Request) {
	rows, _ := h.store.ListLOVSourceFund(r.Context())
	writeJSON(w, http.StatusOK, map[string]any{"data": lovRowsToMaps(rows)})
}

func (h *Handler) AssetRepairGet(w http.ResponseWriter, r *http.Request) {
	orgID, ok := orgIDFromQueryOrClaims(r)
	if !ok {
		writeError(w, http.StatusUnauthorized, "unauthorized")
		return
	}
	rows, _ := h.store.ListRepairs(r.Context(), orgID)
	writeJSON(w, http.StatusOK, map[string]any{"data": rows})
}

func (h *Handler) AssetRepairCreate(w http.ResponseWriter, r *http.Request) {
	h.RepairCreateWithApproval(w, r)
}

func (h *Handler) AssetRepairUpdate(w http.ResponseWriter, r *http.Request) {
	writeJSON(w, http.StatusOK, map[string]string{"status": "ok"})
}

func (h *Handler) AssetRepairDelete(w http.ResponseWriter, r *http.Request) {
	writeJSON(w, http.StatusOK, map[string]string{"status": "ok"})
}

func (h *Handler) OrgDepartmentsGet(w http.ResponseWriter, r *http.Request) {
	orgID, ok := orgIDFromQueryOrClaims(r)
	if !ok {
		writeError(w, http.StatusUnauthorized, "unauthorized")
		return
	}
	depts, _ := h.store.ListDepartments(r.Context(), orgID)
	writeJSON(w, http.StatusOK, map[string]any{"departments": departmentsToMaps(depts)})
}

func (h *Handler) OrgInstitutesGet(w http.ResponseWriter, r *http.Request) {
	orgID, ok := orgIDFromQueryOrClaims(r)
	if !ok {
		writeError(w, http.StatusUnauthorized, "unauthorized")
		return
	}
	inst, _ := h.store.ListInstitutes(r.Context(), orgID)
	writeJSON(w, http.StatusOK, rowsToNamed(inst, "institute_name"))
}

func (h *Handler) OrgSectionsGet(w http.ResponseWriter, r *http.Request) {
	orgID, ok := orgIDFromQueryOrClaims(r)
	if !ok {
		writeError(w, http.StatusUnauthorized, "unauthorized")
		return
	}
	secs, _ := h.store.ListSections(r.Context(), orgID)
	writeJSON(w, http.StatusOK, rowsToNamed(secs, "section_name"))
}

func (h *Handler) OrgRecordLimit(w http.ResponseWriter, r *http.Request) {
	orgID, _ := strconv.ParseInt(chi.URLParam(r, "orgID"), 10, 64)
	v, _ := h.store.OrgLimit(r.Context(), orgID, "record")
	writeJSON(w, http.StatusOK, map[string]any{"data": v})
}

func (h *Handler) OrgStorageLimit(w http.ResponseWriter, r *http.Request) {
	orgID, _ := strconv.ParseInt(chi.URLParam(r, "orgID"), 10, 64)
	v, _ := h.store.OrgLimit(r.Context(), orgID, "storage")
	writeJSON(w, http.StatusOK, map[string]any{"data": v})
}

func (h *Handler) OrgUserLimit(w http.ResponseWriter, r *http.Request) {
	orgID, _ := strconv.ParseInt(chi.URLParam(r, "orgID"), 10, 64)
	v, _ := h.store.OrgLimit(r.Context(), orgID, "user")
	writeJSON(w, http.StatusOK, map[string]any{"data": v})
}

func (h *Handler) OrgOfficerLimit(w http.ResponseWriter, r *http.Request) {
	orgID, _ := strconv.ParseInt(chi.URLParam(r, "orgID"), 10, 64)
	v, _ := h.store.OrgLimit(r.Context(), orgID, "officer")
	writeJSON(w, http.StatusOK, map[string]any{"data": v})
}

func (h *Handler) OrgMenuGet(w http.ResponseWriter, r *http.Request) {
	orgID, _ := strconv.ParseInt(chi.URLParam(r, "orgID"), 10, 64)
	ids, _ := h.store.OrgMenus(r.Context(), orgID)
	names, _ := h.store.ListMenuNames(r.Context())
	items := make([]map[string]any, 0, len(ids))
	for _, id := range ids {
		label := names[id]
		if label == "" {
			label = "เมนู"
		}
		items = append(items, map[string]any{"menuID": id, "menuName": label, "enabled": true})
	}
	writeJSON(w, http.StatusOK, map[string]any{"data": items})
}

func (h *Handler) OrgDeptPosition(w http.ResponseWriter, r *http.Request) {
	orgID, ok := h.orgFromRoute(w, r, "orgID")
	if !ok {
		return
	}
	dept, _ := h.store.ListDepartments(r.Context(), orgID)
	pos, _ := h.store.ListPositions(r.Context(), orgID)
	writeJSON(w, http.StatusOK, map[string]any{"departments": dept, "positions": pos})
}

func (h *Handler) OrgAssignRole(w http.ResponseWriter, r *http.Request) {
	writeJSON(w, http.StatusOK, map[string]string{"status": "ok"})
}

func (h *Handler) OrgVerify(w http.ResponseWriter, r *http.Request) {
	writeJSON(w, http.StatusOK, map[string]string{"status": "ok"})
}

func (h *Handler) OrgListPaged(w http.ResponseWriter, r *http.Request) {
	rows, _ := h.store.ListOrganizations(r.Context())
	writeJSON(w, http.StatusOK, map[string]any{"data": rows, "total": len(rows)})
}

func (h *Handler) FacilityBuildings(w http.ResponseWriter, r *http.Request) {
	orgID, ok := h.orgFromRoute(w, r, "orgID")
	if !ok {
		return
	}
	rows, _ := h.store.ListBuildings(r.Context(), orgID)
	out := make([]map[string]any, 0, len(rows))
	for _, row := range rows {
		out = append(out, rowToBuilding(row))
	}
	writeJSON(w, http.StatusOK, out)
}

func (h *Handler) FacilityRooms(w http.ResponseWriter, r *http.Request) {
	orgID, ok := orgIDFromQueryOrClaims(r)
	if !ok {
		writeError(w, http.StatusUnauthorized, "unauthorized")
		return
	}
	rows, _ := h.store.ListRooms(r.Context(), orgID)
	out := make([]map[string]any, 0, len(rows))
	for _, row := range rows {
		out = append(out, rowToRoom(row))
	}
	writeJSON(w, http.StatusOK, out)
}

func (h *Handler) MasterPrefix(w http.ResponseWriter, r *http.Request) {
	writeJSON(w, http.StatusOK, []map[string]any{{"id": 1, "name": "นาย"}, {"id": 2, "name": "นาง"}, {"id": 3, "name": "นางสาว"}})
}

func (h *Handler) MasterProvince(w http.ResponseWriter, r *http.Request) {
	rows, _ := h.store.ListProvinces(r.Context())
	writeJSON(w, http.StatusOK, lovRowsToMaps(rows))
}

func (h *Handler) MasterDistrict(w http.ResponseWriter, r *http.Request) {
	pid, _ := strconv.ParseInt(chi.URLParam(r, "provinceID"), 10, 64)
	rows, _ := h.store.ListDistricts(r.Context(), pid)
	writeJSON(w, http.StatusOK, lovRowsToMaps(rows))
}

func (h *Handler) MasterSubdistrict(w http.ResponseWriter, r *http.Request) {
	did, _ := strconv.ParseInt(chi.URLParam(r, "districtID"), 10, 64)
	rows, _ := h.store.ListSubdistricts(r.Context(), did)
	writeJSON(w, http.StatusOK, lovRowsToMaps(rows))
}

func (h *Handler) UserSearch(w http.ResponseWriter, r *http.Request) {
	h.UserInitialData(w, r)
}

func (h *Handler) UserGetOne(w http.ResponseWriter, r *http.Request) {
	claims, ok := claimsFromContext(r.Context())
	if !ok {
		writeError(w, http.StatusUnauthorized, "unauthorized")
		return
	}
	uid, _ := strconv.ParseInt(chi.URLParam(r, "userID"), 10, 64)
	users, _ := h.store.ListUsers(r.Context(), claims.OrganizationID)
	for _, u := range users {
		if u.ID == uid {
			writeJSON(w, http.StatusOK, map[string]any{"data": rowToUser(u)})
			return
		}
	}
	writeError(w, http.StatusNotFound, "not found")
}

func (h *Handler) UserUpdate(w http.ResponseWriter, r *http.Request) {
	writeJSON(w, http.StatusOK, map[string]string{"status": "ok"})
}

func (h *Handler) UserOrgList(w http.ResponseWriter, r *http.Request) {
	h.UserInitialData(w, r)
}

func (h *Handler) UserRoles(w http.ResponseWriter, r *http.Request) {
	writeJSON(w, http.StatusOK, []map[string]any{
		{"id": 1, "name": "Super Admin"},
		{"id": 2, "name": "Admin"},
		{"id": 3, "name": "Officer"},
		{"id": 4, "name": "Member"},
	})
}

func (h *Handler) UserOrgUpdate(w http.ResponseWriter, r *http.Request) {
	writeJSON(w, http.StatusOK, map[string]string{"status": "ok"})
}

func (h *Handler) UserOrgToggle(w http.ResponseWriter, r *http.Request) {
	writeJSON(w, http.StatusOK, map[string]string{"status": "ok"})
}

func (h *Handler) UserOrgDelete(w http.ResponseWriter, r *http.Request) {
	writeJSON(w, http.StatusOK, map[string]string{"status": "ok"})
}

func (h *Handler) UserOrgCreate(w http.ResponseWriter, r *http.Request) {
	writeJSON(w, http.StatusOK, map[string]any{"data": map[string]string{"status": "ok"}})
}

func (h *Handler) DashboardInitialData(w http.ResponseWriter, r *http.Request) {
	orgID, ok := h.compatOrgID(w, r)
	if !ok {
		return
	}
	b, ok2 := h.writeDashboardBundle(w, r, orgID)
	if !ok2 {
		return
	}
	writeJSON(w, http.StatusOK, map[string]any{"data": dashboardInitialPayload(b)})
}

func (h *Handler) DashboardRepairSummary(w http.ResponseWriter, r *http.Request) {
	h.CompatRepairInitialData(w, r)
}

func (h *Handler) AuthSwitchOrg(w http.ResponseWriter, r *http.Request) {
	writeJSON(w, http.StatusOK, map[string]string{"status": "ok"})
}

func (h *Handler) SuperAdminOrgMenuAll(w http.ResponseWriter, r *http.Request) {
	names, _ := h.store.ListMenuNames(r.Context())
	items := make([]map[string]any, 0, len(names))
	for id, name := range names {
		items = append(items, map[string]any{"id": id, "menuName": name})
	}
	writeJSON(w, http.StatusOK, items)
}

func (h *Handler) SuperAdminOrgMenuGet(w http.ResponseWriter, r *http.Request) {
	h.SuperAdminOrgMenuAll(w, r)
}

func (h *Handler) LiveSessionCount(w http.ResponseWriter, r *http.Request) {
	writeJSON(w, http.StatusOK, map[string]int{"count": 0})
}
