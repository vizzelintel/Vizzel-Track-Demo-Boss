import { useEffect, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { apiRequest } from "@/lib/api";
import ClientAssetsPage from "./assets/list/client-page";
import {
  extractAssetListPayload,
  normalizeAssetRows,
  sanitizeReferenceData,
} from "@/lib/asset-normalize";
import type { AssetData } from "./assets/list/types";
import { PageLoader } from "@/components/PageLoader";

type InitialPayload = {
  initialData: { data: AssetData[]; total: number };
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
    setLoading(true);
    apiRequest<Record<string, unknown>>(`/asset/initial-data/${orgID}/1/10`)
      .then((data) => {
        const assets = extractAssetListPayload(data.assets);
        const ref = sanitizeReferenceData(data as Record<string, unknown>);
        setPayload({
          initialData: {
            data: normalizeAssetRows(assets.data),
            total: assets.total,
          },
          initialReferenceData: ref,
        });
      })
      .catch(() => {
        setPayload({
          initialData: { data: [], total: 0 },
          initialReferenceData: sanitizeReferenceData({}),
        });
      })
      .finally(() => setLoading(false));
  }, [user, authLoading]);

  if (!authLoading && !user?.organization_id) {
    return (
      <div className="text-muted-foreground flex flex-1 items-center justify-center p-8">
        ไม่พบข้อมูลองค์กร
      </div>
    );
  }

  if (authLoading || loading || !payload) {
    return <PageLoader />;
  }

  return (
    <ClientAssetsPage
      bootstrapLoading={false}
      initialData={payload.initialData}
      initialReferenceData={payload.initialReferenceData}
    />
  );
}
