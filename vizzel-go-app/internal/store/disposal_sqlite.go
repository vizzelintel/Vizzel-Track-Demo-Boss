package store

import (
	"context"
	"fmt"
)

func (s *sqliteStore) ListDisposalLots(ctx context.Context, orgID int64) ([]DisposalLot, error) {
	return nil, nil
}

func (s *sqliteStore) GetDisposalLot(ctx context.Context, orgID, lotID int64) (*DisposalLot, error) {
	return nil, fmt.Errorf("disposal requires postgres")
}

func (s *sqliteStore) CreateDisposalLot(ctx context.Context, orgID int64, in DisposalLotInput) (int64, error) {
	return 0, fmt.Errorf("disposal requires postgres")
}

func (s *sqliteStore) SubmitDisposalForApproval(ctx context.Context, orgID, lotID, userID int64, stepAssignees map[string]int64) error {
	return fmt.Errorf("disposal requires postgres")
}
