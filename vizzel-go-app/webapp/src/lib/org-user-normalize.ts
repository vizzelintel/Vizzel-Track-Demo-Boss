import type { OrgUser } from "@/lib/user";

/** API may return flat `{ id, name, email }` or nested `{ user: { ... } }`. */
export function normalizeOrgUser(entry: unknown): OrgUser | null {
  if (!entry || typeof entry !== "object") return null;
  const row = entry as Record<string, unknown>;

  if (row.user && typeof row.user === "object") {
    const u = row.user as Record<string, unknown>;
    return {
      relationID: Number(row.relationID ?? row.id ?? u.id ?? 0),
      roleID: Number(row.roleID ?? 4),
      verify: Number(row.verify ?? 2),
      status: Boolean(row.status ?? true),
      user: {
        id: Number(u.id ?? 0),
        username: String(u.username ?? u.email ?? ""),
        name: u.name != null ? String(u.name) : null,
        surname: u.surname != null ? String(u.surname) : null,
        email: String(u.email ?? ""),
        image: u.image != null ? String(u.image) : null,
        emailVerifiedAt:
          u.emailVerifiedAt != null ? String(u.emailVerifiedAt) : null,
      },
      organizationID: Number(row.organizationID ?? 0),
      deptID: row.deptID != null ? Number(row.deptID) : null,
      instituteID:
        row.instituteID != null ? Number(row.instituteID) : null,
      sectionID: row.sectionID != null ? Number(row.sectionID) : null,
      department:
        row.department && typeof row.department === "object"
          ? {
              id: Number((row.department as Record<string, unknown>).id ?? row.deptID ?? 0),
              name: String((row.department as Record<string, unknown>).name ?? ""),
            }
          : null,
      institute:
        row.institute && typeof row.institute === "object"
          ? {
              id: Number((row.institute as Record<string, unknown>).id ?? row.instituteID ?? 0),
              name: String((row.institute as Record<string, unknown>).name ?? ""),
            }
          : null,
      section:
        row.section && typeof row.section === "object"
          ? {
              id: Number((row.section as Record<string, unknown>).id ?? row.sectionID ?? 0),
              name: String((row.section as Record<string, unknown>).name ?? ""),
            }
          : null,
      workPositionID:
        row.workPositionID != null ? Number(row.workPositionID) : null,
      position:
        row.position && typeof row.position === "object"
          ? {
              id: Number((row.position as Record<string, unknown>).id ?? 0),
              name: String((row.position as Record<string, unknown>).name ?? ""),
            }
          : null,
    };
  }

  const id = Number(row.id ?? 0);
  if (!id) return null;
  const name = row.name != null ? String(row.name) : null;
  const surname = row.surname != null ? String(row.surname) : null;
  return {
    relationID: Number(row.relationID ?? id),
    roleID: Number(row.roleID ?? 4),
    verify: Number(row.verify ?? 2),
    status: Boolean(row.status ?? true),
    user: {
      id,
      username: String(row.username ?? row.email ?? ""),
      name,
      surname,
      email: String(row.email ?? row.subtitle ?? ""),
      image: null,
      emailVerifiedAt: null,
    },
    organizationID: Number(row.organizationID ?? 0),
    deptID: null,
    workPositionID: null,
    position: null,
  };
}

export function normalizeOrgUsersResponse(raw: unknown): OrgUser[] {
  let list: unknown[] = [];
  if (Array.isArray(raw)) list = raw;
  else if (raw && typeof raw === "object") {
    const o = raw as { data?: unknown; users?: { data?: unknown } };
    if (Array.isArray(o.data)) list = o.data;
    else if (Array.isArray(o.users?.data)) list = o.users.data;
  }
  return list.map(normalizeOrgUser).filter((u): u is OrgUser => u != null);
}
