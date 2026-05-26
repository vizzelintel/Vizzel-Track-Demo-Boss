import { apiRequest } from "@/lib/api";

export interface Notification {
  id: number;
  organization_id?: number;
  user_id?: number;
  event_type: string;
  title: string;
  body?: string;
  link?: string;
  ref_type?: string;
  ref_id?: number;
  is_read: boolean;
  read_at?: string | null;
  created_at: string;
}

export interface NotificationListResponse {
  data: Notification[];
  total: number;
}

export async function listNotifications(
  page = 1,
  pageSize = 20,
  unreadOnly = false,
): Promise<NotificationListResponse> {
  const qs = new URLSearchParams({
    page: String(page),
    pageSize: String(pageSize),
    unreadOnly: unreadOnly ? "true" : "false",
  });
  const res = await apiRequest<NotificationListResponse>(
    `/notification/list?${qs.toString()}`,
  );
  return {
    data: Array.isArray(res?.data) ? res.data : [],
    total: typeof res?.total === "number" ? res.total : 0,
  };
}

export async function getUnreadCount(): Promise<number> {
  const res = await apiRequest<{ count: number }>(
    "/notification/unread-count",
  );
  return typeof res?.count === "number" ? res.count : 0;
}

export async function markRead(id: number): Promise<void> {
  await apiRequest(`/notification/read/${id}`, { method: "PATCH" });
}

export async function markAllRead(): Promise<void> {
  await apiRequest("/notification/read-all", { method: "PATCH" });
}

export async function sendTestPing(): Promise<void> {
  await apiRequest("/notification/test-ping", { method: "POST" });
}

const EVENT_LABELS: Record<string, string> = {
  "asset.created": "เพิ่มสินทรัพย์",
  "asset.updated": "อัปเดตสินทรัพย์",
  "withdrawal.requested": "คำขอเบิก-ยืม",
  "withdrawal.approved": "อนุมัติเบิก-ยืม",
  "repair.submitted": "แจ้งซ่อม",
  "transfer.requested": "ขอย้ายสินทรัพย์",
  "system.test": "ทดสอบระบบ",
};

export function eventLabel(eventType: string): string {
  return EVENT_LABELS[eventType] ?? eventType;
}

export function relativeTimeTH(input: string): string {
  const then = new Date(input).getTime();
  if (Number.isNaN(then)) return "";
  const diff = Math.floor((Date.now() - then) / 1000);
  if (diff < 30) return "เมื่อสักครู่";
  if (diff < 60) return `${diff} วินาทีที่แล้ว`;
  const m = Math.floor(diff / 60);
  if (m < 60) return `${m} นาทีที่แล้ว`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h} ชั่วโมงที่แล้ว`;
  const d = Math.floor(h / 24);
  if (d < 7) return `${d} วันที่แล้ว`;
  return new Date(input).toLocaleDateString("th-TH");
}
