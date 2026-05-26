"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  APPROVAL_STEPS,
  listApprovalDelegates,
} from "@/lib/approval-delegates";
import { useOrganizationUsers } from "@/hooks/use-organization-users";
import { normalizeOrgUser } from "@/lib/org-user-normalize";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export type StepAssignees = Record<string, number>;

const BRANCH_B_STEPS = new Set(["chief_admin", "mayor"]);

function maxRoleForStep(stepKey: string): number {
  return stepKey === "section_head" ? 3 : 2;
}

function userDisplayName(u: {
  user?: { name?: string | null; surname?: string | null; email?: string };
}) {
  const name = [u.user?.name, u.user?.surname].filter(Boolean).join(" ").trim();
  return name || u.user?.email || "";
}

interface StepApproverFieldsProps {
  organizationID?: number | null;
  value: StepAssignees;
  onChange: (next: StepAssignees) => void;
  /** Show branch B steps (เลขา/นายก) — default true */
  includeBranchB?: boolean;
}

export function StepApproverFields({
  organizationID,
  value,
  onChange,
  includeBranchB = true,
}: StepApproverFieldsProps) {
  const { data: usersData } = useOrganizationUsers(organizationID, 1, 500);
  const users = useMemo(
    () =>
      (usersData?.data ?? [])
        .map(normalizeOrgUser)
        .filter((u): u is NonNullable<ReturnType<typeof normalizeOrgUser>> => u != null),
    [usersData],
  );

  const steps = useMemo(
    () =>
      APPROVAL_STEPS.filter(
        (s) => includeBranchB || !BRANCH_B_STEPS.has(s.key),
      ),
    [includeBranchB],
  );

  const [defaultsLoaded, setDefaultsLoaded] = useState(false);

  const loadDefaults = useCallback(async () => {
    try {
      const delegates = await listApprovalDelegates();
      const draft: StepAssignees = {};
      for (const step of steps) {
        const d = delegates.find((row) => row.stepKey === step.key);
        if (d?.userId) draft[step.key] = d.userId;
      }
      if (Object.keys(draft).length > 0) onChange(draft);
    } catch {
      /* ignore — user can pick manually */
    } finally {
      setDefaultsLoaded(true);
    }
  }, [onChange, steps]);

  useEffect(() => {
    if (!organizationID || defaultsLoaded) return;
    loadDefaults();
  }, [organizationID, defaultsLoaded, loadDefaults]);

  const usersByStep = useMemo(() => {
    const out: Record<string, typeof users> = {};
    for (const step of steps) {
      const maxRole = maxRoleForStep(step.key);
      out[step.key] = users.filter((u) => u.roleID > 0 && u.roleID <= maxRole);
    }
    return out;
  }, [steps, users]);

  return (
    <div className="space-y-3 rounded-lg border border-dashed p-4">
      <div>
        <p className="text-sm font-medium">ผู้อนุมัติแต่ละขั้น</p>
        <p className="text-muted-foreground text-xs">
          เลือกผู้อนุมัติสำหรับคำขอนี้ — ค่าเริ่มต้นจากการตั้งค่าหน่วยงาน แก้ไขได้ตามรายการ
        </p>
      </div>
      {steps.map((step, idx) => (
        <div key={step.key} className="space-y-2">
          <Label>
            ผู้อนุมัติขั้น {idx + 1}: {step.label}
            {BRANCH_B_STEPS.has(step.key) ? " (สาย B)" : ""}
          </Label>
          <Select
            value={value[step.key] ? String(value[step.key]) : ""}
            onValueChange={(v) =>
              onChange({ ...value, [step.key]: Number(v) })
            }
          >
            <SelectTrigger>
              <SelectValue placeholder={`เลือก${step.label}`} />
            </SelectTrigger>
            <SelectContent>
              {(usersByStep[step.key] ?? []).map((u) => (
                <SelectItem key={u.user.id} value={String(u.user.id)}>
                  {userDisplayName(u)}
                  {u.roleID ? ` (role ${u.roleID})` : ""}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      ))}
    </div>
  );
}

export function validateStepAssignees(
  assignees: StepAssignees,
  includeBranchB = true,
): string | null {
  for (const step of APPROVAL_STEPS) {
    if (!includeBranchB && BRANCH_B_STEPS.has(step.key)) continue;
    if (!assignees[step.key]) {
      return `กรุณาเลือก${step.label}`;
    }
  }
  return null;
}
