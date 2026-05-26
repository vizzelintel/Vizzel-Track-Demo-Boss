"use client";

import * as React from "react";
import useSWR from "swr";
import { CartesianGrid, Line, LineChart, XAxis, YAxis } from "recharts";
import { LineChart as LineChartIcon, Loader2 } from "lucide-react";

import { formatCurrencyCompact } from "@/lib/utils";
import { apiRequest } from "@/lib/api";
import { parseChartDate, toBuddhistYear } from "@/lib/chart-dates";
import { normalizeValueHistoryPayload } from "@/lib/dashboard-normalize";
import type {
  AssetValueHistoryGranularity,
  AssetValueHistoryRange,
} from "@/lib/data-service";
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

const chartConfig = {
  cost: {
    label: "มูลค่าสินทรัพย์ (Cost)",
    color: "hsl(221.2 83.2% 53.3%)",
  },
  netBookValue: {
    label: "มูลค่าสินทรัพย์สุทธิ (Net Book Value)",
    color: "hsl(142.1 76.2% 36.3%)",
  },
} satisfies ChartConfig;

type RangeOptionId =
  | "7d"
  | "1m"
  | "3m"
  | "1y"
  | "3y"
  | "5y-q"
  | "5y-h"
  | "10y"
  | "all";

interface RangeOption {
  id: RangeOptionId;
  label: string;
  range: AssetValueHistoryRange;
  granularity: AssetValueHistoryGranularity;
  granularityLabel: string;
}

const RANGE_OPTIONS: RangeOption[] = [
  {
    id: "7d",
    label: "7 วัน",
    range: "7d",
    granularity: "day",
    granularityLabel: "รายวัน",
  },
  {
    id: "1m",
    label: "1 เดือน",
    range: "1m",
    granularity: "day",
    granularityLabel: "รายวัน",
  },
  {
    id: "3m",
    label: "3 เดือน",
    range: "3m",
    granularity: "week",
    granularityLabel: "รายสัปดาห์",
  },
  {
    id: "1y",
    label: "1 ปี",
    range: "1y",
    granularity: "month",
    granularityLabel: "รายเดือน",
  },
  {
    id: "3y",
    label: "3 ปี",
    range: "3y",
    granularity: "quarter",
    granularityLabel: "รายไตรมาส",
  },
  {
    id: "5y-q",
    label: "5 ปี (ไตรมาส)",
    range: "5y",
    granularity: "quarter",
    granularityLabel: "รายไตรมาส",
  },
  {
    id: "5y-h",
    label: "5 ปี (ครึ่งปี)",
    range: "5y",
    granularity: "half-year",
    granularityLabel: "รายครึ่งปี",
  },
  {
    id: "10y",
    label: "10 ปี",
    range: "10y",
    granularity: "year",
    granularityLabel: "รายปี",
  },
  {
    id: "all",
    label: "ทั้งหมด",
    range: "all",
    granularity: "year",
    granularityLabel: "รายปี",
  },
];

const DEFAULT_RANGE_ID: RangeOptionId = "3m";

type ValueHistoryPoint = {
  date?: string;
  year?: string;
  cost: number;
  netBookValue: number;
};

interface AssetValueHistoryChartProps {
  organizationID?: number | null;
  initialData?: ValueHistoryPoint[] | null;
  initialRangeId?: RangeOptionId;
}

function formatTickLabel(
  iso: string | undefined,
  fallbackYear: string | undefined,
  granularity: AssetValueHistoryGranularity,
): string {
  if (!iso) {
    const y = fallbackYear ? Number(fallbackYear) : NaN;
    return Number.isFinite(y) ? `ปี ${toBuddhistYear(y >= 2400 ? y - 543 : y)}` : "";
  }
  const d = parseChartDate(iso);
  if (!d) return iso;
  const day = d.getDate();
  const monthShort = d.toLocaleDateString("th-TH", { month: "short" });
  const yearBE = toBuddhistYear(d.getFullYear());

  switch (granularity) {
    case "day":
      return `${day} ${monthShort}`;
    case "week":
      return `${day} ${monthShort}`;
    case "month":
      return `${monthShort} ${yearBE}`;
    case "quarter": {
      const q = Math.floor(d.getMonth() / 3) + 1;
      return `Q${q}/${yearBE}`;
    }
    case "half-year": {
      const h = d.getMonth() < 6 ? 1 : 2;
      return `H${h}/${yearBE}`;
    }
    case "year":
    default:
      return `${yearBE}`;
  }
}

function formatFullDateLabel(
  iso: string | undefined,
  fallbackYear: string | undefined,
  granularity: AssetValueHistoryGranularity,
): string {
  if (!iso) {
    const y = fallbackYear ? Number(fallbackYear) : NaN;
    return Number.isFinite(y)
      ? `ปีงบประมาณ ${toBuddhistYear(y >= 2400 ? y - 543 : y)}`
      : "";
  }
  const d = parseChartDate(iso);
  if (!d) return iso;
  const yearBE = toBuddhistYear(d.getFullYear());
  const full = d.toLocaleDateString("th-TH", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  switch (granularity) {
    case "day":
    case "week":
      return `ณ วันที่ ${full}`;
    case "month":
      return `ณ สิ้นเดือน ${d.toLocaleDateString("th-TH", {
        month: "long",
        year: "numeric",
      })}`;
    case "quarter": {
      const q = Math.floor(d.getMonth() / 3) + 1;
      return `สิ้นไตรมาสที่ ${q} ปี ${yearBE}`;
    }
    case "half-year": {
      const h = d.getMonth() < 6 ? 1 : 2;
      return `สิ้นครึ่งปีที่ ${h} ปี ${yearBE}`;
    }
    case "year":
    default:
      return `ปีงบประมาณ ${yearBE}`;
  }
}

export function AssetValueHistoryChart({
  organizationID,
  initialData,
  initialRangeId = DEFAULT_RANGE_ID,
}: AssetValueHistoryChartProps) {
  const [valueType, setValueType] = React.useState<
    "both" | "cost" | "netBookValue"
  >("both");
  const [rangeId, setRangeId] = React.useState<RangeOptionId>(initialRangeId);
  const [mounted, setMounted] = React.useState(false);

  React.useEffect(() => {
    setMounted(true);
  }, []);

  const activeOption = React.useMemo(
    () => RANGE_OPTIONS.find((o) => o.id === rangeId) ?? RANGE_OPTIONS[2],
    [rangeId],
  );

  const swrKey = organizationID
    ? `/dashboard/value-history/${organizationID}?range=${activeOption.range}&granularity=${activeOption.granularity}`
    : null;

  const useFallback =
    rangeId === initialRangeId &&
    Array.isArray(initialData) &&
    initialData.length > 0;

  const { data: res, isLoading } = useSWR(
    swrKey,
    (url) => apiRequest(url),
    {
      fallbackData: useFallback ? { data: initialData } : undefined,
      revalidateOnMount: !useFallback,
      revalidateOnFocus: false,
      keepPreviousData: true,
    },
  );

  const chartData: ValueHistoryPoint[] = React.useMemo(() => {
    const list = res?.data ?? (useFallback ? initialData : []) ?? [];
    return normalizeValueHistoryPayload(list);
  }, [res, initialData, useFallback]);

  const isEmpty =
    chartData.length === 0 ||
    chartData.every((item) => item.cost === 0 && item.netBookValue === 0);

  const rangeDescription = (() => {
    if (chartData.length === 0) {
      return `ยังไม่มีข้อมูลช่วง ${activeOption.label}`;
    }
    const first = chartData[0];
    const last = chartData[chartData.length - 1];
    const firstLabel = formatFullDateLabel(
      first.date,
      first.year,
      activeOption.granularity,
    );
    const lastLabel = formatFullDateLabel(
      last.date,
      last.year,
      activeOption.granularity,
    );
    return `${activeOption.label} · ${activeOption.granularityLabel} (${firstLabel} → ${lastLabel})`;
  })();

  if (!mounted) return null;

  return (
    <Card className="@container/card">
      <CardHeader className="flex flex-col gap-3">
        <div className="flex flex-col gap-1">
          <CardTitle className="flex items-center gap-2">
            มูลค่าสินทรัพย์ย้อนหลัง
            {isLoading && (
              <Loader2 className="text-muted-foreground h-4 w-4 animate-spin" />
            )}
          </CardTitle>
          <CardDescription>{rangeDescription}</CardDescription>
        </div>
        <CardAction className="flex flex-col items-end gap-2">
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
          {!isEmpty && (
            <>
              <ToggleGroup
                type="single"
                value={valueType}
                onValueChange={(value) =>
                  value &&
                  setValueType(value as "both" | "cost" | "netBookValue")
                }
                variant="outline"
                size="sm"
                className="hidden @md/card:flex"
              >
                <ToggleGroupItem value="both">ทั้งหมด</ToggleGroupItem>
                <ToggleGroupItem value="cost">ต้นทุน</ToggleGroupItem>
                <ToggleGroupItem value="netBookValue">มูลค่าสุทธิ</ToggleGroupItem>
              </ToggleGroup>
              <Select
                value={valueType}
                onValueChange={(value) =>
                  setValueType(value as "both" | "cost" | "netBookValue")
                }
              >
                <SelectTrigger className="h-9 w-full @md/card:hidden">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="both">แสดงทั้งหมด</SelectItem>
                  <SelectItem value="cost">ต้นทุน</SelectItem>
                  <SelectItem value="netBookValue">
                    มูลค่าสินทรัพย์สุทธิ
                  </SelectItem>
                </SelectContent>
              </Select>
            </>
          )}
        </CardAction>
      </CardHeader>
      <CardContent className="px-2 pt-4 sm:px-6 sm:pt-6">
        {isEmpty ? (
          <div className="flex h-[300px] w-full flex-col items-center justify-center rounded-xl border border-dashed border-gray-200 bg-gray-50/50">
            <div className="bg-primary/5 mb-2 rounded-full p-3">
              <LineChartIcon className="text-primary/40 h-8 w-8" />
            </div>
            <p className="text-muted-foreground font-medium">
              ไม่มีข้อมูลมูลค่าสินทรัพย์
            </p>
            <p className="text-muted-foreground/60 text-sm">
              ลองเปลี่ยนช่วงเวลาหรือเริ่มต้นบันทึกสินทรัพย์ในระบบ
            </p>
          </div>
        ) : (
          <ChartContainer
            config={chartConfig}
            className="aspect-auto h-[300px] w-full"
          >
            <LineChart data={chartData}>
              <CartesianGrid vertical={false} strokeDasharray="3 3" />
              <XAxis
                dataKey="date"
                tickLine={false}
                axisLine={false}
                tickMargin={8}
                minTickGap={24}
                tickFormatter={(value, index) => {
                  const item = chartData[index];
                  return formatTickLabel(
                    value as string,
                    item?.year,
                    activeOption.granularity,
                  );
                }}
              />
              <YAxis
                tickLine={false}
                axisLine={false}
                tickMargin={8}
                tickFormatter={(value) => formatCurrencyCompact(value)}
              />
              <ChartTooltip
                cursor={{ stroke: "var(--color-cost)", strokeWidth: 1 }}
                content={
                  <ChartTooltipContent
                    indicator="line"
                    labelFormatter={(value, payload) => {
                      const item = payload?.[0]?.payload as
                        | ValueHistoryPoint
                        | undefined;
                      return formatFullDateLabel(
                        (value as string) ?? item?.date,
                        item?.year,
                        activeOption.granularity,
                      );
                    }}
                    formatter={(value, name) => [
                      `฿${Number(value).toLocaleString()}`,
                      chartConfig[name as keyof typeof chartConfig]?.label ||
                        name,
                    ]}
                  />
                }
              />
              {(valueType === "both" || valueType === "cost") && (
                <Line
                  type="monotone"
                  dataKey="cost"
                  stroke="var(--color-cost)"
                  strokeWidth={2}
                  dot={{ fill: "var(--color-cost)", r: 3 }}
                  activeDot={{ r: 5 }}
                />
              )}
              {(valueType === "both" || valueType === "netBookValue") && (
                <Line
                  type="monotone"
                  dataKey="netBookValue"
                  stroke="var(--color-netBookValue)"
                  strokeWidth={2}
                  dot={{ fill: "var(--color-netBookValue)", r: 3 }}
                  activeDot={{ r: 5 }}
                />
              )}
            </LineChart>
          </ChartContainer>
        )}
      </CardContent>
    </Card>
  );
}
