import { useEffect, useState } from "react";
import { apiRequest } from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { SimpleBarChart } from "@/components/charts/BarChart";
import { DataTable } from "@/components/data/DataTable";
import type { ListRow } from "@/lib/api";

export function RepairDashboardPage() {
  const [data, setData] = useState<{
    pending: number;
    repairs: ListRow[];
    monthly: { month: string; count: number }[];
  } | null>(null);

  useEffect(() => {
    apiRequest("/dashboard/repair/initial-data").then(setData).catch(() => setData(null));
  }, []);

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">รอดำเนินการ</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-3xl font-semibold">{data?.pending ?? "—"}</p>
        </CardContent>
      </Card>
      {data?.monthly && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">แนวโน้มรายเดือน</CardTitle>
          </CardHeader>
          <CardContent>
            <SimpleBarChart
              labels={data.monthly.map((m) => m.month)}
              values={data.monthly.map((m) => m.count)}
            />
          </CardContent>
        </Card>
      )}
      <Card>
        <CardHeader>
          <CardTitle>รายการซ่อม</CardTitle>
        </CardHeader>
        <CardContent>
          <DataTable
            columns={[
              { key: "title", label: "เลขครุภัณฑ์" },
              { key: "subtitle", label: "รายละเอียด" },
              { key: "status", label: "สถานะ" },
            ]}
            rows={data?.repairs ?? []}
          />
        </CardContent>
      </Card>
    </div>
  );
}
