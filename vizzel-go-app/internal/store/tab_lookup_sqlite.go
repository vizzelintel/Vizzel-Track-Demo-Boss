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

// BulkInsertElaasAssets falls back to a per-row CreateAsset on sqlite so the
// e2e harness can still verify the full pipeline. Postgres has the real
// chunked path in tab_lookup.go.
func (s *sqliteStore) BulkInsertElaasAssets(ctx context.Context, orgID int64, rows []ElaasAssetRow) (int, error) {
	inserted := 0
	for _, r := range rows {
		in := AssetInput{
			AssetNumber:     r.AssetNumber,
			ElaasCode:       r.ElaasCode,
			AssetName:       r.AssetName,
			AssetDetails:    r.AssetDetails,
			CategoryName:    r.CategoryName,
			TypeName:        r.TypeName,
			ClassName:       r.ClassName,
			AssetStatusName: r.AssetStatusName,
			AssetValue:      r.AssetValue,
			IsDepreciation:  true,
		}
		if _, err := s.CreateAsset(ctx, orgID, in); err != nil {
			return inserted, err
		}
		inserted++
	}
	return inserted, nil
}
