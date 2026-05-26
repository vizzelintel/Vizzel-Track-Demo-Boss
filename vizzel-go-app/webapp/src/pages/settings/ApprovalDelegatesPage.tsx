"use client";

import { useCallback, useEffect, useState } from "react";
import {
  listApprovalDelegates,
  setApprovalDelegate,
  type ApprovalDelegate,
  APPROVAL_STEPS,
} from "@/lib/approval-delegates";
import { useOrganizationUsers } from "@/hooks/use-organization-users";
import { useUser } from "@/hooks/use-user";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

export function ApprovalDelegatesPage() {
  const { user } = useUser();
  const orgID = user?.organizationRelation?.organizationID;
  const roleID = user?.organizationRelation?.roleID ?? 4;
  const { data: usersData } = useOrganizationUsers(orgID, 1, 200);
  const users = (usersData?.data ?? []).map((row: { user?: { id: number; name?: string; email?: string }; id?: number }) => ({
    id: row.user?.id ?? row.id ?? 0,
    name: row.user?.name,
    email: row.user?.email,
  }));
  const [delegates, setDelegates] = useState<ApprovalDelegate[]>([]);
  const [draft, setDraft] = useState<Record<string, string>>({});

  const load = useCallback(async () => {
    try {
      const list = await listApprovalDelegates();
      setDelegates(list);
      const d: Record<string, string> = {};
      for (const row of list) {
        d[row.stepKey] = String(row.userId);
      }
      setDraft(d);
    } catch {
      toast.error("โหลดผู้รับมอบหมายไม่สำเร็จ");
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  if (roleID > 2) {
    return <p className="text-muted-foreground text-sm">เฉพาะผู้ดูแลระบบเท่านั้น</p>;
  }

  const save = async (stepKey: string) => {
    const userId = Number(draft[stepKey]);
    if (!userId) {
      toast.error("เลือกผู้ใช้");
      return;
    }
    try {
      await setApprovalDelegate(stepKey, userId);
      toast.success("บันทึกแล้ว");
      load();
    } catch {
      toast.error("บันทึกไม่สำเร็จ");
    }
  };

  return (
    <div className="mx-auto max-w-lg space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">ผู้รับมอบหมายสายอนุมัติ</h1>
        <p className="text-muted-foreground text-sm">
          กำหนดว่าใครเป็นผู้อนุมัติแต่ละขั้น (หัวหน้างาน / ผอ. / เลขา / นายก)
        </p>
      </div>
      <ul className="space-y-4">
        {APPROVAL_STEPS.map((step) => (
          <li key={step.key} className="flex flex-wrap items-end gap-3 rounded-lg border p-4">
            <div className="min-w-[140px] flex-1 space-y-2">
              <Label>{step.label}</Label>
              <Select
                value={draft[step.key] ?? ""}
                onValueChange={(v) => setDraft((prev) => ({ ...prev, [step.key]: v }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="เลือกผู้ใช้" />
                </SelectTrigger>
                <SelectContent>
                  {(users ?? []).map((u: { id: number; name?: string; email?: string }) => (
                    <SelectItem key={u.id} value={String(u.id)}>
                      {u.name || u.email || u.id}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Button type="button" onClick={() => save(step.key)}>
              บันทึก
            </Button>
          </li>
        ))}
      </ul>
      {delegates.length > 0 && (
        <p className="text-muted-foreground text-xs">
          ปัจจุบัน: {delegates.map((d) => `${d.stepKey}→${d.userName}`).join(", ")}
        </p>
      )}
    </div>
  );
}
