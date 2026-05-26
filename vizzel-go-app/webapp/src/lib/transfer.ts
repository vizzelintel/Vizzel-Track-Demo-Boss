import { apiRequest } from '@/lib/api';

export interface TransferRecord {
  id: number;
  assetId: number;
  assetNumber?: string;
  componentId?: number;
  transferType: string;
  status: string;
  reason?: string;
  targetOrganizationId?: number;
  direction?: 'incoming' | 'outgoing';
  createdAt?: string;
}

export interface OrgTarget {
  id: number;
  title: string;
}

export async function listTransfers(): Promise<TransferRecord[]> {
  const r = await apiRequest<{ data: TransferRecord[] }>('/transfer/list');
  return r?.data ?? [];
}

export async function listTransferTargets(): Promise<OrgTarget[]> {
  const r = await apiRequest<{ data: OrgTarget[] }>('/organization/transfer-targets');
  return (r?.data ?? []).map((row) => ({
    id: row.id,
    title: (row as { title?: string }).title ?? String(row.id),
  }));
}

export function createTransfer(payload: {
  assetId: number;
  componentId?: number;
  transferType: 'temporary' | 'permanent';
  targetOrganizationId?: number;
  reason?: string;
  submit?: boolean;
}) {
  return apiRequest('/transfer/create', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export function acceptIncomingTransfer(id: number) {
  return apiRequest(`/transfer/accept/${id}`, { method: 'POST' });
}

export function submitTransfer(id: number) {
  return apiRequest(`/transfer/submit/${id}`, { method: 'POST' });
}

export async function listChildOrganizations(): Promise<OrgTarget[]> {
  const r = await apiRequest<{ data: OrgTarget[] }>('/organization/children');
  return r?.data ?? [];
}
