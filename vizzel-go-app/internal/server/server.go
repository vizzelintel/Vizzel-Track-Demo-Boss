package server

import (
	"io/fs"
	"mime"
	"net/http"
	"path/filepath"
	"strings"

	"github.com/go-chi/chi/v5"
	"github.com/go-chi/chi/v5/middleware"
	"github.com/vizzelintel/vizzel-track-demo-boss/vizzel-go-app/internal/api"
	"github.com/vizzelintel/vizzel-track-demo-boss/vizzel-go-app/internal/config"
	"github.com/vizzelintel/vizzel-track-demo-boss/vizzel-go-app/internal/store"
	"github.com/vizzelintel/vizzel-track-demo-boss/vizzel-go-app/internal/spa"
)

func New(cfg config.Config, st store.Store) http.Handler {
	h := api.New(cfg, st)
	r := chi.NewRouter()
	r.Use(middleware.RequestID, middleware.RealIP, middleware.Logger, middleware.Recoverer)

	r.Route("/api/v1", func(r chi.Router) {
		r.Get("/health", h.Health)
		r.Post("/auth/login", h.Login)
		r.Group(func(r chi.Router) {
			r.Use(api.JWTAuth(cfg))
			r.Get("/auth/me", h.Me)
			r.Get("/assets", h.ListAssets)
			r.Get("/dashboard/summary", h.DashboardSummary)
			r.Get("/users", h.ListUsers)
			r.Get("/organization/departments", h.ListDepartments)
			r.Get("/organization/buildings", h.ListBuildings)
			r.Get("/organization/rooms", h.ListRooms)
			r.Get("/assets/categories", h.ListAssetCategories)
			r.Get("/assets/classes", h.ListAssetClasses)
			r.Get("/audit/ongoing", h.ListAuditOngoing)
			r.Get("/audit/history", h.ListAuditHistory)
			r.Get("/repairs", h.ListRepairs)
			r.Get("/withdrawals", h.ListWithdrawals)
			r.Get("/sales", h.ListSales)
			r.Get("/menus", h.OrgMenus)
			r.Get("/super-admin/organizations", h.ListSuperAdminOrgs)
		})
	})

	web, _ := fs.Sub(spa.FS, "dist")
	r.Handle("/*", http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if r.Method != http.MethodGet && r.Method != http.MethodHead {
			http.NotFound(w, r)
			return
		}
		name := strings.TrimPrefix(r.URL.Path, "/")
		if name == "" || name == "index.html" {
			name = "index.html"
		} else if _, err := web.Open(name); err != nil {
			if strings.Contains(filepath.Base(name), ".") {
				http.NotFound(w, r)
				return
			}
			name = "index.html"
		}
		data, err := fs.ReadFile(web, name)
		if err != nil {
			http.NotFound(w, r)
			return
		}
		if ct := mime.TypeByExtension(filepath.Ext(name)); ct != "" {
			w.Header().Set("Content-Type", ct)
		}
		w.Write(data)
	}))

	return r
}
