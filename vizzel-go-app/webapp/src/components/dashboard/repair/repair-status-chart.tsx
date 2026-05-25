'use client';

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from '@/components/ui/chart';
import { Pie, PieChart, Cell } from 'recharts';
import { PieChart as PieChartIcon } from 'lucide-react';

interface RepairStatusChartProps {
  data?: {
    pending: number;
    completed: number;
  } | null;
}

const chartConfig = {
  value: {
    label: 'จำนวน',
  },
  pending: {
    label: 'รอซ่อม',
    color: 'var(--chart-1)',
  },
  completed: {
    label: 'ซ่อมเสร็จ',
    color: 'var(--chart-2)',
  },
} satisfies ChartConfig;

export function RepairStatusChart({ data }: RepairStatusChartProps) {
  const pending = data?.pending ?? 0;
  const completed = data?.completed ?? 0;
  const hasData = pending > 0 || completed > 0;

  const pieData = [
    { name: 'รอซ่อม', value: pending, fill: 'var(--chart-1)' },
    { name: 'ซ่อมเสร็จ', value: completed, fill: 'var(--chart-2)' },
  ];

  return (
    <Card className="flex flex-col">
      <CardHeader>
        <CardTitle>สัดส่วนสถานะการซ่อม</CardTitle>
        <CardDescription>เปรียบเทียบจำนวนรอซ่อมและซ่อมเสร็จ</CardDescription>
      </CardHeader>
      <CardContent className="flex min-h-[300px] flex-1 flex-col items-center justify-center">
        {hasData ? (
          <>
            <ChartContainer
              config={chartConfig}
              className="mx-auto aspect-square max-h-[300px] w-full"
            >
              <PieChart>
                <ChartTooltip
                  cursor={false}
                  content={<ChartTooltipContent hideLabel />}
                />
                <Pie
                  data={pieData}
                  dataKey="value"
                  nameKey="name"
                  innerRadius={60}
                  strokeWidth={5}
                >
                  {pieData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.fill} />
                  ))}
                </Pie>
              </PieChart>
            </ChartContainer>
            <div className="mt-4 flex justify-center gap-6">
              <div className="flex items-center gap-2">
                <div className="h-3 w-3 rounded-full bg-[var(--chart-1)]" />
                <span className="text-sm">รอซ่อม ({pending})</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="h-3 w-3 rounded-full bg-[var(--chart-2)]" />
                <span className="text-sm">ซ่อมเสร็จ ({completed})</span>
              </div>
            </div>
          </>
        ) : (
          <div className="text-muted-foreground flex flex-col items-center justify-center gap-2 opacity-50">
            <PieChartIcon className="h-12 w-12" />
            <p>ไม่พบข้อมูลการแจ้งซ่อม</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
