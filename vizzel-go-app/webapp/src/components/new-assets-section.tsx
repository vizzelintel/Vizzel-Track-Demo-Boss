"use client";

import * as React from "react";
import { IconTrendingUp } from "@tabler/icons-react";
import { Box } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatThaiDate } from "@/lib/utils";
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

interface NewAssetsSectionProps {
  data?: Array<{
    id: number;
    assetNumber: string;
    assetName: string;
    category: string;
    cost: number;
    receivedDate: string;
  }> | null;
}

export function NewAssetsSection({ data }: NewAssetsSectionProps) {
  const currentYear = new Date().getFullYear().toString();
  const selectedYear = String(Number(currentYear) + 543);

  const [currentPage, setCurrentPage] = React.useState(1);
  const pageSize = 5;

  const currentYearData = Array.isArray(data) ? data : [];
  const totalCount = currentYearData.length;
  const totalPages = Math.ceil(totalCount / pageSize);

  const paginatedData = currentYearData.slice(
    (currentPage - 1) * pageSize,
    currentPage * pageSize,
  );

  const totalCost = currentYearData.reduce((sum, asset) => sum + asset.cost, 0);

  const averageCost = totalCount > 0 ? totalCost / totalCount : 0;

  return (
    <div className="grid grid-cols-1 gap-3 px-4 lg:grid-cols-[350px_1fr] lg:px-6">
      <Card className="@container/card relative flex h-full flex-col justify-between overflow-hidden">
        <div className="pointer-events-none absolute top-[-20px] right-[-20px] p-6 opacity-[0.03]">
          <IconTrendingUp size={200} />
        </div>
        <CardHeader>
          <CardTitle>ภาพรวมสินทรัพย์ใหม่ ปีงบประมาณ {selectedYear}</CardTitle>
          <CardDescription>
            สรุปภาพรวมสินทรัพย์ที่นำเข้ามาในปีนี้
          </CardDescription>
        </CardHeader>
        <CardContent className="relative flex flex-col gap-6">
          <div>
            <p className="text-muted-foreground mb-1 text-sm font-medium">
              จำนวนรายการ
            </p>
            <div className="flex items-baseline gap-2">
              <span className="text-primary text-5xl font-bold tabular-nums">
                {totalCount.toLocaleString()}
              </span>
              <span className="text-muted-foreground text-sm">รายการ</span>
            </div>
          </div>

          <div>
            <div className="mb-2 flex items-center justify-between">
              <span className="text-muted-foreground text-sm font-medium">
                มูลค่ารวม
              </span>
              <Badge variant="secondary" className="font-normal">
                ฿
                {averageCost.toLocaleString(undefined, {
                  maximumFractionDigits: 0,
                })}{" "}
                / รายการ
              </Badge>
            </div>
            <p className="text-3xl font-semibold tabular-nums">
              ฿{totalCost.toLocaleString()}
            </p>
          </div>
        </CardContent>
        <CardAction className="mt-auto p-6 pt-0">
          <div className="bg-secondary h-2 w-full overflow-hidden rounded-full">
            <div
              className="bg-primary animate-in slide-in-from-left h-full w-full origin-left duration-1000"
              style={{ width: "100%" }}
            />
          </div>
          <p className="text-muted-foreground mt-2 text-right text-xs">
            คิดเป็น 100% ของสินทรัพย์ใหม่ปีนี้
          </p>
        </CardAction>
      </Card>

      <Card className="@container/card flex flex-col">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>
                รายการสินทรัพย์ใหม่ ปีงบประมาณ {selectedYear}
              </CardTitle>
              <CardDescription>
                รายการสินทรัพย์ที่ซื้อในปีงบประมาณ {selectedYear}
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="flex-1">
          {currentYearData.length > 0 ? (
            <div className="flex h-full flex-col justify-between gap-4">
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[120px]">
                        เลขที่สินทรัพย์
                      </TableHead>
                      <TableHead>ชื่อสินทรัพย์</TableHead>
                      <TableHead>หมวดหมู่</TableHead>
                      <TableHead className="text-right">มูลค่า (บาท)</TableHead>
                      <TableHead className="w-[120px]">วันที่รับ</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {paginatedData.map((asset) => (
                      <TableRow key={asset.id}>
                        <TableCell className="font-medium">
                          {asset.assetNumber}
                        </TableCell>
                        <TableCell>{asset.assetName}</TableCell>
                        <TableCell>
                          <Badge variant="outline">{asset.category}</Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          ฿{asset.cost.toLocaleString()}
                        </TableCell>
                        <TableCell>
                          {formatThaiDate(asset.receivedDate)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              {totalPages > 1 && (
                <div className="flex items-center justify-between px-2">
                  <div className="text-muted-foreground text-sm">
                    หน้า {currentPage} จาก {totalPages}
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                      disabled={currentPage === 1}
                    >
                      ก่อนหน้า
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() =>
                        setCurrentPage((p) => Math.min(totalPages, p + 1))
                      }
                      disabled={currentPage === totalPages}
                    >
                      ถัดไป
                    </Button>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="flex h-full min-h-[400px] flex-col items-center justify-center rounded-xl border border-dashed border-gray-200 bg-gray-50/50 p-8 text-center mt-2">
              <div className="bg-primary/5 mb-4 rounded-full p-4">
                <Box className="text-primary/40 h-10 w-10" />
              </div>
              <p className="text-muted-foreground text-lg font-medium">
                ยังไม่พบข้อมูลสินทรัพย์ใหม่
              </p>
              <p className="text-muted-foreground/60 max-w-[280px] text-sm">
                ยังไม่มีการเพิ่มสินทรัพย์ใหม่ในปีงบประมาณ {selectedYear}{" "}
                หรือยังไม่มีข้อมูลบันทึกในระบบ
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
