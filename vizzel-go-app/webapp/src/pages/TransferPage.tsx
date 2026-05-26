"use client";

import { useCallback, useEffect, useState } from "react";
import { createTransfer, listTransfers, type TransferRecord } from "@/lib/transfer";
import { apiRequest } from "@/lib/api";
import { useUser } from "@/hooks/use-user";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";

export function TransferPage() {
  const { user } = useUser();
  const orgID = user?.organizationRelation?.organizationID;
  const [rows, setRows] = useState<TransferRecord[]>([]);
  const [assets, setAssets] = useState<{ id: number; assetNumber: string; assetName: string }[]>([]);
  const [assetId, setAssetId] = useState("");
  const [transferType, setTransferType] = useState<"temporary" | "permanent">("temporary");
  const [reason, setReason] = useState("");

  const load = useCallback(async () => {
    try {
      setRows(await listTransfers());
    } catch {
      toast.error("โหลดรายการโอนไม่สำเร็จ");
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    if (!orgID) return;
    apiRequest(`/withdrawal/asset/list?organizationID=${orgID}`)
      .then((res: unknown) => {
        const list = Array.isArray(res) ? res : (res as { data?: unknown[] })?.data ?? [];
        setAssets(
          (list as { id: number; assetNumber?: string; asset_number?: string; assetName?: string; asset_name?: string }[]).map(
            (a) => ({
              id: a.id,
              assetNumber: a.assetNumber ?? a.asset_number ?? "",
              assetName: a.assetName ?? a.asset_name ?? "",
            }),
          ),
        );
      })
      .catch(() => {});
  }, [orgID]);

  const submit = async () => {
    if (!assetId) {
      toast.error("เลือกครุภัณฑ์");
      return;
    }
    try {
      await createTransfer({
        assetId: Number(assetId),
        transferType,
        reason,
        submit: true,
      });
      toast.success("ส่งคำขอโอนเพื่ออนุมัติแล้ว");
      setReason("");
      setAssetId("");
      load();
    } catch {
      toast.error("บันทึกไม่สำเร็จ");
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">โอนย้ายครุภัณฑ์</h1>
        <p className="text-muted-foreground text-sm">ภายในหน่วยงาน — ชั่วคราวหรือถาวร</p>
      </div>

      <div className="grid max-w-lg gap-4 rounded-lg border p-4">
        <div className="space-y-2">
          <Label>ครุภัณฑ์</Label>
          <Select value={assetId} onValueChange={setAssetId}>
            <SelectTrigger>
              <SelectValue placeholder="เลือกครุภัณฑ์" />
            </SelectTrigger>
            <SelectContent>
              {assets.map((a) => (
                <SelectItem key={a.id} value={String(a.id)}>
                  {a.assetNumber} — {a.assetName}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label>ประเภท</Label>
          <Select value={transferType} onValueChange={(v) => setTransferType(v as "temporary" | "permanent")}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="temporary">ชั่วคราว</SelectItem>
              <SelectItem value="permanent">ถาวร</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label>เหตุผล</Label>
          <Input value={reason} onChange={(e) => setReason(e.target.value)} />
        </div>
        <Button onClick={submit}>ส่งอนุมัติ</Button>
      </div>

      <div>
        <h2 className="mb-2 font-semibold">รายการล่าสุด</h2>
        <ul className="divide-y rounded-lg border">
          {rows.map((r) => (
            <li key={r.id} className="flex items-center justify-between gap-2 p-3 text-sm">
              <span>
                {r.assetNumber ?? r.assetId} · {r.transferType === "permanent" ? "ถาวร" : "ชั่วคราว"}
              </span>
              <Badge variant="outline">{r.status}</Badge>
            </li>
          ))}
          {rows.length === 0 && (
            <li className="text-muted-foreground p-3 text-sm">ยังไม่มีรายการ</li>
          )}
        </ul>
      </div>
    </div>
  );
}
