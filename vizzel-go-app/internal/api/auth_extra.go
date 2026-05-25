package api

import (
	"encoding/json"
	"net/http"
	"strings"
	"time"

	"github.com/vizzelintel/vizzel-track-demo-boss/vizzel-go-app/internal/auth"
	"github.com/vizzelintel/vizzel-track-demo-boss/vizzel-go-app/internal/store"
	"golang.org/x/crypto/bcrypt"
)

func (h *Handler) Register(w http.ResponseWriter, r *http.Request) {
	var req struct {
		Email       string `json:"email"`
		Password    string `json:"password"`
		DisplayName string `json:"display_name"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeError(w, http.StatusBadRequest, "invalid json")
		return
	}
	email := strings.ToLower(strings.TrimSpace(req.Email))
	if email == "" || len(req.Password) < 6 {
		writeError(w, http.StatusBadRequest, "email and password (6+) required")
		return
	}
	hash, err := bcrypt.GenerateFromPassword([]byte(req.Password), bcrypt.DefaultCost)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "register failed")
		return
	}
	u, err := h.store.CreateUser(r.Context(), 1, email, string(hash), req.DisplayName, store.DemoRoleAdminOrg)
	if err != nil {
		writeError(w, http.StatusConflict, "email already exists")
		return
	}
	writeJSON(w, http.StatusCreated, map[string]any{"user": u, "message": "registered (demo — auto-verified)"})
}

func (h *Handler) Refresh(w http.ResponseWriter, r *http.Request) {
	var req struct {
		RefreshToken string `json:"refresh_token"`
	}
	_ = json.NewDecoder(r.Body).Decode(&req)
	var email string
	var roleID, orgID, userID int64
	if req.RefreshToken != "" {
		c, err := h.store.ValidateRefreshToken(r.Context(), req.RefreshToken)
		if err != nil {
			writeError(w, http.StatusUnauthorized, "invalid refresh token")
			return
		}
		email, roleID, orgID, userID = c.Email, c.RoleID, c.OrganizationID, c.UserID
	} else if claims, ok := claimsFromContext(r.Context()); ok {
		email, roleID, orgID, userID = claims.Email, claims.RoleID, claims.OrganizationID, claims.UserID
	} else {
		writeError(w, http.StatusUnauthorized, "unauthorized")
		return
	}
	token, err := auth.IssueToken(h.cfg.JWTSecret, userID, orgID, roleID, email, 24*time.Hour)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "token failed")
		return
	}
	rt, _ := h.store.IssueRefreshToken(r.Context(), userID)
	writeJSON(w, http.StatusOK, map[string]any{
		"access_token":  token,
		"refresh_token": rt,
		"expires_in":    86400,
	})
}

func (h *Handler) ForgotPassword(w http.ResponseWriter, r *http.Request) {
	writeJSON(w, http.StatusOK, map[string]string{"message": "reset link sent (demo — check console logs)"})
}

func (h *Handler) ResetPassword(w http.ResponseWriter, r *http.Request) {
	writeJSON(w, http.StatusOK, map[string]string{"message": "password reset (demo)"})
}

func (h *Handler) VerifyEmail(w http.ResponseWriter, r *http.Request) {
	writeJSON(w, http.StatusOK, map[string]string{"status": "verified"})
}

func (h *Handler) ChangePassword(w http.ResponseWriter, r *http.Request) {
	claims, ok := claimsFromContext(r.Context())
	if !ok {
		writeError(w, http.StatusUnauthorized, "unauthorized")
		return
	}
	var req struct {
		Password string `json:"password"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil || len(req.Password) < 6 {
		writeError(w, http.StatusBadRequest, "password 6+ required")
		return
	}
	hash, _ := bcrypt.GenerateFromPassword([]byte(req.Password), bcrypt.DefaultCost)
	_ = h.store.UpdateUserPassword(r.Context(), claims.UserID, string(hash))
	writeJSON(w, http.StatusOK, map[string]string{"status": "ok"})
}
