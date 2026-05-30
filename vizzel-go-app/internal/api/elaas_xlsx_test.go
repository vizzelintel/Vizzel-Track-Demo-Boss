package api

import (
	"os"
	"path/filepath"
	"testing"
)

// findElaasSample returns the path to the bundled ELAAS sample xlsx that the
// e2e harness already uses. We walk a few likely roots so the test works
// regardless of whether it is invoked from the package directory or the repo
// root.
func findElaasSample(t *testing.T) string {
	t.Helper()
	for _, candidate := range []string{
		"../../elaas-sample.xlsx",
		"../../../elaas-sample.xlsx",
		"elaas-sample.xlsx",
	} {
		if _, err := os.Stat(candidate); err == nil {
			abs, _ := filepath.Abs(candidate)
			return abs
		}
	}
	t.Skip("elaas-sample.xlsx not found; skipping parser smoke test")
	return ""
}

// TestParseElaasXLSXSample is a self-contained smoke test that verifies the
// rewritten parser still finds the header row, skips totals, and emits the
// expected fields for the bundled อบต.ละหาร export. Run with:
//
//	go test ./internal/api -run TestParseElaasXLSXSample -v
func TestParseElaasXLSXSample(t *testing.T) {
	path := findElaasSample(t)
	f, err := os.Open(path)
	if err != nil {
		t.Fatalf("open sample: %v", err)
	}
	defer f.Close()
	report, err := parseElaasXLSX(f)
	if err != nil {
		t.Fatalf("parse: %v", err)
	}
	t.Logf("parsed rows=%d skipped=%d totalValue=%.2f", len(report.Rows), report.Skipped, report.TotalValue)
	if len(report.Rows) < 100 {
		t.Fatalf("expected >100 data rows, got %d", len(report.Rows))
	}
	if report.HeaderRowIdx <= 0 {
		t.Fatalf("expected positive header row, got %d", report.HeaderRowIdx)
	}
	first := report.Rows[0]
	if first.Category == "" || first.Type == "" {
		t.Fatalf("expected category/type populated, got %+v", first)
	}
	if first.AssetNumber == "" && first.ElaasCode == "" {
		t.Fatalf("expected at least one identifier, got %+v", first)
	}
	if first.AcquireDate == "" {
		t.Fatalf("expected acquire date populated, got %+v", first)
	}
	if first.PurchaseValue <= 0 {
		t.Fatalf("expected positive purchase value, got %+v", first)
	}
	cats := report.CategorySet()
	if len(cats) < 1 {
		t.Fatalf("expected at least 1 category, got %d", len(cats))
	}
	types := report.TypeSet()
	if len(types) < 1 {
		t.Fatalf("expected at least 1 type, got %d", len(types))
	}
	// Check at least one row carries a source-fund (the sample has the
	// "เงินงบประมาณ" column populated for many อาคาร rows).
	funded := 0
	for _, r := range report.Rows {
		if r.SourceFund != "" {
			funded++
		}
	}
	if funded == 0 {
		t.Fatalf("expected at least one row with non-empty source fund")
	}
	t.Logf("categories=%v types(sample-first-5)=%v fundedRows=%d", cats, firstN(types, 5), funded)
}

func firstN(s []string, n int) []string {
	if len(s) < n {
		return s
	}
	return s[:n]
}
