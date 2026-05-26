package api

import (
	"encoding/json"
	"net/http"
	"strconv"
	"strings"

	"github.com/go-chi/chi/v5"
	"github.com/vizzelintel/vizzel-track-demo-boss/vizzel-go-app/internal/notify"
	"github.com/vizzelintel/vizzel-track-demo-boss/vizzel-go-app/internal/store"
)

// ensureAdmin restricts channel mutation routes to Super Admin (1) and
// Admin Org (2). Returns false (and writes 403) when the user does not
// have access.
func ensureAdmin(w http.ResponseWriter, r *http.Request) (int64, bool) {
	claims, ok := claimsFromContext(r.Context())
	if !ok {
		writeError(w, http.StatusUnauthorized, "unauthorized")
		return 0, false
	}
	if claims.RoleID != 1 && claims.RoleID != 2 {
		writeError(w, http.StatusForbidden, "admin role required")
		return 0, false
	}
	return claims.OrganizationID, true
}

// channelRequest is the wire shape used by the create/update endpoints.
type channelRequest struct {
	Name        string          `json:"name"`
	ChannelType string          `json:"channel_type"`
	Config      json.RawMessage `json:"config"`
	Events      []string        `json:"events"`
	IsActive    *bool           `json:"is_active"`
}

func (c channelRequest) toStore(orgID int64) store.NotificationChannel {
	active := true
	if c.IsActive != nil {
		active = *c.IsActive
	}
	cfg := c.Config
	if len(cfg) == 0 {
		cfg = json.RawMessage("{}")
	}
	events := c.Events
	if events == nil {
		events = []string{}
	}
	return store.NotificationChannel{
		OrganizationID: orgID,
		ChannelType:    strings.TrimSpace(c.ChannelType),
		Name:           strings.TrimSpace(c.Name),
		ConfigJSON:     cfg,
		Events:         events,
		IsActive:       active,
	}
}

// ListNotificationChannels returns every channel for the user's org.
func (h *Handler) ListNotificationChannels(w http.ResponseWriter, r *http.Request) {
	claims, ok := claimsFromContext(r.Context())
	if !ok {
		writeError(w, http.StatusUnauthorized, "unauthorized")
		return
	}
	rows, err := h.store.ListChannels(r.Context(), claims.OrganizationID)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "list failed")
		return
	}
	if rows == nil {
		rows = []store.NotificationChannel{}
	}
	writeJSON(w, http.StatusOK, map[string]any{"data": rows, "total": len(rows)})
}

// CreateNotificationChannel inserts a new channel. Admin only.
func (h *Handler) CreateNotificationChannel(w http.ResponseWriter, r *http.Request) {
	orgID, ok := ensureAdmin(w, r)
	if !ok {
		return
	}
	var req channelRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeError(w, http.StatusBadRequest, "invalid json")
		return
	}
	if req.Name == "" || req.ChannelType == "" {
		writeError(w, http.StatusBadRequest, "name and channel_type required")
		return
	}
	id, err := h.store.CreateChannel(r.Context(), req.toStore(orgID))
	if err != nil {
		writeError(w, http.StatusInternalServerError, "create failed")
		return
	}
	writeJSON(w, http.StatusOK, map[string]any{"id": id, "status": "ok"})
}

// UpdateNotificationChannel overwrites all editable fields. Admin only.
func (h *Handler) UpdateNotificationChannel(w http.ResponseWriter, r *http.Request) {
	orgID, ok := ensureAdmin(w, r)
	if !ok {
		return
	}
	id, _ := strconv.ParseInt(chi.URLParam(r, "id"), 10, 64)
	var req channelRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeError(w, http.StatusBadRequest, "invalid json")
		return
	}
	if req.Name == "" || req.ChannelType == "" {
		writeError(w, http.StatusBadRequest, "name and channel_type required")
		return
	}
	if err := h.store.UpdateChannel(r.Context(), id, orgID, req.toStore(orgID)); err != nil {
		writeError(w, http.StatusInternalServerError, "update failed")
		return
	}
	writeJSON(w, http.StatusOK, map[string]string{"status": "ok"})
}

// DeleteNotificationChannel soft-deletes one channel. Admin only.
func (h *Handler) DeleteNotificationChannel(w http.ResponseWriter, r *http.Request) {
	orgID, ok := ensureAdmin(w, r)
	if !ok {
		return
	}
	id, _ := strconv.ParseInt(chi.URLParam(r, "id"), 10, 64)
	if err := h.store.DeleteChannel(r.Context(), id, orgID); err != nil {
		writeError(w, http.StatusInternalServerError, "delete failed")
		return
	}
	writeJSON(w, http.StatusOK, map[string]string{"status": "ok"})
}

// TestNotificationChannel fires a single test Event against one channel
// (and writes one in-app row for the current user so they see the result
// in the bell as well).
func (h *Handler) TestNotificationChannel(w http.ResponseWriter, r *http.Request) {
	orgID, ok := ensureAdmin(w, r)
	if !ok {
		return
	}
	claims, _ := claimsFromContext(r.Context())
	id, _ := strconv.ParseInt(chi.URLParam(r, "id"), 10, 64)
	ch, err := h.store.GetChannel(r.Context(), id, orgID)
	if err != nil || ch == nil {
		writeError(w, http.StatusNotFound, "channel not found")
		return
	}
	if h.dispatcher == nil {
		writeError(w, http.StatusInternalServerError, "dispatcher not configured")
		return
	}

	_ = h.dispatcher.Dispatch(r.Context(), notify.Event{
		OrganizationID: orgID,
		UserIDs:        []int64{claims.UserID},
		EventType:      "system.test",
		Title:          "ทดสอบช่องทาง: " + ch.Name,
		Body:           "การทดสอบการส่งจาก Vizzel Track Demo (" + ch.ChannelType + ")",
		Link:           "/settings/notifications",
		RefType:        "channel",
		RefID:          ch.ID,
	})
	writeJSON(w, http.StatusOK, map[string]any{"status": "ok", "channel": ch.Name})
}
