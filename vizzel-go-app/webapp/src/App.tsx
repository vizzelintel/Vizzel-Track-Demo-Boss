import type { ReactNode } from "react";
import { Navigate, Route, Routes } from "react-router-dom";
import { useAuth } from "./context/AuthContext";
import { AppLayout } from "./components/layout/AppLayout";
import { LoginPage } from "./pages/LoginPage";
import { DashboardPage } from "./pages/DashboardPage";
import { AssetsListPage } from "./pages/AssetsListPage";
import { PlaceholderPage } from "./pages/PlaceholderPage";

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
        <Route path="/dashboard/personal" element={<PlaceholderPage title="รายงานส่วนตัว" />} />
        <Route path="/dashboard/reports" element={<PlaceholderPage title="รายงานการรับประกัน" />} />
        <Route path="/dashboard/audit" element={<PlaceholderPage title="รายงานการตรวจนับ" />} />
        <Route path="/users" element={<PlaceholderPage title="จัดการสมาชิก" />} />
        <Route path="/organization" element={<PlaceholderPage title="ข้อมูลองค์กรและสถานที่" />} />
        <Route path="/organization-structure" element={<PlaceholderPage title="จัดการโครงสร้างองค์กร" />} />
        <Route path="/assets/list" element={<AssetsListPage />} />
        <Route path="/assets/structure" element={<PlaceholderPage title="โครงสร้างสินทรัพย์" />} />
        <Route path="/sales" element={<PlaceholderPage title="ออกจำหน่าย" />} />
        <Route path="/audit/ongoing" element={<PlaceholderPage title="การตรวจนับ" />} />
        <Route path="/audit/history" element={<PlaceholderPage title="ประวัติการตรวจนับ" />} />
        <Route path="/repair" element={<PlaceholderPage title="แจ้งซ่อมบำรุง" />} />
        <Route path="/withdrawal" element={<PlaceholderPage title="เบิก/ยืม" />} />
        <Route path="/profile" element={<PlaceholderPage title="โปรไฟล์" />} />
        <Route path="/settings" element={<PlaceholderPage title="ตั้งค่า" />} />
      </Route>
      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  );
}
