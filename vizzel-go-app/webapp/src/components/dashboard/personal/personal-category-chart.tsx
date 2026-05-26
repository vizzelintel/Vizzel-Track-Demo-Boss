"use client";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
import { Bar, BarChart, XAxis, YAxis, Cell } from "recharts";
import { BarChart3 } from "lucide-react";
import { formatNumberCompact } from "@/lib/utils";
import { truncateLabel } from "@/lib/safe-format";

interface PersonalCategoryChartProps {
  data?: Array<{
    category: string;
    count: number;
    fill?: string;
  }> | null;
}

const chartConfig = {
  count: {
    label: "จำนวน",
    color: "var(--chart-3)",
  },
} satisfies ChartConfig;

export function PersonalCategoryChart({ data }: PersonalCategoryChartProps) {
  const chartData = data ?? [];
  const hasData = chartData.length > 0 && chartData.some((i) => i.count > 0);

  // Calculate dynamic height based on number of items (approx 50px per bar + padding)
  const defaultHeight = 300;
  const itemHeight = 60;
  const calculatedHeight = Math.max(chartData.length * itemHeight, 150);
  const chartHeight = hasData ? calculatedHeight : defaultHeight;

  return (
    <Card className="flex flex-col">
      <CardHeader>
        <CardTitle>สินทรัพย์แยกตามหมวดหมู่</CardTitle>
        <CardDescription>จำนวนสินทรัพย์ที่ดูแลแต่ละหมวดหมู่</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-1 flex-col items-center justify-center p-6">
        {hasData ? (
          <ChartContainer
            config={chartConfig}
            className="w-full"
            style={{ height: `${chartHeight}px` }}
          >
            <BarChart
              data={chartData}
              layout="vertical"
              margin={{
                left: -10,
                right: 20,
              }}
              accessibilityLayer
            >
              <XAxis
                type="number"
                tickLine={false}
                axisLine={true}
                tickFormatter={(value) => formatNumberCompact(value)}
              />
              <YAxis
                dataKey="category"
                type="category"
                tickLine={false}
                axisLine={false}
                width={110}
                tick={{ fontSize: 12 }}
                tickFormatter={(value) => truncateLabel(value, 15)}
              />
              <ChartTooltip cursor={false} content={<ChartTooltipContent />} />
              <Bar dataKey="count" radius={[0, 4, 4, 0]} barSize={32}>
                {chartData.map((entry, index) => (
                  <Cell
                    key={`cell-${index}`}
                    fill={entry.fill || "var(--chart-3)"}
                  />
                ))}
              </Bar>
            </BarChart>
          </ChartContainer>
        ) : (
          <div className="text-muted-foreground flex flex-col items-center justify-center gap-2 opacity-50">
            <BarChart3 className="h-12 w-12" />
            <p>ไม่พบข้อมูลหมวดหมู่</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
