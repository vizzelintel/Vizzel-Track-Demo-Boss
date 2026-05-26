package api

import (
	"errors"
	"net/http"

	"github.com/vizzelintel/vizzel-track-demo-boss/vizzel-go-app/internal/store"
)

func orgVerifyStatusAndMessage(err error) (int, string) {
	switch {
	case errors.Is(err, store.ErrOrgUserInvalidRequest):
		return http.StatusBadRequest, "คำขอไม่ถูกต้อง กรุณาระบุ requestID"
	case errors.Is(err, store.ErrOrgUserRequestNotFound):
		return http.StatusNotFound, "ไม่พบคำขอเข้าร่วมองค์กร"
	case errors.Is(err, store.ErrOrgUserRequestProcessed):
		return http.StatusBadRequest, "คำขอนี้ดำเนินการแล้ว"
	case errors.Is(err, store.ErrOrgUserVerifyForbidden):
		return http.StatusBadRequest, "คุณไม่มีสิทธิ์อนุมัติคำขอในองค์กรนี้"
	default:
		return http.StatusBadRequest, "ไม่สามารถดำเนินการคำขอได้"
	}
}
