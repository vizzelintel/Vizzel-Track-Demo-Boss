package store

import (
	"context"
	"fmt"
)

// AssertOrgAccessible allows the login org, its child orgs, or parent/sibling targets from transfer rules.
func (s *postgresStore) AssertOrgAccessible(ctx context.Context, loginOrgID, targetOrgID int64) error {
	if loginOrgID == targetOrgID {
		return nil
	}
	children, err := s.ListChildOrganizations(ctx, loginOrgID)
	if err != nil {
		return err
	}
	for _, c := range children {
		if c.ID == targetOrgID {
			return nil
		}
	}
	targets, err := s.ListTransferTargets(ctx, loginOrgID)
	if err != nil {
		return err
	}
	for _, t := range targets {
		if t.ID == targetOrgID {
			return nil
		}
	}
	return fmt.Errorf("organization %d not accessible from %d", targetOrgID, loginOrgID)
}

func (s *sqliteStore) AssertOrgAccessible(ctx context.Context, loginOrgID, targetOrgID int64) error {
	if loginOrgID == targetOrgID {
		return nil
	}
	return fmt.Errorf("organization %d not accessible from %d", targetOrgID, loginOrgID)
}
