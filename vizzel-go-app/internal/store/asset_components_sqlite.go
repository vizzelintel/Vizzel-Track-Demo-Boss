package store

import "context"

// The SQLite store is a developer-only fallback that does not (yet) carry the
// tab_asset_component table. Stub the new interface methods out so the build
// still compiles; production runs on Postgres which has the real
// implementation in asset_components.go.

func (s *sqliteStore) ListAssetComponents(ctx context.Context, assetID int64) ([]AssetComponent, error) {
	return []AssetComponent{}, nil
}

func (s *sqliteStore) CreateAssetComponent(ctx context.Context, in AssetComponent) (int64, error) {
	return 0, nil
}

func (s *sqliteStore) UpdateAssetComponent(ctx context.Context, id int64, in AssetComponent) error {
	return nil
}

func (s *sqliteStore) DeleteAssetComponent(ctx context.Context, id int64) error {
	return nil
}

func (s *sqliteStore) ReplaceAssetComponents(ctx context.Context, assetID int64, items []AssetComponent) error {
	return nil
}

func (s *sqliteStore) BulkResolveByRFID(ctx context.Context, orgID int64, rfids []string) ([]ScanResult, error) {
	out := make([]ScanResult, 0, len(rfids))
	for _, r := range rfids {
		out = append(out, ScanResult{RFID: r, Matched: false})
	}
	return out, nil
}
