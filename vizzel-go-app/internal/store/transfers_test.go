package store

import (
	"context"
	"os"
	"testing"
)

func TestListTransfers_poolerParams(t *testing.T) {
	dbURL := os.Getenv("SUPABASE_DB_URL")
	if dbURL == "" {
		dbURL = os.Getenv("DATABASE_URL")
	}
	if dbURL == "" {
		t.Skip("no database URL")
	}
	ctx := context.Background()
	st, err := openPostgres(ctx, dbURL)
	if err != nil {
		t.Fatal(err)
	}
	if _, err := st.ListTransfers(ctx, 1); err != nil {
		t.Fatal(err)
	}
}
