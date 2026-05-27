import { useCallback, useEffect, useState } from "react";
import { Building, LayoutGrid, Menu as MenuIcon } from "lucide-react";
import { toast } from "sonner";
import { apiRequest } from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { PageHeader } from "@/components/layout/PageHeader";

type MenuToggle = { menu_id: number; name: string; enabled: boolean };
type Org = { id: number; title: string };

export function SuperAdminMenusPage() {
  const [tab, setTab] = useState<"org" | "global">("org");
  const [orgs, setOrgs] = useState<Org[]>([]);
  const [orgID, setOrgID] = useState<string>("");
  const [menus, setMenus] = useState<MenuToggle[]>([]);

  const loadOrgs = useCallback(async () => {
    try {
      const r = await apiRequest<{ data: Org[] }>(
        "/api/v1/super-admin/organizations",
      );
      setOrgs(r.data ?? []);
    } catch {
      toast.error("โหลดรายการองค์กรไม่สำเร็จ");
    }
  }, []);

  const loadMenus = useCallback(async (id: string) => {
    if (!id) {
      setMenus([]);
      return;
    }
    try {
      const r = await apiRequest<{ data: MenuToggle[] }>(
        `/api/v1/menus/toggles?organizationID=${id}`,
      );
      setMenus(r.data ?? []);
    } catch {
      toast.error("โหลดรายการเมนูไม่สำเร็จ");
    }
  }, []);

  useEffect(() => {
    loadOrgs();
  }, [loadOrgs]);

  useEffect(() => {
    if (orgID) loadMenus(orgID);
  }, [orgID, loadMenus]);

  const toggle = async (m: MenuToggle) => {
    if (!orgID) return;
    try {
      await apiRequest("/api/v1/menus/toggles", {
        method: "PATCH",
        body: JSON.stringify({
          organization_id: Number(orgID),
          menu_id: m.menu_id,
          enabled: !m.enabled,
        }),
      });
      toast.success(`${m.enabled ? "ปิด" : "เปิด"}เมนู ${m.name} สำเร็จ`);
      loadMenus(orgID);
    } catch {
      toast.error("อัปเดตเมนูไม่สำเร็จ");
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="จัดการเมนู"
        subtitle="กำหนดเมนูที่แต่ละองค์กรเข้าถึงได้ และจัดการเมนูระดับระบบ"
        icon={<MenuIcon className="h-5 w-5" />}
      />

      <Tabs value={tab} onValueChange={(v) => setTab(v as "org" | "global")}>
        <TabsList className="grid h-auto w-full grid-cols-2 gap-1 bg-muted/50 p-1 sm:w-auto">
          <TabsTrigger
            value="org"
            className="gap-2 px-3 py-1.5 text-xs data-[state=active]:bg-white data-[state=active]:shadow-sm"
            data-testid="sa-menus-tab-org"
          >
            <Building className="h-3.5 w-3.5" />
            กำหนดเมนูให้องค์กร
          </TabsTrigger>
          <TabsTrigger
            value="global"
            className="gap-2 px-3 py-1.5 text-xs data-[state=active]:bg-white data-[state=active]:shadow-sm"
            data-testid="sa-menus-tab-global"
          >
            <LayoutGrid className="h-3.5 w-3.5" />
            เมนูระบบ Global
          </TabsTrigger>
        </TabsList>

        <TabsContent value="org" className="mt-3">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between gap-3">
              <div>
                <CardTitle className="text-base">เลือกองค์กร</CardTitle>
                <p className="text-muted-foreground text-xs">
                  เลือกองค์กรที่ต้องการกำหนดเมนู
                </p>
              </div>
              <Select value={orgID} onValueChange={setOrgID}>
                <SelectTrigger
                  className="w-[280px]"
                  data-testid="sa-menus-org-select"
                >
                  <SelectValue placeholder="กรุณาเลือกองค์กรเพื่อจัดการเมนู" />
                </SelectTrigger>
                <SelectContent>
                  {orgs.map((o) => (
                    <SelectItem key={o.id} value={String(o.id)}>
                      {o.title}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </CardHeader>
            <CardContent className="space-y-2">
              {!orgID ? (
                <div className="flex flex-col items-center justify-center py-16 text-center">
                  <div className="bg-primary/5 mb-3 rounded-full p-4">
                    <Building className="text-primary/40 h-8 w-8" />
                  </div>
                  <p className="text-sm font-medium">
                    กรุณาเลือกองค์กรเพื่อจัดการเมนู
                  </p>
                  <p className="text-muted-foreground max-w-[320px] text-xs">
                    เลือกองค์กรจากตัวเลือกด้านบนเพื่อดูและปรับสิทธิ์เข้าถึงเมนู
                  </p>
                </div>
              ) : menus.length === 0 ? (
                <div className="text-muted-foreground py-8 text-center text-sm">
                  ยังไม่มีเมนูในระบบ
                </div>
              ) : (
                menus.map((m) => (
                  <label
                    key={m.menu_id}
                    className="hover:bg-muted/30 flex items-center justify-between rounded-lg border border-border p-3 transition"
                    data-testid={`sa-menus-toggle-${m.menu_id}`}
                  >
                    <div>
                      <p className="text-sm font-medium">{m.name}</p>
                      <p className="text-muted-foreground text-xs">
                        Menu ID: #{m.menu_id}
                      </p>
                    </div>
                    <Switch
                      checked={m.enabled}
                      onCheckedChange={() => toggle(m)}
                      className="data-[state=checked]:bg-emerald-600"
                    />
                  </label>
                ))
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="global" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">เมนูระบบ Global</CardTitle>
              <p className="text-muted-foreground text-xs">
                เมนูทั้งหมดที่ระบบเปิดให้ใช้งานในระดับ Global
              </p>
            </CardHeader>
            <CardContent>
              <div className="text-muted-foreground py-8 text-center text-sm">
                เมนูระบบกำหนดจากซอร์สโค้ดและไม่สามารถปิดได้จากหน้านี้
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
