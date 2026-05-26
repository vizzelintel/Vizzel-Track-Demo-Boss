import { apiRequest } from "./api";
import {
  normalizeDepreciationPayload,
  normalizeLocationPayload,
  normalizeNewAssetsPayload,
  normalizeStatusPayload,
  normalizeSummaryPayload,
  normalizeTrendPayload,
  type DepreciationRow,
  type LocationRow,
  type NewAssetRow,
  type StatusRow,
  type TrendRow,
  type ValueHistoryRow,
  normalizeValueHistoryPayload,
  normalizeDashboardInitialData,
  type DashboardInitialData,
} from "./dashboard-normalize";

export type AssetValueHistoryRange =
  | "7d"
  | "1m"
  | "3m"
  | "1y"
  | "3y"
  | "5y"
  | "10y"
  | "all";

export type AssetValueHistoryGranularity =
  | "day"
  | "week"
  | "month"
  | "quarter"
  | "half-year"
  | "year";

export type DepreciationRange = "1m" | "3m" | "1y" | "3y" | "5y" | "10y" | "all";

/** Single request for overview dashboard (summary + charts). */
export async function getDashboardInitialData(
  orgId: number,
  year = new Date().getFullYear(),
  period: "7d" | "30d" | "90d" = "90d",
): Promise<DashboardInitialData> {
  const res = await apiRequest<unknown>(
    `/dashboard/initial-data/${orgId}?year=${year}&period=${period}`,
  );
  return normalizeDashboardInitialData(res);
}

export async function getDashboardSummary(orgId: number) {
  const res = await apiRequest<unknown>(`/dashboard/summary/${orgId}`);
  return normalizeSummaryPayload(res);
}

export async function getAssetTrend(
  orgId: number,
  range?: AssetValueHistoryRange,
  granularity?: AssetValueHistoryGranularity,
): Promise<TrendRow[]> {
  const params = new URLSearchParams();
  if (range) params.append("range", range);
  if (granularity) params.append("granularity", granularity);
  const qs = params.toString() ? `?${params.toString()}` : "";
  const res = await apiRequest<unknown>(`/dashboard/trend/${orgId}${qs}`);
  return normalizeTrendPayload(res);
}

export async function getAssetValueHistory(
  orgId: number,
  range?: AssetValueHistoryRange,
  granularity?: AssetValueHistoryGranularity,
): Promise<ValueHistoryRow[]> {
  const params = new URLSearchParams();
  if (range) params.append("range", range);
  if (granularity) params.append("granularity", granularity);
  const qs = params.toString() ? `?${params.toString()}` : "";
  const res = await apiRequest<unknown>(`/dashboard/value-history/${orgId}${qs}`);
  return normalizeValueHistoryPayload(res);
}

export async function getAssetStatusChart(orgId: number): Promise<StatusRow[] | null> {
  const res = await apiRequest<unknown>(`/dashboard/status/${orgId}`);
  return normalizeStatusPayload(res);
}

export async function getDepreciationHistoryDashboard(
  orgId: number,
  range?: DepreciationRange,
): Promise<DepreciationRow[]> {
  const params = new URLSearchParams();
  if (range) params.append("range", range);
  const qs = params.toString() ? `?${params.toString()}` : "";
  const res = await apiRequest<unknown>(`/dashboard/depreciation/${orgId}${qs}`);
  return normalizeDepreciationPayload(res);
}

export async function getNewAssetsDashboard(
  orgId: number,
  year?: number,
): Promise<NewAssetRow[]> {
  const qs = year ? `?year=${year}` : "";
  const res = await apiRequest<unknown>(`/dashboard/new-assets/${orgId}${qs}`);
  return normalizeNewAssetsPayload(res);
}

export async function getAssetLocationDashboard(orgId: number): Promise<LocationRow[]> {
  const res = await apiRequest<unknown>(`/dashboard/location/${orgId}`);
  return normalizeLocationPayload(res);
}

export async function getPersonalSummary() {
  const res = await apiRequest<{ data?: unknown }>(`/dashboard/personal/summary`);
  return res.data;
}

export async function getPersonalStatus() {
  const res = await apiRequest<{ data?: unknown }>(`/dashboard/personal/status`);
  return res.data;
}

export async function getPersonalCategory() {
  const res = await apiRequest<{ data?: unknown }>(`/dashboard/personal/category`);
  return res.data;
}

export async function getPersonalAssets(
  page = 1,
  pageSize = 10,
  search = "",
  status = "",
) {
  const query = new URLSearchParams({
    page: page.toString(),
    pageSize: pageSize.toString(),
  });
  if (search) query.append("search", search);
  if (status) query.append("status", status);
  const res = await apiRequest<{ data?: { data: unknown[]; total: number } }>(
    `/dashboard/personal/assets?${query.toString()}`,
  );
  return res.data ?? { data: [], total: 0 };
}

export async function getRepairMonthly() {
  const res = await apiRequest<{ data?: unknown }>(`/dashboard/repair/monthly`);
  return res.data;
}
