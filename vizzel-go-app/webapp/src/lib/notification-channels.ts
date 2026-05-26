import { apiRequest } from "@/lib/api";

export type ChannelType =
  | "line_messaging"
  | "line_notify"
  | "webhook_generic"
  | "discord";

export const CHANNEL_TYPE_LABELS: Record<ChannelType, string> = {
  line_messaging: "LINE Messaging API",
  line_notify: "LINE Notify (Legacy)",
  webhook_generic: "Generic Webhook",
  discord: "Discord",
};

export const EVENT_CATALOG: { value: string; label: string }[] = [
  { value: "asset.created", label: "เพิ่มสินทรัพย์" },
  { value: "asset.updated", label: "อัปเดตสินทรัพย์" },
  { value: "withdrawal.requested", label: "คำขอเบิก-ยืม" },
  { value: "withdrawal.approved", label: "อนุมัติเบิก-ยืม" },
  { value: "repair.submitted", label: "แจ้งซ่อม" },
  { value: "repair.completed", label: "ปิดงานซ่อม" },
  { value: "withdrawal.due_soon", label: "แจ้งเตือนก่อนคืน 1 วัน" },
  { value: "withdrawal.returned", label: "คืนครุภัณฑ์แล้ว" },
  { value: "transfer.accepted", label: "รับโอนครุภัณฑ์ (ปลายทาง)" },
  { value: "transfer.requested", label: "ขอย้ายสินทรัพย์" },
  { value: "system.test", label: "ทดสอบระบบ" },
];

export interface ChannelConfig {
  token?: string;
  recipient?: string;
  url?: string;
}

export interface NotificationChannel {
  id: number;
  organization_id: number;
  channel_type: ChannelType | string;
  name: string;
  config_json: ChannelConfig | string;
  events: string[];
  is_active: boolean;
  created_at: string;
}

export interface ChannelListResponse {
  data: NotificationChannel[];
  total: number;
}

export interface ChannelInput {
  name: string;
  channel_type: ChannelType | string;
  config: ChannelConfig;
  events: string[];
  is_active: boolean;
}

function normalizeChannel(raw: NotificationChannel): NotificationChannel {
  let cfg: ChannelConfig = {};
  if (typeof raw.config_json === "string") {
    try {
      cfg = raw.config_json ? JSON.parse(raw.config_json) : {};
    } catch {
      cfg = {};
    }
  } else if (raw.config_json && typeof raw.config_json === "object") {
    cfg = raw.config_json as ChannelConfig;
  }
  return {
    ...raw,
    config_json: cfg,
    events: Array.isArray(raw.events) ? raw.events : [],
  };
}

export async function listChannels(): Promise<NotificationChannel[]> {
  const res = await apiRequest<ChannelListResponse>(
    "/notification-channel/list",
  );
  const data = Array.isArray(res?.data) ? res.data : [];
  return data.map(normalizeChannel);
}

export async function createChannel(input: ChannelInput): Promise<void> {
  await apiRequest("/notification-channel/create", {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export async function updateChannel(
  id: number,
  input: ChannelInput,
): Promise<void> {
  await apiRequest(`/notification-channel/update/${id}`, {
    method: "PATCH",
    body: JSON.stringify(input),
  });
}

export async function deleteChannel(id: number): Promise<void> {
  await apiRequest(`/notification-channel/delete/${id}`, {
    method: "DELETE",
  });
}

export async function testChannel(id: number): Promise<void> {
  await apiRequest(`/notification-channel/test/${id}`, { method: "POST" });
}
