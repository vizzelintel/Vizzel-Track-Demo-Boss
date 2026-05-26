package store

import (
	"context"
	"fmt"
	"time"
)

type WorkflowStep struct {
	StepOrder      int    `json:"stepOrder"`
	StepKey        string `json:"stepKey"`
	LabelTH        string `json:"labelTh"`
	RequiresBranch string `json:"requiresBranch,omitempty"`
}

type ApprovalInstance struct {
	ID             int64      `json:"id"`
	OrganizationID int64      `json:"organizationId"`
	WorkflowCode   string     `json:"workflowCode"`
	RefType        string     `json:"refType"`
	RefID          int64      `json:"refId"`
	Status         string     `json:"status"`
	CurrentStep    int        `json:"currentStep"`
	Branch         string     `json:"branch,omitempty"`
	RequestedBy    int64      `json:"requestedBy,omitempty"`
	CreatedAt      time.Time  `json:"createdAt"`
	UpdatedAt      *time.Time `json:"updatedAt,omitempty"`
	CompletedAt    *time.Time `json:"completedAt,omitempty"`
	Steps             []WorkflowStep `json:"steps,omitempty"`
	Logs              []ApprovalStepLog `json:"logs,omitempty"`
	CurrentStepKey    string `json:"currentStepKey,omitempty"`
	CurrentStepLabel  string `json:"currentStepLabel,omitempty"`
	CanAct            bool   `json:"canAct,omitempty"`
}

type ApprovalStepLog struct {
	ID          int64     `json:"id"`
	InstanceID  int64     `json:"instanceId"`
	StepOrder   int       `json:"stepOrder"`
	StepKey     string    `json:"stepKey"`
	ActorUserID int64     `json:"actorUserId,omitempty"`
	Action      string    `json:"action"`
	Branch      string    `json:"branch,omitempty"`
	Note        string    `json:"note,omitempty"`
	CreatedAt   time.Time `json:"createdAt"`
}

type RepairRecord struct {
	ID                 int64  `json:"id"`
	AssetID            int64  `json:"assetId"`
	AssetNumber        string `json:"assetNumber"`
	Note               string `json:"note"`
	Symptom            string `json:"symptom,omitempty"`
	Status             string `json:"status"`
	ApprovalInstanceID int64  `json:"approvalInstanceId,omitempty"`
	CreatedAt          string `json:"createdAt"`
}

type WithdrawalInput struct {
	RequesterName string
	ItemName      string
	AssetID       int64
	UserID        int64
	Type          string
	DueDate       *time.Time
	Note          string
	Internal      bool
}

type RepairInput struct {
	AssetNumber string
	Note        string
	Symptom     string
	RequestedBy int64
}

type TransferInput struct {
	AssetID       int64
	ComponentID   int64
	TransferType  string
	ToInstituteID int64
	ToDeptID      int64
	ToSectionID   int64
	ToUserID      int64
	Reason        string
	RequestedBy   int64
}

type TransferRecord struct {
	ID                 int64  `json:"id"`
	AssetID            int64  `json:"assetId"`
	AssetNumber        string `json:"assetNumber,omitempty"`
	ComponentID        int64  `json:"componentId,omitempty"`
	TransferType       string `json:"transferType"`
	Status             string `json:"status"`
	Reason             string `json:"reason,omitempty"`
	ApprovalInstanceID int64  `json:"approvalInstanceId,omitempty"`
	CreatedAt          string `json:"createdAt"`
}

func (s *postgresStore) approvalEnabled(ctx context.Context) bool {
	return s.tabOpsEnabled(ctx)
}

func (s *postgresStore) workflowSteps(ctx context.Context, code string) ([]WorkflowStep, error) {
	rows, err := s.pool.Query(ctx,
		`SELECT s.step_order, s.step_key, s.label_th, COALESCE(s.requires_branch,'')
		 FROM tab_approval_workflow_step s
		 JOIN tab_approval_workflow w ON w.id = s.workflow_id
		 WHERE w.code = $1 ORDER BY s.step_order`,
		code,
	)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var out []WorkflowStep
	for rows.Next() {
		var st WorkflowStep
		if err := rows.Scan(&st.StepOrder, &st.StepKey, &st.LabelTH, &st.RequiresBranch); err != nil {
			return nil, err
		}
		out = append(out, st)
	}
	return out, rows.Err()
}

func nextApplicableStep(steps []WorkflowStep, fromOrder int, branch string) (int, bool) {
	for _, st := range steps {
		if st.StepOrder <= fromOrder {
			continue
		}
		if st.RequiresBranch != "" && st.RequiresBranch != branch {
			continue
		}
		return st.StepOrder, true
	}
	return 0, false
}

func (s *postgresStore) CreateApprovalInstance(ctx context.Context, orgID int64, workflowCode, refType string, refID, requestedBy int64) (int64, error) {
	if !s.approvalEnabled(ctx) {
		return 0, fmt.Errorf("approval not available")
	}
	var id int64
	err := s.pool.QueryRow(ctx,
		`INSERT INTO tab_approval_instance (organization_id, workflow_code, ref_type, ref_id, status, current_step, requested_by)
		 VALUES ($1, $2, $3, $4, 'pending', 1, $5) RETURNING id`,
		orgID, workflowCode, refType, refID, nullInt64(requestedBy),
	).Scan(&id)
	return id, err
}

func (s *postgresStore) GetApprovalInstance(ctx context.Context, orgID, id int64) (*ApprovalInstance, error) {
	var inst ApprovalInstance
	err := s.pool.QueryRow(ctx,
		`SELECT id, organization_id, workflow_code, ref_type, ref_id, status, current_step,
		        COALESCE(branch,''), COALESCE(requested_by,0), created_at, updated_at, completed_at
		 FROM tab_approval_instance WHERE id = $1 AND organization_id = $2`,
		id, orgID,
	).Scan(&inst.ID, &inst.OrganizationID, &inst.WorkflowCode, &inst.RefType, &inst.RefID,
		&inst.Status, &inst.CurrentStep, &inst.Branch, &inst.RequestedBy, &inst.CreatedAt,
		&inst.UpdatedAt, &inst.CompletedAt)
	if err != nil {
		return nil, err
	}
	inst.Steps, _ = s.workflowSteps(ctx, inst.WorkflowCode)
	inst.Logs, _ = s.listApprovalLogs(ctx, id)
	return &inst, nil
}

func (s *postgresStore) listApprovalLogs(ctx context.Context, instanceID int64) ([]ApprovalStepLog, error) {
	rows, err := s.pool.Query(ctx,
		`SELECT id, instance_id, step_order, step_key, COALESCE(actor_user_id,0), action,
		        COALESCE(branch,''), COALESCE(note,''), created_at
		 FROM tab_approval_step_log WHERE instance_id = $1 ORDER BY id`,
		instanceID,
	)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var out []ApprovalStepLog
	for rows.Next() {
		var l ApprovalStepLog
		if err := rows.Scan(&l.ID, &l.InstanceID, &l.StepOrder, &l.StepKey, &l.ActorUserID,
			&l.Action, &l.Branch, &l.Note, &l.CreatedAt); err != nil {
			return nil, err
		}
		out = append(out, l)
	}
	return out, rows.Err()
}

func (s *postgresStore) ListPendingApprovals(ctx context.Context, orgID int64) ([]ApprovalInstance, error) {
	rows, err := s.pool.Query(ctx,
		`SELECT i.id, i.organization_id, i.workflow_code, i.ref_type, i.ref_id, i.status, i.current_step,
		        COALESCE(i.branch,''), COALESCE(i.requested_by,0), i.created_at,
		        s.step_key, s.label_th
		 FROM tab_approval_instance i
		 JOIN tab_approval_workflow w ON w.code = i.workflow_code
		 JOIN tab_approval_workflow_step s ON s.workflow_id = w.id AND s.step_order = i.current_step
		 WHERE i.organization_id = $1 AND i.status = 'pending'
		 ORDER BY i.id DESC LIMIT 100`,
		orgID,
	)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var out []ApprovalInstance
	for rows.Next() {
		var inst ApprovalInstance
		if err := rows.Scan(&inst.ID, &inst.OrganizationID, &inst.WorkflowCode, &inst.RefType, &inst.RefID,
			&inst.Status, &inst.CurrentStep, &inst.Branch, &inst.RequestedBy, &inst.CreatedAt,
			&inst.CurrentStepKey, &inst.CurrentStepLabel); err != nil {
			return nil, err
		}
		out = append(out, inst)
	}
	return out, rows.Err()
}

func (s *postgresStore) ApprovalAction(ctx context.Context, orgID, instanceID, actorUserID, actorRoleID int64, action, branch, note string) error {
	inst, err := s.GetApprovalInstance(ctx, orgID, instanceID)
	if err != nil {
		return err
	}
	if inst.Status != "pending" {
		return fmt.Errorf("instance not pending")
	}
	steps, err := s.workflowSteps(ctx, inst.WorkflowCode)
	if err != nil {
		return err
	}
	var current WorkflowStep
	for _, st := range steps {
		if st.StepOrder == inst.CurrentStep {
			current = st
			break
		}
	}
	if current.StepKey == "" {
		return fmt.Errorf("invalid step")
	}
	if !CanActOnApprovalStep(actorRoleID, current.StepKey) {
		return fmt.Errorf("ไม่มีสิทธิ์อนุมัติขั้นตอน %s", stepLabelFor(current.StepKey))
	}
	_, err = s.pool.Exec(ctx,
		`INSERT INTO tab_approval_step_log (instance_id, step_order, step_key, actor_user_id, action, branch, note)
		 VALUES ($1, $2, $3, $4, $5, $6, $7)`,
		instanceID, inst.CurrentStep, current.StepKey, nullInt64(actorUserID), action, branch, note,
	)
	if err != nil {
		return err
	}
	if action == "reject" {
		_, err = s.pool.Exec(ctx,
			`UPDATE tab_approval_instance SET status = 'rejected', updated_at = NOW(), completed_at = NOW() WHERE id = $1`,
			instanceID,
		)
		return s.syncRefStatus(ctx, inst, "rejected")
	}
	branchVal := inst.Branch
	if current.StepKey == "director" && branch != "" {
		branchVal = branch
		_, _ = s.pool.Exec(ctx, `UPDATE tab_approval_instance SET branch = $2, updated_at = NOW() WHERE id = $1`, instanceID, branchVal)
	}
	next, hasNext := nextApplicableStep(steps, inst.CurrentStep, branchVal)
	if current.StepKey == "director" && branchVal == "A" {
		hasNext = false
	}
	if !hasNext {
		_, err = s.pool.Exec(ctx,
			`UPDATE tab_approval_instance SET status = 'approved', current_step = $2, updated_at = NOW(), completed_at = NOW() WHERE id = $1`,
			instanceID, inst.CurrentStep,
		)
		if err != nil {
			return err
		}
		return s.syncRefStatus(ctx, inst, "approved")
	}
	_, err = s.pool.Exec(ctx,
		`UPDATE tab_approval_instance SET current_step = $2, branch = COALESCE(NULLIF($3,''), branch), updated_at = NOW() WHERE id = $1`,
		instanceID, next, branchVal,
	)
	return err
}

func (s *postgresStore) syncRefStatus(ctx context.Context, inst *ApprovalInstance, approvalStatus string) error {
	refStatus := "rejected"
	if approvalStatus == "approved" {
		refStatus = "approved"
	}
	switch inst.RefType {
	case "repair":
		repairStatus := "rejected"
		if approvalStatus == "approved" {
			repairStatus = "in_progress"
		}
		_, err := s.pool.Exec(ctx, `UPDATE tab_asset_repair SET status = $2, updated_at = NOW() WHERE id = $1`, inst.RefID, repairStatus)
		return err
	case "withdrawal":
		wStatus := "rejected"
		if approvalStatus == "approved" {
			wStatus = "approved"
		}
		_, err := s.pool.Exec(ctx,
			`UPDATE tab_internal_request_withdrawal SET status = $2 WHERE id = $1`,
			inst.RefID, wStatus,
		)
		return err
	case "transfer":
		tStatus := "rejected"
		if approvalStatus == "approved" {
			tStatus = "approved"
		}
		_, err := s.pool.Exec(ctx, `UPDATE tab_asset_transfer SET status = $2, updated_at = NOW() WHERE id = $1`, inst.RefID, tStatus)
		return err
	}
	_ = refStatus
	return nil
}

func (s *postgresStore) SubmitRepairForApproval(ctx context.Context, orgID, repairID, userID int64) error {
	instID, err := s.CreateApprovalInstance(ctx, orgID, "repair", "repair", repairID, userID)
	if err != nil {
		return err
	}
	_, err = s.pool.Exec(ctx,
		`UPDATE tab_asset_repair SET status = 'pending_approval', approval_instance_id = $2, updated_at = NOW() WHERE id = $1`,
		repairID, instID,
	)
	return err
}

func (s *postgresStore) SubmitWithdrawalForApproval(ctx context.Context, orgID, withdrawalID, userID int64) error {
	instID, err := s.CreateApprovalInstance(ctx, orgID, "withdrawal", "withdrawal", withdrawalID, userID)
	if err != nil {
		return err
	}
	_, err = s.pool.Exec(ctx,
		`UPDATE tab_internal_request_withdrawal SET status = 'pending_approval', approval_instance_id = $2 WHERE id = $1`,
		withdrawalID, instID,
	)
	return err
}

func (s *postgresStore) SubmitTransferForApproval(ctx context.Context, orgID, transferID, userID int64) error {
	instID, err := s.CreateApprovalInstance(ctx, orgID, "transfer", "transfer", transferID, userID)
	if err != nil {
		return err
	}
	_, err = s.pool.Exec(ctx,
		`UPDATE tab_asset_transfer SET status = 'pending_approval', approval_instance_id = $2, updated_at = NOW() WHERE id = $1`,
		transferID, instID,
	)
	return err
}

func (s *postgresStore) ReturnWithdrawal(ctx context.Context, orgID, id int64) error {
	_, err := s.pool.Exec(ctx,
		`UPDATE tab_internal_request_withdrawal SET status = 'returned', returned_at = NOW()
		 WHERE id = $1 AND organization_id = $2`,
		id, orgID,
	)
	return err
}
