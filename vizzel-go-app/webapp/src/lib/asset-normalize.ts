import type { AssetData } from "@/pages/assets/list/types";

export type FacetOption = { label: string; value: string };

/** Filter null rows and build facet options without crashing on missing `id`. */
export function toFacetOptions(
  items: unknown,
  labelKeys: string[],
): FacetOption[] {
  if (!Array.isArray(items)) return [];
  const out: FacetOption[] = [];
  for (const raw of items) {
    if (raw == null || typeof raw !== "object") continue;
    const row = raw as Record<string, unknown>;
    const id = row.id ?? row.ID;
    if (id == null || id === "") continue;
    let label = "";
    for (const key of labelKeys) {
      if (row[key] != null && String(row[key]).trim()) {
        label = String(row[key]);
        break;
      }
    }
    if (!label) label = lovOptionLabel(row);
    out.push({ label, value: String(id) });
  }
  return out;
}

export function normalizeAssetRow(raw: unknown): AssetData | null {
  if (raw == null || typeof raw !== "object") return null;
  const r = raw as Record<string, unknown>;
  const id = Number(r.id ?? r.ID);
  if (!Number.isFinite(id) || id <= 0) return null;

  const usersRaw = Array.isArray(r.users) ? r.users : [];
  const users: NonNullable<AssetData["users"]> = usersRaw
    .filter((u) => u != null && typeof u === "object")
    .map((u) => {
      const row = u as Record<string, unknown>;
      return {
        id: Number(row.id ?? 0),
        name: String(row.name ?? ""),
        surname: String(row.surname ?? ""),
        institute: row.institute as NonNullable<AssetData["users"]>[0]["institute"],
        dept: row.dept as NonNullable<AssetData["users"]>[0]["dept"],
        section: row.section as NonNullable<AssetData["users"]>[0]["section"],
      };
    });

  return {
    id,
    assetName: String(r.assetName ?? r.asset_name ?? "—"),
    assetNumber: String(r.assetNumber ?? r.asset_number ?? "—"),
    rfidNum: String(r.rfidNum ?? r.rfid_num ?? ""),
    assetValue: Number(r.assetValue ?? r.asset_value ?? 0) || 0,
    isCheck: Boolean(r.isCheck ?? r.is_check),
    assetStatusID:
      r.assetStatusID != null
        ? Number(r.assetStatusID)
        : r.asset_status_id != null
          ? Number(r.asset_status_id)
          : null,
    assetStatusName:
      r.assetStatusName != null
        ? String(r.assetStatusName)
        : r.asset_status_name != null
          ? String(r.asset_status_name)
          : null,
    image: r.image != null ? String(r.image) : null,
    images: Array.isArray(r.images) ? (r.images as string[]) : [],
    roomID: r.roomID != null ? Number(r.roomID) : null,
    roomName: r.roomName != null ? String(r.roomName) : null,
    buildingName: r.buildingName != null ? String(r.buildingName) : null,
    assetClassID: Number(r.assetClassID ?? r.asset_class_id ?? 0) || 0,
    className: String(r.className ?? r.class_name ?? "—"),
    typeID: Number(r.typeID ?? r.type_id ?? 0) || 0,
    typeName: String(r.typeName ?? r.type_name ?? "—"),
    categoryID: Number(r.categoryID ?? r.category_id ?? 0) || 0,
    categoryName: String(r.categoryName ?? r.category_name ?? "—"),
    getBy: r.getBy != null ? String(r.getBy) : null,
    getByID: r.getByID != null ? Number(r.getByID) : null,
    sourceFund: r.sourceFund != null ? String(r.sourceFund) : null,
    sourceFundID: r.sourceFundID != null ? Number(r.sourceFundID) : null,
    buildingID: r.buildingID != null ? Number(r.buildingID) : null,
    receivedDate: String(r.receivedDate ?? r.received_date ?? ""),
    expiryDate: r.expiryDate != null ? String(r.expiryDate) : null,
    assetDetail: r.assetDetail != null ? String(r.assetDetail) : null,
    users: users.length ? users : undefined,
    currentValue: r.currentValue != null ? Number(r.currentValue) : undefined,
    availableAge: r.availableAge != null ? Number(r.availableAge) : null,
    statusIsLocked: Boolean(r.statusIsLocked),
    depreciation_value:
      r.depreciation_value != null ? Number(r.depreciation_value) : null,
  };
}

export function normalizeAssetRows(raw: unknown): AssetData[] {
  const list = Array.isArray(raw) ? raw : [];
  return list
    .filter((item) => item != null)
    .map(normalizeAssetRow)
    .filter((a): a is AssetData => a != null);
}

/** Unwrap list payloads from `/asset/get` and `/asset/initial-data`. */
export function extractAssetListPayload(
  raw: unknown,
): { data: unknown[]; total: number } {
  if (raw == null) return { data: [], total: 0 };
  if (Array.isArray(raw)) {
    return { data: raw.filter((x) => x != null), total: raw.length };
  }
  if (typeof raw !== "object") return { data: [], total: 0 };

  const r = raw as Record<string, unknown>;
  const total = Number(r.total);
  const inner = r.data;

  if (Array.isArray(inner)) {
    return {
      data: inner.filter((x) => x != null),
      total: Number.isFinite(total) ? total : inner.length,
    };
  }
  if (inner != null && typeof inner === "object") {
    const nested = inner as Record<string, unknown>;
    if (Array.isArray(nested.data)) {
      const rows = nested.data.filter((x) => x != null);
      const nestedTotal = Number(nested.total ?? r.total);
      return {
        data: rows,
        total: Number.isFinite(nestedTotal) ? nestedTotal : rows.length,
      };
    }
  }
  return { data: [], total: 0 };
}

/** Drop null/undefined reference rows and rows without a usable id. */
export type NormalizedOrgUserRow = {
  relationID?: number;
  deptID?: number | null;
  instituteID?: number | null;
  sectionID?: number | null;
  department?: { id: number; name: string } | null;
  institute?: { id: number; name: string } | null;
  section?: { id: number; name: string } | null;
  user: {
    id: number;
    name: string;
    surname: string;
    username: string;
  };
};

function nestedNameId(
  obj: unknown,
  fallbackId: unknown,
): { id: number; name: string } | null {
  if (obj == null || typeof obj !== "object") return null;
  const o = obj as Record<string, unknown>;
  const name = o.name ?? o.dept_name ?? o.deptName ?? o.institute_name ?? o.section_name;
  if (name == null && fallbackId == null) return null;
  return {
    id: Number(o.id ?? fallbackId ?? 0),
    name: String(name ?? ""),
  };
}

/** Nest API user row (flat or `{ user: {...} }`) for asset dialog selects. */
export function normalizeOrgUserRow(raw: unknown): NormalizedOrgUserRow | null {
  if (raw == null || typeof raw !== "object") return null;
  const row = raw as Record<string, unknown>;
  const nested = row.user;
  if (nested != null && typeof nested === "object") {
    const u = nested as Record<string, unknown>;
    const id = Number(u.id ?? row.id);
    if (!Number.isFinite(id) || id <= 0) return null;
    return {
      relationID: Number(row.relationID ?? row.id ?? id),
      deptID: row.deptID != null ? Number(row.deptID) : null,
      instituteID: row.instituteID != null ? Number(row.instituteID) : null,
      sectionID: row.sectionID != null ? Number(row.sectionID) : null,
      department: nestedNameId(row.department, row.deptID),
      institute: nestedNameId(row.institute, row.instituteID),
      section: nestedNameId(row.section, row.sectionID),
      user: {
        id,
        name: String(u.name ?? ""),
        surname: String(u.surname ?? ""),
        username: String(u.username ?? u.email ?? ""),
      },
    };
  }
  const id = Number(row.id ?? row.ID);
  if (!Number.isFinite(id) || id <= 0) return null;
  return {
    relationID: Number(row.relationID ?? id),
    user: {
      id,
      name: String(row.name ?? ""),
      surname: String(row.surname ?? ""),
      username: String(row.username ?? row.email ?? ""),
    },
  };
}

export function normalizeOrgUserRows(items: unknown) {
  if (!Array.isArray(items)) return [];
  return items
    .map(normalizeOrgUserRow)
    .filter((u): u is NonNullable<typeof u> => u != null);
}

export function lovOptionLabel(row: Record<string, unknown>): string {
  return String(
    row.label ?? row.name ?? row.title ?? row.getBy ?? row.sourceFund ?? row.id ?? "",
  );
}

export function filterRefRows(items: unknown): Record<string, unknown>[] {
  if (!Array.isArray(items)) return [];
  return items.filter((x): x is Record<string, unknown> => {
    if (x == null || typeof x !== "object") return false;
    const id = (x as Record<string, unknown>).id ?? (x as Record<string, unknown>).ID;
    if (id == null || id === "") return false;
    const n = Number(id);
    return Number.isFinite(n) ? n > 0 : true;
  });
}

function usersFromReference(ref: Record<string, unknown> | undefined): unknown[] {
  if (!ref) return [];
  const raw = ref.users;
  if (Array.isArray(raw)) return raw;
  if (raw && typeof raw === "object") {
    const data = (raw as { data?: unknown }).data;
    if (Array.isArray(data)) return data;
  }
  return [];
}

export function sanitizeReferenceData(ref: Record<string, unknown> | undefined) {
  const arr = (key: string) =>
    filterRefRows(Array.isArray(ref?.[key]) ? ref![key] : []);
  return {
    categories: arr("categories"),
    statuses: arr("statuses"),
    buildings: arr("buildings"),
    users: normalizeOrgUserRows(usersFromReference(ref)),
    getBy: arr("getBy"),
    sourceFund: arr("sourceFund"),
    rooms: arr("rooms"),
    departments: arr("departments"),
    institutes: arr("institutes"),
    sections: arr("sections"),
    types: arr("types"),
    classes: arr("classes"),
  };
}
