import { useEffect, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import {
  PersonalKpiCards,
  PersonalStatusChart,
  PersonalCategoryChart,
  PersonalAssetsTable,
} from "@/components/dashboard/personal";
import {
  getPersonalAssets,
  getPersonalCategory,
  getPersonalStatus,
  getPersonalSummary,
} from "@/lib/data-service";

export function PersonalDashboardPage() {
  const { user } = useAuth();
  const [summary, setSummary] = useState<Record<string, unknown> | null>(null);
  const [statusData, setStatusData] = useState<unknown[]>([]);
  const [categoryData, setCategoryData] = useState<unknown[]>([]);
  const [assets, setAssets] = useState<{ data: unknown[]; total: number }>({
    data: [],
    total: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      getPersonalSummary().then((s) => setSummary(s as Record<string, unknown>)),
      getPersonalStatus().then((s) => setStatusData((s as unknown[]) ?? [])),
      getPersonalCategory().then((c) => setCategoryData((c as unknown[]) ?? [])),
      getPersonalAssets(1, 10).then(setAssets),
    ]).finally(() => setLoading(false));
  }, []);

  if (loading) {
    return <div className="text-muted-foreground p-6">กำลังโหลด...</div>;
  }

  const kpi = {
    totalAssets: (summary?.ownedAssets as number) ?? 0,
    totalValue: (summary?.totalValue as number) ?? 0,
    pendingRepairs: 0,
    activeAssets: (summary?.ownedAssets as number) ?? 0,
  };

  return (
    <div className="flex flex-1 flex-col gap-4 p-4 md:p-6">
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-bold tracking-tight">รายงานส่วนตัว</h1>
        <p className="text-muted-foreground">
          ภาพรวมสินทรัพย์ที่ {user?.display_name} รับผิดชอบดูแล
        </p>
      </div>
      <PersonalKpiCards data={kpi} />
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <PersonalStatusChart
          data={statusData as never}
          onStatusClick={() => {}}
          selectedStatus={null}
        />
        <PersonalCategoryChart data={categoryData as never} />
      </div>
      <PersonalAssetsTable
        initialData={assets}
        selectedStatus={null}
      />
    </div>
  );
}
