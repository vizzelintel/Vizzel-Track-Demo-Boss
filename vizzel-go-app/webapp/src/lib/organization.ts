import { apiRequest } from "@/lib/api";

export interface OrganizationLovItem {
  id: number;
  name: string;
}

export interface DeptPositionResponse {
  departments: {
    id: number;
    deptName: string;
    organizationID: number;
    instituteID?: number | null;
  }[];
  institutes?: { id: number; institute_name: string; organizationID: number }[];
  positions: { id: number; positionName: string; organizationID: number }[];
  sections?: {
    id: number;
    section_name: string;
    deptID: number;
    organizationID: number;
  }[];
  isInstitute?: boolean;
  isSection?: boolean;
}

function mapNamedRows(
  rows: unknown[],
  nameKey: string,
  organizationID: number,
): { id: number; deptName?: string; institute_name?: string; positionName?: string; section_name?: string; deptID?: number; organizationID: number }[] {
  if (!Array.isArray(rows)) return [];
  return rows.map((row) => {
    const r = row as Record<string, unknown>;
    return {
      id: Number(r.id),
      [nameKey]: String(r[nameKey] ?? r.name ?? r.title ?? ""),
      deptID: r.deptID != null ? Number(r.deptID) : undefined,
      organizationID,
    } as {
      id: number;
      deptName?: string;
      institute_name?: string;
      positionName?: string;
      section_name?: string;
      deptID?: number;
      organizationID: number;
    };
  });
}

export async function getOrganizationDeptPosition(
  organizationID: number,
): Promise<DeptPositionResponse> {
  try {
    const response = await apiRequest<{ data?: DeptPositionResponse } & DeptPositionResponse>(
      `/organization/get_dept_position/${organizationID}`,
      { method: "GET" },
    );
  const data = (response as { data?: DeptPositionResponse }).data ?? response;
  return data as DeptPositionResponse;
  } catch {
    const fallback = await apiRequest<Record<string, unknown>>(
      `/organization/initial-data/${organizationID}`,
    );
    const departments = mapNamedRows(
      (fallback.departments as unknown[]) ?? [],
      "deptName",
      organizationID,
    ).map((d) => ({
      id: d.id,
      deptName: d.deptName ?? "",
      organizationID,
      instituteID: null,
    }));
    const institutes = mapNamedRows(
      (fallback.institutes as unknown[]) ?? [],
      "institute_name",
      organizationID,
    ).map((i) => ({
      id: i.id,
      institute_name: i.institute_name ?? "",
      organizationID,
    }));
    const positions = mapNamedRows(
      (fallback.positions as unknown[]) ?? [],
      "positionName",
      organizationID,
    ).map((p) => ({
      id: p.id,
      positionName: p.positionName ?? "",
      organizationID,
    }));
    const sections = mapNamedRows(
      (fallback.sections as unknown[]) ?? [],
      "section_name",
      organizationID,
    ).map((s) => ({
      id: s.id,
      section_name: s.section_name ?? "",
      deptID: s.deptID ?? 0,
      organizationID,
    }));
    return {
      departments,
      institutes,
      positions,
      sections,
      isInstitute: institutes.length > 0,
      isSection: sections.length > 0,
    };
  }
}
