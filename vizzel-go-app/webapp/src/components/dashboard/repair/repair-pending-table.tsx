'use client';

import { useState } from 'react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { ChevronLeft, ChevronRight } from 'lucide-react';

export interface RepairItem {
  id: number;
  assetNumber: string;
  assetName: string;
  reportDate: string;
  note: string;
  status: 'pending' | 'completed';
}

interface RepairPendingTableProps {
  data?: RepairItem[] | null;
}

export function RepairPendingTable({ data }: RepairPendingTableProps) {
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(5);

  const tableData = data ?? [];
  const totalPages = Math.ceil(tableData.length / pageSize);
  const paginatedData = tableData.slice((page - 1) * pageSize, page * pageSize);

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <CardTitle>รายการรอซ่อม</CardTitle>
            <CardDescription>สินทรัพย์ที่รอดำเนินการซ่อมบำรุง</CardDescription>
          </div>
          <Badge variant="secondary" className="w-fit">
            {tableData.length} รายการ
          </Badge>
        </div>
      </CardHeader>
      <CardContent>
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>รหัสสินทรัพย์</TableHead>
                <TableHead>ชื่อสินทรัพย์</TableHead>
                <TableHead>วันที่แจ้ง</TableHead>
                <TableHead>หมายเหตุ</TableHead>
                <TableHead>สถานะ</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {paginatedData.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={5}
                    className="text-muted-foreground py-8 text-center"
                  >
                    ไม่มีรายการรอซ่อม
                  </TableCell>
                </TableRow>
              ) : (
                paginatedData.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell className="font-medium">
                      {item.assetNumber}
                    </TableCell>
                    <TableCell>{item.assetName}</TableCell>
                    <TableCell>
                      {new Date(item.reportDate).toLocaleDateString('th-TH', {
                        year: 'numeric',
                        month: 'short',
                        day: 'numeric',
                      })}
                    </TableCell>
                    <TableCell className="max-w-[200px] truncate">
                      {item.note}
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant="outline"
                        className={
                          item.status === 'pending'
                            ? 'border-orange-200 bg-orange-50 text-orange-600'
                            : 'border-green-200 bg-green-50 text-green-600'
                        }
                      >
                        {item.status === 'pending' ? 'รอซ่อม' : 'ซ่อมเสร็จ'}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>

        {/* Pagination */}
        {tableData.length > 0 && (
          <div className="mt-4 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-2">
              <span className="text-muted-foreground text-sm">แสดง</span>
              <Select
                value={pageSize.toString()}
                onValueChange={(value) => {
                  setPageSize(Number(value));
                  setPage(1);
                }}
              >
                <SelectTrigger className="h-8 w-[70px]">
                  <SelectValue placeholder={pageSize} />
                </SelectTrigger>
                <SelectContent side="top">
                  {[5, 10, 20, 50].map((size) => (
                    <SelectItem key={size} value={size.toString()}>
                      {size}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <span className="text-muted-foreground text-sm">รายการ</span>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-muted-foreground text-sm">
                หน้า {page} จาก {totalPages}
              </span>
              <div className="flex items-center gap-1">
                <Button
                  variant="outline"
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page === 1}
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <Button
                  variant="outline"
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages}
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
