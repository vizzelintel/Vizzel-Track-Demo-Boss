import { useEffect, useState } from "react";
import { apiRequest, type Asset } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { StatusBars } from "@/components/charts/BarChart";
import { DataTable } from "@/components/data/DataTable";

type Personal = {
  owned_assets: number;
  total_value: number;
  status_breakdown: { name: string; count: number }[];
  recent_assets: Asset[];
};

export function PersonalDashboardPage() {
  const { user } = useAuth();
  const [d, setD] = useState<Personal | null>(null);

  useEffect(() => {
    apiRequest<Personal>("/api/v1/dashboard/personal").then(setD).catch(() => setD(null));
  }, []);

  return (
    <div className="space-y-4">
      <p className="text-muted-foreground text-sm">รายงานส่วนตัว — {user?.display_name}</p>
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">สินทรัพย์ที่ถือครอง</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-semibold">{d?.owned_assets ?? "—"} รายการ</p>
            <p className="text-muted-foreground text-sm">มูลค่า ฿{(d?.total_value ?? 0).toLocaleString()}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-base">สถานะ</CardTitle>
          </CardHeader>
          <CardContent>
            {d?.status_breakdown?.length ? (
              <StatusBars items={d.status_breakdown} />
            ) : (
              <p className="text-muted-foreground text-sm">ไม่มีข้อมูล</p>
            )}
          </CardContent>
        </Card>
      </div>
      <Card>
        <CardHeader>
          <CardTitle className="text-base">สินทรัพย์ล่าสุด</CardTitle>
        </CardHeader>
        <CardContent>
          <DataTable
            columns={[
              { key: "asset_number", label: "เลขที่" },
              { key: "asset_name", label: "ชื่อ" },
              { key: "asset_status_name", label: "สถานะ" },
            ]}
            rows={(d?.recent_assets ?? []).map((a) => ({ ...a, id: a.id }))}
          />
        </CardContent>
      </Card>
    </div>
  );
}
