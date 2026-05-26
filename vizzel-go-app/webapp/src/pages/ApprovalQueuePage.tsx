"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { approvalAction, listPendingApprovals, type ApprovalInstance } from "@/lib/approval";
import { useUser } from "@/hooks/use-user";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";

const workflowLabels: Record<string, string> = {
  repair: "แจ้งซ่อม",
  withdrawal: "เบิก-ยืม",
  transfer: "โอนย้าย (ต้นทาง)",
  transfer_receive: "รับโอน (ปลายทาง)",
};

export function ApprovalQueuePage() {
  const { user } = useUser();
  const roleID = user?.organizationRelation?.roleID ?? 4;
  const [searchParams] = useSearchParams();
  const workflowFilter = searchParams.get("workflow") ?? "";
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

  const filteredItems = useMemo(() => {
    if (!workflowFilter) return items;
    if (workflowFilter === "transfer") {
      return items.filter(
        (i) => i.workflowCode === "transfer" || i.workflowCode === "transfer_receive",
      );
    }
    return items.filter((i) => i.workflowCode === workflowFilter);
  }, [items, workflowFilter]);

  const act = async (id: number, action: "approve" | "reject", branch?: "A" | "B") => {
    try {
      await approvalAction(id, { action, branch, note });
      toast.success(action === "approve" ? "อนุมัติแล้ว" : "ปฏิเสธแล้ว");
      setNote("");
      load();
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "ดำเนินการไม่สำเร็จ");
    }
  };

  const filterLabel = workflowFilter
    ? workflowLabels[workflowFilter] ?? workflowFilter
    : null;

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">คิวอนุมัติ</h1>
        <p className="text-muted-foreground text-sm">
          บทบาทของคุณ: role {roleID} — หัวหน้างาน (3+) · ผอ./เลขา/นายก (2+)
          {filterLabel ? ` · กรอง: ${filterLabel}` : ""}
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
      ) : filteredItems.length === 0 ? (
        <p className="text-muted-foreground text-sm">ไม่มีรายการรออนุมัติ</p>
      ) : (
        <ul className="divide-y rounded-lg border">
          {filteredItems.map((item) => (
            <li key={item.id} className="flex flex-wrap items-center gap-3 p-4">
              <div className="min-w-0 flex-1">
                <p className="font-medium">
                  {workflowLabels[item.workflowCode] ?? item.workflowCode} #
                  {item.refId}
                </p>
                <p className="text-muted-foreground text-xs">
                  ขั้น: {item.currentStepLabel ?? item.currentStepKey ?? item.currentStep}
                  {item.branch ? ` · สาย ${item.branch}` : ""}
                </p>
              </div>
              <Badge variant={item.canAct ? "default" : "secondary"}>
                {item.canAct ? "รอคุณอนุมัติ" : "รอผู้อื่น"}
              </Badge>
              {item.canAct && item.currentStepKey === "director" && (
                <>
                  <Button size="sm" variant="outline" onClick={() => act(item.id, "approve", "A")}>
                    สาย A (อนุมัติจบ)
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => act(item.id, "approve", "B")}>
                    สาย B (ส่งต่อ)
                  </Button>
                </>
              )}
              {item.canAct && item.currentStepKey !== "director" && (
                <Button size="sm" onClick={() => act(item.id, "approve")}>
                  อนุมัติ
                </Button>
              )}
              {item.canAct && (
                <Button size="sm" variant="destructive" onClick={() => act(item.id, "reject")}>
                  ปฏิเสธ
                </Button>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
