import { useEffect, useState } from "react";
import { apiRequest } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";

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

  useEffect(() => {
    apiRequest<Summary>("/api/v1/dashboard/summary").then(setS).catch(() => setS(null));
  }, []);

  const cards = [
    { label: "สินทรัพย์", value: s?.asset_count ?? "—" },
    { label: "สมาชิก", value: s?.user_count ?? "—" },
    { label: "ตรวจนับ (กำลังทำ)", value: s?.audit_ongoing ?? "—" },
    { label: "ซ่อม (รอดำเนินการ)", value: s?.repair_pending ?? "—" },
    { label: "เบิก/ยืม (รอ)", value: s?.withdrawal_pending ?? "—" },
  ];

  return (
    <div className="space-y-4">
      <p className="text-muted-foreground text-sm">
        องค์กร: {user?.organization?.name} — ภาพรวมระบบ (Demo ครบทุกโมดูล)
      </p>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {cards.map((c) => (
          <Card key={c.label}>
            <CardHeader>
              <CardTitle className="text-base">{c.label}</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-semibold">{c.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
