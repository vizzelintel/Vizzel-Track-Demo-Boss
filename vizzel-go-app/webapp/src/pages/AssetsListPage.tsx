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
import { ElaasImportDialog } from "@/components/assets/ElaasImportDialog";
import { Button } from "@/components/ui/button";
import { FileSpreadsheet } from "lucide-react";

type InitialPayload = {
  initialData: { data: AssetData[]; total: number };
  initialReferenceData: Record<string, unknown>;
};

export function AssetsListPage() {
  const { user, loading: authLoading } = useAuth();
  const [payload, setPayload] = useState<InitialPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [elaasOpen, setElaasOpen] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);

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
  }, [user, authLoading, reloadKey]);

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
    <div className="space-y-3">
      <div className="flex items-center justify-end gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={() => setElaasOpen(true)}
          data-testid="elaas-open-btn"
        >
          <FileSpreadsheet className="size-4" />
          นำเข้า ELAAS (.xlsx)
        </Button>
      </div>
      <ClientAssetsPage
        bootstrapLoading={false}
        initialData={payload.initialData}
        initialReferenceData={payload.initialReferenceData}
      />
      <ElaasImportDialog
        open={elaasOpen}
        onOpenChange={setElaasOpen}
        onImported={() => setReloadKey((k) => k + 1)}
      />
    </div>
  );
}
