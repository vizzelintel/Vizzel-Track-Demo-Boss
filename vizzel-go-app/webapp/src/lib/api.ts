const TOKEN_KEY = "vizzel_access_token";

export function getToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}

export function setToken(token: string) {
  localStorage.setItem(TOKEN_KEY, token);
}

export function clearToken() {
  localStorage.removeItem(TOKEN_KEY);
}

export async function apiRequest<T>(
  path: string,
  init: RequestInit = {},
): Promise<T> {
  const headers = new Headers(init.headers);
  if (!headers.has("Content-Type") && init.body) {
    headers.set("Content-Type", "application/json");
  }
  const token = getToken();
  if (token) headers.set("Authorization", `Bearer ${token}`);

  const res = await fetch(path, { ...init, headers });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error((data as { error?: string }).error || res.statusText);
  }
  return data as T;
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
  role_id: number;
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
