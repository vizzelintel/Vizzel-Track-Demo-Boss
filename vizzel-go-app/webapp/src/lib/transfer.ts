import { apiRequest } from '@/lib/api';

export interface TransferRecord {
  id: number;
  assetId: number;
  assetNumber?: string;
  componentId?: number;
  transferType: string;
  status: string;
  reason?: string;
  createdAt?: string;
}

export async function listTransfers(): Promise<TransferRecord[]> {
  const r = await apiRequest<{ data: TransferRecord[] }>('/transfer/list');
  return r?.data ?? [];
}

export function createTransfer(payload: {
  assetId: number;
  componentId?: number;
  transferType: 'temporary' | 'permanent';
  reason?: string;
  submit?: boolean;
}) {
  return apiRequest('/transfer/create', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export function submitTransfer(id: number) {
  return apiRequest(`/transfer/submit/${id}`, { method: 'POST' });
}

export async function listChildOrganizations(): Promise<
  { id: number; title: string }[]
> {
  const r = await apiRequest<{ data: { id: number; title: string }[] }>(
    '/organization/children',
  );
  return r?.data ?? [];
}
