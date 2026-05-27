import type { ListRow } from "@/lib/api";

export type ListRowExtra = ListRow & Record<string, unknown>;

/** Normalize API list payloads: `{ data: [] }`, bare arrays, or null. */
export function unwrapListRows(res: unknown): ListRowExtra[] {
  if (res == null) return [];
  if (Array.isArray(res)) {
    return res.map(rowToListRow);
  }
  if (typeof res === "object" && "data" in res) {
    const data = (res as { data?: unknown }).data;
    if (Array.isArray(data)) return data.map(rowToListRow);
  }
  return [];
}

function rowToListRow(row: unknown): ListRowExtra {
  const r = (row as Record<string, unknown>) ?? {};
  const id = Number(r.id ?? r.ID ?? 0);
  const title = String(
    r.title ??
      r.name ??
      r.buildingName ??
      r.roomName ??
      r.categoryName ??
      r.typeName ??
      r.className ??
      r.institute_name ??
      r.deptName ??
      r.section_name ??
      r.positionName ??
      r.status ??
      "—",
  );
  const createdAt =
    r.createdAt ?? r.created_at ?? r.created ?? r.CreatedAt ?? undefined;
  const assetCount =
    r.assetCount ?? r.asset_count ?? r.count ?? r.children_count ?? undefined;
  return {
    ...r,
    id,
    title,
    subtitle: r.subtitle != null ? String(r.subtitle) : undefined,
    status: r.status != null ? String(r.status) : undefined,
    value: r.value != null ? Number(r.value) : undefined,
    createdAt,
    assetCount,
  };
}
