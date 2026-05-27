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
	r.Get("/withdrawal/verify/{token}", h.WithdrawalVerifyByToken)
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
			r.With(h.RequirePermission("assets", "edit")).Post("/assets", h.CreateAsset)
			r.With(h.RequirePermission("assets", "edit")).Patch("/assets/{id}", h.UpdateAsset)
			r.With(h.RequirePermission("assets", "delete")).Delete("/assets/{id}", h.DeleteAsset)
			r.With(h.RequirePermission("assets", "edit")).Post("/assets/import", h.AssetImport)
			r.Get("/assets/template", h.AssetTemplate)
			r.Get("/assets/structure/template", h.StructureTemplate)
			r.With(h.RequirePermission("assets", "edit")).Post("/assets/structure/import", h.StructureImport)
			r.Get("/assets/structure/export", h.StructureExport)
			r.Get("/organization/structure/template", h.OrgStructureTemplate)
			r.With(h.RequirePermission("organization", "edit")).Post("/organization/structure/import", h.OrgStructureImport)
			r.Get("/organization/structure/export", h.OrgStructureExport)
			r.Get("/facility/template", h.FacilityTemplate)
			r.With(h.RequirePermission("organization", "edit")).Post("/facility/import", h.FacilityImport)
			r.Get("/facility/export", h.FacilityExport)
			r.Get("/user/template", h.UserTemplate)
			r.With(h.RequirePermission("users", "edit")).Post("/user/import", h.UserImport)
			r.Get("/user/export", h.UserExport)
			r.Get("/user/organization/template", h.UserTemplate)
			r.With(h.RequirePermission("users", "edit")).Post("/user/organization/import", h.UserImport)
			r.Get("/user/organization/export", h.UserExport)
			r.Get("/user/organization/export/{orgID}", h.UserExport)
			r.Get("/sales/template", h.DisposalTemplate)
			r.Get("/disposal/template", h.DisposalTemplate)
			r.Get("/asset-structure/template", h.StructureTemplate)
			r.With(h.RequirePermission("assets", "edit")).Post("/asset-structure/import", h.StructureImport)
			r.Get("/asset-structure/export", h.StructureExport)
			r.Get("/organization-structure/template", h.OrgStructureTemplate)
			r.With(h.RequirePermission("organization", "edit")).Post("/organization-structure/import", h.OrgStructureImport)
			r.Get("/organization-structure/export", h.OrgStructureExport)
			r.With(h.RequirePermission("assets", "delete")).Patch("/assets/bulk-delete", h.CompatAssetBulkDelete)
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
			r.Post("/repairs", h.RepairCreateWithApproval)
			r.Post("/repairs/{id}/submit", h.RepairSubmitApproval)
			r.Post("/repairs/{id}/complete", h.RepairComplete)
			r.Post("/withdrawals/{id}/issue", h.WithdrawalIssue)
			r.Get("/withdrawals/verify/{token}", h.WithdrawalVerifyByToken)
			r.Get("/approvals/pending", h.ListPendingApprovals)
			r.Get("/approvals/{id}", h.GetApprovalInstance)
			r.Post("/approvals/{id}/action", h.ApprovalAction)
			r.Get("/transfers", h.ListTransfers)
			r.Post("/transfers", h.CreateTransfer)
			r.Post("/transfers/{id}/submit", h.TransferSubmitApproval)
			r.Post("/transfers/{id}/accept", h.AcceptTransferAtTarget)
			r.Get("/organization/transfer-targets", h.ListTransferTargets)
			r.Get("/organization/children", h.ListChildOrganizations)
			r.Get("/withdrawals", h.ListWithdrawals)
			r.Patch("/withdrawals/{id}/status", h.PatchWithdrawalStatus)
			r.Post("/withdrawals/{id}/submit", h.WithdrawalSubmitApproval)
			r.Post("/withdrawals/{id}/return", h.WithdrawalReturn)
			r.Post("/withdrawals/{id}/return-scan", h.WithdrawalReturnScan)
			r.Get("/approval/delegates", h.ListApprovalDelegates)
			r.Post("/approval/delegates", h.SetApprovalDelegate)
			r.Get("/sales", h.ListSales)
			r.Get("/menus", h.OrgMenus)
			r.Get("/menus/toggles", h.ListMenuToggles)
			r.Patch("/menus/toggles", h.SetOrgMenu)

			r.Route("/entities/{kind}", func(r chi.Router) {
				r.Post("/", h.EntityCreate)
				r.Post("/bulk-delete", h.EntityBulkDelete)
				r.Patch("/{id}", h.EntityUpdate)
				r.Delete("/{id}", h.EntityDelete)
			})

			r.Get("/notification/list", h.ListNotifications)
			r.Get("/notification/unread-count", h.UnreadCountNotifications)
			r.Patch("/notification/read/{id}", h.MarkNotificationRead)
			r.Patch("/notification/read-all", h.MarkAllNotificationsRead)
			r.Post("/notification/test-ping", h.NotificationTestPing)
			r.Get("/notification-channel/list", h.ListNotificationChannels)
			r.Post("/notification-channel/create", h.CreateNotificationChannel)
			r.Patch("/notification-channel/update/{id}", h.UpdateNotificationChannel)
			r.Delete("/notification-channel/delete/{id}", h.DeleteNotificationChannel)
			r.Post("/notification-channel/test/{id}", h.TestNotificationChannel)

			r.Get("/super-admin/stats", h.SuperAdminStats)
			r.Get("/super-admin/organizations", h.ListSuperAdminOrgs)
			r.Post("/super-admin/organizations", h.CreateOrganization)
			r.Delete("/super-admin/organizations/{id}", h.DeleteOrganization)
			r.Get("/super-admin/org-access", h.ListOrgAccess)
			r.Post("/super-admin/org-access", h.CreateOrgAccess)
			r.Delete("/super-admin/org-access/{id}", h.DeleteOrgAccess)

			r.Get("/permissions/me", h.MyPermissions)
			r.Get("/permissions/resources", h.ListResources)
			r.Get("/roles", h.ListRoles)
			r.Get("/roles/{id}", h.GetRole)
			r.Post("/roles", h.CreateRole)
			r.Patch("/roles/{id}", h.UpdateRole)
			r.Delete("/roles/{id}", h.DeleteRole)

			r.With(h.RequirePermission("assets", "edit")).Post("/assets/import/elaas", h.ImportElaasXLSX)
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
		if name == "favicon.ico" {
			name = "favicon.svg"
		}
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
