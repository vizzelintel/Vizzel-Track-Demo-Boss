import type { ReactNode } from "react";
import { Navigate, Route, Routes } from "react-router-dom";
import { useAuth } from "./context/AuthContext";
import { AppLayout } from "./components/layout/AppLayout";
import { LoginPage } from "./pages/LoginPage";
import { DashboardPage } from "./pages/DashboardPage";
import { AssetsListPage } from "./pages/AssetsListPage";
import { ModuleListPage } from "./pages/ModuleListPage";
import { AssetsStructurePage } from "./pages/AssetsStructurePage";
import { OrganizationStructurePage } from "./pages/OrganizationStructurePage";
import { ProfilePage } from "./pages/ProfilePage";

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

const stdCols = [
  { key: "title" as const, label: "รายการ" },
  { key: "subtitle" as const, label: "รายละเอียด" },
  { key: "status" as const, label: "สถานะ" },
];

export default function App() {
  const { user } = useAuth();
  return (
    <Routes>
      <Route
        path="/login"
        element={user ? <Navigate to="/dashboard" replace /> : <LoginPage />}
      />
      <Route
        element={
          <Protected>
            <AppLayout />
          </Protected>
        }
      >
        <Route path="/" element={<Navigate to="/dashboard" replace />} />
        <Route path="/dashboard" element={<DashboardPage />} />
        <Route path="/dashboard/personal" element={<DashboardPage />} />
        <Route
          path="/dashboard/reports"
          element={
            <ModuleListPage title="รายงานการรับประกัน" endpoint="/api/v1/sales" columns={stdCols} />
          }
        />
        <Route
          path="/dashboard/audit"
          element={
            <ModuleListPage
              title="รายงานการตรวจนับ"
              endpoint="/api/v1/audit/history"
              columns={[
                { key: "title", label: "งานตรวจนับ" },
                { key: "status", label: "สถานะ" },
                { key: "value", label: "%" },
              ]}
            />
          }
        />
        <Route
          path="/users"
          element={
            <ModuleListPage
              title="จัดการสมาชิก"
              endpoint="/api/v1/users"
              columns={[
                { key: "title", label: "ชื่อ" },
                { key: "subtitle", label: "อีเมล" },
              ]}
            />
          }
        />
        <Route
          path="/organization"
          element={
            <ModuleListPage
              title="ข้อมูลองค์กรและสถานที่"
              endpoint="/api/v1/organization/buildings"
              columns={[{ key: "title", label: "อาคาร" }]}
            />
          }
        />
        <Route path="/organization-structure" element={<OrganizationStructurePage />} />
        <Route path="/assets/list" element={<AssetsListPage />} />
        <Route path="/assets/structure" element={<AssetsStructurePage />} />
        <Route path="/sales" element={<ModuleListPage title="ออกจำหน่าย" endpoint="/api/v1/sales" columns={stdCols} />} />
        <Route
          path="/audit/ongoing"
          element={
            <ModuleListPage
              title="การตรวจนับ"
              endpoint="/api/v1/audit/ongoing"
              columns={[
                { key: "title", label: "งาน" },
                { key: "status", label: "สถานะ" },
                { key: "value", label: "ความคืบหน้า %" },
              ]}
            />
          }
        />
        <Route
          path="/audit/history"
          element={
            <ModuleListPage
              title="ประวัติการตรวจนับ"
              endpoint="/api/v1/audit/history"
              columns={[
                { key: "title", label: "งาน" },
                { key: "status", label: "สถานะ" },
                { key: "value", label: "%" },
              ]}
            />
          }
        />
        <Route path="/repair" element={<ModuleListPage title="แจ้งซ่อมบำรุง" endpoint="/api/v1/repairs" columns={stdCols} />} />
        <Route path="/withdrawal" element={<ModuleListPage title="เบิก/ยืม" endpoint="/api/v1/withdrawals" columns={stdCols} />} />
        <Route
          path="/withdrawal-approval"
          element={<ModuleListPage title="อนุมัติเบิก/ยืม" endpoint="/api/v1/withdrawals" columns={stdCols} />}
        />
        <Route path="/profile" element={<ProfilePage />} />
        <Route path="/settings" element={<ProfilePage />} />
        <Route
          path="/super-admin/dashboard"
          element={
            <ModuleListPage
              title="Super Admin — องค์กรทั้งหมด"
              endpoint="/api/v1/super-admin/organizations"
              columns={[{ key: "title", label: "องค์กร" }]}
            />
          }
        />
        <Route
          path="/super-admin/organizations"
          element={
            <ModuleListPage
              title="จัดการองค์กร"
              endpoint="/api/v1/super-admin/organizations"
              columns={[{ key: "title", label: "องค์กร" }]}
            />
          }
        />
        <Route
          path="/super-admin/menus"
          element={<ModuleListPage title="จัดการเมนู" endpoint="/api/v1/menus" columns={[{ key: "title", label: "เมนู" }]} />}
        />
        <Route
          path="/super-admin/org-access"
          element={<ModuleListPage title="สิทธิ์เข้าถึง Org (demo)" endpoint="/api/v1/users" columns={[{ key: "title", label: "ผู้ใช้" }]} />}
        />
      </Route>
      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  );
}
