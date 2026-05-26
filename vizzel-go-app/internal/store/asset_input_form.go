package store

import (
	"net/http"
	"strconv"
	"strings"
)

// ParseAssetInputForm reads multipart or urlencoded form fields into AssetInput.
func ParseAssetInputForm(r *http.Request) (AssetInput, error) {
	ct := r.Header.Get("Content-Type")
	if strings.HasPrefix(ct, "multipart/form-data") {
		if err := r.ParseMultipartForm(32 << 20); err != nil {
			return AssetInput{}, err
		}
	} else if strings.HasPrefix(ct, "application/x-www-form-urlencoded") {
		if err := r.ParseForm(); err != nil {
			return AssetInput{}, err
		}
	} else {
		return AssetInput{}, nil
	}
	get := func(keys ...string) string {
		for _, k := range keys {
			if r.Form != nil {
				if v := r.Form[k]; len(v) > 0 && v[0] != "" {
					return v[0]
				}
			}
			if r.MultipartForm != nil && r.MultipartForm.Value != nil {
				if v := r.MultipartForm.Value[k]; len(v) > 0 && v[0] != "" {
					return v[0]
				}
			}
		}
		return ""
	}
	parseInt := func(keys ...string) int64 {
		s := get(keys...)
		if s == "" {
			return 0
		}
		n, _ := strconv.ParseInt(s, 10, 64)
		return n
	}
	statusName := get("assetStatusName", "asset_status_name")
	statusID := parseInt("assetStatusID", "asset_status_id")
	isCheck := get("isCheck", "is_check")
	return AssetInput{
		AssetNumber:     get("assetNumber", "asset_number"),
		AssetName:       get("assetName", "asset_name"),
		RFIDNum:         get("rfidNum", "rfid_num"),
		AssetDetails:    get("assetDetails", "asset_details"),
		CategoryID:      parseInt("categoryID", "category_id"),
		ClassID:         parseInt("assetClassID", "class_id", "asset_class_id"),
		CategoryName:    get("categoryName", "category_name"),
		ClassName:       get("className", "class_name"),
		TypeName:        get("typeName", "type_name"),
		BuildingName:    get("buildingName", "building_name"),
		RoomName:        get("roomName", "room_name"),
		OwnerName:       get("ownerName", "owner_name"),
		AssetStatusName: statusName,
		AssetStatusID:   statusID,
		IsCheck:         isCheck == "true" || isCheck == "1",
		ReceivedDate:    get("receivedDate", "received_date"),
		ExpiryDate:      get("expiryDate", "expiry_date"),
		GetByID:         parseInt("getByID", "get_by_id"),
		GetFrom:         get("getFrom", "get_from"),
		SourceFundID:    parseInt("sourceFundID", "source_fund_id"),
		AvailableAge:    parseInt("availableAge", "available_age"),
		AssetValue:      parseInt("assetValue", "asset_value"),
		UserID:          parseInt("userID", "user_id"),
	}, nil
}
