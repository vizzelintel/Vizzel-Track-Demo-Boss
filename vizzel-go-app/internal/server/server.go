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
			r.Get("/assets/initial-data", h.AssetsInitialData)
			r.Get("/assets/export", h.ExportAssets)
			r.Get("/assets/{id}", h.GetAsset)
			r.Post("/assets", h.CreateAsset)
			r.Patch("/assets/{id}", h.UpdateAsset)
			r.Delete("/assets/{id}", h.DeleteAsset)

			r.Get("/dashboard/summary", h.DashboardSummary)
			r.Get("/dashboard/extended", h.DashboardExtended)
			r.Get("/dashboard/personal", h.PersonalDashboard)

			r.Get("/users", h.ListUsers)
			r.Get("/organization/departments", h.ListDepartments)
			r.Get("/organization/institutes", h.ListInstitutes)
			r.Get("/organization/sections", h.ListSections)
			r.Get("/organization/positions", h.ListPositions)
			r.Get("/organization/buildings", h.ListBuildings)
			r.Get("/organization/rooms", h.ListRooms)

			r.Get("/assets/categories", h.ListAssetCategories)
			r.Get("/assets/types", h.ListAssetTypes)
			r.Get("/assets/classes", h.ListAssetClasses)

			r.Get("/audit/ongoing", h.ListAuditOngoing)
			r.Get("/audit/history", h.ListAuditHistory)
			r.Get("/audit/jobs/{id}", h.GetAuditJob)

			r.Get("/repairs", h.ListRepairs)
			r.Get("/withdrawals", h.ListWithdrawals)
			r.Patch("/withdrawals/{id}/status", h.PatchWithdrawalStatus)
			r.Get("/sales", h.ListSales)
			r.Get("/menus", h.OrgMenus)
			r.Get("/menus/toggles", h.ListMenuToggles)
			r.Patch("/menus/toggles", h.SetOrgMenu)

			r.Route("/entities/{kind}", func(r chi.Router) {
				r.Post("/", h.EntityCreate)
				r.Patch("/{id}", h.EntityUpdate)
				r.Delete("/{id}", h.EntityDelete)
			})

			r.Get("/super-admin/stats", h.SuperAdminStats)
			r.Get("/super-admin/organizations", h.ListSuperAdminOrgs)
			r.Post("/super-admin/organizations", h.CreateOrganization)
			r.Delete("/super-admin/organizations/{id}", h.DeleteOrganization)
			r.Get("/super-admin/org-access", h.ListOrgAccess)
			r.Post("/super-admin/org-access", h.CreateOrgAccess)
			r.Delete("/super-admin/org-access/{id}", h.DeleteOrgAccess)
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
