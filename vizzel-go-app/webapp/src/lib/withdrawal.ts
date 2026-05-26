import { apiRequest } from '@/lib/api';

export interface CreateInternalWithdrawalPayload {
  assetID: number;
  userID: number;
  type: 0 | 1; // 0=withdraw, 1=borrow
  roomID?: number;
  buildingID?: number;
  desireReturn?: string; // ISO Date string
  note?: string;
}

export interface CreateExternalWithdrawalPayload {
  assetID: number;
  desireReturn: string; // ISO Date string
  name: string;
  citizenID: string;
  organization: string;
  note?: string;
}

export interface WithdrawalData {
  id: number; // This is actually the APPROVE ID or Request ID based on context, but let's standardize
  request_internal_id?: number;
  request_external_id?: number;
  assetID: number;

  // Normalized fields
  type: 0 | 1; // 0=Withdraw, 1=Borrow
  requesterName: string;
  requesterOrg?: string;
  origin?: 'internal' | 'external';

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  internalWithdrawal?: any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  externalWithdrawal?: any;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  approveWithdrawals?: any[];

  // Status flags from Approve/Withdrawal logic
  isConfirmed: boolean;
  isTake: 0 | 1 | 2; // 0=Pending, 1=Taken, 2=NotTaken

  createdAt: string;
  createdBy: string;
}

export function createInternalWithdrawal(
  payload: CreateInternalWithdrawalPayload,
) {
  return apiRequest(`/withdrawal/internal/request`, {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export function createExternalWithdrawal(
  payload: CreateExternalWithdrawalPayload,
) {
  return apiRequest(`/withdrawal/external/request`, {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export async function getApproveWithdrawals(
  orgID: number,
  isApprove: number,
  page = 1,
  pageSize = 20,
) {
  let status = 'all';
  if (isApprove === 0) status = 'pending';
  if (isApprove === 1) status = 'approved';

  const res = await apiRequest(
    `/withdrawal/history/${orgID}?page=${page}&pageSize=${pageSize}&status=${status}`,
  );
  return res || { data: [] };
}

export interface ConfirmWithdrawalPayload {
  isConfirm: number; // 0 = reject, 1 = confirm
  note?: string;
}

export function confirmWithdrawal(
  requestID: number,
  type: 1 | 2,
  payload: ConfirmWithdrawalPayload,
) {
  const endpoint = type === 1 ? 'internal' : 'external';
  return apiRequest(`/withdrawal/${endpoint}/confirm/${requestID}`, {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export interface ConfirmTakePayload {
  isTake: boolean; // true = receive, false = cancel/not receive
  returnDate?: string;
  note?: string;
}

export function confirmTake(approveID: number, payload: ConfirmTakePayload) {
  return apiRequest(`/withdrawal/take/${approveID}`, {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export function issueWithdrawal(id: number) {
  return apiRequest<{ data: { issueToken: string; qrPayload: string; status: string } }>(
    `/withdrawal/issue/${id}`,
    { method: 'POST' },
  );
}

export function returnWithdrawal(id: number) {
  return apiRequest(`/withdrawal/${id}/return`, { method: 'POST' });
}
