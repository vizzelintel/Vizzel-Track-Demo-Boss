/** Holder org labels: สำนัก (institute), ฝ่าย (dept), งาน (section). */

export type HolderOrgLabels = {
  institute: string;
  division: string;
  work: string;
};

type NamedRow = { id?: number | string; name?: string; [key: string]: unknown };

function rowName(row: NamedRow | undefined, ...keys: string[]): string {
  if (!row) return "-";
  for (const k of keys) {
    const v = row[k];
    if (v != null && String(v).trim()) return String(v).trim();
  }
  return "-";
}

function findById<T extends { id?: number | string }>(
  list: T[] | undefined,
  id: number | string | null | undefined,
): T | undefined {
  if (id == null || !list?.length) return undefined;
  return list.find((r) => String(r.id) === String(id));
}

export function resolveHolderOrgLabels(
  holderUserId: string | number | null | undefined,
  usersList: unknown[],
  institutes: unknown[],
  departments: unknown[],
  sections: unknown[],
): HolderOrgLabels {
  const empty: HolderOrgLabels = { institute: "-", division: "-", work: "-" };
  if (holderUserId == null || holderUserId === "") return empty;

  const u = usersList.find((raw) => {
    if (!raw || typeof raw !== "object") return false;
    const row = raw as Record<string, unknown>;
    const nested = row.user as Record<string, unknown> | undefined;
    const uid = nested?.id ?? row.id;
    return String(uid) === String(holderUserId);
  }) as Record<string, unknown> | undefined;

  if (!u) return empty;

  const instList = institutes as NamedRow[];
  const deptList = departments as NamedRow[];
  const secList = sections as NamedRow[];

  let institute = rowName(
    u.institute as NamedRow | undefined,
    "name",
    "institute_name",
    "instituteName",
  );
  let division = rowName(
    u.department as NamedRow | undefined,
    "name",
    "dept_name",
    "deptName",
  );
  let work = rowName(
    u.section as NamedRow | undefined,
    "name",
    "section_name",
    "sectionName",
  );

  const instituteID = u.instituteID ?? u.instituteId;
  const deptID = u.deptID ?? u.deptId;
  const sectionID = u.sectionID ?? u.sectionId;

  if (institute === "-" && instituteID != null) {
    const inst = findById(instList, instituteID as number | string);
    institute = rowName(inst, "institute_name", "instituteName", "name", "title");
  }

  if (division === "-" && deptID != null) {
    const dept = findById(deptList, deptID as number | string);
    division = rowName(dept, "dept_name", "deptName", "name", "title");
    if (institute === "-" && dept?.instituteID != null) {
      const inst = findById(instList, dept.instituteID as number | string);
      institute = rowName(inst, "institute_name", "instituteName", "name", "title");
    }
  }

  if (work === "-" && sectionID != null) {
    const sec = findById(secList, sectionID as number | string);
    work = rowName(sec, "section_name", "sectionName", "name", "title");
  }

  return { institute, division, work };
}

/** Build a relative URL for stored asset images (Vite proxy). */
export function assetImageUrl(path: string): string {
  if (!path) return "";
  if (path.startsWith("http://") || path.startsWith("https://") || path.startsWith("blob:")) {
    return path;
  }
  let clean = path.replace(/\\/g, "/");
  clean = clean.replace(/^backend\//, "").replace(/^frontend\//, "");
  if (!clean.startsWith("/")) clean = `/${clean}`;
  return clean;
}
