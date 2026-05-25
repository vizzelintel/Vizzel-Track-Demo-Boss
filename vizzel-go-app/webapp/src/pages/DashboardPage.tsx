import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { apiRequest, type DashboardExtended } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { SimpleBarChart, StatusBars } from "@/components/charts/BarChart";

type Summary = {
  asset_count: number;
  user_count: number;
  audit_ongoing: number;
  repair_pending: number;
  withdrawal_pending: number;
};

export function DashboardPage() {
  const { user } = useAuth();
  const [s, setS] = useState<Summary | null>(null);
  const [ext, setExt] = useState<DashboardExtended | null>(null);

  useEffect(() => {
    apiRequest<Summary>("/api/v1/dashboard/summary").then(setS).catch(() => setS(null));
    apiRequest<DashboardExtended>("/api/v1/dashboard/extended").then(setExt).catch(() => setExt(null));
  }, []);

  const kpi = ext
    ? [
        { label: "มูลค่าสินทรัพย์รวม", value: `฿${ext.total_asset_value.toLocaleString()}` },
        { label: "มูลค่าสุทธิ", value: `฿${ext.net_book_value.toLocaleString()}` },
        { label: "ค่าเสื่อมสะสม", value: `฿${ext.accumulated_depreciation.toLocaleString()}` },
        { label: "จำนวนสินทรัพย์", value: ext.total_assets },
        { label: "สินทรัพย์ใหม่ปีนี้", value: ext.new_assets_this_year },
        { label: "ตรวจนับ (กำลังทำ)", value: s?.audit_ongoing ?? "—" },
      ]
    : [
        { label: "สินทรัพย์", value: s?.asset_count ?? "—" },
        { label: "สมาชิก", value: s?.user_count ?? "—" },
        { label: "ตรวจนับ (กำลังทำ)", value: s?.audit_ongoing ?? "—" },
        { label: "ซ่อม (รอ)", value: s?.repair_pending ?? "—" },
        { label: "เบิก/ยืม (รอ)", value: s?.withdrawal_pending ?? "—" },
      ];

  return (
    <div className="space-y-6">
      <p className="text-muted-foreground text-sm">
        องค์กร: {user?.organization?.name} — แดชบอร์ดภาพรวม
      </p>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {kpi.map((c) => (
          <Card key={c.label}>
            <CardHeader>
              <CardTitle className="text-base">{c.label}</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-semibold tabular-nums">{c.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>
      {ext && (
        <div className="grid gap-4 lg:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">แนวโน้มจำนวนสินทรัพย์</CardTitle>
            </CardHeader>
            <CardContent>
              <SimpleBarChart labels={ext.trend.labels} values={ext.trend.values} />
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle className="text-base">สถานะสินทรัพย์</CardTitle>
            </CardHeader>
            <CardContent>
              <StatusBars items={ext.status_breakdown} />
              <Link to="/assets/list" className="text-primary mt-3 inline-block text-sm hover:underline">
                ดูรายการสินทรัพย์ →
              </Link>
            </CardContent>
          </Card>
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle className="text-base">ที่ตั้งสินทรัพย์</CardTitle>
            </CardHeader>
            <CardContent>
              <StatusBars items={ext.location_breakdown} />
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
