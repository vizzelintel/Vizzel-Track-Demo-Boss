import { useEffect, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { apiRequest } from "@/lib/api";
import ClientAssetsPage from "./assets/list/client-page";

type InitialPayload = {
  initialData: { data: unknown[]; total: number };
  initialReferenceData: Record<string, unknown>;
};

export function AssetsListPage() {
  const { user, loading: authLoading } = useAuth();
  const [payload, setPayload] = useState<InitialPayload | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (authLoading) return;
    if (!user?.organization_id) {
      setLoading(false);
      return;
    }
    const orgID = user.organization_id;
    apiRequest<Record<string, unknown>>(`/asset/initial-data/${orgID}/1/10`)
      .then((data) => {
        const assets = (data.assets as { data?: unknown[]; total?: number }) ?? {};
        setPayload({
          initialData: {
            data: assets.data ?? [],
            total: assets.total ?? 0,
          },
          initialReferenceData: {
            categories: data.categories ?? [],
            statuses: data.statuses ?? [],
            buildings: data.buildings ?? [],
            users: (data.users as { data?: unknown[] })?.data ?? [],
            getBy: data.getBy ?? [],
            sourceFund: data.sourceFund ?? [],
            rooms: data.rooms ?? [],
            departments: data.departments ?? [],
            institutes: data.institutes ?? [],
            sections: data.sections ?? [],
          },
        });
      })
      .catch(() => {
        setPayload({
          initialData: { data: [], total: 0 },
          initialReferenceData: {
            categories: [],
            statuses: [],
            buildings: [],
            users: [],
            getBy: [],
            sourceFund: [],
            rooms: [],
            departments: [],
            institutes: [],
            sections: [],
          },
        });
      })
      .finally(() => setLoading(false));
  }, [user, authLoading]);

  if (authLoading || loading) {
    return (
      <div className="text-muted-foreground flex flex-1 items-center justify-center p-8">
        กำลังโหลดรายการสินทรัพย์...
      </div>
    );
  }

  if (!payload) {
    return (
      <div className="text-muted-foreground flex flex-1 items-center justify-center p-8">
        ไม่พบข้อมูลองค์กร
      </div>
    );
  }

  return (
    <ClientAssetsPage
      initialData={payload.initialData}
      initialReferenceData={payload.initialReferenceData}
    />
  );
}
