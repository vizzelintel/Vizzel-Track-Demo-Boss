import { useEffect, useMemo, useState } from "react";
import { loadMyPermissions, permissionLookup, type MyPermissions } from "@/lib/rbac";

const CACHE_KEY = "vizzel_my_permissions";

type Action = "view" | "edit" | "delete";

export function usePermissions() {
  const [data, setData] = useState<MyPermissions | null>(() => readCache());
  const [loading, setLoading] = useState(!data);

  useEffect(() => {
    let alive = true;
    loadMyPermissions()
      .then((d) => {
        if (!alive) return;
        setData(d);
        try {
          localStorage.setItem(CACHE_KEY, JSON.stringify(d));
        } catch {
          // ignore quota errors — cache is best-effort
        }
      })
      .catch(() => {
        // Fail open: keep stale cache; UI uses fallback role gating.
      })
      .finally(() => alive && setLoading(false));
    return () => {
      alive = false;
    };
  }, []);

  const lookup = useMemo(
    () => permissionLookup(data?.permissions ?? []),
    [data],
  );

  const can = (resource: string, action: Action = "view") => {
    if (data?.is_super) return true;
    const p = lookup.get(resource);
    if (!p) return false;
    if (action === "view") return p.can_view;
    if (action === "edit") return p.can_edit;
    if (action === "delete") return p.can_delete;
    return false;
  };

  return { data, loading, can, isSuper: data?.is_super ?? false };
}

function readCache(): MyPermissions | null {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    return raw ? (JSON.parse(raw) as MyPermissions) : null;
  } catch {
    return null;
  }
}
