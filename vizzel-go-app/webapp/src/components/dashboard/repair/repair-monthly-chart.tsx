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
import { Bar, BarChart, XAxis, YAxis } from 'recharts';
import { BarChart3 } from 'lucide-react';

interface RepairMonthlyChartProps {
  data?: Array<{
    month: string;
    count: number;
  }> | null;
}

const chartConfig = {
  count: {
    label: 'จำนวน',
    color: 'var(--chart-3)',
  },
} satisfies ChartConfig;

export function RepairMonthlyChart({ data }: RepairMonthlyChartProps) {
  const chartData = data ?? [];
  const hasData = chartData.length > 0 && chartData.some((i) => i.count > 0);

  return (
    <Card className="flex flex-col">
      <CardHeader>
        <CardTitle>จำนวนแจ้งซ่อมรายเดือน</CardTitle>
        <CardDescription>สถิติ 6 เดือนล่าสุด</CardDescription>
      </CardHeader>
      <CardContent className="flex min-h-[300px] flex-1 flex-col items-center justify-center">
        {hasData ? (
          <ChartContainer config={chartConfig} className="h-[300px] w-full">
            <BarChart data={chartData} accessibilityLayer>
              <XAxis
                dataKey="month"
                tickLine={false}
                tickMargin={10}
                axisLine={false}
              />
              <YAxis tickLine={false} tickMargin={10} axisLine={false} />
              <ChartTooltip cursor={false} content={<ChartTooltipContent />} />
              <Bar
                dataKey="count"
                fill="var(--chart-3)"
                radius={[4, 4, 0, 0]}
              />
            </BarChart>
          </ChartContainer>
        ) : (
          <div className="text-muted-foreground flex flex-col items-center justify-center gap-2 opacity-50">
            <BarChart3 className="h-12 w-12" />
            <p>ไม่พบข้อมูลรายเดือน</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
