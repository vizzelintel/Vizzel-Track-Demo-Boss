"use client";

import { AlertCircle, Check, Percent, X } from "lucide-react";
import { KpiCard, KpiCardGrid } from "@/components/layout/KpiCard";

export interface AuditKpiData {
  checked: number;
  notChecked: number;
  checkRate: number;
  notFound: number;
}

interface AuditKpiSummaryProps {
  data?: AuditKpiData | null;
}

export function AuditKpiSummary({ data }: AuditKpiSummaryProps) {
  const stats: AuditKpiData = {
    checked: data?.checked ?? 0,
    notChecked: data?.notChecked ?? 0,
    checkRate: data?.checkRate ?? 0,
    notFound: data?.notFound ?? 0,
  };
  const total = stats.checked + stats.notChecked;

  return (
    <div className="px-4 lg:px-6">
      <KpiCardGrid cols={4}>
        <KpiCard
          label="ตรวจนับแล้ว"
          value={stats.checked.toLocaleString()}
          hint={`จากทั้งหมด ${total.toLocaleString()} รายการ`}
          icon={Check}
          tone="emerald"
          testId="audit-kpi-checked"
        />
        <KpiCard
          label="ยังไม่ได้ตรวจนับ"
          value={stats.notChecked.toLocaleString()}
          hint="ต้องดำเนินการตรวจนับ"
          icon={X}
          tone="orange"
          testId="audit-kpi-not-checked"
        />
        <KpiCard
          label="อัตราการตรวจนับ"
          value={`${stats.checkRate.toFixed(1)}%`}
          hint="ตรวจนับแล้ว / ทั้งหมด"
          icon={Percent}
          tone="blue"
          testId="audit-kpi-rate"
        />
        <KpiCard
          label='ที่ "ยังไม่พบ"'
          value={stats.notFound.toLocaleString()}
          hint="ต้องตรวจสอบเพิ่มเติม"
          icon={AlertCircle}
          tone="red"
          testId="audit-kpi-not-found"
        />
      </KpiCardGrid>
    </div>
  );
}
