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
  toUserId?: number;
  toUserName?: string;
  targetBuildingId?: number;
  targetBuildingName?: string;
  targetRoomId?: number;
  targetRoomName?: string;
  direction?: 'incoming' | 'outgoing';
  createdAt?: string;
}

export interface OrgTarget {
  id: number;
  title: string;
}

export interface TransferDashboardStats {
  pendingOutgoing: number;
  pendingIncoming: number;
  completed: number;
  total: number;
}

export async function listTransfers(): Promise<TransferRecord[]> {
  const r = await apiRequest<{ data: TransferRecord[] }>('/transfer/list');
  return r?.data ?? [];
}

export async function getTransferDashboardStats(): Promise<TransferDashboardStats> {
  const r = await apiRequest<{ data: TransferDashboardStats }>('/transfer/dashboard-stats');
  return r?.data ?? { pendingOutgoing: 0, pendingIncoming: 0, completed: 0, total: 0 };
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
  toUserId?: number;
  targetBuildingId?: number;
  targetRoomId?: number;
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
