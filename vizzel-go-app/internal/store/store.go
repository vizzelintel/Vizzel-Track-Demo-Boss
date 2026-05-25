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
	ListAssetsPaged(ctx context.Context, orgID int64, page, pageSize int, f AssetFilter) (*AssetListResult, error)
	AssetReferenceData(ctx context.Context, orgID int64) (*AssetReferenceData, error)
	EnrichAssets(ctx context.Context, orgID int64) error
	GetAsset(ctx context.Context, orgID, id int64) (*Asset, error)
	CreateAsset(ctx context.Context, orgID int64, in AssetInput) (*Asset, error)
	UpdateAsset(ctx context.Context, orgID, id int64, in AssetInput) error
	DeleteAsset(ctx context.Context, orgID, id int64) error
	ExportAssetsCSV(ctx context.Context, orgID int64, f AssetFilter) ([]byte, error)
	DashboardSummary(ctx context.Context, orgID int64) (*DashboardSummary, error)
	DashboardExtended(ctx context.Context, orgID int64) (*DashboardExtended, error)
	PersonalDashboard(ctx context.Context, orgID int64, ownerName string) (*PersonalDashboard, error)
	SuperAdminStats(ctx context.Context) (*SuperAdminStats, error)
	ListUsers(ctx context.Context, orgID int64) ([]Row, error)
	ListDepartments(ctx context.Context, orgID int64) ([]Row, error)
	ListInstitutes(ctx context.Context, orgID int64) ([]Row, error)
	ListSections(ctx context.Context, orgID int64) ([]Row, error)
	ListPositions(ctx context.Context, orgID int64) ([]Row, error)
	ListBuildings(ctx context.Context, orgID int64) ([]Row, error)
	ListRooms(ctx context.Context, orgID int64) ([]Row, error)
	ListAssetCategories(ctx context.Context, orgID int64) ([]Row, error)
	ListAssetTypes(ctx context.Context, orgID int64, categoryID int64) ([]Row, error)
	ListAssetClasses(ctx context.Context, orgID int64, typeID int64) ([]Row, error)
	ListAuditJobs(ctx context.Context, orgID int64, status string) ([]Row, error)
	GetAuditJob(ctx context.Context, orgID, id int64) (*Row, error)
	ListRepairs(ctx context.Context, orgID int64) ([]Row, error)
	ListWithdrawals(ctx context.Context, orgID int64, status string) ([]Row, error)
	ListSales(ctx context.Context, orgID int64) ([]Row, error)
	ListOrganizations(ctx context.Context) ([]Row, error)
	OrgMenus(ctx context.Context, orgID int64) ([]int, error)
	ListMenuToggles(ctx context.Context, orgID int64) ([]MenuToggle, error)
	SetOrgMenu(ctx context.Context, orgID int64, menuID int, enabled bool) error
	ListOrgAccess(ctx context.Context) ([]OrgAccessRow, error)
	CreateOrgAccess(ctx context.Context, userID, orgID int64, roleID int) error
	DeleteOrgAccess(ctx context.Context, id int64) error
	CreateOrganization(ctx context.Context, name string) (*Row, error)
	DeleteOrganization(ctx context.Context, id int64) error
	EntityCreate(ctx context.Context, kind string, orgID int64, name string, parentID int64) (int64, error)
	EntityUpdate(ctx context.Context, kind string, orgID, id int64, name string) error
	EntityDelete(ctx context.Context, kind string, orgID, id int64) error
	SeedModules(ctx context.Context, orgID int64) error
	UpdateWithdrawalStatus(ctx context.Context, orgID, id int64, status string) error
	CreateUser(ctx context.Context, orgID int64, email, hash, display string, roleID int64) (*User, error)
	UpdateUserPassword(ctx context.Context, userID int64, hash string) error
	IssueRefreshToken(ctx context.Context, userID int64) (string, error)
	ValidateRefreshToken(ctx context.Context, token string) (*RefreshClaims, error)
	ListWarranties(ctx context.Context, orgID int64) ([]Row, map[string]int, error)
	ListLOVGetBy(ctx context.Context) ([]Row, error)
	ListLOVSourceFund(ctx context.Context) ([]Row, error)
	ListAssetDocs(ctx context.Context, assetID int64) ([]AssetDoc, error)
	CreateAssetDoc(ctx context.Context, assetID int64, name, url string) (int64, error)
	DeleteAssetDoc(ctx context.Context, docID int64) error
	CreateCheckJob(ctx context.Context, orgID int64, name string) (int64, error)
	UpdateCheckJob(ctx context.Context, orgID, jobID int64, status string, progress int) error
	DeleteCheckJob(ctx context.Context, orgID, jobID int64) error
	CreateWithdrawal(ctx context.Context, orgID int64, requester, item string, internal bool) (int64, error)
	CreateRepair(ctx context.Context, orgID int64, assetNumber, note string) (int64, error)
	ListMenuNames(ctx context.Context) (map[int]string, error)
	OrgLimit(ctx context.Context, orgID int64, kind string) (int, error)
	ListProvinces(ctx context.Context) ([]Row, error)
	ListDistricts(ctx context.Context, provinceID int64) ([]Row, error)
	ListSubdistricts(ctx context.Context, districtID int64) ([]Row, error)
}

func Open(ctx context.Context, dbURL, sqlitePath string) (Store, error) {
	if dbURL != "" {
		return openPostgres(ctx, dbURL)
	}
	if sqlitePath != "" {
		return openSQLite(ctx, sqlitePath)
	}
	return nil, fmt.Errorf("DATABASE_URL or SUPABASE_DB_URL required (Postgres only)")
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
