import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Bell, CheckCheck, Package, Pencil, FileText, ShieldCheck, Inbox } from "lucide-react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  eventLabel,
  getUnreadCount,
  listNotifications,
  markAllRead,
  markRead,
  relativeTimeTH,
  type Notification,
} from "@/lib/notifications";

const REFRESH_MS = 30_000;

function eventIcon(eventType: string) {
  switch (eventType) {
    case "asset.created":
      return Package;
    case "asset.updated":
      return Pencil;
    case "repair.submitted":
      return FileText;
    case "withdrawal.requested":
    case "withdrawal.approved":
      return ShieldCheck;
    default:
      return Inbox;
  }
}

interface NotificationBellProps {
  className?: string;
}

export function NotificationBell({ className }: NotificationBellProps) {
  const [open, setOpen] = useState(false);
  const [unread, setUnread] = useState(0);
  const [items, setItems] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const refreshCount = useCallback(async () => {
    try {
      const n = await getUnreadCount();
      setUnread(n);
    } catch {
      /* swallow */
    }
  }, []);

  const refreshList = useCallback(async () => {
    setLoading(true);
    try {
      const res = await listNotifications(1, 10, false);
      setItems(res.data);
    } catch {
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refreshCount();
    const id = window.setInterval(refreshCount, REFRESH_MS);
    return () => window.clearInterval(id);
  }, [refreshCount]);

  useEffect(() => {
    if (open) {
      refreshList();
    }
  }, [open, refreshList]);

  const handleItemClick = useCallback(
    async (n: Notification) => {
      if (!n.is_read) {
        try {
          await markRead(n.id);
          setUnread((c) => Math.max(0, c - 1));
        } catch {
          /* swallow */
        }
      }
      setOpen(false);
      if (n.link) {
        navigate(n.link);
      } else {
        navigate("/notifications");
      }
    },
    [navigate],
  );

  const handleMarkAll = useCallback(async () => {
    try {
      await markAllRead();
      setUnread(0);
      setItems((prev) => prev.map((n) => ({ ...n, is_read: true })));
    } catch {
      /* swallow */
    }
  }, []);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          aria-label="การแจ้งเตือน"
          className={
            "relative inline-flex h-9 w-9 items-center justify-center rounded-md text-foreground/80 hover:bg-accent hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring " +
            (className ?? "")
          }
        >
          <Bell className="h-5 w-5" />
          {unread > 0 ? (
            <span className="absolute -top-0.5 -right-0.5 inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-semibold leading-none text-white">
              {unread > 99 ? "99+" : unread}
            </span>
          ) : null}
        </button>
      </PopoverTrigger>
      <PopoverContent
        align="end"
        sideOffset={8}
        className="z-[60] w-[360px] p-0"
      >
        <div className="flex items-center justify-between border-b px-4 py-3">
          <p className="text-sm font-semibold">การแจ้งเตือน</p>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-8 px-2 text-xs"
            onClick={handleMarkAll}
            disabled={unread === 0}
          >
            <CheckCheck className="mr-1 h-3.5 w-3.5" />
            อ่านทั้งหมด
          </Button>
        </div>
        <ScrollArea className="max-h-[420px]">
          {loading ? (
            <div className="px-4 py-6 text-center text-xs text-muted-foreground">
              กำลังโหลด...
            </div>
          ) : items.length === 0 ? (
            <div className="px-4 py-10 text-center text-sm text-muted-foreground">
              ยังไม่มีการแจ้งเตือน
            </div>
          ) : (
            <ul className="divide-y">
              {items.map((n) => {
                const Icon = eventIcon(n.event_type);
                return (
                  <li key={n.id}>
                    <button
                      type="button"
                      onClick={() => handleItemClick(n)}
                      className={
                        "flex w-full items-start gap-3 px-4 py-3 text-left transition hover:bg-accent " +
                        (n.is_read ? "" : "bg-blue-50/40")
                      }
                    >
                      <span className="mt-0.5 inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-muted text-muted-foreground">
                        <Icon className="h-4 w-4" />
                      </span>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <p className="truncate text-sm font-medium">
                            {n.title}
                          </p>
                          {!n.is_read ? (
                            <span className="inline-block h-1.5 w-1.5 shrink-0 rounded-full bg-red-500" />
                          ) : null}
                        </div>
                        {n.body ? (
                          <p className="mt-0.5 line-clamp-2 text-xs text-muted-foreground">
                            {n.body}
                          </p>
                        ) : null}
                        <p className="mt-1 text-[11px] text-muted-foreground">
                          <span className="rounded bg-muted px-1.5 py-0.5">
                            {eventLabel(n.event_type)}
                          </span>
                          <span className="ml-2">
                            {relativeTimeTH(n.created_at)}
                          </span>
                        </p>
                      </div>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </ScrollArea>
        <div className="flex items-center justify-between border-t px-4 py-2">
          <Button
            type="button"
            variant="link"
            size="sm"
            className="h-7 px-0 text-xs"
            onClick={() => {
              setOpen(false);
              navigate("/notifications");
            }}
          >
            ดูทั้งหมด
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}
