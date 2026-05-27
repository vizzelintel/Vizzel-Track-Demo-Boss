import { lazy, Suspense, type ReactNode } from "react";
import { Navigate, Route, Routes } from "react-router-dom";
import { useAuth } from "./context/AuthContext";
import { ProtectedLayout } from "./components/layout/ProtectedLayout";
import { AuthLayout } from "./components/layout/AuthLayout";
import { PageLoader } from "./components/PageLoader";
import { getToken } from "@/lib/api";
import { EntityCrudPage } from "./components/data/EntityCrudPage";

const LoginPage = lazy(() =>
  import("./pages/LoginPage").then((m) => ({ default: m.LoginPage })),
);
const RegisterPage = lazy(() =>
  import("./pages/RegisterPage").then((m) => ({ default: m.RegisterPage })),
);
const ForgotPasswordPage = lazy(() =>
  import("./pages/ForgotPasswordPage").then((m) => ({ default: m.ForgotPasswordPage })),
);
const ResetPasswordPage = lazy(() =>
  import("./pages/ResetPasswordPage").then((m) => ({ default: m.ResetPasswordPage })),
);
const VerifyEmailPage = lazy(() =>
  import("./pages/VerifyEmailPage").then((m) => ({ default: m.VerifyEmailPage })),
);
const OnboardingPage = lazy(() =>
  import("./pages/OnboardingPage").then((m) => ({ default: m.OnboardingPage })),
);
const SelectOrganizationPage = lazy(() =>
  import("./pages/SelectOrganizationPage").then((m) => ({
    default: m.SelectOrganizationPage,
  })),
);
const DashboardPage = lazy(() =>
  import("./pages/DashboardPage").then((m) => ({ default: m.DashboardPage })),
);
const PersonalDashboardPage = lazy(() =>
  import("./pages/PersonalDashboardPage").then((m) => ({ default: m.PersonalDashboardPage })),
);
const AssetsListPage = lazy(() =>
  import("./pages/AssetsListPage").then((m) => ({ default: m.AssetsListPage })),
);
const AssetsStructurePage = lazy(() =>
  import("./pages/AssetsStructurePage").then((m) => ({ default: m.AssetsStructurePage })),
);
const OrganizationPage = lazy(() =>
  import("./pages/OrganizationPage").then((m) => ({ default: m.OrganizationPage })),
);
const OrganizationStructurePage = lazy(() =>
  import("./pages/OrganizationStructurePage").then((m) => ({ default: m.OrganizationStructurePage })),
);
const ProfilePage = lazy(() =>
  import("./pages/ProfilePage").then((m) => ({ default: m.ProfilePage })),
);
const AuditOngoingPage = lazy(() =>
  import("./pages/AuditOngoingPage").then((m) => ({ default: m.AuditOngoingPage })),
);
const AuditJobPage = lazy(() =>
  import("./pages/AuditJobPage").then((m) => ({ default: m.AuditJobPage })),
);
const AuditReportPage = lazy(() =>
  import("./pages/AuditReportPage").then((m) => ({ default: m.AuditReportPage })),
);
const WithdrawalApprovalPage = lazy(() =>
  import("./pages/withdrawal/withdrawal-approval/page").then((m) => ({
    default: m.WithdrawalApprovalPage,
  })),
);
const UsersPage = lazy(() =>
  import("./pages/users/page").then((m) => ({ default: m.UsersPage })),
);
const WithdrawalPage = lazy(() =>
  import("./pages/withdrawal/page").then((m) => ({ default: m.WithdrawalPage })),
);
const WithdrawalDashboardPage = lazy(() =>
  import("./pages/withdrawal/dashboard/page").then((m) => ({
    default: m.WithdrawalDashboardPage,
  })),
);
const SuperAdminDashboardPage = lazy(() =>
  import("./pages/SuperAdminDashboardPage").then((m) => ({
    default: m.SuperAdminDashboardPage,
  })),
);
const SuperAdminOrganizationsPage = lazy(() =>
  import("./pages/SuperAdminOrganizationsPage").then((m) => ({
    default: m.SuperAdminOrganizationsPage,
  })),
);
const SuperAdminMenusPage = lazy(() =>
  import("./pages/SuperAdminMenusPage").then((m) => ({ default: m.SuperAdminMenusPage })),
);
const SuperAdminOrgAccessPage = lazy(() =>
  import("./pages/SuperAdminOrgAccessPage").then((m) => ({
    default: m.SuperAdminOrgAccessPage,
  })),
);
const SuperAdminRolesPage = lazy(() =>
  import("./pages/SuperAdminRolesPage").then((m) => ({
    default: m.SuperAdminRolesPage,
  })),
);
const DocumentsPage = lazy(() =>
  import("./pages/DocumentsPage").then((m) => ({ default: m.DocumentsPage })),
);
const DocumentDetailPage = lazy(() =>
  import("./pages/DocumentDetailPage").then((m) => ({ default: m.DocumentDetailPage })),
);
const InboxPage = lazy(() =>
  import("./pages/InboxPage").then((m) => ({ default: m.InboxPage })),
);
const WarrantyReportsPage = lazy(() =>
  import("./pages/WarrantyReportsPage").then((m) => ({ default: m.WarrantyReportsPage })),
);
const RepairDashboardPage = lazy(() =>
  import("./pages/RepairDashboardPage").then((m) => ({ default: m.RepairDashboardPage })),
);
const AssetTaxonomyPage = lazy(() =>
  import("./pages/AssetTaxonomyPage").then((m) => ({ default: m.AssetTaxonomyPage })),
);
const NotificationsPage = lazy(() =>
  import("./pages/NotificationsPage").then((m) => ({ default: m.NotificationsPage })),
);
const NotificationChannelsPage = lazy(() =>
  import("./pages/settings/NotificationChannelsPage").then((m) => ({
    default: m.NotificationChannelsPage,
  })),
);
const ApprovalDelegatesPage = lazy(() =>
  import("./pages/settings/ApprovalDelegatesPage").then((m) => ({
    default: m.ApprovalDelegatesPage,
  })),
);
const RolesPage = lazy(() =>
  import("./pages/settings/RolesPage").then((m) => ({ default: m.RolesPage })),
);
const ApprovalQueuePage = lazy(() =>
  import("./pages/ApprovalQueuePage").then((m) => ({ default: m.ApprovalQueuePage })),
);
const TransferPage = lazy(() =>
  import("./pages/TransferPage").then((m) => ({ default: m.TransferPage })),
);
const TransferDashboardPage = lazy(() =>
  import("./pages/TransferDashboardPage").then((m) => ({ default: m.TransferDashboardPage })),
);
const TransferIncomingPage = lazy(() =>
  import("./pages/TransferIncomingPage").then((m) => ({ default: m.TransferIncomingPage })),
);
const RepairWorkflowPage = lazy(() =>
  import("./pages/RepairWorkflowPage").then((m) => ({ default: m.RepairWorkflowPage })),
);
const SalesPage = lazy(() =>
  import("./pages/SalesPage").then((m) => ({ default: m.SalesPage })),
);
const SalesCreatePage = lazy(() =>
  import("./pages/SalesCreatePage").then((m) => ({ default: m.SalesCreatePage })),
);
const WithdrawalVerifyPage = lazy(() =>
  import("./pages/WithdrawalVerifyPage").then((m) => ({
    default: m.WithdrawalVerifyPage,
  })),
);

function Lazy({ children }: { children: ReactNode }) {
  return <Suspense fallback={<PageLoader />}>{children}</Suspense>;
}

function Protected({ children }: { children: ReactNode }) {
  const { user, loading } = useAuth();
  if (!getToken()) {
    return <Navigate to="/login" replace />;
  }
  if (loading) {
    return <PageLoader label="กำลังตรวจสอบการเข้าสู่ระบบ..." />;
  }
  if (!user) return <Navigate to="/login" replace />;
  return <>{children}</>;
}

function PublicOnly({
  children,
  redirect = "/dashboard",
}: {
  children: ReactNode;
  redirect?: string;
}) {
  const { user, loading } = useAuth();
  if (!getToken()) {
    return <>{children}</>;
  }
  if (loading) {
    return <PageLoader label="กำลังเข้าสู่ระบบ..." />;
  }
  if (user) return <Navigate to={redirect} replace />;
  return <>{children}</>;
}

export default function App() {
  return (
    <Routes>
      <Route
        path="/withdrawal/verify/:token"
        element={
          <Lazy>
            <WithdrawalVerifyPage />
          </Lazy>
        }
      />
      <Route
        path="/login"
        element={
          <PublicOnly>
            <AuthLayout>
              <Lazy>
                <LoginPage />
              </Lazy>
            </AuthLayout>
          </PublicOnly>
        }
      />
      <Route
        path="/register"
        element={
          <PublicOnly>
            <AuthLayout>
              <Lazy>
                <RegisterPage />
              </Lazy>
            </AuthLayout>
          </PublicOnly>
        }
      />
      <Route
        path="/forgot-password"
        element={
          <AuthLayout>
            <Lazy>
              <ForgotPasswordPage />
            </Lazy>
          </AuthLayout>
        }
      />
      <Route
        path="/reset-password"
        element={
          <AuthLayout>
            <Lazy>
              <ResetPasswordPage />
            </Lazy>
          </AuthLayout>
        }
      />
      <Route
        path="/verify-email"
        element={
          <AuthLayout>
            <Lazy>
              <VerifyEmailPage />
            </Lazy>
          </AuthLayout>
        }
      />
      <Route
        path="/onboarding"
        element={
          <Lazy>
            <OnboardingPage />
          </Lazy>
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
        <Route
          path="/dashboard"
          element={
            <Lazy>
              <DashboardPage />
            </Lazy>
          }
        />
        <Route
          path="/dashboard/personal"
          element={
            <Lazy>
              <PersonalDashboardPage />
            </Lazy>
          }
        />
        <Route
          path="/dashboard/reports"
          element={
            <Lazy>
              <WarrantyReportsPage />
            </Lazy>
          }
        />
        <Route
          path="/dashboard/repair"
          element={
            <Lazy>
              <RepairDashboardPage />
            </Lazy>
          }
        />
        <Route
          path="/dashboard/audit"
          element={
            <Lazy>
              <AuditReportPage />
            </Lazy>
          }
        />
        <Route
          path="/users"
          element={
            <Lazy>
              <UsersPage />
            </Lazy>
          }
        />
        <Route
          path="/organization"
          element={
            <Lazy>
              <OrganizationPage />
            </Lazy>
          }
        />
        <Route
          path="/organization-structure"
          element={
            <Lazy>
              <OrganizationStructurePage />
            </Lazy>
          }
        />
        <Route
          path="/organization/institute"
          element={<Navigate to="/organization-structure?tab=institutes" replace />}
        />
        <Route
          path="/organization/department"
          element={<Navigate to="/organization-structure?tab=departments" replace />}
        />
        <Route
          path="/organization/section"
          element={<Navigate to="/organization-structure?tab=sections" replace />}
        />
        <Route
          path="/select-organization"
          element={
            <Lazy>
              <SelectOrganizationPage />
            </Lazy>
          }
        />
        <Route path="/assets" element={<Navigate to="/assets/list" replace />} />
        <Route
          path="/assets/list"
          element={
            <Lazy>
              <AssetsListPage />
            </Lazy>
          }
        />
        <Route
          path="/assets/structure"
          element={
            <Lazy>
              <AssetsStructurePage />
            </Lazy>
          }
        />
        <Route
          path="/assets/category"
          element={
            <Lazy>
              <AssetTaxonomyPage
                title="หมวดสินทรัพย์"
                listEndpoint="/api/v1/assets/categories"
                entityKind="categories"
              />
            </Lazy>
          }
        />
        <Route
          path="/assets/type"
          element={
            <Lazy>
              <AssetTaxonomyPage
                title="ประเภทสินทรัพย์"
                listEndpoint="/api/v1/assets/types"
                entityKind="types"
                parentField={{ label: "หมวด", listEndpoint: "/api/v1/assets/categories" }}
              />
            </Lazy>
          }
        />
        <Route
          path="/assets/class"
          element={
            <Lazy>
              <AssetTaxonomyPage
                title="กลุ่ม/ชนิดสินทรัพย์"
                listEndpoint="/api/v1/assets/classes"
                entityKind="classes"
                parentField={{ label: "ประเภท", listEndpoint: "/api/v1/assets/types" }}
              />
            </Lazy>
          }
        />
        <Route
          path="/sales"
          element={
            <Lazy>
              <SalesPage />
            </Lazy>
          }
        />
        <Route
          path="/sales/create"
          element={
            <Lazy>
              <SalesCreatePage />
            </Lazy>
          }
        />
        <Route path="/audit" element={<Navigate to="/audit/ongoing" replace />} />
        <Route
          path="/audit/ongoing"
          element={
            <Lazy>
              <AuditOngoingPage />
            </Lazy>
          }
        />
        <Route
          path="/audit/ongoing/:jobID"
          element={
            <Lazy>
              <AuditJobPage />
            </Lazy>
          }
        />
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
            <Lazy>
              <RepairWorkflowPage />
            </Lazy>
          }
        />
        <Route
          path="/repair/dashboard"
          element={
            <Lazy>
              <RepairDashboardPage />
            </Lazy>
          }
        />
        <Route
          path="/approval-queue"
          element={
            <Lazy>
              <ApprovalQueuePage />
            </Lazy>
          }
        />
        <Route
          path="/transfer"
          element={
            <Lazy>
              <TransferPage />
            </Lazy>
          }
        />
        <Route
          path="/transfer/dashboard"
          element={
            <Lazy>
              <TransferDashboardPage />
            </Lazy>
          }
        />
        <Route
          path="/transfer/incoming"
          element={
            <Lazy>
              <TransferIncomingPage />
            </Lazy>
          }
        />
        <Route
          path="/withdrawal"
          element={
            <Lazy>
              <WithdrawalPage />
            </Lazy>
          }
        />
        <Route
          path="/withdrawal/dashboard"
          element={
            <Lazy>
              <WithdrawalDashboardPage />
            </Lazy>
          }
        />
        <Route
          path="/withdrawal-approval"
          element={
            <Lazy>
              <WithdrawalApprovalPage />
            </Lazy>
          }
        />
        <Route
          path="/documents"
          element={
            <Lazy>
              <DocumentsPage />
            </Lazy>
          }
        />
        <Route
          path="/documents/:id"
          element={
            <Lazy>
              <DocumentDetailPage />
            </Lazy>
          }
        />
        <Route
          path="/inbox"
          element={
            <Lazy>
              <InboxPage />
            </Lazy>
          }
        />
        <Route
          path="/notifications"
          element={
            <Lazy>
              <NotificationsPage />
            </Lazy>
          }
        />
        <Route
          path="/settings/notifications"
          element={
            <Lazy>
              <NotificationChannelsPage />
            </Lazy>
          }
        />
        <Route
          path="/settings/approval-delegates"
          element={
            <Lazy>
              <ApprovalDelegatesPage />
            </Lazy>
          }
        />
        <Route
          path="/settings/roles"
          element={
            <Lazy>
              <RolesPage />
            </Lazy>
          }
        />
        <Route
          path="/profile"
          element={
            <Lazy>
              <ProfilePage />
            </Lazy>
          }
        />
        <Route
          path="/settings"
          element={
            <Lazy>
              <ProfilePage />
            </Lazy>
          }
        />
        <Route
          path="/super-admin/dashboard"
          element={
            <Lazy>
              <SuperAdminDashboardPage />
            </Lazy>
          }
        />
        <Route
          path="/super-admin/organizations"
          element={
            <Lazy>
              <SuperAdminOrganizationsPage />
            </Lazy>
          }
        />
        <Route
          path="/super-admin/menus"
          element={
            <Lazy>
              <SuperAdminMenusPage />
            </Lazy>
          }
        />
        <Route
          path="/super-admin/org-access"
          element={
            <Lazy>
              <SuperAdminOrgAccessPage />
            </Lazy>
          }
        />
        <Route
          path="/super-admin/roles"
          element={
            <Lazy>
              <SuperAdminRolesPage />
            </Lazy>
          }
        />
      </Route>
      <Route path="*" element={<Navigate to="/login" replace />} />
    </Routes>
  );
}
