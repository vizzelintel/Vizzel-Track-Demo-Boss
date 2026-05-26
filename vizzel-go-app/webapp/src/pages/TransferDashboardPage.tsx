"use client";

import { useEffect, useState } from "react";
import { getTransferDashboardStats, type TransferDashboardStats } from "@/lib/transfer";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowDownLeft, ArrowUpRight, CheckCircle2, Package } from "lucide-react";

function StatCard({
  title,
  value,
  icon: Icon,
}: {
  title: string;
  value: number;
  icon: React.ComponentType<{ className?: string }>;
}) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        <Icon className="text-muted-foreground size-4" />
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{value}</div>
      </CardContent>
    </Card>
  );
}

export function TransferDashboardPage() {
  const [stats, setStats] = useState<TransferDashboardStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getTransferDashboardStats()
      .then(setStats)
      .catch(() =>
        setStats({ pendingOutgoing: 0, pendingIncoming: 0, completed: 0, total: 0 }),
      )
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="text-muted-foreground flex flex-1 items-center justify-center p-8">
        กำลังโหลดภาพรวมโอนย้าย...
      </div>
    );
  }

  const s = stats ?? { pendingOutgoing: 0, pendingIncoming: 0, completed: 0, total: 0 };

  return (
    <div className="flex flex-1 flex-col gap-4 p-4 md:p-6">
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-bold tracking-tight">ภาพรวมโอนย้ายครุภัณฑ์</h1>
        <p className="text-muted-foreground text-sm">
          สถิติการโอนย้ายภายในและข้ามหน่วยงาน
        </p>
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard title="รอดำเนินการ (ส่งออก)" value={s.pendingOutgoing} icon={ArrowUpRight} />
        <StatCard title="รอรับโอน (เข้า)" value={s.pendingIncoming} icon={ArrowDownLeft} />
        <StatCard title="เสร็จสิ้น" value={s.completed} icon={CheckCircle2} />
        <StatCard title="ทั้งหมด" value={s.total} icon={Package} />
      </div>
    </div>
  );
}
