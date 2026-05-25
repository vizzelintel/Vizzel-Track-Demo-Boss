import { useEffect, useState } from "react";
import { apiRequest } from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

type MenuToggle = { menu_id: number; name: string; enabled: boolean };

export function SuperAdminMenusPage() {
  const [menus, setMenus] = useState<MenuToggle[]>([]);

  const load = () => {
    apiRequest<{ data: MenuToggle[] }>("/api/v1/menus/toggles").then((r) => setMenus(r.data));
  };

  useEffect(() => {
    load();
  }, []);

  const toggle = async (m: MenuToggle) => {
    await apiRequest("/api/v1/menus/toggles", {
      method: "PATCH",
      body: JSON.stringify({ menu_id: m.menu_id, enabled: !m.enabled }),
    });
    load();
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>จัดการเมนูองค์กร</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {menus.map((m) => (
          <label key={m.menu_id} className="flex items-center justify-between rounded-lg border border-border p-3">
            <span>{m.name}</span>
            <input type="checkbox" checked={m.enabled} onChange={() => toggle(m)} />
          </label>
        ))}
      </CardContent>
    </Card>
  );
}
