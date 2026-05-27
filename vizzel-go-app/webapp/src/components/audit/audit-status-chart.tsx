"use client";

import * as React from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  LabelList,
  Pie,
  PieChart,
  XAxis,
  YAxis,
} from "recharts";
import { ClipboardList } from "lucide-react";
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
} from "@/components/ui/chart";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";

export type AuditStatusPoint = {
  status: string;
  value: number;
  label: string;
};

const COLORS = [
  "hsl(142.1 76.2% 36.3%)",
  "hsl(38.7 92% 50%)",
  "hsl(0 84.2% 60.2%)",
];

const chartConfig = {
  "ตรวจนับแล้ว": { label: "ตรวจนับแล้ว", color: COLORS[0] },
  "ยังไม่ตรวจนับ": { label: "ยังไม่ตรวจนับ", color: COLORS[1] },
  "ยังไม่พบ": { label: "ยังไม่พบ", color: COLORS[2] },
} satisfies ChartConfig;

const DEFAULT_DATA: AuditStatusPoint[] = [
  { status: "ตรวจนับแล้ว", value: 0, label: "ตรวจนับแล้ว" },
  { status: "ยังไม่ตรวจนับ", value: 0, label: "ยังไม่ตรวจนับ" },
  { status: "ยังไม่พบ", value: 0, label: "ยังไม่พบ" },
];

interface AuditStatusChartProps {
  data?: AuditStatusPoint[] | null;
}

export function AuditStatusChart({ data }: AuditStatusChartProps) {
  const [chartType, setChartType] = React.useState<"donut" | "bar">("donut");
  const [mounted, setMounted] = React.useState(false);

  React.useEffect(() => {
    setMounted(true);
  }, []);

  const chartData =
    Array.isArray(data) && data.length > 0 ? data : DEFAULT_DATA;
  const total = chartData.reduce((sum, item) => sum + (item.value || 0), 0);

  if (!mounted) return null;

  return (
    <Card className="@container/card">
      <CardHeader>
        <CardTitle>กราฟสรุปสถานะการตรวจนับ</CardTitle>
        <CardDescription>
          สรุปจำนวนสินทรัพย์ทั้งหมด {total.toLocaleString()} รายการ
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
      <CardContent className="px-2 pt-4 sm:px-6 sm:pt-6">
        {total === 0 ? (
          <div className="flex h-[300px] w-full flex-col items-center justify-center rounded-xl border border-dashed border-gray-200 bg-gray-50/50">
            <div className="bg-primary/5 mb-2 rounded-full p-3">
              <ClipboardList className="text-primary/40 h-8 w-8" />
            </div>
            <p className="text-muted-foreground font-medium">
              ยังไม่มีข้อมูลการตรวจนับ
            </p>
            <p className="text-muted-foreground/60 text-sm">
              ข้อมูลจะปรากฏเมื่อเริ่มงานตรวจนับและมีการสแกนสินทรัพย์
            </p>
          </div>
        ) : (
          <ChartContainer
            config={chartConfig}
            className="aspect-auto h-[300px] w-full"
          >
            {chartType === "donut" ? (
              <PieChart>
                <ChartTooltip
                  content={({ active, payload }) => {
                    if (!active || !payload?.length) return null;
                    const d = payload[0];
                    const pct = total
                      ? ((d.value as number) / total) * 100
                      : 0;
                    return (
                      <div className="bg-background rounded-lg border p-2 shadow-sm">
                        <div className="flex items-center gap-2">
                          <div
                            className="h-2.5 w-2.5 rounded-full"
                            style={{
                              backgroundColor: (
                                d.payload as { fill?: string }
                              ).fill,
                            }}
                          />
                          <span className="text-sm font-medium">
                            {d.payload.label}
                          </span>
                        </div>
                        <div className="flex items-baseline gap-2">
                          <span className="text-2xl font-bold">
                            {Number(d.value ?? 0).toLocaleString()}
                          </span>
                          <span className="text-muted-foreground text-xs">
                            รายการ ({pct.toFixed(1)}%)
                          </span>
                        </div>
                      </div>
                    );
                  }}
                />
                <Pie
                  data={chartData}
                  dataKey="value"
                  nameKey="label"
                  cx="50%"
                  cy="50%"
                  outerRadius={100}
                  innerRadius={60}
                  label={({ value }) =>
                    value > 0 ? Number(value).toLocaleString() : ""
                  }
                  labelLine={false}
                >
                  {chartData.map((_, idx) => (
                    <Cell key={idx} fill={COLORS[idx % COLORS.length]} />
                  ))}
                </Pie>
              </PieChart>
            ) : (
              <BarChart
                data={chartData}
                layout="vertical"
                margin={{ left: 0, right: 32, top: 8, bottom: 8 }}
              >
                <CartesianGrid horizontal={false} />
                <XAxis type="number" hide />
                <YAxis
                  dataKey="label"
                  type="category"
                  tickLine={false}
                  axisLine={false}
                  tickMargin={8}
                  width={120}
                />
                <ChartTooltip
                  cursor={false}
                  content={({ active, payload }) => {
                    if (!active || !payload?.length) return null;
                    const d = payload[0];
                    const pct = total
                      ? ((d.value as number) / total) * 100
                      : 0;
                    return (
                      <div className="bg-background rounded-lg border p-2 shadow-sm">
                        <span className="text-sm font-medium">
                          {d.payload.label}
                        </span>
                        <div className="flex items-baseline gap-2">
                          <span className="text-2xl font-bold">
                            {Number(d.value ?? 0).toLocaleString()}
                          </span>
                          <span className="text-muted-foreground text-xs">
                            รายการ ({pct.toFixed(1)}%)
                          </span>
                        </div>
                      </div>
                    );
                  }}
                />
                <Bar dataKey="value" radius={[0, 4, 4, 0]}>
                  {chartData.map((_, idx) => (
                    <Cell key={idx} fill={COLORS[idx % COLORS.length]} />
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
            )}
          </ChartContainer>
        )}
      </CardContent>
    </Card>
  );
}
