package api

import (
	"net/http"
	"strconv"
	"strings"

	"github.com/go-chi/chi/v5"
	"github.com/vizzelintel/vizzel-track-demo-boss/vizzel-go-app/internal/notify"
	"github.com/vizzelintel/vizzel-track-demo-boss/vizzel-go-app/internal/store"
)

// ListNotifications returns the current user's bell list (paginated).
func (h *Handler) ListNotifications(w http.ResponseWriter, r *http.Request) {
	claims, ok := claimsFromContext(r.Context())
	if !ok {
		writeError(w, http.StatusUnauthorized, "unauthorized")
		return
	}
	q := r.URL.Query()
	page, _ := strconv.Atoi(q.Get("page"))
	pageSize, _ := strconv.Atoi(q.Get("pageSize"))
	unreadOnly := strings.EqualFold(q.Get("unreadOnly"), "true")

	items, total, err := h.store.ListNotifications(r.Context(), claims.UserID, page, pageSize, unreadOnly)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "list failed")
		return
	}
	if items == nil {
		items = []store.Notification{}
	}
	writeJSON(w, http.StatusOK, map[string]any{
		"data":  items,
		"total": total,
	})
}

// UnreadCount is polled by the bell every 30s.
func (h *Handler) UnreadCountNotifications(w http.ResponseWriter, r *http.Request) {
	claims, ok := claimsFromContext(r.Context())
	if !ok {
		writeError(w, http.StatusUnauthorized, "unauthorized")
		return
	}
	count, err := h.store.CountUnread(r.Context(), claims.UserID)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "count failed")
		return
	}
	writeJSON(w, http.StatusOK, map[string]any{"count": count})
}

// MarkNotificationRead flips one row to is_read = true (scoped to user).
func (h *Handler) MarkNotificationRead(w http.ResponseWriter, r *http.Request) {
	claims, ok := claimsFromContext(r.Context())
	if !ok {
		writeError(w, http.StatusUnauthorized, "unauthorized")
		return
	}
	id, _ := strconv.ParseInt(chi.URLParam(r, "id"), 10, 64)
	if err := h.store.MarkRead(r.Context(), id, claims.UserID); err != nil {
		writeError(w, http.StatusInternalServerError, "mark failed")
		return
	}
	writeJSON(w, http.StatusOK, map[string]string{"status": "ok"})
}

// MarkAllNotificationsRead flips every unread row for the user.
func (h *Handler) MarkAllNotificationsRead(w http.ResponseWriter, r *http.Request) {
	claims, ok := claimsFromContext(r.Context())
	if !ok {
		writeError(w, http.StatusUnauthorized, "unauthorized")
		return
	}
	if err := h.store.MarkAllRead(r.Context(), claims.UserID); err != nil {
		writeError(w, http.StatusInternalServerError, "mark failed")
		return
	}
	writeJSON(w, http.StatusOK, map[string]string{"status": "ok"})
}

// NotificationTestPing creates a sample notification for the current user so
// the bell + LINE/webhook plumbing can be verified end-to-end without
// touching a real asset.
func (h *Handler) NotificationTestPing(w http.ResponseWriter, r *http.Request) {
	claims, ok := claimsFromContext(r.Context())
	if !ok {
		writeError(w, http.StatusUnauthorized, "unauthorized")
		return
	}
	if h.dispatcher == nil {
		writeError(w, http.StatusInternalServerError, "dispatcher not configured")
		return
	}
	_ = h.dispatcher.Dispatch(r.Context(), notify.Event{
		OrganizationID: claims.OrganizationID,
		UserIDs:        []int64{claims.UserID},
		EventType:      "system.test",
		Title:          "ทดสอบการแจ้งเตือน",
		Body:           "นี่คือการแจ้งเตือนทดสอบจาก Vizzel Track Demo",
		Link:           "/notifications",
		RefType:        "test",
	})
	writeJSON(w, http.StatusOK, map[string]string{"status": "ok"})
}
