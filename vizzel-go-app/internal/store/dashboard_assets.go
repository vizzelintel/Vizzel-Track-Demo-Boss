package store

import (
	"context"
	"fmt"
	"time"
)

func (s *postgresStore) loadDashboardAssets(ctx context.Context, orgID int64) ([]DepreciationAssetInput, []dashboardAssetMeta, error) {
	if s.tabAssetsEnabled(ctx) {
		return s.loadDashboardAssetsTab(ctx, orgID)
	}
	return s.loadDashboardAssetsLegacy(ctx, orgID)
}

func (s *postgresStore) loadDashboardAssetsTab(ctx context.Context, orgID int64) ([]DepreciationAssetInput, []dashboardAssetMeta, error) {
	q := `
SELECT a.id, a.asset_number, a.asset_name, COALESCE(cat.category_name,''),
       COALESCE(st.status,'ใช้งาน'), COALESCE(addr.building_name,''),
       COALESCE(a.asset_value,0),
       COALESCE(NULLIF(a.available_age,0), 5),
       COALESCE(a.received_date, a.created_at), a.created_at
FROM tab_asset a
LEFT JOIN tab_asset_class cl ON cl.id = a.asset_class_id AND cl.deleted_at IS NULL
LEFT JOIN tab_asset_type ty ON ty.id = cl.asset_type_id AND ty.deleted_at IS NULL
LEFT JOIN tab_asset_category cat ON cat.id = ty.category_id AND cat.deleted_at IS NULL
LEFT JOIN tab_asset_status st ON st.id = a.asset_status_id
LEFT JOIN LATERAL (
    SELECT building_name FROM tab_asset_address
    WHERE asset_id = a.id AND deleted_at IS NULL ORDER BY id LIMIT 1
) addr ON TRUE
WHERE a.organization_id = $1 AND a.deleted_at IS NULL`
	return s.scanDashboardAssets(ctx, q, orgID)
}

func (s *postgresStore) loadDashboardAssetsLegacy(ctx context.Context, orgID int64) ([]DepreciationAssetInput, []dashboardAssetMeta, error) {
	q := `
SELECT id, asset_number, asset_name, COALESCE(category_name,''),
       COALESCE(asset_status_name,'ใช้งาน'), COALESCE(building_name,''),
       COALESCE(asset_value,0), 5,
       created_at, created_at
FROM assets WHERE organization_id = $1 AND status != 'deleted'`
	return s.scanDashboardAssets(ctx, q, orgID)
}

func (s *postgresStore) scanDashboardAssets(ctx context.Context, q string, orgID int64) ([]DepreciationAssetInput, []dashboardAssetMeta, error) {
	rows, err := s.pool.Query(ctx, q, orgID)
	if err != nil {
		return nil, nil, err
	}
	defer rows.Close()
	var deps []DepreciationAssetInput
	var meta []dashboardAssetMeta
	for rows.Next() {
		var m dashboardAssetMeta
		var dep DepreciationAssetInput
		var received, created time.Time
		if err := rows.Scan(&m.id, &m.assetNumber, &m.assetName, &m.categoryName,
			&m.statusName, &m.buildingName, &dep.AssetValue, &dep.AvailableAge,
			&received, &created); err != nil {
			return nil, nil, err
		}
		dep.ReceivedDate = received
		m.createdAt = created
		deps = append(deps, dep)
		meta = append(meta, m)
	}
	return deps, meta, rows.Err()
}

func (s *postgresStore) DashboardBundle(ctx context.Context, orgID int64) (*DashboardBundle, error) {
	deps, meta, err := s.loadDashboardAssets(ctx, orgID)
	if err != nil {
		return nil, fmt.Errorf("dashboard assets: %w", err)
	}
	return ComputeDashboardBundle(deps, meta, time.Now()), nil
}

func (s *sqliteStore) DashboardBundle(ctx context.Context, orgID int64) (*DashboardBundle, error) {
	res, err := s.ListAssetsPaged(ctx, orgID, 1, 10000, AssetFilter{})
	if err != nil || res == nil {
		return ComputeDashboardBundle(nil, nil, time.Now()), err
	}
	deps := make([]DepreciationAssetInput, 0, len(res.Data))
	meta := make([]dashboardAssetMeta, 0, len(res.Data))
	for _, a := range res.Data {
		deps = append(deps, DepreciationAssetInput{
			AssetValue:   a.AssetValue,
			AvailableAge: 5,
			ReceivedDate: a.CreatedAt,
		})
		meta = append(meta, dashboardAssetMeta{
			id: a.ID, assetNumber: a.AssetNumber, assetName: a.AssetName,
			categoryName: a.CategoryName, statusName: a.AssetStatusName,
			buildingName: a.BuildingName, createdAt: a.CreatedAt,
		})
	}
	return ComputeDashboardBundle(deps, meta, time.Now()), nil
}
