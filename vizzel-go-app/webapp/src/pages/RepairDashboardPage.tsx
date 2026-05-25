import { useEffect, useState } from "react";
import {
  RepairKpiCards,
  RepairStatusChart,
  RepairMonthlyChart,
  RepairPendingTable,
} from "@/components/dashboard/repair";
import { apiRequest } from "@/lib/api";

type RepairDashboardData = {
  summary?: {
    pending?: number;
    completed?: number;
    inProgress?: number;
    cancelled?: number;
  };
  status?: unknown[];
  monthly?: unknown[];
  pendingRepairs?: { data: unknown[]; total: number };
};

export function RepairDashboardPage() {
  const [data, setData] = useState<RepairDashboardData | null>(null);

  useEffect(() => {
    apiRequest<{ data?: RepairDashboardData }>("/dashboard/repair/initial-data")
      .then((res) => setData(res.data ?? (res as RepairDashboardData)))
      .catch(() => setData(null));
  }, []);

  const summary = data?.summary ?? {
    pending: (data as { pending?: number })?.pending ?? 0,
    completed: 0,
    inProgress: 0,
    cancelled: 0,
  };

  return (
    <div className="flex flex-1 flex-col gap-4 p-4 md:p-6">
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-bold tracking-tight">รายงานการซ่อมบำรุง</h1>
        <p className="text-muted-foreground">ภาพรวมงานแจ้งซ่อมและสถานะดำเนินการ</p>
      </div>
      <RepairKpiCards data={summary} />
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <RepairStatusChart data={summary} />
        <RepairMonthlyChart data={(data?.monthly ?? []) as never} />
      </div>
      <RepairPendingTable
        initialData={
          (data?.pendingRepairs as { data: unknown[]; total: number }) ?? {
            data: [],
            total: 0,
          }
        }
      />
    </div>
  );
}
