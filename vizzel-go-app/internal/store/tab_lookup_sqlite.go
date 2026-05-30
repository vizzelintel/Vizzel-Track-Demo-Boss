package store

import "context"

// The sqlite dev store stores category/type/class/status names denormalized on
// the `assets` table (no tab_asset_* taxonomy), so the EnsureTab* helpers
// simply no-op and return id=0. Callers must still pass the names through
// AssetInput.{CategoryName,TypeName,ClassName,AssetStatusName} for the row to
// show up correctly in the sqlite-backed e2e harness.

func (s *sqliteStore) EnsureTabTaxonomy(ctx context.Context, orgID int64, category, typ, class string) (int64, error) {
	return 0, nil
}

func (s *sqliteStore) EnsureTabAssetStatus(ctx context.Context, name string) (int64, error) {
	return 0, nil
}

func (s *sqliteStore) EnsureLovGetBy(ctx context.Context, name string) (int64, error) {
	return 0, nil
}

func (s *sqliteStore) EnsureLovSourceFund(ctx context.Context, name string) (int64, error) {
	return 0, nil
}
