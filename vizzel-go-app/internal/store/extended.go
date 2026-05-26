package store

type AssetInput struct {
	AssetNumber     string `json:"asset_number"`
	AssetName       string `json:"asset_name"`
	RFIDNum         string `json:"rfid_num"`
	CategoryID      int64  `json:"category_id"`
	ClassID         int64  `json:"class_id"`
	CategoryName    string `json:"category_name"`
	ClassName       string `json:"class_name"`
	TypeName        string `json:"type_name"`
	BuildingName    string `json:"building_name"`
	RoomName        string `json:"room_name"`
	OwnerName       string `json:"owner_name"`
	AssetStatusName string `json:"asset_status_name"`
	AssetStatusID   int64  `json:"asset_status_id"`
	AssetValue      int64  `json:"asset_value"`
	UserID          int64  `json:"user_id"`
}

type DashboardExtended struct {
	TotalAssetValue          int64         `json:"total_asset_value"`
	AccumulatedDepreciation  int64         `json:"accumulated_depreciation"`
	NetBookValue             int64         `json:"net_book_value"`
	TotalAssets              int           `json:"total_assets"`
	NewAssetsThisYear        int           `json:"new_assets_this_year"`
	CurrentYearDepreciation  int64         `json:"current_year_depreciation"`
	Trend                    TrendSeries   `json:"trend"`
	StatusBreakdown          []StatusSlice `json:"status_breakdown"`
	LocationBreakdown        []StatusSlice `json:"location_breakdown"`
}

type TrendSeries struct {
	Labels []string `json:"labels"`
	Values []int    `json:"values"`
}

type StatusSlice struct {
	Name  string `json:"name"`
	Count int    `json:"count"`
}

type PersonalDashboard struct {
	OwnedAssets   int           `json:"owned_assets"`
	TotalValue    int64         `json:"total_value"`
	StatusBreakdown []StatusSlice `json:"status_breakdown"`
	RecentAssets  []Asset       `json:"recent_assets"`
}

type SuperAdminStats struct {
	OrgCount      int           `json:"org_count"`
	UserCount     int           `json:"user_count"`
	AssetCount    int           `json:"asset_count"`
	TopOrgs       []StatusSlice `json:"top_orgs"`
}

type OrgAccessRow struct {
	ID             int64  `json:"id"`
	UserID         int64  `json:"user_id"`
	UserName       string `json:"user_name"`
	OrganizationID int64  `json:"organization_id"`
	OrgName        string `json:"org_name"`
	RoleID         int    `json:"role_id"`
}

type MenuToggle struct {
	MenuID  int    `json:"menu_id"`
	Name    string `json:"name"`
	Enabled bool   `json:"enabled"`
}
