'use client';

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
} from '@/components/ui/card';
import { Clock, CheckCircle2, Wrench, CalendarDays } from 'lucide-react';

interface RepairKpiCardsProps {
  data?: {
    pending: number;
    completed: number;
    total: number;
    thisMonth: number;
  } | null;
}

export function RepairKpiCards({ data }: RepairKpiCardsProps) {
  const pending = data?.pending ?? 0;
  const completed = data?.completed ?? 0;
  const total = data?.total ?? 0;
  const thisMonth = data?.thisMonth ?? 0;

  const currentMonth = new Date().toLocaleDateString('th-TH', {
    month: 'long',
    year: 'numeric',
  });

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardDescription>รอซ่อม</CardDescription>
          <Clock className="text-muted-foreground h-4 w-4" />
        </CardHeader>
        <CardContent>
          <div className="text-3xl font-bold">{pending}</div>
          <p className="text-muted-foreground mt-1 text-xs">
            รายการที่รอดำเนินการ
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardDescription>ซ่อมเสร็จแล้ว</CardDescription>
          <CheckCircle2 className="text-muted-foreground h-4 w-4" />
        </CardHeader>
        <CardContent>
          <div className="font-bold0 text-3xl">{completed}</div>
          <p className="text-muted-foreground mt-1 text-xs">
            รายการที่ดำเนินการเสร็จ
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardDescription>แจ้งซ่อมทั้งหมด</CardDescription>
          <Wrench className="text-muted-foreground h-4 w-4" />
        </CardHeader>
        <CardContent>
          <div className="text-3xl font-bold">{total}</div>
          <p className="text-muted-foreground mt-1 text-xs">รวมทุกสถานะ</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardDescription>แจ้งซ่อมเดือนนี้</CardDescription>
          <CalendarDays className="text-muted-foreground h-4 w-4" />
        </CardHeader>
        <CardContent>
          <div className="text-3xl font-bold">{thisMonth}</div>
          <p className="text-muted-foreground mt-1 text-xs">{currentMonth}</p>
        </CardContent>
      </Card>
    </div>
  );
}
