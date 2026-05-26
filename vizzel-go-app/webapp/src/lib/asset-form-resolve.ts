import type { AssetData } from "@/pages/assets/list/types";
import type { NormalizedOrgUserRow } from "@/lib/asset-normalize";
import { lovOptionLabel } from "@/lib/asset-normalize";

/** Map stored id or label to select value (id string). */
export function resolveLovSelectValue(
  id: number | null | undefined,
  label: string | null | undefined,
  options: Record<string, unknown>[],
): string {
  if (id != null && Number(id) > 0) return String(id);
  if (!label?.trim()) return "";
  const want = label.trim().toLowerCase();
  for (const row of options) {
    const rowId = row.id ?? row.ID;
    if (rowId == null) continue;
    const rowLabel = lovOptionLabel(row).trim().toLowerCase();
    if (rowLabel === want) return String(rowId);
  }
  return "";
}

export function resolveHolderUserId(
  asset: AssetData,
  usersList: NormalizedOrgUserRow[],
): string {
  const holder = asset.users?.[0];
  if (holder?.id && holder.id > 0) return String(holder.id);
  if (!holder?.name) return "";
  const full = `${holder.name} ${holder.surname ?? ""}`.trim().toLowerCase();
  for (const row of usersList) {
    const u = row.user;
    const candidate = `${u.name} ${u.surname}`.trim().toLowerCase();
    if (candidate === full || u.username.toLowerCase() === full) {
      return String(u.id);
    }
  }
  return "";
}

export function parseAssetDate(value: string | null | undefined): Date | undefined {
  if (!value?.trim()) return undefined;
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? undefined : d;
}
