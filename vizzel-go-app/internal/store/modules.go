package store

import "time"

type DashboardSummary struct {
	AssetCount        int `json:"asset_count"`
	UserCount         int `json:"user_count"`
	AuditOngoing      int `json:"audit_ongoing"`
	RepairPending     int `json:"repair_pending"`
	WithdrawalPending int `json:"withdrawal_pending"`
}

type Row struct {
	ID        int64     `json:"id"`
	Title     string    `json:"title"`
	Subtitle  string    `json:"subtitle,omitempty"`
	Status    string    `json:"status,omitempty"`
	Value     int64     `json:"value,omitempty"`
	CreatedAt time.Time `json:"created_at,omitempty"`
}
