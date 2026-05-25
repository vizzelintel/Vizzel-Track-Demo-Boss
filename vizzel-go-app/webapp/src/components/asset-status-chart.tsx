"use client";

import * as React from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  LabelList,
  XAxis,
  YAxis,
} from "recharts";
import { useRouter } from "next/navigation";
import { PieChart as PieChartIcon } from "lucide-react";

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

import { STATUS_ORDER } from "@/lib/constants";

const chartConfig = {
  value: {
    label: "จำนวน",
  },
} satisfies ChartConfig;

interface AssetStatusChartProps {
  data?: Array<{ status: string; value: number; label: string }> | null;
}

export function AssetStatusChart({ data }: AssetStatusChartProps) {
  const router = useRouter();
  const [selectedStatus, setSelectedStatus] = React.useState<string | null>(
    null,
  );
  const [mounted, setMounted] = React.useState(false);

  React.useEffect(() => {
    setMounted(true);
  }, []);

  const handleStatusClick = (statusName: string) => {
    router.push(`/assets/list?status=${encodeURIComponent(statusName)}`);
  };

  const chartData = React.useMemo(() => {
    const rawData = data ?? [];
    const map = new Map<
      string,
      { status: string; value: number; label: string; fill: string }
    >();

    rawData.forEach((item) => {
      const key = item.status || "unknown";
      const displayLabel = item.label || key;

      if (map.has(key)) {
        const existing = map.get(key)!;
        existing.value += item.value;
      } else {
        map.set(key, {
          ...item,
          status: key,
          label: displayLabel,
          fill: "transparent",
        });
      }
    });

    const sorted = Array.from(map.values()).sort((a, b) => {
      const indexA = STATUS_ORDER.indexOf(a.label);
      const indexB = STATUS_ORDER.indexOf(b.label);

      const finalIndexA = indexA === -1 ? 999 : indexA;
      const finalIndexB = indexB === -1 ? 999 : indexB;

      if (finalIndexA !== finalIndexB) {
        return finalIndexA - finalIndexB;
      }

      return b.value - a.value;
    });

    const totalItems = sorted.length;
    return sorted.map((item, index) => {
      const minL = 30;
      const maxL = 75;
      const step = totalItems > 1 ? (maxL - minL) / (totalItems - 1) : 0;
      const lightness = minL + step * index;

      return {
        ...item,
        fill: `hsl(215, 90%, ${lightness}%)`,
      };
    });
  }, [data]);

  const total = React.useMemo(
    () => chartData.reduce((sum, item) => sum + item.value, 0),
    [chartData],
  );

  const hasData = chartData.some((item) => item.value > 0);

  const chartHeight = Math.max(280, chartData.length * 44 + 40);

  if (!mounted) return null;

  return (
    <Card className="@container/card flex flex-col">
      <CardHeader>
        <CardTitle>ข้อมูลสินทรัพย์แบ่งตามสถานะ</CardTitle>
        <CardDescription>
          สรุปจำนวนสินทรัพย์ทั้งหมด {total.toLocaleString()} รายการ
          {chartData.length > 0 && ` จาก ${chartData.length} สถานะ`}
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-1 flex-col items-stretch justify-center p-6">
        {hasData ? (
          <>
            <ChartContainer
              config={chartConfig}
              className="w-full"
              style={{ height: chartHeight }}
            >
              <BarChart
                data={chartData}
                layout="vertical"
                margin={{ left: 0, right: 56, top: 8, bottom: 8 }}
              >
                <CartesianGrid horizontal={false} strokeDasharray="3 3" />
                <XAxis
                  type="number"
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={(value) => value.toLocaleString()}
                />
                <YAxis
                  dataKey="label"
                  type="category"
                  tickLine={false}
                  axisLine={false}
                  tickMargin={8}
                  width={140}
                  interval={0}
                />
                <ChartTooltip
                  cursor={{ fill: "hsl(215 90% 50% / 0.06)" }}
                  content={
                    <ChartTooltipContent
                      indicator="dot"
                      formatter={(value, name, props) => {
                        const percentage =
                          total > 0 ? ((value as number) / total) * 100 : 0;
                        return [
                          `${value?.toLocaleString()} รายการ (${percentage.toFixed(1)}%)`,
                          props.payload.label,
                        ];
                      }}
                    />
                  }
                />
                <Bar dataKey="value" radius={[0, 4, 4, 0]}>
                  {chartData.map((entry, index) => (
                    <Cell
                      key={`cell-${index}`}
                      fill={entry.fill}
                      opacity={
                        selectedStatus && selectedStatus !== entry.status
                          ? 0.3
                          : 1
                      }
                      onClick={() => handleStatusClick(entry.status)}
                      className="cursor-pointer transition-opacity hover:opacity-80"
                    />
                  ))}
                  <LabelList
                    dataKey="value"
                    position="right"
                    className="fill-foreground text-sm font-semibold"
                    formatter={(value: number) =>
                      (value ?? 0).toLocaleString()
                    }
                  />
                </Bar>
              </BarChart>
            </ChartContainer>

            <div className="mt-4 flex flex-wrap justify-center gap-x-6 gap-y-2">
              {chartData.map((item, index) => {
                const isSelected = selectedStatus === item.status;
                const isDimmed = selectedStatus && !isSelected;

                return (
                  <div
                    key={index}
                    className={`flex cursor-pointer items-center gap-2 transition-opacity ${
                      isDimmed ? "opacity-30" : "opacity-100"
                    }`}
                    onClick={() => handleStatusClick(item.status)}
                    onMouseEnter={() => setSelectedStatus(item.status)}
                    onMouseLeave={() => setSelectedStatus(null)}
                  >
                    <div
                      className="h-2.5 w-2.5 rounded-full"
                      style={{ backgroundColor: item.fill }}
                    />
                    <span
                      className={`text-xs ${
                        isSelected
                          ? "text-foreground font-bold"
                          : "text-muted-foreground"
                      }`}
                    >
                      {item.label} ({item.value.toLocaleString()})
                    </span>
                  </div>
                );
              })}
            </div>
          </>
        ) : (
          <div className="flex h-[300px] w-full flex-col items-center justify-center rounded-xl border border-dashed border-gray-200 bg-gray-50/50">
            <div className="bg-primary/5 mb-2 rounded-full p-3">
              <PieChartIcon className="text-primary/40 h-8 w-8" />
            </div>
            <p className="text-muted-foreground font-medium">
              ไม่พบข้อมูลสินทรัพย์
            </p>
            <p className="text-muted-foreground/60 text-sm">
              ยังไม่มีการบันทึกสถานะของสินทรัพย์ในระบบ
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
