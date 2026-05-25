import { useEffect, useState } from "react";
import { apiRequest } from "@/lib/api";

export function useOrganizationMenus(organizationID: number | null, initialMenus: number[] = []) {
  const [menuIds, setMenuIds] = useState<number[]>(initialMenus);
  const [loading, setLoading] = useState(!initialMenus.length);

  useEffect(() => {
    if (!organizationID) return;
    apiRequest<{ data: { menu_id: number; enabled: boolean }[] }>("/api/v1/menus/toggles")
      .then((r) => setMenuIds(r.data.filter((m) => m.enabled).map((m) => m.menu_id)))
      .catch(() => setMenuIds([1, 2, 3]))
      .finally(() => setLoading(false));
  }, [organizationID]);

  const hasMenu = (id: number) => menuIds.includes(id);

  return { hasMenu, loading, menuIds };
}
