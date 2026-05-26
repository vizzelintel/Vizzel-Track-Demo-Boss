"use client";

import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  disposalStatusLabel,
  listDisposalLots,
  type DisposalLot,
} from "@/lib/disposal";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { FileUp, Plus } from "lucide-react";

function statusBadge(status: string) {
  const variant =
    status === "approved"
      ? "default"
      : status === "rejected"
        ? "destructive"
        : status === "pending_approval"
          ? "secondary"
          : "outline";
  return (
    <Badge variant={variant}>{disposalStatusLabel[status] ?? status}</Badge>
  );
}

export function SalesPage() {
  const [rows, setRows] = useState<DisposalLot[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setRows(await listDisposalLots());
    } catch {
      toast.error("โหลดรายการ LOT จำหน่ายไม่สำเร็จ");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">ออกจำหน่าย</h1>
          <p className="text-muted-foreground text-sm">
            จัดการ LOT การจำหน่ายครุภัณฑ์จำนวนมาก (รองรับนำเข้า CSV หลายร้อย–พันรายการต่อ LOT)
          </p>
        </div>
        <Button asChild>
          <Link to="/sales/create">
            <Plus className="mr-2 h-4 w-4" />
            ตั้งเรื่องจำหน่าย
          </Link>
        </Button>
      </div>

      <div className="rounded-lg border">
        <div className="bg-muted/40 flex items-center justify-between border-b px-4 py-2 text-sm font-medium">
          <span>LOT จำหน่าย</span>
          <span className="text-muted-foreground">{rows.length} รายการ</span>
        </div>
        {loading ? (
          <p className="text-muted-foreground p-6 text-sm">กำลังโหลด...</p>
        ) : rows.length === 0 ? (
          <div className="flex flex-col items-center gap-3 p-10 text-center">
            <FileUp className="text-muted-foreground h-10 w-10" />
            <p className="text-muted-foreground text-sm">ยังไม่มี LOT จำหน่าย</p>
            <Button asChild variant="outline" size="sm">
              <Link to="/sales/create">สร้าง LOT แรก</Link>
            </Button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left">
                  <th className="p-3 font-medium">LOT</th>
                  <th className="p-3 font-medium">วันที่จำหน่าย</th>
                  <th className="p-3 font-medium">ผู้ซื้อ/ผู้รับ</th>
                  <th className="p-3 font-medium text-right">จำนวนเงิน</th>
                  <th className="p-3 font-medium text-center">ครุภัณฑ์</th>
                  <th className="p-3 font-medium">สถานะ</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => {
                  const first = r.sampleAssets?.[0];
                  const extra = (r.assetCount ?? 0) - 1;
                  return (
                    <tr key={r.id} className="hover:bg-muted/30 border-b last:border-0">
                      <td className="p-3 font-medium">{r.lot}</td>
                      <td className="p-3">{r.disposalDate ?? "—"}</td>
                      <td className="p-3">{r.buyer || "—"}</td>
                      <td className="p-3 text-right">
                        {r.amount != null
                          ? r.amount.toLocaleString("th-TH", {
                              minimumFractionDigits: 2,
                            })
                          : "—"}
                      </td>
                      <td className="p-3 text-center">
                        <span className="font-medium">{r.assetCount}</span>
                        {first && (
                          <p className="text-muted-foreground truncate text-xs">
                            {first.assetNumber}
                            {extra > 0 ? ` +${extra}` : ""}
                          </p>
                        )}
                      </td>
                      <td className="p-3">{statusBadge(r.status)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
