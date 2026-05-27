"use client";

import * as React from "react";
import useSWR from "swr";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import { Check, X, AlertCircle, Search, Loader2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
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
import { ChevronLeft, ChevronRight } from "lucide-react";
import { fetcher } from "@/lib/api";
import { useDebounce } from "@/hooks/use-debounce";
import type { AuditKpiData } from "./audit-kpi-summary";

export interface AuditAssetRow {
  id: number;
  assetNumber: string;
  assetName: string;
  buildingName: string | null;
  roomName: string | null;
  roomNumber: string | null;
  users: Array<{ id: number; name: string; surname: string }>;
  lastCheckedDate?: string | null;
}

interface AuditTableEnvelope {
  data: AuditAssetRow[];
  total: number;
}

type AuditTableFilter = "checked" | "not-checked" | "not-found";

const FILTER_ENDPOINT: Record<AuditTableFilter, string> = {
  checked: "assets-checked",
  "not-checked": "assets-not-checked",
  "not-found": "assets-not-found",
};

interface AuditTableProps {
  organizationID?: number | null;
  filter: AuditTableFilter;
  initialData?: AuditTableEnvelope | null;
  jobIds?: number[];
}

function formatThai(date?: string | null): string {
  if (!date) return "ยังไม่เคยตรวจ";
  const d = new Date(date);
  if (Number.isNaN(d.getTime())) return "ยังไม่เคยตรวจ";
  return new Intl.DateTimeFormat("th-TH", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(d);
}

function AuditTable({
  organizationID,
  filter,
  initialData,
  jobIds,
}: AuditTableProps) {
  const [page, setPage] = React.useState(1);
  const [pageSize, setPageSize] = React.useState(10);
  const [search, setSearch] = React.useState("");
  const debouncedSearch = useDebounce(search, 400);

  const jobIdsParam =
    jobIds && jobIds.length > 0 ? `&jobIds=${jobIds.join(",")}` : "";

  const endpoint = organizationID
    ? `/audit/${FILTER_ENDPOINT[filter]}/${organizationID}?page=${page}&pageSize=${pageSize}${jobIdsParam}`
    : null;

  const useFallback =
    page === 1 &&
    filter === "not-checked" &&
    !jobIdsParam &&
    !!initialData;

  const { data, isLoading } = useSWR<AuditTableEnvelope>(endpoint, fetcher, {
    fallbackData: useFallback ? (initialData ?? undefined) : undefined,
    keepPreviousData: true,
    revalidateOnFocus: false,
  });

  const allRows = data?.data ?? [];
  const total = data?.total ?? 0;

  const filtered = React.useMemo(() => {
    if (!debouncedSearch) return allRows;
    const needle = debouncedSearch.toLowerCase();
    return allRows.filter((row) =>
      `${row.assetName} ${row.assetNumber}`.toLowerCase().includes(needle),
    );
  }, [allRows, debouncedSearch]);
  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between gap-3">
        <div className="relative max-w-sm flex-1">
          <Search className="text-muted-foreground absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2" />
          <Input
            placeholder="ค้นหาสินทรัพย์ด้วยชื่อ..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            className="pl-9"
          />
        </div>
        <span className="text-muted-foreground text-sm">
          แสดง {filtered.length.toLocaleString()} / {total.toLocaleString()} รายการ
        </span>
      </div>

      <div className="overflow-x-auto rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>รหัสสินทรัพย์</TableHead>
              <TableHead>ชื่อสินทรัพย์</TableHead>
              <TableHead>สถานที่ล่าสุด</TableHead>
              <TableHead>ผู้รับผิดชอบ</TableHead>
              <TableHead>ล่าสุดตรวจเมื่อไหร่</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading && filtered.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="h-24 text-center">
                  <div className="flex items-center justify-center gap-2 text-muted-foreground">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    กำลังโหลดข้อมูล...
                  </div>
                </TableCell>
              </TableRow>
            ) : filtered.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="h-24 text-center text-muted-foreground">
                  ไม่มีข้อมูล
                </TableCell>
              </TableRow>
            ) : (
              filtered.map((row) => {
                const location = row.buildingName && row.roomName
                  ? `${row.buildingName} ${row.roomName}${row.roomNumber && row.roomNumber !== row.roomName ? ` ห้อง ${row.roomNumber}` : ""}`
                  : row.buildingName || row.roomName || "-";
                const names = (row.users ?? [])
                  .map((u) => `${u.name || ""} ${u.surname || ""}`.trim())
                  .filter(Boolean)
                  .join(", ");
                return (
                  <TableRow key={row.id}>
                    <TableCell className="font-medium">
                      {row.assetNumber || "-"}
                    </TableCell>
                    <TableCell className="max-w-[200px] truncate" title={row.assetName}>
                      {row.assetName || "-"}
                    </TableCell>
                    <TableCell className="max-w-[220px] truncate" title={location}>
                      {location}
                    </TableCell>
                    <TableCell>
                      {names || <span className="text-muted-foreground">-</span>}
                    </TableCell>
                    <TableCell>{formatThai(row.lastCheckedDate)}</TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>

      {total > 0 && (
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-2">
            <span className="text-muted-foreground text-sm">แสดง</span>
            <Select
              value={pageSize.toString()}
              onValueChange={(v) => {
                setPageSize(Number(v));
                setPage(1);
              }}
            >
              <SelectTrigger className="h-8 w-[80px]">
                <SelectValue placeholder={pageSize} />
              </SelectTrigger>
              <SelectContent side="top">
                {[10, 20, 50, 100].map((size) => (
                  <SelectItem key={size} value={size.toString()}>
                    {size}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <span className="text-muted-foreground text-sm">รายการ/หน้า</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-muted-foreground text-sm">
              หน้า {page} จาก {totalPages}
            </span>
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
              disabled={page >= totalPages}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

interface AuditDetailTablesProps {
  organizationID?: number | null;
  summary?: AuditKpiData | null;
  initialTableData?: AuditTableEnvelope | null;
  jobIds?: number[];
}

export function AuditDetailTables({
  organizationID,
  summary,
  initialTableData,
  jobIds,
}: AuditDetailTablesProps) {
  const [activeTab, setActiveTab] = React.useState<AuditTableFilter>("checked");

  return (
    <div className="px-4 lg:px-6">
      <Card>
        <CardHeader>
          <CardTitle>
            รายการสินทรัพย์: ตรวจนับแล้ว / ยังไม่ได้ตรวจนับ / ยังไม่พบ
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Tabs
            value={activeTab}
            onValueChange={(v) => setActiveTab(v as AuditTableFilter)}
            className="w-full"
          >
            <TabsList className="grid h-auto w-full grid-cols-3 gap-1 p-1">
              <TabsTrigger
                value="checked"
                className="flex items-center gap-1 px-2 py-2 text-xs sm:gap-2 sm:px-3 sm:text-sm"
              >
                <Check className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                <span className="hidden sm:inline">รายการที่ตรวจนับแล้ว</span>
                <span className="sm:hidden">ตรวจนับแล้ว</span>
                {summary && (
                  <Badge variant="secondary" className="ml-1 h-4 px-1 text-[10px] sm:h-5 sm:px-1.5 sm:text-xs">
                    {summary.checked}
                  </Badge>
                )}
              </TabsTrigger>
              <TabsTrigger
                value="not-checked"
                className="flex items-center gap-1 px-2 py-2 text-xs sm:gap-2 sm:px-3 sm:text-sm"
              >
                <X className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                <span className="hidden sm:inline">รายการยังไม่ได้ตรวจนับ</span>
                <span className="sm:hidden">ยังไม่ตรวจ</span>
                {summary && (
                  <Badge variant="secondary" className="ml-1 h-4 px-1 text-[10px] sm:h-5 sm:px-1.5 sm:text-xs">
                    {summary.notChecked}
                  </Badge>
                )}
              </TabsTrigger>
              <TabsTrigger
                value="not-found"
                className="flex items-center gap-1 px-2 py-2 text-xs sm:gap-2 sm:px-3 sm:text-sm"
              >
                <AlertCircle className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                <span className="hidden sm:inline">
                  รายการยังไม่พบ (ปิดจ็อบแล้วไม่ได้ตรวจนับ)
                </span>
                <span className="sm:hidden">ยังไม่พบ</span>
                {summary && (
                  <Badge variant="secondary" className="ml-1 h-4 px-1 text-[10px] sm:h-5 sm:px-1.5 sm:text-xs">
                    {summary.notFound}
                  </Badge>
                )}
              </TabsTrigger>
            </TabsList>

            <TabsContent value="checked" className="mt-4">
              <AuditTable
                organizationID={organizationID}
                filter="checked"
                jobIds={jobIds}
              />
            </TabsContent>
            <TabsContent value="not-checked" className="mt-4">
              <AuditTable
                organizationID={organizationID}
                filter="not-checked"
                initialData={initialTableData}
                jobIds={jobIds}
              />
            </TabsContent>
            <TabsContent value="not-found" className="mt-4">
              <AuditTable
                organizationID={organizationID}
                filter="not-found"
                jobIds={jobIds}
              />
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}
