import { useEffect, useState } from "react";
import { apiRequest } from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { StatusBars } from "@/components/charts/BarChart";

type Stats = {
  org_count: number;
  user_count: number;
  asset_count: number;
  top_orgs: { name: string; count: number }[];
};

export function SuperAdminDashboardPage() {
  const [s, setS] = useState<Stats | null>(null);

  useEffect(() => {
    apiRequest<Stats>("/api/v1/super-admin/stats").then(setS).catch(() => setS(null));
  }, []);

  return (
    <div className="space-y-4">
      <p className="text-muted-foreground text-sm">Super Admin — ภาพรวมแพลตฟอร์ม</p>
      <div className="grid gap-4 md:grid-cols-3">
        {[
          { label: "องค์กร", value: s?.org_count },
          { label: "ผู้ใช้", value: s?.user_count },
          { label: "สินทรัพย์ทั้งหมด", value: s?.asset_count },
        ].map((c) => (
          <Card key={c.label}>
            <CardHeader>
              <CardTitle className="text-base">{c.label}</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-semibold">{c.value ?? "—"}</p>
            </CardContent>
          </Card>
        ))}
      </div>
      <Card>
        <CardHeader>
          <CardTitle className="text-base">องค์กรที่มีสินทรัพย์มากสุด</CardTitle>
        </CardHeader>
        <CardContent>
          {s?.top_orgs?.length ? <StatusBars items={s.top_orgs} /> : <p className="text-muted-foreground text-sm">—</p>}
        </CardContent>
      </Card>
    </div>
  );
}
