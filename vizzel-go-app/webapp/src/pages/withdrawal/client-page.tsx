"use client";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { TEST_IDS } from "@/components/test-ids";
import { InternalForm } from "./components/internal-form";
import { ExternalForm } from "./components/external-form";
import { WithdrawalList } from "./components/withdrawal-list";

import { useUser } from "@/hooks/use-user";
import { useOrganizationMenus } from "@/hooks/use-organization-menus";
import { Lock } from "lucide-react";
import { useState, useEffect } from "react";
import { apiRequest } from "@/lib/api";
import { useRouter } from "@/shims/next-navigation";

interface ClientWithdrawalPageProps {
  initialAssets: any[];
  initialUsers: any[];
  initialHistory: any[];
}

export default function ClientWithdrawalPage({
  initialAssets,
  initialUsers,
  initialHistory,
}: ClientWithdrawalPageProps) {
  const { user } = useUser();
  const organizationID = user?.organizationRelation?.organizationID ?? null;
  const { hasMenu, loading } = useOrganizationMenus(organizationID);
  const router = useRouter();

  const [assets, setAssets] = useState<any[]>(initialAssets);

  useEffect(() => {
    setAssets(initialAssets);
  }, [initialAssets]);

  const refreshAssets = async () => {
    if (!organizationID) return;
    try {
      const res = await apiRequest(
        `/withdrawal/asset/list?organizationID=${organizationID}`,
      );
      setAssets(res || []);
      router.refresh();
    } catch (error) {
      console.error("Failed to fetch assets", error);
    }
  };

  if (loading) return null;

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
        <h1 className="text-2xl font-bold tracking-tight">ระบบเบิก-ยืม</h1>
        <p className="text-muted-foreground text-sm">คำขอเบิกหรือยืมครุภัณฑ์</p>
      </div>

      <div className="mt-2">
        <Tabs defaultValue="internal" className="space-y-4">
          <TabsList className="bg-muted/60 p-1">
            <TabsTrigger value="internal" className="gap-2" data-testid={TEST_IDS.WITHDRAWAL.TAB_INTERNAL}>
              บุคลากรภายใน
            </TabsTrigger>
            <TabsTrigger value="external" className="gap-2" data-testid={TEST_IDS.WITHDRAWAL.TAB_EXTERNAL}>
              บุคคลภายนอก
            </TabsTrigger>
            <TabsTrigger value="history" className="gap-2" data-testid={TEST_IDS.WITHDRAWAL.TAB_HISTORY}>
              ประวัติการทำรายการ
            </TabsTrigger>
          </TabsList>

          <TabsContent value="internal" className="space-y-4">
            <div className="bg-card text-card-foreground rounded-xl border p-6 shadow-sm">
              <InternalForm
                assets={assets}
                onRefreshAssets={refreshAssets}
                initialUsers={initialUsers}
              />
            </div>
          </TabsContent>
          <TabsContent value="external" className="space-y-4">
            <div className="bg-card text-card-foreground rounded-xl border p-6 shadow-sm">
              <ExternalForm assets={assets} onRefreshAssets={refreshAssets} />
            </div>
          </TabsContent>
          <TabsContent value="history" className="space-y-4">
            <WithdrawalList initialData={initialHistory} />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
