import { apiRequest } from "@/lib/api";

export interface OrgUser {
  relationID: number;
  roleID: number;
  verify: number;
  status: boolean;
  user: {
    id: number;
    username: string;
    name: string | null;
    surname: string | null;
    email: string;
    image: string | null;
    emailVerifiedAt: string | null;
  };
  organizationID: number;
  deptID: number | null;
  department?: { id: number; name: string } | null;
}

export interface OrganizationUsersResponse {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
  data: OrgUser[];
}

export async function fetchOrganizationUsers(
  organizationID: number,
  page = 1,
  pageSize = 100,
): Promise<OrganizationUsersResponse> {
  try {
    const res = await apiRequest<{ data?: OrgUser[]; users?: { data?: unknown[] } }>(
      `/user/initial-data/${organizationID}`,
    );
    const raw = (res.data as OrgUser[]) ?? (res.users?.data as OrgUser[]) ?? [];
    if (raw.length > 0) {
      return {
        page,
        pageSize,
        total: raw.length,
        totalPages: 1,
        data: raw,
      };
    }
  } catch {
    /* fallback */
  }

  const rows = await apiRequest<{ data?: { id: number; title: string; subtitle?: string }[] }>(
    "/api/v1/users",
  );
  const list = rows.data ?? [];
  const data: OrgUser[] = list.map((r, i) => {
    const parts = (r.title || "").split(" ");
    const name = parts[0] ?? r.title;
    const surname = parts.slice(1).join(" ") || null;
    return {
      relationID: i + 1,
      roleID: 4,
      verify: 1,
      status: true,
      organizationID,
      deptID: null,
      user: {
        id: r.id,
        username: r.subtitle || `user${r.id}`,
        name,
        surname,
        email: r.subtitle || "",
        image: null,
        emailVerifiedAt: null,
      },
    };
  });

  return {
    page,
    pageSize,
    total: data.length,
    totalPages: Math.max(1, Math.ceil(data.length / pageSize)),
    data,
  };
}
