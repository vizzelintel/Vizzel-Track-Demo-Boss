"use client";

import * as React from "react";
import useSWR from "swr";
import { Area, AreaChart, CartesianGrid, XAxis, YAxis } from "recharts";
import { Box, Loader2 } from "lucide-react";

import { useIsMobile } from "@/hooks/use-mobile";
import { apiRequest } from "@/lib/api";
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

export const description = "An interactive area chart";

const chartConfig = {
  count: {
    label: "จำนวนสินทรัพย์",
    color: "var(--primary)",
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

type TrendPoint = {
  date: string;
  count: number;
};

interface ChartAreaInteractiveProps {
  organizationID?: number | null;
  initialData?: TrendPoint[] | null;
  initialRangeId?: RangeOptionId;
}

function toBuddhistYear(year: number): number {
  return year + 543;
}

function formatTickLabel(
  iso: string | undefined,
  granularity: AssetValueHistoryGranularity,
): string {
  if (!iso) return "";
  const d = new Date(iso);
  const day = d.getDate();
  const monthShort = d.toLocaleDateString("th-TH", { month: "short" });
  const yearBE = toBuddhistYear(d.getFullYear());

  switch (granularity) {
    case "day":
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
  granularity: AssetValueHistoryGranularity,
): string {
  if (!iso) return "";
  const d = new Date(iso);
  const yearBE = toBuddhistYear(d.getFullYear());
  const fullDay = d.toLocaleDateString("th-TH", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  switch (granularity) {
    case "day":
      return `วันที่ ${fullDay}`;
    case "week":
      return `สัปดาห์สิ้นสุดวันที่ ${fullDay}`;
    case "month":
      return `เดือน ${d.toLocaleDateString("th-TH", {
        month: "long",
        year: "numeric",
      })}`;
    case "quarter": {
      const q = Math.floor(d.getMonth() / 3) + 1;
      return `ไตรมาสที่ ${q} ปี ${yearBE}`;
    }
    case "half-year": {
      const h = d.getMonth() < 6 ? 1 : 2;
      return `ครึ่งปีที่ ${h} ปี ${yearBE}`;
    }
    case "year":
    default:
      return `ปี ${yearBE}`;
  }
}

export function ChartAreaInteractive({
  organizationID,
  initialData,
  initialRangeId = DEFAULT_RANGE_ID,
}: ChartAreaInteractiveProps) {
  const isMobile = useIsMobile();
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
    ? `/dashboard/trend/${organizationID}?range=${activeOption.range}&granularity=${activeOption.granularity}`
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
      revalidateOnFocus: false,
      keepPreviousData: true,
    },
  );

  const chartData: TrendPoint[] = React.useMemo(() => {
    const list = res?.data ?? (useFallback ? initialData : []) ?? [];
    return Array.isArray(list) ? list : [];
  }, [res, initialData, useFallback]);

  const isEmpty =
    chartData.length === 0 || chartData.every((item) => item.count === 0);

  const totalCount = React.useMemo(
    () => chartData.reduce((sum, item) => sum + (item.count ?? 0), 0),
    [chartData],
  );

  const rangeDescription = (() => {
    if (chartData.length === 0) {
      return `ยังไม่มีข้อมูลช่วง ${activeOption.label}`;
    }
    const first = chartData[0];
    const last = chartData[chartData.length - 1];
    const firstLabel = formatFullDateLabel(
      first.date,
      activeOption.granularity,
    );
    const lastLabel = formatFullDateLabel(last.date, activeOption.granularity);
    return `${activeOption.label} · ${activeOption.granularityLabel} (${firstLabel} → ${lastLabel})`;
  })();

  if (!mounted) return null;

  return (
    <Card className="@container/card">
      <CardHeader className="flex flex-col gap-3">
        <div className="flex flex-col gap-1">
          <CardTitle className="flex items-center gap-2">
            สินทรัพย์ใหม่ตามช่วงเวลา
            {isLoading && (
              <Loader2 className="text-muted-foreground h-4 w-4 animate-spin" />
            )}
          </CardTitle>
          <CardDescription>
            {rangeDescription}
            {!isEmpty && (
              <span className="text-muted-foreground ml-2">
                · รวม {totalCount.toLocaleString()} รายการ
              </span>
            )}
          </CardDescription>
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
        </CardAction>
      </CardHeader>
      <CardContent className="px-2 pt-4 sm:px-6 sm:pt-6">
        {isEmpty ? (
          <div className="flex h-[250px] w-full flex-col items-center justify-center rounded-xl border border-dashed border-gray-200 bg-gray-50/50">
            <div className="bg-primary/5 mb-2 rounded-full p-3">
              <Box className="text-primary/40 h-8 w-8" />
            </div>
            <p className="text-muted-foreground font-medium">
              ไม่มีข้อมูลในช่วงเวลาที่เลือก
            </p>
            <p className="text-muted-foreground/60 text-sm">
              ลองเปลี่ยนช่วงเวลาหรือเริ่มต้นบันทึกสินทรัพย์ในระบบ
            </p>
          </div>
        ) : (
          <ChartContainer
            config={chartConfig}
            className="aspect-auto h-[250px] w-full"
          >
            <AreaChart data={chartData}>
              <defs>
                <linearGradient id="fillCount" x1="0" y1="0" x2="0" y2="1">
                  <stop
                    offset="5%"
                    stopColor="var(--color-count)"
                    stopOpacity={1.0}
                  />
                  <stop
                    offset="95%"
                    stopColor="var(--color-count)"
                    stopOpacity={0.1}
                  />
                </linearGradient>
              </defs>
              <CartesianGrid vertical={false} />
              <XAxis
                dataKey="date"
                tickLine={false}
                axisLine={false}
                tickMargin={8}
                minTickGap={24}
                tickFormatter={(value) =>
                  formatTickLabel(value as string, activeOption.granularity)
                }
              />
              <YAxis
                tickLine={false}
                axisLine={false}
                tickMargin={8}
                allowDecimals={false}
              />
              <ChartTooltip
                cursor={false}
                defaultIndex={isMobile ? -1 : Math.min(10, chartData.length - 1)}
                content={
                  <ChartTooltipContent
                    labelFormatter={(value) =>
                      formatFullDateLabel(
                        value as string,
                        activeOption.granularity,
                      )
                    }
                    formatter={(value) => [
                      `${Number(value).toLocaleString()} รายการ`,
                      chartConfig.count.label,
                    ]}
                    indicator="dot"
                  />
                }
              />
              <Area
                dataKey="count"
                type="monotone"
                fill="url(#fillCount)"
                stroke="var(--color-count)"
              />
            </AreaChart>
          </ChartContainer>
        )}
      </CardContent>
    </Card>
  );
}
