package api

import (
	"context"
	"net/http"
	"strings"

	"github.com/vizzelintel/vizzel-track-demo-boss/vizzel-go-app/internal/auth"
	"github.com/vizzelintel/vizzel-track-demo-boss/vizzel-go-app/internal/config"
)

type ctxKey string

const claimsKey ctxKey = "claims"

func JWTAuth(cfg config.Config) func(http.Handler) http.Handler {
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			header := r.Header.Get("Authorization")
			if !strings.HasPrefix(header, "Bearer ") {
				writeError(w, http.StatusUnauthorized, "missing bearer token")
				return
			}
			token := strings.TrimSpace(strings.TrimPrefix(header, "Bearer "))
			claims, err := auth.ParseToken(cfg.JWTSecret, token)
			if err != nil {
				writeError(w, http.StatusUnauthorized, "invalid token")
				return
			}
			ctx := context.WithValue(r.Context(), claimsKey, claims)
			next.ServeHTTP(w, r.WithContext(ctx))
		})
	}
}

func claimsFromContext(ctx context.Context) (*auth.Claims, bool) {
	c, ok := ctx.Value(claimsKey).(*auth.Claims)
	return c, ok
}
