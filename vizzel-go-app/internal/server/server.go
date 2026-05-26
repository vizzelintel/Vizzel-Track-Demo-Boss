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

	r.Get("/health", h.Health)
	r.Post("/auth/login", h.Login) // production path
	r.Post("/auth/register", h.Register)
	r.Post("/auth/refresh", h.Refresh)
	r.Post("/auth/forgot-password", h.ForgotPassword)
	r.Post("/auth/reset-password", h.ResetPassword)
	r.Get("/auth/verify/{token}", h.VerifyEmail)

	r.Route("/api/v1", func(r chi.Router) {
		r.Get("/health", h.Health)
		r.Post("/auth/login", h.Login)
		r.Post("/auth/register", h.Register)
		r.Post("/auth/refresh", h.Refresh)
		r.Group(func(r chi.Router) {
			r.Use(api.JWTAuth(cfg))
			r.Post("/auth/change-password", h.ChangePassword)
			r.Get("/auth/me", h.Me)

			r.Get("/assets", h.ListAssets)
			r.Get("/assets/initial-data", h.AssetsInitialData)
			r.Get("/assets/export", h.ExportAssets)
			r.Get("/assets/{id}", h.GetAsset)
			r.Post("/assets", h.CreateAsset)
			r.Patch("/assets/{id}", h.UpdateAsset)
			r.Delete("/assets/{id}", h.DeleteAsset)
			r.Post("/assets/import", h.AssetImport)
			r.Get("/assets/template", h.AssetTemplate)
			r.Patch("/assets/bulk-delete", h.CompatAssetBulkDelete)
			r.Get("/warranty/initial-data/{orgID}", h.WarrantyInitialData)

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

			r.Get("/assets/components/{assetID}", h.GetAssetComponents)
			r.Post("/assets/components", h.CreateAssetComponent)
			r.Patch("/assets/components/{componentID}", h.UpdateAssetComponent)
			r.Delete("/assets/components/{componentID}", h.DeleteAssetComponent)
			r.Post("/assets/components/bulk-replace/{assetID}", h.BulkReplaceAssetComponents)
			r.Post("/assets/scan/resolve", h.ResolveScannedRFIDs)

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

	r.Group(func(r chi.Router) {
		r.Use(api.JWTAuth(cfg))
		api.MountProductionRoutes(r, h)
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
