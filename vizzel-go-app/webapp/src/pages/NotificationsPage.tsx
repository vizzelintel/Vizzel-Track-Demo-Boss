import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { CheckCheck, RefreshCw, Send } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import {
  eventLabel,
  listNotifications,
  markAllRead,
  markRead,
  relativeTimeTH,
  sendTestPing,
  type Notification,
} from "@/lib/notifications";

const PAGE_SIZE = 20;

export function NotificationsPage() {
  const [tab, setTab] = useState<"all" | "unread">("all");
  const [page, setPage] = useState(1);
  const [items, setItems] = useState<Notification[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await listNotifications(page, PAGE_SIZE, tab === "unread");
      setItems(res.data);
      setTotal(res.total);
    } catch (err) {
      toast.error((err as Error).message || "โหลดการแจ้งเตือนล้มเหลว");
      setItems([]);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  }, [page, tab]);

  useEffect(() => {
    load();
  }, [load]);

  const totalPages = useMemo(
    () => Math.max(1, Math.ceil(total / PAGE_SIZE)),
    [total],
  );

  const handleClick = useCallback(
    async (n: Notification) => {
      if (!n.is_read) {
        try {
          await markRead(n.id);
        } catch {
          /* swallow */
        }
      }
      if (n.link) {
        navigate(n.link);
      }
    },
    [navigate],
  );

  const handleMarkAll = useCallback(async () => {
    try {
      await markAllRead();
      toast.success("ทำเครื่องหมายอ่านทั้งหมดแล้ว");
      load();
    } catch (err) {
      toast.error((err as Error).message || "อัปเดตล้มเหลว");
    }
  }, [load]);

  const handleTestPing = useCallback(async () => {
    try {
      await sendTestPing();
      toast.success("ส่งการแจ้งเตือนทดสอบแล้ว");
      load();
    } catch (err) {
      toast.error((err as Error).message || "ส่งล้มเหลว");
    }
  }, [load]);

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <CardTitle className="text-xl">การแจ้งเตือน</CardTitle>
            <CardDescription>
              รายการเหตุการณ์ในระบบที่เกี่ยวข้องกับบัญชีของคุณ
            </CardDescription>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleTestPing}
            >
              <Send className="mr-1.5 h-4 w-4" />
              ส่งทดสอบ
            </Button>
            <Button variant="outline" size="sm" onClick={() => load()}>
              <RefreshCw className="mr-1.5 h-4 w-4" />
              รีเฟรช
            </Button>
            <Button size="sm" onClick={handleMarkAll}>
              <CheckCheck className="mr-1.5 h-4 w-4" />
              ทำเครื่องหมายอ่านทั้งหมด
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          <Tabs
            value={tab}
            onValueChange={(v) => {
              setTab(v as "all" | "unread");
              setPage(1);
            }}
          >
            <TabsList>
              <TabsTrigger value="all">ทั้งหมด</TabsTrigger>
              <TabsTrigger value="unread">ยังไม่อ่าน</TabsTrigger>
            </TabsList>
          </Tabs>

          {loading ? (
            <div className="rounded-md border bg-muted/30 px-4 py-8 text-center text-sm text-muted-foreground">
              กำลังโหลด...
            </div>
          ) : items.length === 0 ? (
            <div className="rounded-md border bg-muted/30 px-4 py-12 text-center text-sm text-muted-foreground">
              ยังไม่มีการแจ้งเตือน
            </div>
          ) : (
            <ul className="divide-y rounded-md border">
              {items.map((n) => (
                <li
                  key={n.id}
                  className={
                    "flex cursor-pointer items-start gap-3 px-4 py-3 transition hover:bg-accent " +
                    (n.is_read ? "" : "bg-blue-50/40")
                  }
                  onClick={() => handleClick(n)}
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <p className="truncate font-medium">{n.title}</p>
                      <Badge variant="outline" className="text-[10px]">
                        {eventLabel(n.event_type)}
                      </Badge>
                      {!n.is_read ? (
                        <span className="inline-block h-1.5 w-1.5 rounded-full bg-red-500" />
                      ) : null}
                    </div>
                    {n.body ? (
                      <p className="mt-1 text-sm text-muted-foreground">
                        {n.body}
                      </p>
                    ) : null}
                    <p className="mt-1 text-xs text-muted-foreground">
                      {relativeTimeTH(n.created_at)}
                    </p>
                  </div>
                </li>
              ))}
            </ul>
          )}

          {total > PAGE_SIZE ? (
            <div className="flex items-center justify-between pt-2 text-sm">
              <span className="text-muted-foreground">
                ทั้งหมด {total} รายการ (หน้า {page}/{totalPages})
              </span>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page <= 1}
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                >
                  ก่อนหน้า
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page >= totalPages}
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                >
                  ถัดไป
                </Button>
              </div>
            </div>
          ) : null}
        </CardContent>
      </Card>
    </div>
  );
}
