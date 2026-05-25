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
