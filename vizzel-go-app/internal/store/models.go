package store

import "time"

type Organization struct {
	ID   int64  `json:"id"`
	Name string `json:"name"`
}

type User struct {
	ID             int64  `json:"id"`
	OrganizationID int64  `json:"organization_id"`
	RoleID         int64  `json:"role_id"`
	Email          string `json:"email"`
	DisplayName    string `json:"display_name"`
}

const DemoRoleAdminOrg int64 = 2

type Asset struct {
	ID              int64     `json:"id"`
	OrganizationID  int64     `json:"organization_id"`
	AssetNumber     string    `json:"asset_number"`
	ElaasCode       string    `json:"elaas_code,omitempty"`
	AssetName       string    `json:"asset_name"`
	RFIDNum         string    `json:"rfid_num,omitempty"`
	CategoryID      int64     `json:"category_id,omitempty"`
	ClassID         int64     `json:"class_id,omitempty"`
	TypeID          int64     `json:"type_id,omitempty"`
	CategoryName    string    `json:"category_name,omitempty"`
	ClassName       string    `json:"class_name,omitempty"`
	TypeName        string    `json:"type_name,omitempty"`
	BuildingName    string    `json:"building_name,omitempty"`
	RoomName        string    `json:"room_name,omitempty"`
	OwnerName       string    `json:"owner_name,omitempty"`
	UserID          int64     `json:"user_id,omitempty"`
	AssetStatusID   int64     `json:"asset_status_id,omitempty"`
	AssetStatusName string    `json:"asset_status_name,omitempty"`
	IsCheck         bool      `json:"is_check"`
	IsDepreciation  bool      `json:"is_depreciation"`
	ReceivedDate    time.Time `json:"received_date"`
	ExpiryDate      *time.Time `json:"expiry_date,omitempty"`
	GetByID         int       `json:"get_by_id,omitempty"`
	GetFrom         string    `json:"get_from,omitempty"`
	SourceFundID    int       `json:"source_fund_id,omitempty"`
	AvailableAge    int       `json:"available_age,omitempty"`
	AssetDetails    string    `json:"asset_details,omitempty"`
	AssetValue      int64     `json:"asset_value"`
	Status          string    `json:"status"`
	CreatedAt       time.Time `json:"created_at"`
	ComponentCount  int       `json:"component_count"`
}

// AssetComponent is one physical piece of an asset. Each component has its
// own RFID (so multi-piece assets like a computer set can be tracked
// individually) and belongs to a single parent asset.
type AssetComponent struct {
	ID            int64  `json:"id"`
	AssetID       int64  `json:"asset_id"`
	ComponentName string `json:"component_name"`
	RFIDNum       string `json:"rfid_num"`
	SerialNo      string `json:"serial_no"`
	PositionNo    int    `json:"position_no"`
	Note          string `json:"note"`
	CurrentStatus string `json:"current_status"`
}

// ScanResult reports whether a single scanned RFID matched an existing
// component, plus the parent asset metadata so the UI can group results.
type ScanResult struct {
	RFID          string `json:"rfid"`
	Matched       bool   `json:"matched"`
	AssetID       int64  `json:"asset_id,omitempty"`
	AssetNumber   string `json:"asset_number,omitempty"`
	AssetName     string `json:"asset_name,omitempty"`
	ComponentID   int64  `json:"component_id,omitempty"`
	ComponentName string `json:"component_name,omitempty"`
}

type UserRecord struct {
	ID             int64
	OrganizationID int64
	RoleID         int64
	Email          string
	PasswordHash   string
	DisplayName    string
}
