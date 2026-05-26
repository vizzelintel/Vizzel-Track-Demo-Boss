"use client";

import { apiRequest } from "@/lib/api";
import { normalizeOrgUsersResponse } from "@/lib/org-user-normalize";

export interface UpdateOrgRolePayload {
  deptID?: number | null;
  instituteID?: number | null;
  sectionID?: number | null;
  positionID?: number | null;
  roleID?: number;
}

export interface NameId {
  id: number;
  name: string;
}

export interface OrgUser {
  relationID: number;
  roleID: number;
  verify: number;
  status: boolean;
  updatedAt?: string | Date | null;
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
  organization?: { id: number; name: string; branch: string | null } | null;
  deptID: number | null;
  department?: { id: number; name: string } | null;
  instituteID?: number | null;
  institute?: { id: number; name: string } | null;
  sectionID?: number | null;
  section?: { id: number; name: string } | null;
  workPositionID: number | null;
  position?: { id: number; name: string } | null;
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
  pageSize = 10,
  verify?: number,
  search?: string,
  roleIDs?: number[],
): Promise<OrganizationUsersResponse> {
  let path = `/user/organization/${organizationID}/${page}/${pageSize}`;
  const params: string[] = [];
  if (verify !== undefined) {
    params.push(`verify=${verify}`);
  }
  if (search && search.trim().length > 0) {
    params.push(`search=${encodeURIComponent(search.trim())}`);
  }
  if (roleIDs && roleIDs.length > 0) {
    params.push(`roles=${roleIDs.join(",")}`);
  }
  if (params.length > 0) {
    path += `?${params.join("&")}`;
  }

  try {
    const res = await apiRequest<OrganizationUsersResponse | { data?: unknown }>(path);
    const data = normalizeOrgUsersResponse(res);
    return paginateOrgUsers(data, page, pageSize, verify, search);
  } catch {
    const res = await apiRequest<unknown>(`/user/initial-data/${organizationID}`);
    const data = normalizeOrgUsersResponse(res);
    return paginateOrgUsers(data, page, pageSize, verify, search);
  }
}

function paginateOrgUsers(
  all: OrgUser[],
  page: number,
  pageSize: number,
  verify?: number,
  search?: string,
): OrganizationUsersResponse {
  const filtered =
    verify === undefined
      ? all
      : all.filter((u) => Number(u.verify ?? 2) === verify);
  const searched =
    search && search.trim()
      ? filtered.filter((u) => {
          const q = search.trim().toLowerCase();
          const full = `${u.user?.name ?? ""} ${u.user?.surname ?? ""} ${u.user?.email ?? ""}`.toLowerCase();
          return full.includes(q);
        })
      : filtered;
  const start = (page - 1) * pageSize;
  const slice = searched.slice(start, start + pageSize);
  return {
    page,
    pageSize,
    total: searched.length,
    totalPages: Math.max(1, Math.ceil(searched.length / pageSize)),
    data: slice,
  };
}

export async function toggleUserActive(
  userID: number,
  organizationID: number,
  isActive: boolean,
) {
  return apiRequest<{
    data: {
      id: number;
      status: boolean;
      roleID: number;
      officerLimitData?: {
        organizationID: number;
        officerLimit: number;
        officerCount: number;
      };
    };
  }>(`/user/organization/toggle_active`, {
    method: "PATCH",
    body: JSON.stringify({
      userID,
      organizationID,
      is_active: isActive ? 1 : 0,
    }),
  });
}

export async function assignUserRole(
  relationID: number,
  organizationID: number,
  roleID: 3 | 4,
) {
  return apiRequest(`/organization/assign_role`, {
    method: "POST",
    body: JSON.stringify({
      relationID,
      organizationID,
      roleID,
    }),
  });
}

export async function updateOrganizationRole(
  relationID: number,
  payload: UpdateOrgRolePayload,
) {
  return apiRequest(`/user/organization/update/${relationID}`, {
    method: "PATCH",
    body: JSON.stringify(payload),
  });
}

export async function deleteUserFromOrganization(
  relationID: number,
  userID: number,
) {
  return apiRequest(`/user/organization/delete`, {
    method: "PATCH",
    body: JSON.stringify({
      relationID,
      userID,
    }),
  });
}

export async function createUserInOrganization(
  organizationID: number,
  payload: {
    username: string;
    email: string;
    password: string;
    name?: string;
    surname?: string;
    status?: boolean;
  },
) {
  return apiRequest(`/user/organization/create`, {
    method: "POST",
    body: JSON.stringify({ ...payload, organizationID }),
  });
}

export async function updateUser(
  userID: number,
  payload: {
    name?: string;
    surname?: string;
    username?: string;
    prefix?: string;
    mobile?: string;
    line?: string;
    facebook?: string;
    biographical?: string;
    image?: File;
    password?: string;
  },
) {
  const formData = new FormData();
  if (payload.name) formData.append("name", payload.name);
  if (payload.surname) formData.append("surname", payload.surname);
  if (payload.username) formData.append("username", payload.username);
  if (payload.prefix) formData.append("prefix", payload.prefix);
  if (payload.mobile) formData.append("mobile", payload.mobile);
  if (payload.line) formData.append("line", payload.line);
  if (payload.facebook) formData.append("facebook", payload.facebook);
  if (payload.biographical) formData.append("biographical", payload.biographical);
  if (payload.image) formData.append("image", payload.image);
  if (payload.password) formData.append("password", payload.password);

  return apiRequest(`/user/update/${userID}`, {
    method: "PATCH",
    body: formData,
  });
}

export async function verifyUserRequest(requestID: number, verify: boolean) {
  return apiRequest(`/organization/verify`, {
    method: "POST",
    body: JSON.stringify({
      requestID,
      verify,
    }),
  });
}

export async function importUserToOrganization(
  organizationID: number,
  file: File,
  autoCreateStructure = true,
) {
  const formData = new FormData();
  formData.append("file", file);
  formData.append("organizationID", organizationID.toString());
  formData.append("autoCreateStructure", autoCreateStructure.toString());

  return apiRequest(`/user/organization/import`, {
    method: "POST",
    body: formData,
    timeout: 120000,
  });
}

export async function downloadUserTemplate() {
  return apiRequest(`/user/organization/template`, {
    method: "GET",
    responseType: "blob",
  });
}

export async function exportUsersFromOrganization(
  organizationID: number,
  search?: string,
) {
  let path = `/user/organization/export/${organizationID}`;
  if (search && search.trim().length > 0) {
    path += `?search=${encodeURIComponent(search.trim())}`;
  }

  return apiRequest(path, {
    method: "GET",
    responseType: "blob",
  });
}
