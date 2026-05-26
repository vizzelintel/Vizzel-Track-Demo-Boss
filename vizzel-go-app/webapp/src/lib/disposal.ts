import { apiRequest, getToken } from "@/lib/api";

export interface DisposalLot {
  id: number;
  lot: string;
  reason?: string;
  disposalDate?: string;
  buyer?: string;
  amount?: number;
  status: string;
  assetCount: number;
  approvalInstanceId?: number;
  createdAt?: string;
  sampleAssets?: { id: number; assetNumber: string; assetName: string }[];
  docs?: { id: number; docPath: string; docName?: string }[];
}

const BASE = import.meta.env.VITE_API_URL ?? "";

export async function listDisposalLots(): Promise<DisposalLot[]> {
  const r = await apiRequest<{ data: DisposalLot[] }>("/asset/out/list");
  return r?.data ?? [];
}

export async function getDisposalLot(id: number): Promise<DisposalLot> {
  const r = await apiRequest<{ data: DisposalLot }>(`/api/v1/disposal/lots/${id}`);
  return r.data;
}

export async function createDisposalLot(
  form: FormData,
  submit: boolean,
  stepAssignees: Record<string, number>,
) {
  form.set("submit", submit ? "true" : "false");
  form.set("stepAssignees", JSON.stringify(stepAssignees));
  const token = getToken();
  const res = await fetch(`${BASE}/asset/out/create`, {
    method: "POST",
    headers: token ? { Authorization: `Bearer ${token}` } : {},
    body: form,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error((err as { message?: string }).message ?? "บันทึกไม่สำเร็จ");
  }
  return res.json() as Promise<{ data: { id: number } }>;
}

export async function importDisposalLot(
  file: File,
  fields: {
    lot?: string;
    reason: string;
    disposalDate: string;
    buyer: string;
    amount: string;
    submit: boolean;
    stepAssignees: Record<string, number>;
  },
) {
  const form = new FormData();
  form.append("file", file);
  if (fields.lot) form.append("lot", fields.lot);
  form.append("reason", fields.reason);
  form.append("disposalDate", fields.disposalDate);
  form.append("buyer", fields.buyer);
  form.append("amount", fields.amount);
  form.append("submit", fields.submit ? "true" : "false");
  form.append("stepAssignees", JSON.stringify(fields.stepAssignees));
  const token = getToken();
  const res = await fetch(`${BASE}/asset/out/import`, {
    method: "POST",
    headers: token ? { Authorization: `Bearer ${token}` } : {},
    body: form,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error((err as { message?: string }).message ?? "นำเข้าไม่สำเร็จ");
  }
  return res.json() as Promise<{ data: { id: number; imported: number } }>;
}

export async function submitDisposal(id: number, stepAssignees: Record<string, number>) {
  return apiRequest(`/disposal/lots/${id}/submit`, {
    method: "POST",
    body: JSON.stringify({ stepAssignees }),
  });
}

export function disposalDocUrl(docPath: string): string {
  const name = docPath.split("/").pop() ?? "";
  return `${BASE}/uploads/disposal_doc/${name}`;
}

export async function downloadDisposalTemplate() {
  const token = getToken();
  const res = await fetch(`${BASE}/asset/out/template`, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "disposal_import_template.csv";
  a.click();
  URL.revokeObjectURL(url);
}

export const disposalStatusLabel: Record<string, string> = {
  draft: "แบบร่าง",
  pending_approval: "รออนุมัติ",
  approved: "อนุมัติแล้ว",
  rejected: "ปฏิเสธ",
};
