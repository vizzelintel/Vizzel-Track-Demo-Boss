import type { PersonalAssetItem } from "@/components/dashboard/personal/personal-assets-table";

const STATUS_FILLS = [
  "var(--chart-2)",
  "var(--chart-1)",
  "var(--chart-4)",
  "var(--chart-3)",
];

export type PersonalStatusPoint = {
  name: string;
  value: number;
  fill: string;
};

export type PersonalCategoryPoint = {
  category: string;
  count: number;
  fill?: string;
};

export function normalizePersonalStatus(raw: unknown): PersonalStatusPoint[] {
  if (!Array.isArray(raw)) return [];
  return raw.map((item, i) => {
    const row = item as Record<string, unknown>;
    const name = String(row.name ?? row.status ?? row.label ?? "ไม่ระบุ");
    const value = Number(row.value ?? row.count ?? 0);
    return {
      name,
      value: Number.isFinite(value) ? value : 0,
      fill: String(row.fill ?? STATUS_FILLS[i % STATUS_FILLS.length]),
    };
  });
}

export function normalizePersonalCategory(raw: unknown): PersonalCategoryPoint[] {
  if (!Array.isArray(raw)) return [];
  return raw.map((item, i) => {
    const row = item as Record<string, unknown>;
    const category = String(row.category ?? row.name ?? row.label ?? "ไม่ระบุ");
    const count = Number(row.count ?? row.value ?? 0);
    return {
      category,
      count: Number.isFinite(count) ? count : 0,
      fill: String(row.fill ?? STATUS_FILLS[i % STATUS_FILLS.length]),
    };
  });
}

export function normalizePersonalAssetRows(raw: unknown): PersonalAssetItem[] {
  let items: unknown[] = [];
  if (Array.isArray(raw)) {
    items = raw;
  } else if (raw && typeof raw === "object") {
    const nested = raw as { data?: unknown };
    if (Array.isArray(nested.data)) items = nested.data;
  }
  return items.map((item) => {
    const row = item as Record<string, unknown>;
    const value = Number(
      row.value ?? row.assetValue ?? row.cost ?? row.asset_value ?? 0,
    );
    return {
      id: Number(row.id ?? 0),
      assetNumber: String(row.assetNumber ?? row.asset_number ?? "—"),
      assetName: String(row.assetName ?? row.asset_name ?? "—"),
      category: String(row.category ?? row.categoryName ?? row.category_name ?? "—"),
      value: Number.isFinite(value) ? value : 0,
      location: String(
        row.location ??
          [row.buildingName, row.roomName].filter(Boolean).join(" / ") ??
          "—",
      ),
      status: (row.status as PersonalAssetItem["status"]) ?? "active",
      statusLabel: String(
        row.statusLabel ?? row.assetStatusName ?? row.status ?? "—",
      ),
    };
  });
}
