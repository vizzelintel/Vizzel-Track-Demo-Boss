import { apiRequest } from '@/lib/api';

export interface ApprovalInstance {
  id: number;
  workflowCode: string;
  refType: string;
  refId: number;
  status: string;
  currentStep: number;
  currentStepKey?: string;
  currentStepLabel?: string;
  currentStepAssigneeName?: string;
  canAct?: boolean;
  branch?: string;
  requestedBy?: number;
  createdAt?: string;
}

export async function listPendingApprovals(): Promise<ApprovalInstance[]> {
  const r = await apiRequest<{ data: ApprovalInstance[] }>('/approval/pending');
  return r?.data ?? [];
}

export function getApproval(id: number) {
  return apiRequest<{ data: ApprovalInstance }>(`/approval/get/${id}`).then(
    (r) => r?.data,
  );
}

export function approvalAction(
  id: number,
  payload: { action: 'approve' | 'reject'; branch?: 'A' | 'B'; note?: string },
) {
  return apiRequest(`/approval/action/${id}`, {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export function submitRepair(id: number, stepAssignees?: Record<string, number>) {
  return apiRequest(`/asset/repair/submit/${id}`, {
    method: 'POST',
    body: JSON.stringify({ stepAssignees: stepAssignees ?? {} }),
  });
}

export function completeRepair(id: number) {
  return apiRequest(`/asset/repair/complete/${id}`, { method: 'POST' });
}
