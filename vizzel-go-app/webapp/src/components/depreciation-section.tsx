"use client";

import * as React from "react";
import useSWR from "swr";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  XAxis,
  YAxis,
} from "recharts";
import { Loader2, TrendingDown } from "lucide-react";

import { apiRequest } from "@/lib/api";
import { formatCurrencyCompact } from "@/lib/utils";
import type { DepreciationRange } from "@/lib/data-service";

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
  ChartLegend,
  ChartLegendContent,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";

const chartConfig = {
  depreciation: {
    label: "ค่าเสื่อมราคา",
    color: "hsl(221.2 83.2% 53.3%)",
  },
  accumulated: {
    label: "ค่าเสื่อมราคาสะสม",
    color: "hsl(142.1 76.2% 36.3%)",
  },
} satisfies ChartConfig;

type RangeOptionId = DepreciationRange;

interface RangeOption {
  id: RangeOptionId;
  label: string;
  granularity: "month" | "year";
  granularityLabel: string;
}

const RANGE_OPTIONS: RangeOption[] = [
  {
    id: "1m",
    label: "1 เดือน",
    granularity: "month",
    granularityLabel: "รายเดือน",
  },
  {
    id: "3m",
    label: "3 เดือน",
    granularity: "month",
    granularityLabel: "รายเดือน",
  },
  {
    id: "1y",
    label: "1 ปี",
    granularity: "month",
    granularityLabel: "รายเดือน",
  },
  {
    id: "3y",
    label: "3 ปี",
    granularity: "year",
    granularityLabel: "รายปี",
  },
  {
    id: "5y",
    label: "5 ปี",
    granularity: "year",
    granularityLabel: "รายปี",
  },
  {
    id: "10y",
    label: "10 ปี",
    granularity: "year",
    granularityLabel: "รายปี",
  },
  {
    id: "all",
    label: "ทั้งหมด",
    granularity: "year",
    granularityLabel: "รายปี",
  },
];

const DEFAULT_RANGE_ID: RangeOptionId = "3y";

type DepreciationPoint = {
  date?: string;
  year: string;
  granularity?: "month" | "year";
  depreciation: number;
  accumulated: number;
};

interface DepreciationSectionProps {
  organizationID?: number | null;
  data?: DepreciationPoint[] | null;
  initialRangeId?: RangeOptionId;
}

function toBuddhistYear(year: number): number {
  return year + 543;
}

function formatTickLabel(
  item: DepreciationPoint | undefined,
  granularity: "month" | "year",
): string {
  if (!item) return "";
  if (granularity === "month" && item.date) {
    const d = new Date(item.date);
    const monthShort = d.toLocaleDateString("th-TH", { month: "short" });
    const yearBE = toBuddhistYear(d.getFullYear());
    return `${monthShort} ${yearBE}`;
  }
  return `ปี ${toBuddhistYear(Number(item.year))}`;
}

function formatFullPeriodLabel(
  item: DepreciationPoint | undefined,
  granularity: "month" | "year",
): string {
  if (!item) return "";
  if (granularity === "month" && item.date) {
    const d = new Date(item.date);
    return `เดือน ${d.toLocaleDateString("th-TH", {
      month: "long",
      year: "numeric",
    })}`;
  }
  return `ปี ${toBuddhistYear(Number(item.year))}`;
}

export function DepreciationSection({
  organizationID,
  data,
  initialRangeId = DEFAULT_RANGE_ID,
}: DepreciationSectionProps) {
  const [rangeId, setRangeId] = React.useState<RangeOptionId>(initialRangeId);
  const [viewMode, setViewMode] = React.useState<"table" | "chart">("chart");
  const [chartType, setChartType] = React.useState<"area" | "bar">("area");
  const [mounted, setMounted] = React.useState(false);

  React.useEffect(() => {
    setMounted(true);
  }, []);

  const activeOption = React.useMemo(
    () =>
      RANGE_OPTIONS.find((o) => o.id === rangeId) ??
      RANGE_OPTIONS.find((o) => o.id === DEFAULT_RANGE_ID) ??
      RANGE_OPTIONS[3],
    [rangeId],
  );

  const swrKey = organizationID
    ? `/dashboard/depreciation/${organizationID}?range=${activeOption.id}`
    : null;

  const useFallback =
    rangeId === initialRangeId && Array.isArray(data) && data.length > 0;

  const { data: res, isLoading } = useSWR(
    swrKey,
    (url) => apiRequest(url),
    {
      fallbackData: useFallback ? { data } : undefined,
      revalidateOnFocus: false,
      keepPreviousData: true,
    },
  );

  const chartData: DepreciationPoint[] = React.useMemo(() => {
    const list = res?.data ?? (useFallback ? data : []) ?? [];
    return Array.isArray(list) ? list : [];
  }, [res, data, useFallback]);

  const isEmptyData =
    chartData.length === 0 ||
    chartData.every(
      (item) => item.depreciation === 0 && item.accumulated === 0,
    );

  const rangeDescription = (() => {
    if (chartData.length === 0) {
      return `ยังไม่มีข้อมูลช่วง ${activeOption.label}`;
    }
    const first = chartData[0];
    const last = chartData[chartData.length - 1];
    const firstLabel = formatFullPeriodLabel(first, activeOption.granularity);
    const lastLabel = formatFullPeriodLabel(last, activeOption.granularity);
    if (firstLabel === lastLabel) {
      return `${activeOption.label} · ${activeOption.granularityLabel} (${firstLabel})`;
    }
    return `${activeOption.label} · ${activeOption.granularityLabel} (${firstLabel} → ${lastLabel})`;
  })();

  if (!mounted) return null;

  return (
    <div className="flex flex-col gap-4 px-4 lg:px-6">
      <Card className="@container/card">
        <CardHeader className="flex flex-col gap-3">
          <div className="flex flex-col gap-1">
            <CardTitle className="flex items-center gap-2">
              ค่าเสื่อมราคาย้อนหลัง
              {isLoading && (
                <Loader2 className="text-muted-foreground h-4 w-4 animate-spin" />
              )}
            </CardTitle>
            <CardDescription>{rangeDescription}</CardDescription>
          </div>
          <CardAction className="flex flex-col items-end gap-2 @md/card:flex-row @md/card:items-center">
            <Select
              value={rangeId}
              onValueChange={(v) => setRangeId(v as RangeOptionId)}
            >
              <SelectTrigger className="h-9 w-full min-w-[180px] @md/card:w-[200px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {RANGE_OPTIONS.map((opt) => (
                  <SelectItem key={opt.id} value={opt.id}>
                    {opt.label}
                    <span className="text-muted-foreground ml-2 text-xs">
                      · {opt.granularityLabel}
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {!isEmptyData && (
              <>
                <ToggleGroup
                  type="single"
                  value={viewMode}
                  onValueChange={(value) =>
                    value && setViewMode(value as "table" | "chart")
                  }
                  variant="outline"
                  size="sm"
                  className="hidden @md/card:flex"
                >
                  <ToggleGroupItem value="chart">กราฟ</ToggleGroupItem>
                  <ToggleGroupItem value="table">ตาราง</ToggleGroupItem>
                </ToggleGroup>
                {viewMode === "chart" && (
                  <ToggleGroup
                    type="single"
                    value={chartType}
                    onValueChange={(value) =>
                      value && setChartType(value as "area" | "bar")
                    }
                    variant="outline"
                    size="sm"
                    className="hidden @md/card:flex"
                  >
                    <ToggleGroupItem value="area">Area</ToggleGroupItem>
                    <ToggleGroupItem value="bar">Bar</ToggleGroupItem>
                  </ToggleGroup>
                )}
                <Select
                  value={viewMode}
                  onValueChange={(value) =>
                    setViewMode(value as "table" | "chart")
                  }
                >
                  <SelectTrigger className="h-9 w-full @md/card:hidden">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="chart">แสดงกราฟ</SelectItem>
                    <SelectItem value="table">แสดงตาราง</SelectItem>
                  </SelectContent>
                </Select>
                {viewMode === "chart" && (
                  <Select
                    value={chartType}
                    onValueChange={(value) =>
                      setChartType(value as "area" | "bar")
                    }
                  >
                    <SelectTrigger className="h-9 w-full @md/card:hidden">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="area">Area Chart</SelectItem>
                      <SelectItem value="bar">Bar Chart</SelectItem>
                    </SelectContent>
                  </Select>
                )}
              </>
            )}
          </CardAction>
        </CardHeader>
        <CardContent>
          {isEmptyData ? (
            <div className="flex h-[300px] w-full flex-col items-center justify-center rounded-xl border border-dashed border-gray-200 bg-gray-50/50">
              <div className="bg-primary/5 mb-2 rounded-full p-3">
                <TrendingDown className="text-primary/40 h-8 w-8" />
              </div>
              <p className="text-muted-foreground font-medium">
                ยังไม่มีข้อมูลค่าเสื่อมราคา
              </p>
              <p className="text-muted-foreground/60 text-sm">
                ข้อมูลจะปรากฏเมื่อมีการบันทึกราคาทุนและอายุการใช้งานของสินทรัพย์
              </p>
            </div>
          ) : viewMode === "chart" ? (
            <div className="space-y-4">
              <ChartContainer
                config={chartConfig}
                className="aspect-auto h-[300px] w-full"
              >
                {chartType === "area" ? (
                  <AreaChart data={chartData}>
                    <defs>
                      <linearGradient
                        id="fillDepreciation"
                        x1="0"
                        y1="0"
                        x2="0"
                        y2="1"
                      >
                        <stop
                          offset="5%"
                          stopColor="var(--color-depreciation)"
                          stopOpacity={0.8}
                        />
                        <stop
                          offset="95%"
                          stopColor="var(--color-depreciation)"
                          stopOpacity={0.1}
                        />
                      </linearGradient>
                      <linearGradient
                        id="fillAccumulated"
                        x1="0"
                        y1="0"
                        x2="0"
                        y2="1"
                      >
                        <stop
                          offset="5%"
                          stopColor="var(--color-accumulated)"
                          stopOpacity={0.6}
                        />
                        <stop
                          offset="95%"
                          stopColor="var(--color-accumulated)"
                          stopOpacity={0.1}
                        />
                      </linearGradient>
                    </defs>
                    <CartesianGrid vertical={false} />
                    <XAxis
                      dataKey="year"
                      tickLine={false}
                      axisLine={false}
                      tickMargin={8}
                      tickFormatter={(_value, index) =>
                        formatTickLabel(
                          chartData[index],
                          activeOption.granularity,
                        )
                      }
                    />
                    <YAxis
                      tickLine={false}
                      axisLine={false}
                      tickMargin={8}
                      tickFormatter={(value) => formatCurrencyCompact(value)}
                    />
                    <ChartTooltip
                      cursor={false}
                      content={
                        <ChartTooltipContent
                          indicator="dot"
                          labelFormatter={(_value, payload) => {
                            const item = payload?.[0]?.payload as
                              | DepreciationPoint
                              | undefined;
                            return formatFullPeriodLabel(
                              item,
                              activeOption.granularity,
                            );
                          }}
                          formatter={(value) =>
                            `฿${Number(value).toLocaleString()}`
                          }
                        />
                      }
                    />
                    <ChartLegend content={<ChartLegendContent />} />
                    <Area
                      dataKey="depreciation"
                      type="natural"
                      fill="url(#fillDepreciation)"
                      stroke="var(--color-depreciation)"
                      stackId="a"
                    />
                    <Area
                      dataKey="accumulated"
                      type="natural"
                      fill="url(#fillAccumulated)"
                      stroke="var(--color-accumulated)"
                      stackId="b"
                    />
                  </AreaChart>
                ) : (
                  <BarChart data={chartData}>
                    <CartesianGrid vertical={false} />
                    <XAxis
                      dataKey="year"
                      tickLine={false}
                      axisLine={false}
                      tickMargin={8}
                      tickFormatter={(_value, index) =>
                        formatTickLabel(
                          chartData[index],
                          activeOption.granularity,
                        )
                      }
                    />
                    <YAxis
                      tickLine={false}
                      axisLine={false}
                      tickMargin={8}
                      tickFormatter={(value) => formatCurrencyCompact(value)}
                    />
                    <ChartTooltip
                      cursor={false}
                      content={
                        <ChartTooltipContent
                          indicator="dot"
                          labelFormatter={(_value, payload) => {
                            const item = payload?.[0]?.payload as
                              | DepreciationPoint
                              | undefined;
                            return formatFullPeriodLabel(
                              item,
                              activeOption.granularity,
                            );
                          }}
                          formatter={(value) =>
                            `฿${Number(value).toLocaleString()}`
                          }
                        />
                      }
                    />
                    <ChartLegend content={<ChartLegendContent />} />
                    <Bar
                      dataKey="depreciation"
                      fill="var(--color-depreciation)"
                      radius={[4, 4, 0, 0]}
                    />
                    <Bar
                      dataKey="accumulated"
                      fill="var(--color-accumulated)"
                      radius={[4, 4, 0, 0]}
                    />
                  </BarChart>
                )}
              </ChartContainer>
            </div>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[140px]">
                      {activeOption.granularity === "month" ? "เดือน" : "ปี"}
                    </TableHead>
                    <TableHead className="text-right">
                      ค่าเสื่อมราคา
                    </TableHead>
                    <TableHead className="text-right">
                      ค่าเสื่อมราคาสะสม
                    </TableHead>
                    <TableHead className="text-right">อัตราเพิ่มขึ้น</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {chartData.map((row, index) => {
                    const previousDep =
                      index > 0 ? chartData[index - 1].depreciation : 0;
                    const growthRate =
                      previousDep > 0
                        ? (
                            ((row.depreciation - previousDep) / previousDep) *
                            100
                          ).toFixed(1)
                        : "0.0";
                    const isPositive = parseFloat(growthRate) >= 0;

                    return (
                      <TableRow key={row.date ?? row.year}>
                        <TableCell className="font-medium">
                          {formatTickLabel(row, activeOption.granularity)}
                        </TableCell>
                        <TableCell className="text-right">
                          ฿{row.depreciation.toLocaleString()}
                        </TableCell>
                        <TableCell className="text-right">
                          ฿{row.accumulated.toLocaleString()}
                        </TableCell>
                        <TableCell className="text-right">
                          <span
                            className={
                              isPositive ? "text-green-600" : "text-red-600"
                            }
                          >
                            {isPositive ? "+" : ""}
                            {growthRate}%
                          </span>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
