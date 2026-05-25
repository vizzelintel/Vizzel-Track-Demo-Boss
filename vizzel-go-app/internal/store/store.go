package store

import (
	"context"
	"fmt"
)

type Store interface {
	Driver() string
	Ping(ctx context.Context) error
	Migrate(ctx context.Context) error
	SeedDemo(ctx context.Context, email, password string, assetCount int) error
	UserByEmail(ctx context.Context, email string) (*UserRecord, error)
	ListAssets(ctx context.Context, orgID int64, cursor int64, limit int) ([]Asset, int64, bool, error)
	DashboardSummary(ctx context.Context, orgID int64) (*DashboardSummary, error)
	ListUsers(ctx context.Context, orgID int64) ([]Row, error)
	ListDepartments(ctx context.Context, orgID int64) ([]Row, error)
	ListBuildings(ctx context.Context, orgID int64) ([]Row, error)
	ListRooms(ctx context.Context, orgID int64) ([]Row, error)
	ListAssetCategories(ctx context.Context, orgID int64) ([]Row, error)
	ListAssetClasses(ctx context.Context, orgID int64) ([]Row, error)
	ListAuditJobs(ctx context.Context, orgID int64, status string) ([]Row, error)
	ListRepairs(ctx context.Context, orgID int64) ([]Row, error)
	ListWithdrawals(ctx context.Context, orgID int64) ([]Row, error)
	ListSales(ctx context.Context, orgID int64) ([]Row, error)
	ListOrganizations(ctx context.Context) ([]Row, error)
	OrgMenus(ctx context.Context, orgID int64) ([]int, error)
	SeedModules(ctx context.Context, orgID int64) error
}

func Open(ctx context.Context, dbURL, sqlitePath string) (Store, error) {
	if dbURL != "" {
		return openPostgres(ctx, dbURL)
	}
	return openSQLite(ctx, sqlitePath)
}

func assetNumber(i int) string {
	return fmt.Sprintf("DEMO-%05d", i)
}

func assetName(i int) string {
	names := []string{
		"Laptop", "Desktop PC", "Monitor", "Printer", "Projector",
		"Air Conditioner", "Desk", "Chair", "Server", "Router",
	}
	return fmt.Sprintf("%s Unit %d", names[i%len(names)], i)
}
