"use client";

import { useCallback, useEffect, useState } from "react";
import { apiRequest } from "@/lib/api";
import { useUser } from "@/hooks/use-user";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";

interface RepairRow {
  id: number;
  title: string;
  subtitle: string;
  status: string;
}

export function RepairWorkflowPage() {
  const { user } = useUser();
  const orgID = user?.organizationRelation?.organizationID;
  const [rows, setRows] = useState<RepairRow[]>([]);
  const [assetNumber, setAssetNumber] = useState("");
  const [symptom, setSymptom] = useState("");
  const [note, setNote] = useState("");

  const load = useCallback(async () => {
    try {
      const res = await apiRequest<{ data: RepairRow[] }>("/asset/repair/get");
      setRows(res?.data ?? []);
    } catch {
      toast.error("โหลดรายการซ่อมไม่สำเร็จ");
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const create = async () => {
    if (!assetNumber.trim()) {
      toast.error("ระบุเลขครุภัณฑ์");
      return;
    }
    try {
      await apiRequest("/asset/repair/create", {
        method: "POST",
        body: JSON.stringify({
          assetNumber: assetNumber.trim(),
          symptom,
          note,
          submit: true,
        }),
      });
      toast.success("ส่งแจ้งซ่อมเพื่ออนุมัติแล้ว");
      setAssetNumber("");
      setSymptom("");
      setNote("");
      load();
    } catch {
      toast.error("บันทึกไม่สำเร็จ");
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">แจ้งซ่อมบำรุง</h1>
        <p className="text-muted-foreground text-sm">
          ส่งเข้าสายอนุมัติ — หัวหน้างาน → ผู้อำนวยการ (A/B) → เลขาฯ/นายก (สาย B)
        </p>
      </div>

      <div className="grid max-w-lg gap-4 rounded-lg border p-4">
        <div className="space-y-2">
          <Label>เลขครุภัณฑ์</Label>
          <Input value={assetNumber} onChange={(e) => setAssetNumber(e.target.value)} />
        </div>
        <div className="space-y-2">
          <Label>อาการ/ปัญหา</Label>
          <Textarea value={symptom} onChange={(e) => setSymptom(e.target.value)} rows={2} />
        </div>
        <div className="space-y-2">
          <Label>หมายเหตุ</Label>
          <Input value={note} onChange={(e) => setNote(e.target.value)} />
        </div>
        <Button onClick={create}>ส่งอนุมัติ</Button>
      </div>

      <div>
        <h2 className="mb-2 font-semibold">รายการแจ้งซ่อม</h2>
        <ul className="divide-y rounded-lg border">
          {rows.map((r) => (
            <li key={r.id} className="flex items-center justify-between gap-2 p-3 text-sm">
              <div>
                <p className="font-medium">{r.title}</p>
                <p className="text-muted-foreground">{r.subtitle}</p>
              </div>
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
