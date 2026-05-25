package config

import (
	"os"
	"strconv"
)

type Config struct {
	Addr           string
	JWTSecret      string
	DBURL          string
	SQLitePath     string
	DemoEmail      string
	DemoPassword   string
	SeedAssetCount int
}

func Load() Config {
	seedCount := 200
	if v := os.Getenv("SEED_ASSET_COUNT"); v != "" {
		if n, err := strconv.Atoi(v); err == nil && n > 0 {
			seedCount = n
		}
	}
	return Config{
		Addr:           envOr("ADDR", ":8080"),
		JWTSecret:      os.Getenv("JWT_SECRET"),
		DBURL:          envOr("DATABASE_URL", os.Getenv("SUPABASE_DB_URL")),
		SQLitePath:     envOr("SQLITE_PATH", ""), // Postgres only — set SQLITE_PATH only for local override
		DemoEmail:      envOr("DEMO_EMAIL", "admin@demo.local"),
		DemoPassword:   envOr("DEMO_PASSWORD", "demo1234"),
		SeedAssetCount: seedCount,
	}
}

func envOr(key, fallback string) string {
	if v := os.Getenv(key); v != "" {
		return v
	}
	return fallback
}
