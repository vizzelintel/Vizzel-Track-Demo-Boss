package api

import (
	"encoding/json"
	"io"
	"net/http"

	"github.com/vizzelintel/vizzel-track-demo-boss/vizzel-go-app/internal/store"
)

func decodeAssetInput(r *http.Request) (store.AssetInput, error) {
	body, err := io.ReadAll(r.Body)
	if err != nil {
		return store.AssetInput{}, err
	}
	in, err := store.ParseAssetInputJSON(body)
	if err == nil && (in.AssetName != "" || in.AssetNumber != "" || in.ClassID != 0) {
		return in, nil
	}
	var fallback store.AssetInput
	if err := json.Unmarshal(body, &fallback); err != nil {
		return store.AssetInput{}, err
	}
	return fallback, nil
}
