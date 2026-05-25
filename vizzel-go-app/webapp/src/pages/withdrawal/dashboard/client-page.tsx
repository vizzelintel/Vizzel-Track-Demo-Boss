"use client";

import { DashboardView } from "@/pages/withdrawal/withdrawal-approval/components/dashboard-view";
import { useUser } from "@/hooks/use-user";
import { useOrganizationMenus } from "@/hooks/use-organization-menus";
import { useRouter } from "@/shims/next-navigation";
import { useEffect } from "react";
import { Lock } from "lucide-react";

interface ClientWithdrawalDashboardPageProps {
  dashboardStats?: any;
}

export default function ClientWithdrawalDashboardPage({
  dashboardStats,
}: ClientWithdrawalDashboardPageProps) {
  const { user } = useUser();
  const router = useRouter();
  const organizationID = user?.organizationRelation?.organizationID ?? null;
  const roleID = user?.organizationRelation?.roleID ?? null;
  const { hasMenu, loading } = useOrganizationMenus(organizationID);

  useEffect(() => {
    // Role Restriction: Role 1 & 2 Only
    if (roleID && roleID > 2) {
      router.replace("/withdrawal");
    }
  }, [roleID, router]);

  if (loading) return null;
  if (roleID && roleID > 2) return null;

  if (!hasMenu(3)) {
    return (
      <div className="flex h-[50vh] flex-col items-center justify-center gap-4 text-center">
        <div className="bg-muted flex size-20 items-center justify-center rounded-full">
          <Lock className="text-muted-foreground size-10" />
        </div>
        <div className="space-y-2">
          <h1 className="text-2xl font-bold tracking-tight">
            ไม่สามารถเข้าถึงได้
          </h1>
          <p className="text-muted-foreground">
            แพ็กเกจของคุณไม่รองรับฟีเจอร์นี้
            กรุณาติดต่อผู้ดูแลระบบหรืออัปเกรดแพ็กเกจ
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-full min-h-0 flex-1 flex-col gap-4 overflow-visible p-4 lg:p-6">
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-bold tracking-tight">
          ภาพรวมระบบเบิก-ยืม
        </h1>
        <p className="text-muted-foreground text-sm">
          สถิติและข้อมูลภาพรวมการเบิก-ยืมครุภัณฑ์
        </p>
      </div>

      <div className="mt-2">
        <DashboardView stats={dashboardStats} />
      </div>
    </div>
  );
}
