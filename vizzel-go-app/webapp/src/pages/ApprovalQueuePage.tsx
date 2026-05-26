"use client";

import { useCallback, useEffect, useState } from "react";
import { approvalAction, listPendingApprovals, type ApprovalInstance } from "@/lib/approval";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";

const workflowLabels: Record<string, string> = {
  repair: "แจ้งซ่อม",
  withdrawal: "เบิก-ยืม",
  transfer: "โอนย้าย",
};

export function ApprovalQueuePage() {
  const [items, setItems] = useState<ApprovalInstance[]>([]);
  const [loading, setLoading] = useState(true);
  const [note, setNote] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setItems(await listPendingApprovals());
    } catch {
      toast.error("โหลดคิวอนุมัติไม่สำเร็จ");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const act = async (id: number, action: "approve" | "reject", branch?: "A" | "B") => {
    try {
      await approvalAction(id, { action, branch, note });
      toast.success(action === "approve" ? "อนุมัติแล้ว" : "ปฏิเสธแล้ว");
      setNote("");
      load();
    } catch {
      toast.error("ดำเนินการไม่สำเร็จ");
    }
  };

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">คิวอนุมัติ</h1>
        <p className="text-muted-foreground text-sm">
          แจ้งซ่อม / เบิก-ยืม / โอนย้าย — หัวหน้างาน → ผู้อำนวยการ (สาย A/B) → เลขาฯ/นายก (สาย B)
        </p>
      </div>
      <Textarea
        placeholder="หมายเหตุ (ถ้ามี)"
        value={note}
        onChange={(e) => setNote(e.target.value)}
        rows={2}
      />
      {loading ? (
        <p className="text-muted-foreground text-sm">กำลังโหลด...</p>
      ) : items.length === 0 ? (
        <p className="text-muted-foreground text-sm">ไม่มีรายการรออนุมัติ</p>
      ) : (
        <ul className="divide-y rounded-lg border">
          {items.map((item) => (
            <li key={item.id} className="flex flex-wrap items-center gap-3 p-4">
              <div className="min-w-0 flex-1">
                <p className="font-medium">
                  {workflowLabels[item.workflowCode] ?? item.workflowCode} #
                  {item.refId}
                </p>
                <p className="text-muted-foreground text-xs">
                  ขั้นที่ {item.currentStep}
                  {item.branch ? ` · สาย ${item.branch}` : ""}
                </p>
              </div>
              <Badge variant="secondary">{item.status}</Badge>
              {item.currentStep === 2 && (
                <>
                  <Button size="sm" variant="outline" onClick={() => act(item.id, "approve", "A")}>
                    สาย A (อนุมัติจบ)
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => act(item.id, "approve", "B")}>
                    สาย B (ส่งต่อ)
                  </Button>
                </>
              )}
              <Button size="sm" onClick={() => act(item.id, "approve")}>
                อนุมัติ
              </Button>
              <Button size="sm" variant="destructive" onClick={() => act(item.id, "reject")}>
                ปฏิเสธ
              </Button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
