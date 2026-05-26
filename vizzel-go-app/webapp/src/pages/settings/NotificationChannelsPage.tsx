import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { Plus, Pencil, Trash2, Send, RefreshCw } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  createChannel,
  deleteChannel,
  listChannels,
  testChannel,
  updateChannel,
  CHANNEL_TYPE_LABELS,
  EVENT_CATALOG,
  type ChannelInput,
  type ChannelType,
  type NotificationChannel,
} from "@/lib/notification-channels";

interface FormState {
  id?: number;
  name: string;
  channel_type: ChannelType;
  token: string;
  recipient: string;
  url: string;
  events: string[];
  is_active: boolean;
}

const emptyForm: FormState = {
  name: "",
  channel_type: "line_messaging",
  token: "",
  recipient: "",
  url: "",
  events: [],
  is_active: true,
};

function fromChannel(ch: NotificationChannel): FormState {
  const cfg =
    typeof ch.config_json === "string" ? {} : (ch.config_json ?? {});
  return {
    id: ch.id,
    name: ch.name,
    channel_type: ch.channel_type as ChannelType,
    token: cfg.token ?? "",
    recipient: cfg.recipient ?? "",
    url: cfg.url ?? "",
    events: ch.events ?? [],
    is_active: !!ch.is_active,
  };
}

function toChannelInput(f: FormState): ChannelInput {
  const cfg: Record<string, string> = {};
  if (f.channel_type === "line_messaging") {
    if (f.token) cfg.token = f.token;
    if (f.recipient) cfg.recipient = f.recipient;
  } else if (f.channel_type === "line_notify") {
    if (f.token) cfg.token = f.token;
  } else {
    if (f.url) cfg.url = f.url;
  }
  return {
    name: f.name.trim(),
    channel_type: f.channel_type,
    config: cfg,
    events: f.events,
    is_active: f.is_active,
  };
}

export function NotificationChannelsPage() {
  const [rows, setRows] = useState<NotificationChannel[]>([]);
  const [loading, setLoading] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await listChannels();
      setRows(data);
    } catch (err) {
      toast.error((err as Error).message || "โหลดช่องทางไม่สำเร็จ");
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const openCreate = useCallback(() => {
    setForm(emptyForm);
    setDialogOpen(true);
  }, []);

  const openEdit = useCallback((ch: NotificationChannel) => {
    setForm(fromChannel(ch));
    setDialogOpen(true);
  }, []);

  const handleSave = useCallback(async () => {
    if (!form.name.trim()) {
      toast.error("กรุณากรอกชื่อช่องทาง");
      return;
    }
    setSaving(true);
    try {
      const payload = toChannelInput(form);
      if (form.id) {
        await updateChannel(form.id, payload);
        toast.success("บันทึกการแก้ไขเรียบร้อย");
      } else {
        await createChannel(payload);
        toast.success("เพิ่มช่องทางใหม่เรียบร้อย");
      }
      setDialogOpen(false);
      load();
    } catch (err) {
      toast.error((err as Error).message || "บันทึกไม่สำเร็จ");
    } finally {
      setSaving(false);
    }
  }, [form, load]);

  const handleDelete = useCallback(
    async (ch: NotificationChannel) => {
      if (!window.confirm(`ลบช่องทาง "${ch.name}" ใช่หรือไม่?`)) return;
      try {
        await deleteChannel(ch.id);
        toast.success("ลบช่องทางแล้ว");
        load();
      } catch (err) {
        toast.error((err as Error).message || "ลบไม่สำเร็จ");
      }
    },
    [load],
  );

  const handleTest = useCallback(async (ch: NotificationChannel) => {
    try {
      await testChannel(ch.id);
      toast.success(`ส่งทดสอบไปยัง ${ch.name} แล้ว`);
    } catch (err) {
      toast.error((err as Error).message || "ทดสอบล้มเหลว");
    }
  }, []);

  const toggleEvent = useCallback((evt: string, checked: boolean) => {
    setForm((prev) => {
      if (checked) {
        if (prev.events.includes(evt)) return prev;
        return { ...prev, events: [...prev.events, evt] };
      }
      return { ...prev, events: prev.events.filter((e) => e !== evt) };
    });
  }, []);

  const showsToken = useMemo(
    () =>
      form.channel_type === "line_messaging" ||
      form.channel_type === "line_notify",
    [form.channel_type],
  );
  const showsRecipient = form.channel_type === "line_messaging";
  const showsURL =
    form.channel_type === "webhook_generic" || form.channel_type === "discord";

  return (
    <Card>
      <CardHeader className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <CardTitle className="text-xl">ตั้งค่าการแจ้งเตือน</CardTitle>
          <CardDescription>
            ช่องทางส่งการแจ้งเตือนภายนอก (LINE / Webhook / Discord) สำหรับองค์กรของคุณ
          </CardDescription>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={load}>
            <RefreshCw className="mr-1.5 h-4 w-4" />
            รีเฟรช
          </Button>
          <Button size="sm" onClick={openCreate}>
            <Plus className="mr-1.5 h-4 w-4" />
            เพิ่มช่องทาง
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>ชื่อ</TableHead>
                <TableHead>ประเภท</TableHead>
                <TableHead className="text-center">อีเวนต์</TableHead>
                <TableHead className="text-center">สถานะ</TableHead>
                <TableHead className="text-right">การจัดการ</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell
                    colSpan={5}
                    className="py-8 text-center text-sm text-muted-foreground"
                  >
                    กำลังโหลด...
                  </TableCell>
                </TableRow>
              ) : rows.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={5}
                    className="py-10 text-center text-sm text-muted-foreground"
                  >
                    ยังไม่มีช่องทางแจ้งเตือน — กด "เพิ่มช่องทาง" เพื่อเริ่มต้น
                  </TableCell>
                </TableRow>
              ) : (
                rows.map((ch) => (
                  <TableRow key={ch.id}>
                    <TableCell className="font-medium">{ch.name}</TableCell>
                    <TableCell>
                      <Badge variant="outline">
                        {CHANNEL_TYPE_LABELS[
                          ch.channel_type as ChannelType
                        ] ?? ch.channel_type}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-center text-sm text-muted-foreground">
                      {ch.events && ch.events.length > 0
                        ? `${ch.events.length} อีเวนต์`
                        : "ทุกอีเวนต์"}
                    </TableCell>
                    <TableCell className="text-center">
                      {ch.is_active ? (
                        <Badge>เปิดใช้งาน</Badge>
                      ) : (
                        <Badge variant="secondary">ปิด</Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleTest(ch)}
                          title="ทดสอบส่ง"
                        >
                          <Send className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => openEdit(ch)}
                          title="แก้ไข"
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDelete(ch)}
                          title="ลบ"
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </CardContent>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle>
              {form.id ? "แก้ไขช่องทาง" : "เพิ่มช่องทางใหม่"}
            </DialogTitle>
            <DialogDescription>
              ตั้งค่าปลายทางสำหรับการส่งแจ้งเตือนภายนอก
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="ch-name">ชื่อช่องทาง</Label>
              <Input
                id="ch-name"
                value={form.name}
                onChange={(e) =>
                  setForm((p) => ({ ...p, name: e.target.value }))
                }
                placeholder="เช่น LINE แจ้งเตือนทีม"
              />
            </div>

            <div className="space-y-1.5">
              <Label>ประเภทช่องทาง</Label>
              <Select
                value={form.channel_type}
                onValueChange={(v) =>
                  setForm((p) => ({ ...p, channel_type: v as ChannelType }))
                }
              >
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {(
                    Object.keys(CHANNEL_TYPE_LABELS) as ChannelType[]
                  ).map((k) => (
                    <SelectItem key={k} value={k}>
                      {CHANNEL_TYPE_LABELS[k]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {showsToken ? (
              <div className="space-y-1.5">
                <Label htmlFor="ch-token">Access Token</Label>
                <Input
                  id="ch-token"
                  type="password"
                  value={form.token}
                  onChange={(e) =>
                    setForm((p) => ({ ...p, token: e.target.value }))
                  }
                  placeholder="LINE token"
                />
              </div>
            ) : null}

            {showsRecipient ? (
              <div className="space-y-1.5">
                <Label htmlFor="ch-recipient">ผู้รับ (userId หรือ groupId)</Label>
                <Input
                  id="ch-recipient"
                  value={form.recipient}
                  onChange={(e) =>
                    setForm((p) => ({ ...p, recipient: e.target.value }))
                  }
                  placeholder="Uxxx... หรือ Cxxx..."
                />
              </div>
            ) : null}

            {showsURL ? (
              <div className="space-y-1.5">
                <Label htmlFor="ch-url">Webhook URL</Label>
                <Input
                  id="ch-url"
                  value={form.url}
                  onChange={(e) =>
                    setForm((p) => ({ ...p, url: e.target.value }))
                  }
                  placeholder="https://hooks.example.com/..."
                />
              </div>
            ) : null}

            <div className="space-y-2">
              <Label>อีเวนต์ที่จะส่ง (เลือกว่างไว้หมายถึงทุกอีเวนต์)</Label>
              <div className="grid grid-cols-2 gap-2">
                {EVENT_CATALOG.map((e) => {
                  const checked = form.events.includes(e.value);
                  return (
                    <label
                      key={e.value}
                      className="flex cursor-pointer items-center gap-2 rounded-md border px-3 py-2 text-sm hover:bg-accent"
                    >
                      <Checkbox
                        checked={checked}
                        onCheckedChange={(v) =>
                          toggleEvent(e.value, !!v)
                        }
                      />
                      <span>{e.label}</span>
                    </label>
                  );
                })}
              </div>
            </div>

            <div className="flex items-center justify-between rounded-md border px-3 py-2">
              <div>
                <p className="text-sm font-medium">เปิดใช้งานช่องทางนี้</p>
                <p className="text-xs text-muted-foreground">
                  ปิดเพื่อหยุดส่งชั่วคราว
                </p>
              </div>
              <Switch
                checked={form.is_active}
                onCheckedChange={(v) =>
                  setForm((p) => ({ ...p, is_active: !!v }))
                }
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDialogOpen(false)}
              disabled={saving}
            >
              ยกเลิก
            </Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving ? "กำลังบันทึก..." : "บันทึก"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
