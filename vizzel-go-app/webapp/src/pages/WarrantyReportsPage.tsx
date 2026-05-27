import { useEffect, useMemo, useState } from "react";
import {
  AlertCircle,
  CalendarClock,
  ShieldAlert,
  ShieldCheck,
} from "lucide-react";
import { apiRequest } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import type { ListRow } from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PageHeader } from "@/components/layout/PageHeader";
import { KpiCard, KpiCardGrid } from "@/components/layout/KpiCard";
import { TableToolbar, toToolbarColumns } from "@/components/data/TableToolbar";
import { DataTable, type Column, type SortState } from "@/components/data/DataTable";
import { DataTablePagination } from "@/components/data/DataTablePagination";

type Warranty = ListRow & {
  assetNumber?: string;
  assetName?: string;
  expiresInDays?: number | null;
};

type Filter = "lt90" | "lt60" | "lt30" | "expired";

type Summary = {
  active: number;
  expiring: number;
  expired: number;
};

function classifyWarranty(w: Warranty): Filter {
  if (w.status === "expired") return "expired";
  const days = w.expiresInDays ?? null;
  if (days != null) {
    if (days <= 0) return "expired";
    if (days < 30) return "lt30";
    if (days < 60) return "lt60";
  }
  return "lt90";
}

export function WarrantyReportsPage() {
  const { user } = useAuth();
  const [rows, setRows] = useState<Warranty[]>([]);
  const [summary, setSummary] = useState<Summary>({
    active: 0,
    expiring: 0,
    expired: 0,
  });
  const [filter, setFilter] = useState<Filter>("lt90");
  const [search, setSearch] = useState("");
  const [hidden, setHidden] = useState<string[]>([]);
  const [sort, setSort] = useState<SortState | null>({
    key: "expiresInDays",
    dir: "asc",
  });
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  useEffect(() => {
    const org = user?.organization_id ?? 1;
    apiRequest<{ warranties: ListRow[]; summary: Summary }>(
      `/api/v1/warranty/initial-data/${org}`,
    )
      .then((r) => {
        const list = (r.warranties || []).map((w) => ({
          ...w,
          assetNumber: w.title,
          assetName: w.subtitle,
          expiresInDays:
            typeof (w as Warranty).expiresInDays === "number"
              ? (w as Warranty).expiresInDays
              : w.status === "expired"
                ? -1
                : w.status === "expiring"
                  ? 25
                  : 120,
        })) as Warranty[];
        setRows(list);
        setSummary({
          active: r.summary?.active ?? 0,
          expiring: r.summary?.expiring ?? 0,
          expired: r.summary?.expired ?? 0,
        });
      })
      .catch(() => {
        setRows([]);
      });
  }, [user]);

  const counts = useMemo(() => {
    const next: Record<Filter, number> = {
      lt90: 0,
      lt60: 0,
      lt30: 0,
      expired: 0,
    };
    for (const w of rows) {
      const c = classifyWarranty(w);
      next[c] += 1;
      // <90 should also include lt60 + lt30
      if (c === "lt30") {
        next.lt60 += 1;
        next.lt90 += 1;
      } else if (c === "lt60") {
        next.lt90 += 1;
      }
    }
    return next;
  }, [rows]);

  const filtered = useMemo(() => {
    const list = rows.filter((w) => {
      const c = classifyWarranty(w);
      if (filter === "expired") return c === "expired";
      if (filter === "lt30") return c === "lt30";
      if (filter === "lt60") return c === "lt30" || c === "lt60";
      return c !== "expired";
    });
    const q = search.trim().toLowerCase();
    if (!q) return list;
    return list.filter((w) =>
      [w.assetNumber, w.assetName, w.title, w.subtitle]
        .filter(Boolean)
        .join(" ")
        .toLowerCase()
        .includes(q),
    );
  }, [rows, filter, search]);

  useEffect(() => {
    setPage(1);
  }, [filter, search, pageSize]);

  const total = filtered.length;
  const pageRows = filtered.slice((page - 1) * pageSize, page * pageSize);

  const columns: Column<Warranty>[] = [
    {
      key: "assetNumber",
      label: "เลขครุภัณฑ์",
      sortable: true,
      render: (w) => <span className="font-medium">{w.assetNumber || w.title}</span>,
    },
    {
      key: "assetName",
      label: "ชื่อสินทรัพย์",
      sortable: true,
      render: (w) => w.assetName || w.subtitle || "—",
    },
    {
      key: "expiresInDays",
      label: "วันคงเหลือ",
      sortable: true,
      render: (w) => {
        const d = w.expiresInDays;
        if (d == null) return "—";
        if (d <= 0)
          return <Badge variant="destructive">หมดประกัน</Badge>;
        if (d < 30)
          return (
            <Badge className="bg-red-100 text-red-700 hover:bg-red-100">
              เหลือ {d} วัน
            </Badge>
          );
        if (d < 60)
          return (
            <Badge className="bg-orange-100 text-orange-700 hover:bg-orange-100">
              เหลือ {d} วัน
            </Badge>
          );
        return (
          <Badge className="bg-emerald-100 text-emerald-700 hover:bg-emerald-100">
            เหลือ {d} วัน
          </Badge>
        );
      },
    },
    {
      key: "status",
      label: "สถานะ",
      sortable: true,
      render: (w) => (
        <Badge variant={w.status === "expired" ? "destructive" : "outline"}>
          {w.status === "expired"
            ? "หมดประกัน"
            : w.status === "expiring"
              ? "ใกล้หมดประกัน"
              : "อยู่ในประกัน"}
        </Badge>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="รายงานการรับประกัน"
        subtitle="ติดตามสินทรัพย์ตามช่วงประกัน เพื่อวางแผนต่ออายุหรือเปลี่ยนทดแทน"
        icon={<ShieldCheck className="h-5 w-5" />}
      />

      <KpiCardGrid cols={4}>
        <KpiCard
          label="เหลือประกัน < 90 วัน"
          value={counts.lt90}
          icon={CalendarClock}
          tone="emerald"
          onClick={() => setFilter("lt90")}
          testId="warranty-kpi-lt90"
        />
        <KpiCard
          label="เหลือประกัน < 60 วัน"
          value={counts.lt60}
          icon={ShieldCheck}
          tone="amber"
          onClick={() => setFilter("lt60")}
          testId="warranty-kpi-lt60"
        />
        <KpiCard
          label="เหลือประกัน < 30 วัน"
          value={counts.lt30}
          icon={ShieldAlert}
          tone="orange"
          onClick={() => setFilter("lt30")}
          testId="warranty-kpi-lt30"
        />
        <KpiCard
          label="หมดประกันแล้ว"
          value={counts.expired}
          icon={AlertCircle}
          tone="red"
          onClick={() => setFilter("expired")}
          testId="warranty-kpi-expired"
        />
      </KpiCardGrid>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">
            รายละเอียดสินทรัพย์ตามช่วงประกัน
          </CardTitle>
          <p className="text-muted-foreground text-sm">
            สรุป {summary.active.toLocaleString()} รายการอยู่ในประกัน,{" "}
            {summary.expiring.toLocaleString()} ใกล้หมด,{" "}
            {summary.expired.toLocaleString()} หมดแล้ว
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          <Tabs value={filter} onValueChange={(v) => setFilter(v as Filter)}>
            <TabsList className="grid h-auto w-full grid-cols-2 gap-1 bg-muted/50 p-1 sm:grid-cols-4">
              <TabsTrigger
                value="lt90"
                className="gap-2 data-[state=active]:bg-white data-[state=active]:shadow-sm"
                data-testid="warranty-pill-lt90"
              >
                น้อยกว่า 90 วัน
                <Badge variant="secondary" className="ml-1 px-1.5 text-[10px]">
                  {counts.lt90}
                </Badge>
              </TabsTrigger>
              <TabsTrigger
                value="lt60"
                className="gap-2 data-[state=active]:bg-white data-[state=active]:shadow-sm"
                data-testid="warranty-pill-lt60"
              >
                น้อยกว่า 60 วัน
                <Badge variant="secondary" className="ml-1 px-1.5 text-[10px]">
                  {counts.lt60}
                </Badge>
              </TabsTrigger>
              <TabsTrigger
                value="lt30"
                className="gap-2 data-[state=active]:bg-white data-[state=active]:shadow-sm"
                data-testid="warranty-pill-lt30"
              >
                น้อยกว่า 30 วัน
                <Badge variant="secondary" className="ml-1 px-1.5 text-[10px]">
                  {counts.lt30}
                </Badge>
              </TabsTrigger>
              <TabsTrigger
                value="expired"
                className="gap-2 data-[state=active]:bg-white data-[state=active]:shadow-sm"
                data-testid="warranty-pill-expired"
              >
                หมดประกันแล้ว
                <Badge variant="destructive" className="ml-1 px-1.5 text-[10px]">
                  {counts.expired}
                </Badge>
              </TabsTrigger>
            </TabsList>
          </Tabs>

          <TableToolbar
            search={search}
            onSearchChange={setSearch}
            searchPlaceholder="ค้นหาสินทรัพย์..."
            columns={toToolbarColumns(columns)}
            hiddenColumns={hidden}
            onHiddenChange={setHidden}
            testIdPrefix="warranty"
          />
          <DataTable
            columns={columns}
            rows={pageRows}
            hiddenColumns={hidden}
            sort={sort}
            onSortChange={setSort}
            emptyLabel="ไม่พบสินทรัพย์ในช่วงประกันนี้"
          />
          <DataTablePagination
            page={page}
            pageSize={pageSize}
            total={total}
            onPageChange={setPage}
            onPageSizeChange={setPageSize}
            testIdPrefix="warranty-pagination"
          />
        </CardContent>
      </Card>
    </div>
  );
}
