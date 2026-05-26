package api

import (
	"context"
	"encoding/json"
	"io"
	"net/http"
	"strings"

	"github.com/vizzelintel/vizzel-track-demo-boss/vizzel-go-app/internal/store"
)

func decodeAssetInput(r *http.Request) (store.AssetInput, error) {
	ct := r.Header.Get("Content-Type")
	if strings.HasPrefix(ct, "multipart/form-data") || strings.HasPrefix(ct, "application/x-www-form-urlencoded") {
		in, err := store.ParseAssetInputForm(r)
		if err != nil {
			return store.AssetInput{}, err
		}
		if in.AssetName != "" || in.AssetNumber != "" || in.ClassID != 0 || in.UserID != 0 {
			return in, nil
		}
	}

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

func (h *Handler) enrichAssetInput(ctx context.Context, orgID int64, in *store.AssetInput) {
	if in == nil {
		return
	}
	if in.OwnerName == "" && in.UserID > 0 {
		users, _ := h.store.ListOrgUsers(ctx, orgID)
		for _, u := range users {
			if u.UserID == in.UserID {
				in.OwnerName = strings.TrimSpace(u.Name + " " + u.Surname)
				if in.OwnerName == "" {
					in.OwnerName = u.Username
				}
				break
			}
		}
	}
	if in.AssetStatusName == "" && in.AssetStatusID > 0 {
		ref, _ := h.store.AssetReferenceData(ctx, orgID)
		if ref != nil {
			for _, st := range ref.Statuses {
				if st.ID == in.AssetStatusID {
					in.AssetStatusName = st.Title
					break
				}
			}
		}
	}
}
