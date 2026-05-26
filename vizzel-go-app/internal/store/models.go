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
}

type UserRecord struct {
	ID             int64
	OrganizationID int64
	RoleID         int64
	Email          string
	PasswordHash   string
	DisplayName    string
}
