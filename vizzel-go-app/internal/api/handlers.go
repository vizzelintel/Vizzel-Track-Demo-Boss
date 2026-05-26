package api

import (
	"database/sql"
	"encoding/json"
	"errors"
	"net/http"
	"strings"
	"time"

	"github.com/vizzelintel/vizzel-track-demo-boss/vizzel-go-app/internal/auth"
	"github.com/vizzelintel/vizzel-track-demo-boss/vizzel-go-app/internal/config"
	"github.com/vizzelintel/vizzel-track-demo-boss/vizzel-go-app/internal/notify"
	"github.com/vizzelintel/vizzel-track-demo-boss/vizzel-go-app/internal/store"
	"golang.org/x/crypto/bcrypt"
)

type Handler struct {
	cfg        config.Config
	store      store.Store
	dispatcher *notify.Dispatcher
}

func New(cfg config.Config, s store.Store) *Handler {
	return &Handler{cfg: cfg, store: s, dispatcher: notify.New(s)}
}

func (h *Handler) Health(w http.ResponseWriter, r *http.Request) {
	status := "ok"
	if err := h.store.Ping(r.Context()); err != nil {
		status = "degraded"
	}
	writeJSON(w, http.StatusOK, map[string]any{
		"status": status,
		"db":     h.store.Driver(),
	})
}

type loginRequest struct {
	Email    string `json:"email"`
	Password string `json:"password"`
}

func (h *Handler) Login(w http.ResponseWriter, r *http.Request) {
	var req loginRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeError(w, http.StatusBadRequest, "invalid json body")
		return
	}
	email := strings.ToLower(strings.TrimSpace(req.Email))
	if email == "" || req.Password == "" {
		writeError(w, http.StatusBadRequest, "email and password required")
		return
	}

	u, err := h.store.UserByEmail(r.Context(), email)
	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			writeError(w, http.StatusUnauthorized, "invalid credentials")
			return
		}
		writeError(w, http.StatusInternalServerError, "login failed")
		return
	}
	if err := bcrypt.CompareHashAndPassword([]byte(u.PasswordHash), []byte(req.Password)); err != nil {
		writeError(w, http.StatusUnauthorized, "invalid credentials")
		return
	}

	roleID := store.DemoRoleAdminOrg
	if u.RoleID > 0 {
		roleID = u.RoleID
	} else if email == "superadmin@demo.local" {
		roleID = 1
	}
	token, err := auth.IssueToken(h.cfg.JWTSecret, u.ID, u.OrganizationID, roleID, u.Email, 24*time.Hour)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "token issue failed")
		return
	}
	refresh, _ := h.store.IssueRefreshToken(r.Context(), u.ID)

	writeJSON(w, http.StatusOK, map[string]any{
		"access_token":  token,
		"refresh_token": refresh,
		"token_type":    "Bearer",
		"expires_in":    86400,
		"user": store.User{
			ID:             u.ID,
			OrganizationID: u.OrganizationID,
			RoleID:         roleID,
			Email:          u.Email,
			DisplayName:    u.DisplayName,
		},
	})
}

func (h *Handler) Me(w http.ResponseWriter, r *http.Request) {
	claims, ok := claimsFromContext(r.Context())
	if !ok {
		writeError(w, http.StatusUnauthorized, "unauthorized")
		return
	}
	displayName := claims.Email
	if u, err := h.store.UserByEmail(r.Context(), claims.Email); err == nil {
		displayName = u.DisplayName
	}
	roleID := claims.RoleID
	if roleID == 0 {
		roleID = store.DemoRoleAdminOrg
	}
	writeJSON(w, http.StatusOK, map[string]any{
		"id":              claims.UserID,
		"email":           claims.Email,
		"display_name":    displayName,
		"organization_id": claims.OrganizationID,
		"role_id":         roleID,
		"organization": map[string]any{
			"id":   claims.OrganizationID,
			"name": "Demo Organization",
		},
	})
}

func writeJSON(w http.ResponseWriter, status int, v any) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	_ = json.NewEncoder(w).Encode(v)
}

func writeError(w http.ResponseWriter, status int, msg string) {
	writeJSON(w, status, map[string]string{"error": msg})
}
