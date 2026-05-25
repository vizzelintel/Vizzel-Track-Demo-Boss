"use client";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

import { Lock } from "lucide-react";
import { ApprovalList } from "./components/approval-list";
import { useUser } from "@/hooks/use-user";
import { useOrganizationMenus } from "@/hooks/use-organization-menus";
import { useRouter } from "@/shims/next-navigation";
import { useEffect } from "react";

interface ClientApprovalPageProps {
  initialPending?: any[];
  initialApproved?: any[];
}

export default function ClientApprovalPage({
  initialPending = [],
  initialApproved = [],
}: ClientApprovalPageProps) {
  const { user } = useUser();
  const router = useRouter();
  const organizationID = user?.organizationRelation?.organizationID ?? null;
  const roleID = user?.organizationRelation?.roleID ?? null;
  const { hasMenu, loading } = useOrganizationMenus(organizationID);

  useEffect(() => {
    // Role Restriction:
    // Only Role 1 (Super Admin) & 2 (Admin Org) can approve.
    // Roles 3 & 4 should be redirected.
    if (roleID && roleID > 2) {
      router.replace("/withdrawal");
    }
  }, [roleID, router]);

  if (loading) return null;
  if (roleID && roleID > 2) return null; // Prevent flash

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
          อนุมัติการเบิก-ยืม
        </h1>
        <p className="text-muted-foreground text-sm">
          ตรวจสอบและจัดการอนุมัติรายการขอเบิกหรือยืมครุภัณฑ์
        </p>
      </div>

      <div className="mt-2">
        <Tabs defaultValue="pending" className="space-y-4">
          <TabsList className="bg-muted/60 p-1">
            <TabsTrigger value="pending" className="gap-2">
              รออนุมัติ
            </TabsTrigger>
            <TabsTrigger value="approved" className="gap-2">
              อนุมัติแล้ว/ประวัติ
            </TabsTrigger>
          </TabsList>

          <TabsContent value="pending" className="space-y-4">
            <ApprovalList isApprove={0} initialData={initialPending} />
          </TabsContent>
          <TabsContent value="approved" className="space-y-4">
            <ApprovalList isApprove={1} initialData={initialApproved} />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
