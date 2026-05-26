package store

import (
	"testing"
	"time"
)

func TestAccumulatedDepreciationCapsAtCostMinusOne(t *testing.T) {
	received := time.Date(2020, 1, 1, 0, 0, 0, 0, time.UTC)
	asOf := time.Date(2030, 1, 1, 0, 0, 0, 0, time.UTC)
	a := DepreciationAssetInput{
		AssetValue:   100_000,
		AvailableAge: 5,
		ReceivedDate: received,
	}
	got := AccumulatedDepreciation(a, asOf)
	want := int64(99_999)
	if got != want {
		t.Fatalf("accumulated = %d, want %d", got, want)
	}
}

func TestNetBookValueNeverBelowOneBaht(t *testing.T) {
	received := time.Date(2020, 1, 1, 0, 0, 0, 0, time.UTC)
	asOf := time.Date(2099, 1, 1, 0, 0, 0, 0, time.UTC)
	a := DepreciationAssetInput{
		AssetValue:   50_000,
		AvailableAge: 1,
		ReceivedDate: received,
	}
	if nb := NetBookValue(a, asOf); nb != GovResidualBaht {
		t.Fatalf("net book = %d, want %d", nb, GovResidualBaht)
	}
}

func TestAssetValueOneHasNoDepreciation(t *testing.T) {
	a := DepreciationAssetInput{
		AssetValue:   1,
		AvailableAge: 10,
		ReceivedDate: time.Now(),
	}
	if d := AccumulatedDepreciation(a, time.Now()); d != 0 {
		t.Fatalf("depreciation for 1 baht asset = %d, want 0", d)
	}
}
