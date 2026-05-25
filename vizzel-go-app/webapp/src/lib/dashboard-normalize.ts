/** Normalize Nest-compat dashboard payloads for production UI components. */

export type NewAssetRow = {
  id: number;
  assetNumber: string;
  assetName: string;
  category: string;
  cost: number;
  receivedDate: string;
};

export type LocationRow = {
  location: string;
  count: number;
  value: number;
};

export type DepreciationRow = {
  year: string;
  granularity?: "month" | "year";
  depreciation: number;
  accumulated: number;
  date?: string;
};

export type StatusRow = {
  status: string;
  value: number;
  label: string;
};

export type TrendRow = { date: string; count: number };

export type ValueHistoryRow = { date: string; value: number };

function asArray<T>(value: unknown): T[] {
  return Array.isArray(value) ? (value as T[]) : [];
}

export function normalizeTrendPayload(raw: unknown): TrendRow[] {
  if (Array.isArray(raw)) return raw as TrendRow[];
  if (raw && typeof raw === "object" && "data" in raw) {
    return asArray<TrendRow>((raw as { data: unknown }).data);
  }
  return [];
}

export function normalizeStatusPayload(raw: unknown): StatusRow[] | null {
  const list = Array.isArray(raw)
    ? raw
    : raw && typeof raw === "object" && "data" in raw
      ? asArray((raw as { data: unknown }).data)
      : [];
  if (list.length === 0) return null;
  return list.map((item) => {
    const row = item as Record<string, unknown>;
    const status = String(row.status ?? row.name ?? "ไม่ระบุ");
    const value = Number(row.value ?? row.count ?? 0);
    return {
      status,
      value,
      label: String(row.label ?? status),
    };
  });
}

export function normalizeNewAssetsPayload(raw: unknown): NewAssetRow[] {
  if (Array.isArray(raw)) {
    return raw.map(mapNewAsset);
  }
  if (raw && typeof raw === "object") {
    const obj = raw as Record<string, unknown>;
    if (Array.isArray(obj.items)) {
      return obj.items.map(mapNewAsset);
    }
    if (Array.isArray(obj.data)) {
      return obj.data.map(mapNewAsset);
    }
  }
  return [];
}

function mapNewAsset(item: unknown): NewAssetRow {
  const row = item as Record<string, unknown>;
  return {
    id: Number(row.id ?? 0),
    assetNumber: String(row.assetNumber ?? row.asset_number ?? ""),
    assetName: String(row.assetName ?? row.asset_name ?? ""),
    category: String(row.category ?? row.categoryName ?? "ไม่ระบุ"),
    cost: Number(row.cost ?? row.assetValue ?? row.asset_value ?? 0),
    receivedDate: String(row.receivedDate ?? row.received_date ?? ""),
  };
}

export function normalizeLocationPayload(raw: unknown): LocationRow[] {
  const list = Array.isArray(raw)
    ? raw
    : raw && typeof raw === "object" && "data" in raw
      ? asArray((raw as { data: unknown }).data)
      : [];
  return list.map((item) => {
    const row = item as Record<string, unknown>;
    const location = String(
      row.location ?? row.buildingName ?? row.name ?? "ไม่ระบุ",
    );
    const count = Number(row.count ?? 0);
    const value = Number(row.value ?? count * 10000);
    return { location, count, value };
  });
}

export function normalizeDepreciationPayload(raw: unknown): DepreciationRow[] {
  const list = Array.isArray(raw)
    ? raw
    : raw && typeof raw === "object" && "data" in raw
      ? asArray((raw as { data: unknown }).data)
      : [];
  let accumulated = 0;
  return list.map((item) => {
    const row = item as Record<string, unknown>;
    const year = String(row.year ?? row.date ?? "");
    const depreciation = Number(
      row.depreciation ?? row.value ?? row.dep ?? 0,
    );
    if (row.accumulated != null) {
      accumulated = Number(row.accumulated);
    } else {
      accumulated += depreciation;
    }
    return {
      year,
      granularity: (row.granularity as DepreciationRow["granularity"]) ?? "year",
      depreciation,
      accumulated,
      date: row.date ? String(row.date) : undefined,
    };
  });
}

export function normalizeValueHistoryPayload(raw: unknown): ValueHistoryRow[] {
  const list = Array.isArray(raw)
    ? raw
    : raw && typeof raw === "object" && "data" in raw
      ? asArray((raw as { data: unknown }).data)
      : [];
  return list.map((item) => {
    const row = item as Record<string, unknown>;
    return {
      date: String(row.date ?? ""),
      value: Number(row.value ?? row.count ?? 0),
    };
  });
}

export function normalizeSummaryPayload(raw: unknown): Record<string, unknown> | null {
  if (!raw || typeof raw !== "object") return null;
  if ("data" in raw && (raw as { data: unknown }).data) {
    return normalizeSummaryPayload((raw as { data: unknown }).data);
  }
  return raw as Record<string, unknown>;
}
