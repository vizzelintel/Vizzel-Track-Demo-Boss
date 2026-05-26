package store

import (
	"context"
	"fmt"
)

func (s *sqliteStore) CreateWithdrawalEx(ctx context.Context, orgID int64, in WithdrawalInput) (int64, error) {
	return s.CreateWithdrawal(ctx, orgID, in.RequesterName, in.ItemName, in.Internal)
}

func (s *sqliteStore) CreateRepairEx(ctx context.Context, orgID int64, in RepairInput) (int64, error) {
	return s.CreateRepair(ctx, orgID, in.AssetNumber, in.Note)
}

func (s *sqliteStore) SubmitRepairForApproval(ctx context.Context, orgID, repairID, userID int64) error {
	return fmt.Errorf("approval requires postgres")
}

func (s *sqliteStore) SubmitWithdrawalForApproval(ctx context.Context, orgID, withdrawalID, userID int64) error {
	return fmt.Errorf("approval requires postgres")
}

func (s *sqliteStore) SubmitTransferForApproval(ctx context.Context, orgID, transferID, userID int64) error {
	return fmt.Errorf("approval requires postgres")
}

func (s *sqliteStore) ReturnWithdrawal(ctx context.Context, orgID, id int64) error {
	return s.UpdateWithdrawalStatus(ctx, orgID, id, "returned")
}

func (s *sqliteStore) ListPendingApprovals(ctx context.Context, orgID int64) ([]ApprovalInstance, error) {
	return nil, nil
}

func (s *sqliteStore) GetApprovalInstance(ctx context.Context, orgID, id int64) (*ApprovalInstance, error) {
	return nil, fmt.Errorf("approval requires postgres")
}

func (s *sqliteStore) ApprovalAction(ctx context.Context, orgID, instanceID, actorUserID int64, action, branch, note string) error {
	return fmt.Errorf("approval requires postgres")
}

func (s *sqliteStore) ListTransfers(ctx context.Context, orgID int64) ([]TransferRecord, error) {
	return nil, nil
}

func (s *sqliteStore) CreateTransfer(ctx context.Context, orgID int64, in TransferInput) (int64, error) {
	return 0, fmt.Errorf("transfer requires postgres")
}

func (s *sqliteStore) ListChildOrganizations(ctx context.Context, parentID int64) ([]Row, error) {
	return nil, nil
}

func (s *sqliteStore) ResolveOrgScope(ctx context.Context, orgID int64, includeChildren bool) ([]int64, error) {
	return []int64{orgID}, nil
}
