import type { ReactNode } from "react";
import { Navigate, Route, Routes } from "react-router-dom";
import { useAuth } from "./context/AuthContext";
import { ProtectedLayout } from "./components/layout/ProtectedLayout";
import { LoginPage } from "./pages/LoginPage";
import { DashboardPage } from "./pages/DashboardPage";
import { PersonalDashboardPage } from "./pages/PersonalDashboardPage";
import { AssetsListPage } from "./pages/AssetsListPage";
import { AssetsStructurePage } from "./pages/AssetsStructurePage";
import { OrganizationPage } from "./pages/OrganizationPage";
import { OrganizationStructurePage } from "./pages/OrganizationStructurePage";
import { ProfilePage } from "./pages/ProfilePage";
import { EntityCrudPage } from "./components/data/EntityCrudPage";
import { AuditOngoingPage } from "./pages/AuditOngoingPage";
import { AuditJobPage } from "./pages/AuditJobPage";
import { WithdrawalApprovalPage } from "./pages/withdrawal/withdrawal-approval/page";
import { UsersPage } from "./pages/users/page";
import { WithdrawalPage } from "./pages/withdrawal/page";
import { WithdrawalDashboardPage } from "./pages/withdrawal/dashboard/page";
import { SuperAdminDashboardPage } from "./pages/SuperAdminDashboardPage";
import { SuperAdminMenusPage } from "./pages/SuperAdminMenusPage";
import { SuperAdminOrgAccessPage } from "./pages/SuperAdminOrgAccessPage";
import { DocumentsPage } from "./pages/DocumentsPage";
import { DocumentDetailPage } from "./pages/DocumentDetailPage";
import { InboxPage } from "./pages/InboxPage";
import { RegisterPage } from "./pages/RegisterPage";
import { ForgotPasswordPage } from "./pages/ForgotPasswordPage";
import { WarrantyReportsPage } from "./pages/WarrantyReportsPage";
import { RepairDashboardPage } from "./pages/RepairDashboardPage";
import { AssetTaxonomyPage } from "./pages/AssetTaxonomyPage";
import { AuthLayout } from "./components/layout/AuthLayout";

function Protected({ children }: { children: ReactNode }) {
  const { user, loading } = useAuth();
  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center text-muted-foreground">
        กำลังโหลด...
      </div>
    );
  }
  if (!user) return <Navigate to="/login" replace />;
  return <>{children}</>;
}

export default function App() {
  const { user } = useAuth();
  return (
    <Routes>
      <Route
        path="/login"
        element={
          user ? (
            <Navigate to="/dashboard" replace />
          ) : (
            <AuthLayout>
              <LoginPage />
            </AuthLayout>
          )
        }
      />
      <Route
        path="/register"
        element={
          user ? (
            <Navigate to="/dashboard" replace />
          ) : (
            <AuthLayout>
              <RegisterPage />
            </AuthLayout>
          )
        }
      />
      <Route
        path="/forgot-password"
        element={
          <AuthLayout>
            <ForgotPasswordPage />
          </AuthLayout>
        }
      />
      <Route
        element={
          <Protected>
            <ProtectedLayout />
          </Protected>
        }
      >
        <Route path="/" element={<Navigate to="/dashboard" replace />} />
        <Route path="/dashboard" element={<DashboardPage />} />
        <Route path="/dashboard/personal" element={<PersonalDashboardPage />} />
        <Route path="/dashboard/reports" element={<WarrantyReportsPage />} />
        <Route path="/dashboard/repair" element={<RepairDashboardPage />} />
        <Route
          path="/dashboard/audit"
          element={
            <EntityCrudPage
              title="รายงานการตรวจนับ"
              listEndpoint="/api/v1/audit/history"
              columns={[
                { key: "title", label: "งาน" },
                { key: "status", label: "สถานะ" },
                { key: "value", label: "%", render: (r) => `${r.value ?? 0}%` },
              ]}
            />
          }
        />
        <Route path="/users" element={<UsersPage />} />
        <Route path="/organization" element={<OrganizationPage />} />
        <Route path="/organization-structure" element={<OrganizationStructurePage />} />
        <Route path="/assets" element={<Navigate to="/assets/list" replace />} />
        <Route path="/assets/list" element={<AssetsListPage />} />
        <Route path="/assets/structure" element={<AssetsStructurePage />} />
        <Route
          path="/assets/category"
          element={<AssetTaxonomyPage title="หมวดสินทรัพย์" listEndpoint="/api/v1/assets/categories" entityKind="categories" />}
        />
        <Route
          path="/assets/type"
          element={
            <AssetTaxonomyPage
              title="ประเภทสินทรัพย์"
              listEndpoint="/api/v1/assets/types"
              entityKind="types"
              parentField={{ label: "หมวด", listEndpoint: "/api/v1/assets/categories" }}
            />
          }
        />
        <Route
          path="/assets/class"
          element={
            <AssetTaxonomyPage
              title="กลุ่ม/ชนิดสินทรัพย์"
              listEndpoint="/api/v1/assets/classes"
              entityKind="classes"
              parentField={{ label: "ประเภท", listEndpoint: "/api/v1/assets/types" }}
            />
          }
        />
        <Route
          path="/sales"
          element={
            <EntityCrudPage
              title="ออกจำหน่าย"
              listEndpoint="/api/v1/sales"
              entityKind="sales"
              columns={[
                { key: "title", label: "เลขครุภัณฑ์" },
                { key: "subtitle", label: "ผู้ซื้อ" },
                { key: "status", label: "สถานะ" },
              ]}
              createLabel="เพิ่มรายการจำหน่าย"
            />
          }
        />
        <Route path="/audit" element={<Navigate to="/audit/ongoing" replace />} />
        <Route path="/audit/ongoing" element={<AuditOngoingPage />} />
        <Route path="/audit/ongoing/:jobID" element={<AuditJobPage />} />
        <Route
          path="/audit/history"
          element={
            <EntityCrudPage
              title="ประวัติการตรวจนับ"
              listEndpoint="/api/v1/audit/history"
              columns={[
                { key: "title", label: "งาน" },
                { key: "status", label: "สถานะ" },
                { key: "value", label: "%", render: (r) => `${r.value ?? 0}%` },
              ]}
            />
          }
        />
        <Route
          path="/repair"
          element={
            <EntityCrudPage
              title="แจ้งซ่อมบำรุง"
              listEndpoint="/api/v1/repairs"
              entityKind="repairs"
              columns={[
                { key: "title", label: "เลขครุภัณฑ์" },
                { key: "subtitle", label: "รายละเอียด" },
                { key: "status", label: "สถานะ" },
              ]}
              createLabel="แจ้งซ่อม"
            />
          }
        />
        <Route path="/withdrawal" element={<WithdrawalPage />} />
        <Route path="/withdrawal/dashboard" element={<WithdrawalDashboardPage />} />
        <Route path="/withdrawal-approval" element={<WithdrawalApprovalPage />} />
        <Route path="/documents" element={<DocumentsPage />} />
        <Route path="/documents/:id" element={<DocumentDetailPage />} />
        <Route path="/inbox" element={<InboxPage />} />
        <Route path="/profile" element={<ProfilePage />} />
        <Route path="/settings" element={<ProfilePage />} />
        <Route path="/super-admin/dashboard" element={<SuperAdminDashboardPage />} />
        <Route
          path="/super-admin/organizations"
          element={
            <EntityCrudPage
              title="จัดการองค์กร"
              listEndpoint="/api/v1/super-admin/organizations"
              columns={[{ key: "title", label: "องค์กร" }]}
            />
          }
        />
        <Route path="/super-admin/menus" element={<SuperAdminMenusPage />} />
        <Route path="/super-admin/org-access" element={<SuperAdminOrgAccessPage />} />
      </Route>
      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  );
}
