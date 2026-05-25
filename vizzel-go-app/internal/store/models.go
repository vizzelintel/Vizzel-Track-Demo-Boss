package store

import "time"

type Organization struct {
	ID   int64  `json:"id"`
	Name string `json:"name"`
}

type User struct {
	ID             int64  `json:"id"`
	OrganizationID int64  `json:"organization_id"`
	Email          string `json:"email"`
	DisplayName    string `json:"display_name"`
}

type Asset struct {
	ID             int64     `json:"id"`
	OrganizationID int64     `json:"organization_id"`
	AssetNumber    string    `json:"asset_number"`
	AssetName      string    `json:"asset_name"`
	AssetValue     int64     `json:"asset_value"`
	Status         string    `json:"status"`
	CreatedAt      time.Time `json:"created_at"`
}

type UserRecord struct {
	ID             int64
	OrganizationID int64
	Email          string
	PasswordHash   string
	DisplayName    string
}
