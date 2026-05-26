"use client";

import * as React from "react";
import {
  Card,
  CardAction,
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { Bar, BarChart, CartesianGrid, XAxis, YAxis, Pie, PieChart, Cell } from "recharts";
import { PieChart as PieChartIcon } from "lucide-react";
import { formatLocaleNumber } from "@/lib/safe-format";

interface PersonalStatusChartProps {
  data?: Array<{
    name: string;
    value: number;
    fill: string;
  }> | null;
  onStatusClick?: (statusName: string) => void;
  selectedStatus?: string | null;
}

const chartConfig = {
  value: {
    label: "จำนวน",
  },
  active: {
    label: "ใช้งานปกติ",
    color: "var(--chart-2)",
  },
  repair: {
    label: "รอซ่อม",
    color: "var(--chart-1)",
  },
  inactive: {
    label: "ไม่ใช้งาน",
    color: "var(--chart-4)",
  },
} satisfies ChartConfig;

export function PersonalStatusChart({
  data,
  onStatusClick,
  selectedStatus,
}: PersonalStatusChartProps) {
  const [chartType, setChartType] = React.useState<"donut" | "bar">("donut");
  const [mounted, setMounted] = React.useState(false);

  React.useEffect(() => {
    setMounted(true);
  }, []);

  const chartData = (data ?? []).map((item) => ({
    name: item.name ?? "ไม่ระบุ",
    value: Number(item.value) || 0,
    fill: item.fill ?? "var(--chart-2)",
  }));
  const hasData = chartData.some((item) => item.value > 0);

  const total = React.useMemo(
    () => chartData.reduce((sum, item) => sum + (Number(item.value) || 0), 0),
    [chartData],
  );

  if (!mounted) return null;

  return (
    <Card className="@container/card flex flex-col">
      <CardHeader>
        <CardTitle>สถานะสินทรัพย์ที่ดูแล</CardTitle>
        <CardDescription>
          สรุปจำนวนสินทรัพย์ทั้งหมด {formatLocaleNumber(total)} รายการ
        </CardDescription>
        <CardAction>
          <ToggleGroup
            type="single"
            value={chartType}
            onValueChange={(value) =>
              value && setChartType(value as "donut" | "bar")
            }
            variant="outline"
            className="hidden @md/card:flex"
          >
            <ToggleGroupItem value="donut">Donut Chart</ToggleGroupItem>
            <ToggleGroupItem value="bar">Bar Chart</ToggleGroupItem>
          </ToggleGroup>
          <Select
            value={chartType}
            onValueChange={(value) => setChartType(value as "donut" | "bar")}
          >
            <SelectTrigger className="w-full @md/card:hidden">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="donut">Donut Chart</SelectItem>
              <SelectItem value="bar">Bar Chart</SelectItem>
            </SelectContent>
          </Select>
        </CardAction>
      </CardHeader>
      <CardContent className="flex flex-1 flex-col items-center justify-center p-6">
        {hasData ? (
          <>
            <ChartContainer
              config={chartConfig}
              className="mx-auto aspect-square max-h-[300px] w-full"
            >
              {chartType === "donut" ? (
                <PieChart>
                  <ChartTooltip
                    cursor={false}
                    content={<ChartTooltipContent hideLabel />}
                  />
                  <Pie
                    data={chartData}
                    dataKey="value"
                    nameKey="name"
                    innerRadius={60}
                    strokeWidth={5}
                    onClick={(pieData) => {
                      if (onStatusClick && pieData.name) {
                        onStatusClick(pieData.name);
                      }
                    }}
                    className="cursor-pointer"
                  >
                    {chartData.map((entry, index) => (
                      <Cell
                        key={`cell-${index}`}
                        fill={entry.fill}
                        className="cursor-pointer transition-opacity hover:opacity-80"
                        opacity={
                          selectedStatus && selectedStatus !== entry.name
                            ? 0.3
                            : 1
                        }
                      />
                    ))}
                  </Pie>
                </PieChart>
              ) : (
                <BarChart data={chartData}>
                  <CartesianGrid vertical={false} strokeDasharray="3 3" />
                  <XAxis
                    dataKey="name"
                    tickLine={false}
                    axisLine={false}
                    tickMargin={8}
                    angle={-45}
                    textAnchor="end"
                    height={80}
                  />
                  <YAxis
                    tickLine={false}
                    axisLine={false}
                    tickMargin={8}
                    tickFormatter={(value) => formatLocaleNumber(value)}
                  />
                  <ChartTooltip
                    cursor={false}
                    content={
                      <ChartTooltipContent
                        indicator="dot"
                        formatter={(value, name, props) => {
                          const percentage = ((value as number) / total) * 100;
                          return [
                            `${value?.toLocaleString()} รายการ (${percentage.toFixed(1)}%)`,
                            props.payload.name,
                          ];
                        }}
                      />
                    }
                  />
                  <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                    {chartData.map((entry, index) => (
                      <Cell
                        key={`cell-${index}`}
                        fill={entry.fill}
                        opacity={
                          selectedStatus && selectedStatus !== entry.name
                            ? 0.3
                            : 1
                        }
                        onClick={() => onStatusClick?.(entry.name)}
                        className="cursor-pointer transition-opacity hover:opacity-80"
                      />
                    ))}
                  </Bar>
                </BarChart>
              )}
            </ChartContainer>
            <div className="mt-4 flex flex-wrap justify-center gap-x-6 gap-y-2">
              {chartData.map((item, index) => {
                const isSelected = selectedStatus === item.name;
                const isDimmed = selectedStatus && !isSelected;

                return (
                  <div
                    key={index}
                    className={`flex cursor-pointer items-center gap-2 transition-opacity ${
                      isDimmed ? "opacity-30" : "opacity-100"
                    }`}
                    onClick={() => onStatusClick?.(item.name)}
                  >
                    <div
                      className="h-2.5 w-2.5 rounded-full"
                      style={{ backgroundColor: item.fill }}
                    />
                    <span
                      className={`text-xs ${
                        isSelected
                          ? "font-bold text-foreground"
                          : "text-muted-foreground"
                      }`}
                    >
                      {item.name} ({item.value})
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
