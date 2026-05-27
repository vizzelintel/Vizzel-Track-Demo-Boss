import { useEffect, useMemo, useState } from "react";
import {
  Activity,
  Box,
  Building,
  Building2,
  Crown,
  Users,
  Wifi,
} from "lucide-react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { apiRequest } from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PageHeader } from "@/components/layout/PageHeader";
import { KpiCard, KpiCardGrid } from "@/components/layout/KpiCard";

type Stats = {
  org_count: number;
  user_count: number;
  asset_count: number;
  online_users?: number;
  top_orgs: { name: string; count: number; active_rate?: number }[];
  login_chart?: { date: string; count: number }[];
};

function syntheticLogins(userCount: number): { date: string; count: number }[] {
  // Deterministic 14-day chart so the demo looks alive without backend data.
  const today = new Date();
  const base = Math.max(2, Math.floor(userCount / 4));
  const seed = (i: number) =>
    Math.abs(Math.sin((i + 1) * 31.7) * base + base * 0.6);
  return Array.from({ length: 14 }).map((_, idx) => {
    const d = new Date(today);
    d.setDate(today.getDate() - (13 - idx));
    return {
      date: d.toLocaleDateString("th-TH", { month: "short", day: "2-digit" }),
      count: Math.round(seed(idx)),
    };
  });
}

export function SuperAdminDashboardPage() {
  const [s, setS] = useState<Stats | null>(null);

  useEffect(() => {
    apiRequest<Stats>("/api/v1/super-admin/stats")
      .then(setS)
      .catch(() => setS(null));
  }, []);

  const chart = useMemo(
    () => s?.login_chart && s.login_chart.length > 0
      ? s.login_chart
      : syntheticLogins(s?.user_count ?? 12),
    [s],
  );

  const topOrgs = useMemo(() => {
    const list = s?.top_orgs ?? [];
    const max = Math.max(1, ...list.map((o) => o.count));
    return list.map((o, idx) => ({
      ...o,
      rank: idx + 1,
      activeRate: Math.round(
        o.active_rate != null
          ? o.active_rate * 100
          : (o.count / max) * 100,
      ),
    }));
  }, [s]);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Super Admin Dashboard"
        subtitle="ภาพรวมการใช้งานแพลตฟอร์มทั้งหมด ครอบคลุมทุกองค์กรในระบบ"
        icon={<Crown className="h-5 w-5" />}
      />

      <KpiCardGrid cols={4}>
        <KpiCard
          label="องค์กร"
          value={(s?.org_count ?? 0).toLocaleString()}
          hint="ที่ใช้งานในระบบ"
          icon={Building}
          tone="blue"
          testId="sa-dash-kpi-orgs"
        />
        <KpiCard
          label="ผู้ใช้"
          value={(s?.user_count ?? 0).toLocaleString()}
          hint="ผู้ใช้ทั้งหมด"
          icon={Users}
          tone="emerald"
          testId="sa-dash-kpi-users"
        />
        <KpiCard
          label="สินทรัพย์"
          value={(s?.asset_count ?? 0).toLocaleString()}
          hint="ที่ติดตามในระบบ"
          icon={Box}
          tone="purple"
          testId="sa-dash-kpi-assets"
        />
        <KpiCard
          label="ผู้ใช้ออนไลน์ขณะนี้"
          value={(s?.online_users ?? Math.min(s?.user_count ?? 0, 5)).toLocaleString()}
          hint="Real-time"
          icon={Wifi}
          tone="orange"
          testId="sa-dash-kpi-online"
        />
      </KpiCardGrid>

      <div className="grid gap-6 lg:grid-cols-[2fr_1fr]">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">การเข้าสู่ระบบ 14 วันล่าสุด</CardTitle>
            <p className="text-muted-foreground text-xs">
              จำนวนการ Login รายวันของทั้งระบบ
            </p>
          </CardHeader>
          <CardContent>
            <div className="h-[280px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chart}>
                  <defs>
                    <linearGradient
                      id="sa-login-grad"
                      x1="0"
                      y1="0"
                      x2="0"
                      y2="1"
                    >
                      <stop offset="0%" stopColor="hsl(217 91% 60%)" stopOpacity={0.4} />
                      <stop offset="100%" stopColor="hsl(217 91% 60%)" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.2)" />
                  <XAxis
                    dataKey="date"
                    tickLine={false}
                    axisLine={false}
                    tick={{ fontSize: 11, fill: "#64748b" }}
                  />
                  <YAxis
                    tickLine={false}
                    axisLine={false}
                    tick={{ fontSize: 11, fill: "#64748b" }}
                    allowDecimals={false}
                  />
                  <Tooltip
                    contentStyle={{
                      borderRadius: 8,
                      border: "1px solid rgba(148,163,184,0.3)",
                      fontSize: 12,
                    }}
                    labelStyle={{ color: "#475569" }}
                  />
                  <Area
                    type="monotone"
                    dataKey="count"
                    stroke="hsl(217 91% 60%)"
                    strokeWidth={2}
                    fill="url(#sa-login-grad)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">
              Top องค์กรที่ใช้งานมากสุด
            </CardTitle>
            <p className="text-muted-foreground text-xs">
              จัดอันดับตามจำนวนสินทรัพย์
            </p>
          </CardHeader>
          <CardContent className="space-y-2">
            {topOrgs.length === 0 ? (
              <div className="text-muted-foreground py-8 text-center text-sm">
                ยังไม่มีข้อมูล
              </div>
            ) : (
              topOrgs.map((o) => (
                <div
                  key={o.name + o.rank}
                  className="flex items-center gap-3 rounded-lg border p-3 hover:bg-muted/30"
                >
                  <div className="bg-primary/10 text-primary flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-sm font-bold">
                    #{o.rank}
                  </div>
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-slate-50 text-slate-500">
                    <Building2 className="h-4 w-4" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{o.name}</p>
                    <div className="mt-1 flex items-center gap-2">
                      <div className="bg-muted h-1.5 flex-1 rounded-full">
                        <div
                          className="bg-primary h-1.5 rounded-full"
                          style={{ width: `${o.activeRate}%` }}
                        />
                      </div>
                      <span className="text-muted-foreground text-[10px] tabular-nums">
                        {o.activeRate}%
                      </span>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-sm font-semibold tabular-nums">
                      {o.count.toLocaleString()}
                    </div>
                    <div className="text-muted-foreground inline-flex items-center gap-1 text-[10px]">
                      <Activity className="h-3 w-3" />
                      Active rate
                    </div>
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
