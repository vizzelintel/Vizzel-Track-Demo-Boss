const TOKEN_KEY = "vizzel_access_token";

export function getToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}

export function setToken(token: string) {
  localStorage.setItem(TOKEN_KEY, token);
}

export function setAccessToken(token: string) {
  setToken(token);
}

export function clearToken() {
  localStorage.removeItem(TOKEN_KEY);
}

export const BASE_URL = "";

type ApiOptions = RequestInit & {
  responseType?: "json" | "blob";
  timeout?: number;
};

export const fetcher = (url: string) => apiRequest(url);

export async function apiRequest<T = unknown>(
  path: string,
  init: ApiOptions = {},
): Promise<T> {
  const headers = new Headers(init.headers);
  const isForm = init.body instanceof FormData;
  if (!isForm && init.body && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }
  const token = getToken();
  if (token) headers.set("Authorization", `Bearer ${token}`);

  const controller = new AbortController();
  const timeout = init.timeout ?? 60000;
  const timer = setTimeout(() => controller.abort(), timeout);

  const res = await fetch(path, {
    ...init,
    headers,
    signal: controller.signal,
  });
  clearTimeout(timer);

  if (init.responseType === "blob") {
    if (!res.ok) throw new Error(res.statusText);
    return (await res.blob()) as T;
  }

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const msg =
      (data as { error?: string; message?: string }).error ||
      (data as { message?: string }).message ||
      res.statusText;
    throw new Error(msg);
  }
  return data as T;
}

export async function getSessionSingleton() {
  const { getSession } = await import("next-auth/react");
  return getSession();
}

export async function apiDownload(path: string, filename: string) {
  const token = getToken();
  const res = await fetch(path, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
  if (!res.ok) throw new Error("download failed");
  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export type User = {
  id: number;
  email: string;
  display_name: string;
  organization_id: number;
  organizationID?: number;
  role_id: number;
  roleID?: number;
  isOrgVerified?: boolean;
  organization?: { id: number; name: string };
};

export type Asset = {
  id: number;
  asset_number: string;
  asset_name: string;
  rfid_num?: string;
  category_id?: number;
  class_id?: number;
  category_name?: string;
  class_name?: string;
  type_name?: string;
  building_name?: string;
  room_name?: string;
  owner_name?: string;
  asset_status_name?: string;
  asset_value: number;
  status: string;
};

export type AssetListPage = {
  page: number;
  page_size: number;
  total: number;
  total_pages: number;
  data: Asset[];
};

export type AssetReferenceData = {
  categories: { id: number; title: string }[];
  types: { id: number; title: string }[];
  classes: { id: number; title: string }[];
  statuses: { id: number; title: string }[];
};

export type ListRow = {
  id: number;
  title: string;
  subtitle?: string;
  status?: string;
  value?: number;
};

export type DashboardExtended = {
  total_asset_value: number;
  accumulated_depreciation: number;
  net_book_value: number;
  total_assets: number;
  new_assets_this_year: number;
  trend: { labels: string[]; values: number[] };
  status_breakdown: { name: string; count: number }[];
  location_breakdown: { name: string; count: number }[];
};
