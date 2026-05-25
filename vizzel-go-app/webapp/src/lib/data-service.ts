import { apiRequest } from "./api";

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

export async function getDashboardSummary(orgId: number) {
  const res = await apiRequest<{ data?: Record<string, unknown> }>(
    `/dashboard/summary/${orgId}`,
  );
  return res.data ?? null;
}

export async function getAssetTrend(
  orgId: number,
  range?: AssetValueHistoryRange,
  granularity?: AssetValueHistoryGranularity,
) {
  const params = new URLSearchParams();
  if (range) params.append("range", range);
  if (granularity) params.append("granularity", granularity);
  const qs = params.toString() ? `?${params.toString()}` : "";
  const res = await apiRequest<{ data?: Array<{ date: string; count: number }> }>(
    `/dashboard/trend/${orgId}${qs}`,
  );
  return res.data ?? [];
}

export async function getAssetValueHistory(
  orgId: number,
  range?: AssetValueHistoryRange,
  granularity?: AssetValueHistoryGranularity,
) {
  const params = new URLSearchParams();
  if (range) params.append("range", range);
  if (granularity) params.append("granularity", granularity);
  const qs = params.toString() ? `?${params.toString()}` : "";
  const res = await apiRequest<{ data?: Array<{ date: string; value: number }> }>(
    `/dashboard/value-history/${orgId}${qs}`,
  );
  return res.data ?? [];
}

export async function getAssetStatusChart(orgId: number) {
  const res = await apiRequest<{
    data?: Array<{ status: string; value: number; label: string }>;
  }>(`/dashboard/status/${orgId}`);
  return res.data ?? null;
}

export async function getDepreciationHistoryDashboard(
  orgId: number,
  range?: DepreciationRange,
) {
  const params = new URLSearchParams();
  if (range) params.append("range", range);
  const qs = params.toString() ? `?${params.toString()}` : "";
  const res = await apiRequest<{ data?: unknown }>(
    `/dashboard/depreciation/${orgId}${qs}`,
  );
  return res.data ?? null;
}

export async function getNewAssetsDashboard(orgId: number, year?: number) {
  const qs = year ? `?year=${year}` : "";
  const res = await apiRequest<{ data?: unknown }>(
    `/dashboard/new-assets/${orgId}${qs}`,
  );
  return res.data ?? null;
}

export async function getAssetLocationDashboard(orgId: number) {
  const res = await apiRequest<{ data?: unknown }>(`/dashboard/location/${orgId}`);
  return res.data ?? null;
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
