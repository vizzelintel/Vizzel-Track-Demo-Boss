import { apiRequest } from "@/lib/api";
import type { AssetComponent } from "@/pages/assets/list/types";

// Raw component shape coming back from /asset/component/get/{assetID}.
interface ApiComponent {
  id?: number;
  assetID?: number;
  componentName?: string;
  rfidNum?: string;
  serialNo?: string;
  positionNo?: number;
  note?: string;
  currentStatus?: string;
}

function normalize(row: ApiComponent | undefined | null): AssetComponent | null {
  if (!row) return null;
  return {
    id: row.id,
    componentName: row.componentName ?? "",
    rfidNum: row.rfidNum ?? "",
    serialNo: row.serialNo ?? "",
    positionNo: Number(row.positionNo ?? 1),
    note: row.note ?? "",
  };
}

export async function getAssetComponents(
  assetId: number,
): Promise<AssetComponent[]> {
  const res = await apiRequest<{ data?: ApiComponent[] } | ApiComponent[]>(
    `/asset/component/get/${assetId}`,
  );
  const arr = Array.isArray(res) ? res : res.data || [];
  return arr
    .map(normalize)
    .filter((c): c is AssetComponent => c !== null);
}

export async function replaceAssetComponents(
  assetId: number,
  components: AssetComponent[],
): Promise<void> {
  await apiRequest(`/asset/component/bulk-replace/${assetId}`, {
    method: "POST",
    body: JSON.stringify({
      components: components.map((c, i) => ({
        componentName: c.componentName,
        rfidNum: c.rfidNum || "",
        serialNo: c.serialNo || "",
        positionNo: c.positionNo || i + 1,
        note: c.note || "",
      })),
    }),
  });
}

export interface ScanAssetSummary {
  assetID: number;
  assetNumber: string;
  assetName: string;
  total: number;
  matched: number;
  matchedRfids: string[];
  components: ApiComponent[];
  missingNames: string[];
  missingRfids: string[];
  status: "complete" | "partial";
}

export interface ResolveScanResponse {
  total: number;
  complete: ScanAssetSummary[];
  partial: ScanAssetSummary[];
  unmatched: { rfid: string }[];
}

export async function resolveScannedRfids(
  rfids: string[],
): Promise<ResolveScanResponse> {
  const clean = rfids
    .map((r) => r.trim())
    .filter((r) => r.length > 0);
  const res = await apiRequest<ResolveScanResponse>(`/asset/scan/resolve`, {
    method: "POST",
    body: JSON.stringify({ rfids: clean }),
  });
  return {
    total: res?.total ?? clean.length,
    complete: res?.complete ?? [],
    partial: res?.partial ?? [],
    unmatched: res?.unmatched ?? [],
  };
}
