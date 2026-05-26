"use client";

import * as React from "react";
import { Bar, BarChart, CartesianGrid, Cell, XAxis, YAxis } from "recharts";
import {
  IconChevronLeft,
  IconChevronRight,
  IconChevronsLeft,
  IconChevronsRight,
  IconMapPin,
  IconPackage,
  IconCurrencyBaht,
} from "@tabler/icons-react";

import { Button } from "@/components/ui/button";
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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { TEST_IDS } from "@/components/test-ids";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

const assetLocationData = [
  {
    location: "อาคาร A ชั้น 1",
    count: 125,
    value: 2500000,
  },
  {
    location: "อาคาร A ชั้น 2",
    count: 98,
    value: 1950000,
  },
  {
    location: "อาคาร B ชั้น 1",
    count: 156,
    value: 3120000,
  },
  {
    location: "อาคาร B ชั้น 2",
    count: 87,
    value: 1740000,
  },
  {
    location: "อาคาร C ชั้น 1",
    count: 203,
    value: 4060000,
  },
  {
    location: "อาคาร C ชั้น 2",
    count: 145,
    value: 2900000,
  },
  {
    location: "โกดังเก็บของ",
    count: 45,
    value: 900000,
  },
];

const chartConfig = {
  value: {
    label: "มูลค่าสินทรัพย์",
    color: "hsl(221.2 83.2% 53.3%)",
  },
} satisfies ChartConfig;

const COLORS = [
  "hsl(221.2 83.2% 53.3%)",
  "hsl(142.1 76.2% 36.3%)",
  "hsl(38.7 92% 50%)",
  "hsl(0 84.2% 60.2%)",
  "hsl(280 70% 50%)",
  "hsl(200 90% 50%)",
  "hsl(30 80% 50%)",
];

interface LocationAsset {
  id: number;
  assetNumber: string;
  assetName: string;
  category: string;
  cost: number;
}

interface LocationData {
  location: string;
  count: number;
  value: number;
  assets?: Array<{
    id: number;
    assetNumber: string;
    assetName: string;
    category: string;
    cost: number;
  }>;
}

interface AssetLocationSectionProps {
  data?: LocationData[] | null;
}

export function AssetLocationSection({ data }: AssetLocationSectionProps) {
  const [chartType, setChartType] = React.useState<"bar" | "column">("bar");
  const [pageIndex, setPageIndex] = React.useState(0);
  const [pageSize, setPageSize] = React.useState(5);
  const [mounted, setMounted] = React.useState(false);
  const [dialogOpen, setDialogOpen] = React.useState(false);
  const [selectedLocation, setSelectedLocation] =
    React.useState<LocationData | null>(null);
  const [dialogPageIndex, setDialogPageIndex] = React.useState(0);
  const dialogPageSize = 10; // Assets per page in dialog

  React.useEffect(() => {
    setMounted(true);
  }, []);

  const chartData = Array.isArray(data) && data.length > 0 ? data : assetLocationData;
  const totalCount = chartData.reduce((sum, item) => sum + item.count, 0);
  const totalValue = chartData.reduce((sum, item) => sum + item.value, 0);

  if (!mounted) return null;

  const totalPages = Math.ceil(chartData.length / pageSize);
  const startIndex = pageIndex * pageSize;
  const endIndex = startIndex + pageSize;
  const paginatedData = chartData.slice(startIndex, endIndex);
  // const hasSummaryRow = endIndex >= chartData.length;

  const canPreviousPage = pageIndex > 0;
  const canNextPage = pageIndex < totalPages - 1;

  const handlePageSizeChange = (newPageSize: string) => {
    setPageSize(Number(newPageSize));
    setPageIndex(0);
  };

  const handleLocationClick = (item: LocationData) => {
    setSelectedLocation(item);
    setDialogPageIndex(0);
    setDialogOpen(true);
  };

  return (
    <div className="flex flex-col gap-3 px-4 lg:px-6">
      <Card className="@container/card">
        <CardHeader>
          <CardTitle>ข้อมูลสถานที่ตั้งสินทรัพย์</CardTitle>
          <CardDescription>
            สรุปจำนวนสินทรัพย์ทั้งหมด {totalCount.toLocaleString()} รายการ
            มูลค่ารวม ฿{totalValue.toLocaleString()}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {totalCount === 0 ? (
            <div className="flex h-[300px] w-full flex-col items-center justify-center rounded-xl border border-dashed border-gray-200 bg-gray-50/50">
              <div className="bg-primary/5 mb-2 rounded-full p-3">
                <IconMapPin className="text-primary/40 h-8 w-8" />
              </div>
              <p className="text-muted-foreground font-medium">
                ไม่มีข้อมูลสถานที่ตั้งสินทรัพย์
              </p>
              <p className="text-muted-foreground/60 text-sm">
                ข้อมูลจะปรากฏเมื่อมีการระบุสถานที่ในข้อมูลสินทรัพย์
              </p>
            </div>
          ) : (
            <>
              <div className="overflow-hidden rounded-md border">
                <Table data-testid={TEST_IDS.ASSET_LOCATION.TABLE}>
                  <TableHeader>
                    <TableRow className="bg-muted/50">
                      <TableHead>สถานที่ตั้ง</TableHead>
                      <TableHead className="text-right">
                        จำนวนสินทรัพย์
                      </TableHead>
                      <TableHead className="text-right">
                        มูลค่าสินทรัพย์ (บาท)
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {paginatedData.map((item, index) => (
                      <TableRow
                        data-testid={TEST_IDS.ASSET_LOCATION.TABLE_ROW(item.location)}
                        key={startIndex + index}
                        className="cursor-pointer transition-colors hover:bg-muted/50"
                        onClick={() => handleLocationClick(item)}
                      >
                        <TableCell className="font-medium">
                          {item.location}
                        </TableCell>
                        <TableCell className="text-right">
                          {item.count.toLocaleString()} รายการ
                        </TableCell>
                        <TableCell className="text-right">
                          ฿{item.value.toLocaleString()}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>

                <div className="bg-muted/30 border-t px-4 py-3">
                  <div className="flex items-center justify-between text-sm font-semibold">
                    <span>รวมทั้งหมด</span>
                    <div className="flex gap-6">
                      <span>{totalCount.toLocaleString()} รายการ</span>
                      <span>฿{totalValue.toLocaleString()}</span>
                    </div>
                  </div>
                </div>
              </div>
            </>
          )}

          {totalCount > 0 && (
            <div className="flex items-center justify-between px-4 py-4">
              <div className="hidden items-center gap-2 lg:flex">
                <Label htmlFor="rows-per-page" className="text-sm font-medium">
                  แสดงต่อหน้า
                </Label>
                <Select
                  value={`${pageSize}`}
                  onValueChange={handlePageSizeChange}
                >
                  <SelectTrigger size="sm" className="w-20" id="rows-per-page" data-testid={TEST_IDS.ASSET_LOCATION.DROPDOWN_PAGE_SIZE}>
                    <SelectValue placeholder={pageSize} />
                  </SelectTrigger>
                  <SelectContent side="top">
                    {[5, 10, 20, 30, 50].map((size) => (
                      <SelectItem key={size} value={`${size}`}>
                        {size}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex w-fit items-center justify-center text-sm font-medium">
                หน้า {pageIndex + 1} จาก {totalPages}
              </div>
              <div className="ml-auto flex items-center gap-2 lg:ml-0">
                <Button
                  variant="outline"
                  className="hidden h-8 w-8 p-0 lg:flex"
                  onClick={() => setPageIndex(0)}
                  disabled={!canPreviousPage}
                  data-testid={TEST_IDS.ASSET_LOCATION.BUTTON_FIRST_PAGE}
                >
                  <span className="sr-only">ไปหน้าแรก</span>
                  <IconChevronsLeft />
                </Button>
                <Button
                  variant="outline"
                  className="size-8"
                  size="icon"
                  onClick={() => setPageIndex(pageIndex - 1)}
                  disabled={!canPreviousPage}
                  data-testid={TEST_IDS.ASSET_LOCATION.BUTTON_PREV_PAGE}
                >
                  <span className="sr-only">หน้าก่อนหน้า</span>
                  <IconChevronLeft />
                </Button>
                <Button
                  variant="outline"
                  className="size-8"
                  size="icon"
                  onClick={() => setPageIndex(pageIndex + 1)}
                  disabled={!canNextPage}
                  data-testid={TEST_IDS.ASSET_LOCATION.BUTTON_NEXT_PAGE}
                >
                  <span className="sr-only">หน้าถัดไป</span>
                  <IconChevronRight />
                </Button>
                <Button
                  variant="outline"
                  className="hidden size-8 lg:flex"
                  size="icon"
                  onClick={() => setPageIndex(totalPages - 1)}
                  disabled={!canNextPage}
                  data-testid={TEST_IDS.ASSET_LOCATION.BUTTON_LAST_PAGE}
                >
                  <span className="sr-only">ไปหน้าสุดท้าย</span>
                  <IconChevronsRight />
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="@container/card">
        <CardHeader>
          <CardTitle>มูลค่าสินทรัพย์ตามสถานที่ตั้ง</CardTitle>
          <CardDescription>
            แสดงมูลค่าสินทรัพย์แยกตามสถานที่ตั้ง
          </CardDescription>
          <CardAction>
            <ToggleGroup
              type="single"
              value={chartType}
              onValueChange={(value) =>
                value && setChartType(value as "bar" | "column")
              }
              variant="outline"
              className="hidden @md/card:flex"
            >
              <ToggleGroupItem value="bar">Bar Chart</ToggleGroupItem>
              <ToggleGroupItem value="column">Column Chart</ToggleGroupItem>
            </ToggleGroup>
            <Select
              value={chartType}
              onValueChange={(value) => setChartType(value as "bar" | "column")}
            >
              <SelectTrigger className="w-full @md/card:hidden">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="bar">Bar Chart</SelectItem>
                <SelectItem value="column">Column Chart</SelectItem>
              </SelectContent>
            </Select>
          </CardAction>
        </CardHeader>
        <CardContent className="px-2 pt-4 sm:px-6 sm:pt-6">
          {chartData.length > 0 ? (
            <ChartContainer
              config={chartConfig}
              className="aspect-auto h-[350px] w-full"
            >
              {chartType === "bar" ? (
                <BarChart
                  data={chartData}
                  layout="vertical"
                  margin={{ left: 0, right: 10 }}
                >
                  <CartesianGrid horizontal={false} strokeDasharray="3 3" />
                  <XAxis
                    type="number"
                    tickLine={false}
                    axisLine={false}
                    tickMargin={8}
                    tickFormatter={(value) => `฿${(value / 1000).toFixed(0)}k`}
                  />
                  <YAxis
                    type="category"
                    dataKey="location"
                    tickLine={false}
                    axisLine={false}
                    tickMargin={8}
                    width={120}
                    tickFormatter={(value) =>
                      value.split(" ")[0] + " " + value.split(" ")[1]
                    }
                  />
                  <ChartTooltip
                    cursor={false}
                    content={
                      <ChartTooltipContent
                        indicator="dot"
                        formatter={(value, name) => [
                          `฿${Number(value).toLocaleString()}`,
                          "มูลค่าสินทรัพย์",
                        ]}
                        labelFormatter={(value, payload) => {
                          if (payload && payload[0]) {
                            return payload[0].payload.location;
                          }
                          return value;
                        }}
                      />
                    }
                  />
                  <Bar dataKey="value" radius={[0, 4, 4, 0]}>
                    {chartData.map((entry, index) => (
                      <Cell
                        key={`cell-${index}`}
                        fill={COLORS[index % COLORS.length]}
                      />
                    ))}
                  </Bar>
                </BarChart>
              ) : (
                <BarChart data={chartData}>
                  <CartesianGrid vertical={false} strokeDasharray="3 3" />
                  <XAxis
                    dataKey="location"
                    tickLine={false}
                    axisLine={false}
                    tickMargin={8}
                    angle={-45}
                    textAnchor="end"
                    height={100}
                    tickFormatter={(value) =>
                      value.split(" ")[0] + " " + value.split(" ")[1]
                    }
                  />
                  <YAxis
                    tickLine={false}
                    axisLine={false}
                    tickMargin={8}
                    tickFormatter={(value) => `฿${(value / 1000).toFixed(0)}k`}
                  />
                  <ChartTooltip
                    cursor={false}
                    content={
                      <ChartTooltipContent
                        indicator="dot"
                        labelFormatter={(value) => value}
                        formatter={(value, name) => [
                          `฿${Number(value).toLocaleString()}`,
                          "มูลค่าสินทรัพย์",
                        ]}
                      />
                    }
                  />
                  <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                    {chartData.map((entry, index) => (
                      <Cell
                        key={`cell-${index}`}
                        fill={COLORS[index % COLORS.length]}
                      />
                    ))}
                  </Bar>
                </BarChart>
              )}
            </ChartContainer>
          ) : (
            <div className="flex h-[350px] w-full flex-col items-center justify-center rounded-xl border border-dashed border-gray-200 bg-gray-50/50">
              <div className="bg-primary/5 mb-2 rounded-full p-3">
                <IconMapPin className="text-primary/40 h-8 w-8" />
              </div>
              <p className="text-muted-foreground font-medium">
                ไม่พบข้อมูลมูลค่าสินทรัพย์ตามสถานที่ตั้ง
              </p>
              <p className="text-muted-foreground/60 text-sm">
                ระบุข้อมูลสถานที่ในหน้าแก้ไขสินทรัพย์เพื่อแสดงข้อมูลย้อนหลัง
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Location Details Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-3xl max-h-[90vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <IconMapPin className="h-5 w-5 text-primary" />
              {selectedLocation?.location}
            </DialogTitle>
            <DialogDescription>
              รายการสินทรัพย์ทั้งหมด {selectedLocation?.count.toLocaleString()}{" "}
              รายการ มูลค่ารวม ฿{selectedLocation?.value.toLocaleString()}
            </DialogDescription>
          </DialogHeader>
          {selectedLocation && (
            <div className="flex flex-col gap-4 overflow-hidden flex-1">
              {/* Summary Cards */}
              <div className="grid grid-cols-3 gap-3">
                <div className="flex flex-col items-center justify-center rounded-lg border bg-linear-to-br from-blue-50 to-blue-100 dark:from-blue-950/30 dark:to-blue-900/30 p-3">
                  <div className="flex items-center gap-1 text-blue-600 dark:text-blue-400 mb-1">
                    <IconPackage className="h-4 w-4" />
                    <span className="text-xs font-medium">จำนวน</span>
                  </div>
                  <span className="text-xl font-bold text-blue-700 dark:text-blue-300">
                    {selectedLocation.count.toLocaleString()}
                  </span>
                </div>

                <div className="flex flex-col items-center justify-center rounded-lg border bg-linear-to-br from-green-50 to-green-100 dark:from-green-950/30 dark:to-green-900/30 p-3">
                  <div className="flex items-center gap-1 text-green-600 dark:text-green-400 mb-1">
                    <IconCurrencyBaht className="h-4 w-4" />
                    <span className="text-xs font-medium">มูลค่ารวม</span>
                  </div>
                  <span className="text-xl font-bold text-green-700 dark:text-green-300">
                    ฿{selectedLocation.value.toLocaleString()}
                  </span>
                </div>

                <div className="flex flex-col items-center justify-center rounded-lg border bg-muted/30 p-3">
                  <span className="text-xs text-muted-foreground mb-1">
                    เฉลี่ย/รายการ
                  </span>
                  <span className="text-xl font-bold">
                    ฿
                    {selectedLocation.count > 0
                      ? Math.round(
                          selectedLocation.value / selectedLocation.count,
                        ).toLocaleString()
                      : 0}
                  </span>
                </div>
              </div>

              {/* Assets Table */}
              {(() => {
                const assets = selectedLocation.assets ?? [];
                if (assets.length === 0) {
                  return (
                    <div className="flex items-center justify-center py-8 text-muted-foreground">
                      ไม่พบข้อมูลสินทรัพย์
                    </div>
                  );
                }
                const totalDialogPages = Math.ceil(
                  assets.length / dialogPageSize,
                );
                return (
                  <div className="flex flex-col gap-2 overflow-hidden flex-1">
                    <div className="rounded-md border overflow-auto flex-1">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead className="w-[50px]">#</TableHead>
                            <TableHead>เลขทะเบียน</TableHead>
                            <TableHead>ชื่อสินทรัพย์</TableHead>
                            <TableHead>หมวดหมู่</TableHead>
                            <TableHead className="text-right">
                              มูลค่า (บาท)
                            </TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {assets
                            .slice(
                              dialogPageIndex * dialogPageSize,
                              (dialogPageIndex + 1) * dialogPageSize,
                            )
                            .filter((asset) => asset != null && asset.id != null)
                            .map((asset, idx) => (
                              <TableRow key={asset.id ?? `row-${idx}`}>
                                <TableCell className="text-muted-foreground">
                                  {dialogPageIndex * dialogPageSize + idx + 1}
                                </TableCell>
                                <TableCell className="font-mono text-sm">
                                  {asset.assetNumber}
                                </TableCell>
                                <TableCell className="font-medium">
                                  {asset.assetName}
                                </TableCell>
                                <TableCell className="text-muted-foreground">
                                  {asset.category}
                                </TableCell>
                                <TableCell className="text-right">
                                  ฿{asset.cost.toLocaleString()}
                                </TableCell>
                              </TableRow>
                            ))}
                        </TableBody>
                      </Table>
                    </div>

                    {/* Dialog Pagination */}
                    {assets.length > dialogPageSize && (
                      <div className="flex flex-col gap-2 px-2 pt-2 border-t sm:flex-row sm:items-center sm:justify-between">
                        <span className="text-xs sm:text-sm text-muted-foreground text-center sm:text-left">
                          แสดง {dialogPageIndex * dialogPageSize + 1} -{" "}
                          {Math.min(
                            (dialogPageIndex + 1) * dialogPageSize,
                            assets.length,
                          )}{" "}
                          จาก {assets.length} รายการ
                        </span>
                        <div className="flex items-center justify-center gap-1 sm:gap-2">
                          <Button
                            variant="outline"
                            size="icon"
                            className="h-7 w-7 sm:h-8 sm:w-8"
                            onClick={() => setDialogPageIndex(0)}
                            disabled={dialogPageIndex === 0}
                          >
                            <IconChevronsLeft className="h-3 w-3 sm:h-4 sm:w-4" />
                          </Button>
                          <Button
                            variant="outline"
                            size="icon"
                            className="h-7 w-7 sm:h-8 sm:w-8"
                            onClick={() =>
                              setDialogPageIndex(dialogPageIndex - 1)
                            }
                            disabled={dialogPageIndex === 0}
                          >
                            <IconChevronLeft className="h-3 w-3 sm:h-4 sm:w-4" />
                          </Button>
                          <span className="text-xs sm:text-sm min-w-[80px] text-center">
                            {dialogPageIndex + 1} / {totalDialogPages}
                          </span>
                          <Button
                            variant="outline"
                            size="icon"
                            className="h-7 w-7 sm:h-8 sm:w-8"
                            onClick={() =>
                              setDialogPageIndex(dialogPageIndex + 1)
                            }
                            disabled={dialogPageIndex >= totalDialogPages - 1}
                          >
                            <IconChevronRight className="h-3 w-3 sm:h-4 sm:w-4" />
                          </Button>
                          <Button
                            variant="outline"
                            size="icon"
                            className="h-7 w-7 sm:h-8 sm:w-8"
                            onClick={() =>
                              setDialogPageIndex(totalDialogPages - 1)
                            }
                            disabled={dialogPageIndex >= totalDialogPages - 1}
                          >
                            <IconChevronsRight className="h-3 w-3 sm:h-4 sm:w-4" />
                          </Button>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })()}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
