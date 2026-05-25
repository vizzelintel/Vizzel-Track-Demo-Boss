"use client";

import * as React from "react";
import { IconTrendingDown, IconTrendingUp } from "@tabler/icons-react";

import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { TEST_IDS } from "./test-ids";

interface SectionCardsProps {
  data?: {
    totalAssetValue?: number;
    totalAssetValueTrend?: string;
    accumulatedDepreciation?: number;
    accumulatedDepreciationTrend?: string;
    netBookValue?: number;
    netBookValueTrend?: string;
    totalAssets?: number;
    totalAssetsTrend?: string;
    newAssetsThisYear?: number;
    newAssetsTrend?: string;
    currentYearDepreciation?: number;
    currentYear?: number;
    monthlyAverage?: number;
    depreciationTrend?: string;
  } | null;
}

export function SectionCards({ data }: SectionCardsProps) {
  const totalAssetValue = data?.totalAssetValue ?? 0;
  const totalAssetValueTrend = data?.totalAssetValueTrend ?? "+0%";
  const accumulatedDepreciation = data?.accumulatedDepreciation ?? 0;
  const accumulatedDepreciationTrend =
    data?.accumulatedDepreciationTrend ?? "+0%";
  const netBookValue = data?.netBookValue ?? 0;
  const netBookValueTrend = data?.netBookValueTrend ?? "+0%";
  const totalAssets = data?.totalAssets ?? 0;
  const totalAssetsTrend = data?.totalAssetsTrend ?? "+0%";
  const newAssetsThisYear = data?.newAssetsThisYear ?? 0;
  const newAssetsTrend = data?.newAssetsTrend ?? "+0%";

  const currentYear = data?.currentYear ?? new Date().getFullYear();
  const selectedYear = String(currentYear + 543);

  const currentYearDepreciation = {
    year: currentYear,
    totalDepreciation: data?.currentYearDepreciation ?? 0,
    monthlyAverage: data?.monthlyAverage ?? 0,
    trend: data?.depreciationTrend ?? "+0%",
  };

  const isPositiveTrend = (trend: string) => !trend.startsWith("-");
  return (
    <div className="grid grid-cols-1 gap-4 px-4 *:data-[slot=card]:shadow-xs lg:px-6 @xl/main:grid-cols-2 @5xl/main:grid-cols-3">
      <Card className="@container/card overflow-hidden" data-testid={TEST_IDS.DASHBOARD.CARD_TOTAL_VALUE}>
        <CardHeader>
          <CardDescription>มูลค่าสินทรัพย์รวม</CardDescription>
          <CardTitle className="text-xl font-semibold tabular-nums @[200px]/card:text-2xl w-full">
            <div
              className="truncate block w-full"
              title={`฿${totalAssetValue.toLocaleString()}`}
            >
              ฿{totalAssetValue.toLocaleString()}
            </div>
          </CardTitle>
          <CardAction>
            <Badge variant="outline">
              {isPositiveTrend(totalAssetValueTrend) ? (
                <IconTrendingUp />
              ) : (
                <IconTrendingDown />
              )}
              {totalAssetValueTrend}
            </Badge>
          </CardAction>
        </CardHeader>
        <CardFooter className="flex-col items-start gap-1.5 text-sm">
          <div className="line-clamp-1 flex gap-2 font-medium">
            {isPositiveTrend(totalAssetValueTrend)
              ? "มูลค่าสินทรัพย์เพิ่มขึ้น"
              : "มูลค่าสินทรัพย์ลดลง"}{" "}
            {isPositiveTrend(totalAssetValueTrend) ? (
              <IconTrendingUp className="size-4" />
            ) : (
              <IconTrendingDown className="size-4" />
            )}
          </div>
          <div className="text-muted-foreground">
            รวมการเปลี่ยนแปลงย้อนหลัง 6 เดือน
          </div>
        </CardFooter>
      </Card>
      <Card className="@container/card overflow-hidden" data-testid={TEST_IDS.DASHBOARD.CARD_ACCUMULATED_DEPRECIATION}>
        <CardHeader>
          <CardDescription>ค่าเสื่อมราคาสะสม</CardDescription>
          <CardTitle className="text-xl font-semibold tabular-nums @[200px]/card:text-2xl w-full">
            <div
              className="truncate block w-full"
              title={`฿${accumulatedDepreciation.toLocaleString()}`}
            >
              ฿{accumulatedDepreciation.toLocaleString()}
            </div>
          </CardTitle>
          <CardAction>
            <Badge variant="outline">
              {isPositiveTrend(accumulatedDepreciationTrend) ? (
                <IconTrendingUp />
              ) : (
                <IconTrendingDown />
              )}
              {accumulatedDepreciationTrend}
            </Badge>
          </CardAction>
        </CardHeader>
        <CardFooter className="flex-col items-start gap-1.5 text-sm">
          <div className="line-clamp-1 flex gap-2 font-medium">
            {isPositiveTrend(accumulatedDepreciationTrend)
              ? "ค่าเสื่อมราคาเพิ่มขึ้น"
              : "ค่าเสื่อมราคาลดลง"}
            ตามอายุการใช้งาน{" "}
            {isPositiveTrend(accumulatedDepreciationTrend) ? (
              <IconTrendingUp className="size-4" />
            ) : (
              <IconTrendingDown className="size-4" />
            )}
          </div>
          <div className="text-muted-foreground">
            คำนวณตามอัตราเสื่อมราคาของแต่ละหมวดหมู่
          </div>
        </CardFooter>
      </Card>
      <Card className="@container/card overflow-hidden" data-testid={TEST_IDS.DASHBOARD.CARD_NET_BOOK_VALUE}>
        <CardHeader>
          <CardDescription>มูลค่าสินทรัพย์สุทธิ</CardDescription>
          <CardTitle className="text-xl font-semibold tabular-nums @[200px]/card:text-2xl w-full">
            <div
              className="truncate block w-full"
              title={`฿${netBookValue.toLocaleString()}`}
            >
              ฿{netBookValue.toLocaleString()}
            </div>
          </CardTitle>
          <CardAction>
            <Badge variant="outline">
              {isPositiveTrend(netBookValueTrend) ? (
                <IconTrendingUp />
              ) : (
                <IconTrendingDown />
              )}
              {netBookValueTrend}
            </Badge>
          </CardAction>
        </CardHeader>
        <CardFooter className="flex-col items-start gap-1.5 text-sm">
          <div className="line-clamp-1 flex gap-2 font-medium">
            {isPositiveTrend(netBookValueTrend)
              ? "มูลค่าสุทธิเพิ่มขึ้น"
              : "มูลค่าสุทธิลดลง"}
            อย่างต่อเนื่อง{" "}
            {isPositiveTrend(netBookValueTrend) ? (
              <IconTrendingUp className="size-4" />
            ) : (
              <IconTrendingDown className="size-4" />
            )}
          </div>
          <div className="text-muted-foreground">
            มูลค่าสินทรัพย์รวม - ค่าเสื่อมราคาสะสม
          </div>
        </CardFooter>
      </Card>
      <Card className="@container/card overflow-hidden" data-testid={TEST_IDS.DASHBOARD.CARD_TOTAL_ASSETS}>
        <CardHeader>
          <CardDescription>จำนวนสินทรัพย์ทั้งหมด</CardDescription>
          <CardTitle className="text-xl font-semibold tabular-nums @[200px]/card:text-2xl w-full">
            <div className="truncate block w-full" title={totalAssets.toLocaleString()}>
              {totalAssets.toLocaleString()}
            </div>
          </CardTitle>
          <CardAction>
            <Badge variant="outline">
              {isPositiveTrend(totalAssetsTrend) ? (
                <IconTrendingUp />
              ) : (
                <IconTrendingDown />
              )}
              {totalAssetsTrend}
            </Badge>
          </CardAction>
        </CardHeader>
        <CardFooter className="flex-col items-start gap-1.5 text-sm">
          <div className="line-clamp-1 flex gap-2 font-medium">
            {isPositiveTrend(totalAssetsTrend)
              ? "จำนวนสินทรัพย์เพิ่มขึ้น"
              : "จำนวนสินทรัพย์ลดลง"}{" "}
            {isPositiveTrend(totalAssetsTrend) ? (
              <IconTrendingUp className="size-4" />
            ) : (
              <IconTrendingDown className="size-4" />
            )}
          </div>
          <div className="text-muted-foreground">รวมสินทรัพย์ทั้งหมดในระบบ</div>
        </CardFooter>
      </Card>
      <Card className="@container/card overflow-hidden" data-testid={TEST_IDS.DASHBOARD.CARD_NEW_ASSETS}>
        <CardHeader>
          <CardDescription>
            สินทรัพย์ใหม่ในปีงบประมาณ {selectedYear}
          </CardDescription>
          <CardTitle className="text-xl font-semibold tabular-nums @[200px]/card:text-2xl w-full">
            <div
              className="truncate block w-full"
              title={newAssetsThisYear.toLocaleString()}
            >
              {newAssetsThisYear.toLocaleString()}
            </div>
          </CardTitle>
          <CardAction>
            <Badge variant="outline">
              {isPositiveTrend(newAssetsTrend) ? (
                <IconTrendingUp />
              ) : (
                <IconTrendingDown />
              )}
              {newAssetsTrend}
            </Badge>
          </CardAction>
        </CardHeader>
        <CardFooter className="flex-col items-start gap-1.5 text-sm">
          <div className="line-clamp-1 flex gap-2 font-medium">
            {isPositiveTrend(newAssetsTrend) ? "เพิ่มขึ้น" : "ลดลง"}{" "}
            {newAssetsTrend.replace(/[+-]/g, "")} เมื่อเทียบกับปีก่อน{" "}
            {isPositiveTrend(newAssetsTrend) ? (
              <IconTrendingUp className="size-4" />
            ) : (
              <IconTrendingDown className="size-4" />
            )}
          </div>
          <div className="text-muted-foreground">
            สินทรัพย์ที่นำเข้ามาในปีงบประมาณปัจจุบัน
          </div>
        </CardFooter>
      </Card>
      <Card className="@container/card overflow-hidden" data-testid={TEST_IDS.DASHBOARD.CARD_CURRENT_YEAR_DEPRECIATION}>
        <CardHeader>
          <CardDescription>
            ค่าเสื่อมราคาปีนี้ ({Number(currentYearDepreciation.year) + 543})
          </CardDescription>
          <CardTitle className="text-xl font-semibold tabular-nums @[200px]/card:text-2xl w-full">
            <div
              className="truncate block w-full"
              title={`฿${currentYearDepreciation.totalDepreciation.toLocaleString()}`}
            >
              ฿{currentYearDepreciation.totalDepreciation.toLocaleString()}
            </div>
          </CardTitle>
          <CardAction>
            <Badge variant="outline">
              <IconTrendingUp />
              {currentYearDepreciation.trend}
            </Badge>
          </CardAction>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 gap-4 @md/card:grid-cols-2">
            <div className="space-y-1">
              <p className="text-muted-foreground text-sm">
                ค่าเสื่อมราคาเฉลี่ยต่อเดือน
              </p>
              <p className="text-lg font-semibold">
                ฿
                {currentYearDepreciation.monthlyAverage.toLocaleString(
                  "th-TH",
                  {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  },
                )}
              </p>
            </div>
            {/* <div className="space-y-1">
              <p className="text-sm text-muted-foreground">เปรียบเทียบกับปีก่อน</p>
              <p className="text-lg font-semibold text-green-600">
                เพิ่มขึ้น {currentYearDepreciation.trend}
              </p>
            </div> */}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
