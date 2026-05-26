import { apiRequest } from "@/lib/api";

export const SUPER_ADMIN_ROLE_ID = 1;

export type Permission = {
  resource: string;
  label?: string;
  can_view: boolean;
  can_edit: boolean;
  can_delete: boolean;
};

export type Role = {
  id: number;
  name: string;
  description: string;
  is_system: boolean;
  is_locked: boolean;
  permissions?: Permission[];
};

export type Resource = {
  code: string;
  label: string;
  sort_order: number;
};

export type MyPermissions = {
  role_id: number;
  role_name?: string;
  is_super: boolean;
  permissions: Permission[];
};

export type RoleInput = {
  name: string;
  description: string;
  permissions: Permission[];
};

export async function listRoles() {
  return apiRequest<Role[]>("/api/v1/roles");
}

export async function getRole(id: number) {
  return apiRequest<Role>(`/api/v1/roles/${id}`);
}

export async function createRole(input: RoleInput) {
  return apiRequest<Role>("/api/v1/roles", {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export async function updateRole(id: number, input: RoleInput) {
  return apiRequest<Role>(`/api/v1/roles/${id}`, {
    method: "PATCH",
    body: JSON.stringify(input),
  });
}

export async function deleteRole(id: number) {
  return apiRequest<{ status: string }>(`/api/v1/roles/${id}`, { method: "DELETE" });
}

export async function listResources() {
  return apiRequest<Resource[]>("/api/v1/permissions/resources");
}

export async function fetchMyPermissions() {
  return apiRequest<MyPermissions>("/api/v1/permissions/me");
}

// Back-compat alias used by some pages.
export const loadMyPermissions = fetchMyPermissions;

export function hasPermission(
  perms: MyPermissions | null,
  resource: string,
  action: "view" | "edit" | "delete",
): boolean {
  if (!perms) return false;
  if (perms.is_super) return true;
  const row = perms.permissions.find((p) => p.resource === resource);
  if (!row) return false;
  if (action === "view") return row.can_view;
  if (action === "edit") return row.can_edit;
  return row.can_delete;
}

// permissionLookup builds an O(1) lookup map keyed by resource code so the
// `can(resource, action)` helper stays a constant-time check inside React
// render paths.
export function permissionLookup(perms: Permission[]): Map<string, Permission> {
  const m = new Map<string, Permission>();
  for (const p of perms) {
    m.set(p.resource, p);
  }
  return m;
}
