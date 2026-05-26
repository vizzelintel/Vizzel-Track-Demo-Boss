import { apiRequest } from '@/lib/api';

export const APPROVAL_STEPS = [
  { key: 'section_head', label: 'หัวหน้างาน' },
  { key: 'director', label: 'ผู้อำนวยการ' },
  { key: 'chief_admin', label: 'เลขานุการ' },
  { key: 'mayor', label: 'นายก/ปลัด' },
] as const;

export interface ApprovalDelegate {
  stepKey: string;
  userId: number;
  userName?: string;
}

export async function listApprovalDelegates(): Promise<ApprovalDelegate[]> {
  const r = await apiRequest<{ data: ApprovalDelegate[] }>('/approval/delegates');
  return r?.data ?? [];
}

export function setApprovalDelegate(stepKey: string, userId: number) {
  return apiRequest('/approval/delegates', {
    method: 'POST',
    body: JSON.stringify({ stepKey, userId }),
  });
}
