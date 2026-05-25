"use client";

import { useState } from "react";
import useSWR from "swr";
import { fetcher } from "@/lib/api";
import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
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
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight, Loader2 } from "lucide-react";
import { useDebounce } from "@/hooks/use-debounce";
import { TEST_IDS } from "@/components/test-ids";

export interface PersonalAssetItem {
  id: number;
  assetNumber: string;
  assetName: string;
  category: string;
  value: number;
  location: string;
  status: "active" | "repair" | "inactive" | "custom";
  statusLabel: string;
}

interface PersonalAssetsTableProps {
  initialData?: {
    data: PersonalAssetItem[];
    total: number;
  };
  selectedStatus?: string | null;
}

export function PersonalAssetsTable({
  initialData,
  selectedStatus,
}: PersonalAssetsTableProps) {
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebounce(search, 500);

  // Use SWR to fetch data from the server
  // This replaces getPersonalAssets from data-service for client-side fetches
  const queryString = new URLSearchParams({
    page: page.toString(),
    pageSize: pageSize.toString(),
  });
  if (debouncedSearch) queryString.append("search", debouncedSearch);
  if (selectedStatus) queryString.append("status", selectedStatus);

  const { data, isLoading, error } = useSWR(
    `/dashboard/personal/assets?${queryString.toString()}`,
    fetcher,
    {
      fallbackData:
        page === 1 && !debouncedSearch && !selectedStatus
          ? { data: initialData?.data || [], total: initialData?.total || 0 }
          : undefined,
      keepPreviousData: true,
    },
  );

  // Normalize the data response structure from API fetcher vs fallbackData
  // If `data` is from network, it's usually { data: { data: [...], total: ... } } because of nestjs wrapped in data
  // If `data` is fallbackData, it's { data: [...], total: ... }
  const isNestedResponse =
    data &&
    "data" in data &&
    typeof data.data === "object" &&
    data.data !== null &&
    !Array.isArray(data.data) &&
    "data" in data.data;

  const payload = isNestedResponse ? data.data : data;

  const tableData = Array.isArray(payload?.data)
    ? payload.data
    : Array.isArray(payload)
      ? payload
      : [];

  const total = payload?.total ?? initialData?.total ?? 0;
  const totalPages = Math.ceil(total / pageSize);

  // If page is out of bounds due to a filter change, reset to page 1
  if (page > totalPages && totalPages > 0) {
    setPage(1);
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <CardTitle>รายการสินทรัพย์ที่ดูแล</CardTitle>
            <CardDescription>สินทรัพย์ทั้งหมดที่คุณรับผิดชอบ</CardDescription>
          </div>
          <div className="flex items-center gap-2">
            <div className="relative max-w-sm">
              <Search className="text-muted-foreground absolute left-2.5 top-2.5 h-4 w-4" />
              <Input
                placeholder="ค้นหาชื่อหรือรหัสสินทรัพย์..."
                className="pl-8"
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setPage(1); // Reset page on search
                }}
                data-testid={TEST_IDS.DASHBOARD_PERSONAL.INPUT_SEARCH}
              />
            </div>
            {selectedStatus && (
              <Badge variant="outline" className="h-9 whitespace-nowrap">
                {selectedStatus}
              </Badge>
            )}
            <Badge variant="secondary" className="h-9 w-fit whitespace-nowrap">
              {total} รายการ
            </Badge>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="rounded-md border">
          <Table data-testid={TEST_IDS.DASHBOARD_PERSONAL.TABLE_ASSETS}>
            <TableHeader>
              <TableRow>
                <TableHead>รหัสสินทรัพย์</TableHead>
                <TableHead>ชื่อสินทรัพย์</TableHead>
                <TableHead>หมวดหมู่</TableHead>
                <TableHead className="text-right">มูลค่า</TableHead>
                <TableHead>ตำแหน่ง</TableHead>
                <TableHead>สถานะ</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading && !tableData.length ? (
                <TableRow>
                  <TableCell
                    colSpan={6}
                    className="text-muted-foreground py-8 text-center"
                  >
                    <div className="flex items-center justify-center gap-2">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      กำลังโหลดข้อมูล...
                    </div>
                  </TableCell>
                </TableRow>
              ) : tableData.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={6}
                    className="text-muted-foreground py-8 text-center"
                  >
                    ไม่มีสินทรัพย์ที่ดูแล
                  </TableCell>
                </TableRow>
              ) : (
                tableData.map((item: PersonalAssetItem) => (
                  <TableRow key={item.id} data-testid={TEST_IDS.DASHBOARD_PERSONAL.TABLE_ROW(item.id)}>
                    <TableCell className="font-medium">
                      {item.assetNumber}
                    </TableCell>
                    <TableCell>{item.assetName}</TableCell>
                    <TableCell>{item.category}</TableCell>
                    <TableCell className="text-right">
                      ฿{item.value.toLocaleString()}
                    </TableCell>
                    <TableCell className="max-w-[150px] truncate">
                      {item.location}
                    </TableCell>
                    <TableCell>
                      {item.statusLabel === "-" ||
                      item.statusLabel === "ไม่ระบุ" ? (
                        <span className="text-muted-foreground">-</span>
                      ) : (
                        <Badge variant="outline" className="whitespace-nowrap">
                          {item.statusLabel}
                        </Badge>
                      )}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>

        {/* Pagination */}
        {total > 0 && (
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
                <SelectTrigger className="h-8 w-[70px]" data-testid={TEST_IDS.DASHBOARD_PERSONAL.DROPDOWN_PAGE_SIZE}>
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
                  data-testid={TEST_IDS.DASHBOARD_PERSONAL.BUTTON_PREV_PAGE}
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <Button
                  variant="outline"
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages || totalPages === 0}
                  data-testid={TEST_IDS.DASHBOARD_PERSONAL.BUTTON_NEXT_PAGE}
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
