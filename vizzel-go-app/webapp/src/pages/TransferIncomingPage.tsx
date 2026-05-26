"use client";

import { useCallback, useEffect, useState } from "react";
import {
  acceptIncomingTransfer,
  listTransfers,
  type TransferRecord,
} from "@/lib/transfer";
import { useUser } from "@/hooks/use-user";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";

export function TransferIncomingPage() {
  const { user } = useUser();
  const roleID = user?.organizationRelation?.roleID ?? 4;
  const [rows, setRows] = useState<TransferRecord[]>([]);

  const load = useCallback(async () => {
    try {
      const all = await listTransfers();
      setRows(all.filter((r) => r.direction === "incoming"));
    } catch {
      toast.error("โหลดรายการขาเข้าไม่สำเร็จ");
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const accept = async (id: number) => {
    try {
      await acceptIncomingTransfer(id);
      toast.success("รับโอนครุภัณฑ์แล้ว");
      load();
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "รับโอนไม่สำเร็จ");
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">รายการโอนย้ายขาเข้า</h1>
        <p className="text-muted-foreground text-sm">
          ครุภัณฑ์ที่รอรับจากหน่วยงานอื่น — กดยืนยันเมื่ออนุมัติครบแล้ว
        </p>
      </div>

      <ul className="divide-y rounded-lg border">
        {rows.map((r) => (
          <li key={r.id} className="flex flex-wrap items-center justify-between gap-2 p-3 text-sm">
            <div>
              <p className="font-medium">
                {r.assetNumber ?? r.assetId} · {r.transferType === "permanent" ? "ถาวร" : "ชั่วคราว"}
              </p>
              {(r.toUserName || r.targetBuildingName || r.targetRoomName) && (
                <p className="text-muted-foreground text-xs">
                  ปลายทาง: {[r.toUserName, r.targetBuildingName, r.targetRoomName].filter(Boolean).join(" · ")}
                </p>
              )}
            </div>
            <div className="flex items-center gap-2">
              <Badge variant="secondary">{r.status}</Badge>
              {r.status === "pending_target_approval" && (
                <span className="text-muted-foreground text-xs">รออนุมัติที่คิวอนุมัติ</span>
              )}
              {r.status === "pending_target" && roleID <= 2 && (
                <Button size="sm" onClick={() => accept(r.id)}>
                  รับโอน (ยืนยัน)
                </Button>
              )}
            </div>
          </li>
        ))}
        {rows.length === 0 && (
          <li className="text-muted-foreground p-3 text-sm">ไม่มีรายการขาเข้า</li>
        )}
      </ul>
    </div>
  );
}
