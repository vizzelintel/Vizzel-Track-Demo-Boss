import { listChildOrganizations, listTransferTargets } from "@/lib/transfer";

export type OrgOption = { id: number; title: string };

export async function listAccessibleOrganizations(
  loginOrgId: number,
  loginOrgName: string,
): Promise<OrgOption[]> {
  const byId = new Map<number, string>();
  byId.set(loginOrgId, loginOrgName);

  const [children, targets] = await Promise.all([
    listChildOrganizations().catch(() => [] as OrgOption[]),
    listTransferTargets().catch(() => [] as OrgOption[]),
  ]);

  for (const row of [...children, ...targets]) {
    if (row?.id) byId.set(row.id, row.title || String(row.id));
  }

  return Array.from(byId.entries())
    .map(([id, title]) => ({ id, title }))
    .sort((a, b) => a.id - b.id);
}
