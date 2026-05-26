package store

import "context"

type ApprovalStepAssignee struct {
	StepKey  string `json:"stepKey"`
	UserID   int64  `json:"userId"`
	UserName string `json:"userName,omitempty"`
	LabelTH  string `json:"labelTh,omitempty"`
}

func (s *postgresStore) SaveApprovalStepAssignees(ctx context.Context, instanceID int64, assignees map[string]int64) error {
	if len(assignees) == 0 {
		return nil
	}
	for stepKey, userID := range assignees {
		if stepKey == "" || userID <= 0 {
			continue
		}
		_, err := s.pool.Exec(ctx,
			`INSERT INTO tab_approval_instance_step (instance_id, step_key, assigned_user_id)
			 VALUES ($1, $2, $3)
			 ON CONFLICT (instance_id, step_key) DO UPDATE SET assigned_user_id = EXCLUDED.assigned_user_id`,
			instanceID, stepKey, userID,
		)
		if err != nil {
			return err
		}
	}
	return nil
}

func (s *postgresStore) listInstanceStepAssignees(ctx context.Context, instanceID int64) ([]ApprovalStepAssignee, error) {
	rows, err := s.pool.Query(ctx,
		`SELECT s.step_key, s.assigned_user_id,
		        COALESCE(NULLIF(TRIM(COALESCE(u.name,'') || ' ' || COALESCE(u.surname,'')), ''), u.email, ''),
		        COALESCE(ws.label_th, s.step_key)
		 FROM tab_approval_instance_step s
		 JOIN tab_user u ON u.id = s.assigned_user_id
		 JOIN tab_approval_instance i ON i.id = s.instance_id
		 LEFT JOIN tab_approval_workflow w ON w.code = i.workflow_code
		 LEFT JOIN tab_approval_workflow_step ws ON ws.workflow_id = w.id AND ws.step_key = s.step_key
		 WHERE s.instance_id = $1
		 ORDER BY COALESCE(ws.step_order, 0), s.step_key`,
		instanceID,
	)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var out []ApprovalStepAssignee
	for rows.Next() {
		var a ApprovalStepAssignee
		if err := rows.Scan(&a.StepKey, &a.UserID, &a.UserName, &a.LabelTH); err != nil {
			return nil, err
		}
		out = append(out, a)
	}
	return out, rows.Err()
}

func (s *postgresStore) createApprovalInstanceWithAssignees(ctx context.Context, orgID int64, workflowCode, refType string, refID, requestedBy int64, assignees map[string]int64) (int64, error) {
	id, err := s.CreateApprovalInstance(ctx, orgID, workflowCode, refType, refID, requestedBy)
	if err != nil {
		return 0, err
	}
	if err := s.SaveApprovalStepAssignees(ctx, id, assignees); err != nil {
		return id, err
	}
	return id, nil
}
