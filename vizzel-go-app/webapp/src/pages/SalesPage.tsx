import { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Paperclip, Plus, ShoppingCart } from "lucide-react";
import { toast } from "sonner";
import {
  disposalStatusLabel,
  listDisposalLots,
  downloadDisposalTemplate,
  type DisposalLot,
} from "@/lib/disposal";
import { formatThaiDate } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import {
  PageHeader,
  standardImportExportToolbar,
} from "@/components/layout/PageHeader";
import { DataTable, type Column, type SortState } from "@/components/data/DataTable";
import { TableToolbar, toToolbarColumns } from "@/components/data/TableToolbar";
import { DataTablePagination } from "@/components/data/DataTablePagination";

function statusBadge(status: string) {
  const variant =
    status === "approved"
      ? "default"
      : status === "rejected"
        ? "destructive"
        : status === "pending_approval"
          ? "secondary"
          : "outline";
  return (
    <Badge variant={variant}>{disposalStatusLabel[status] ?? status}</Badge>
  );
}

export function SalesPage() {
  const [rows, setRows] = useState<DisposalLot[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [hidden, setHidden] = useState<string[]>([]);
  const [sort, setSort] = useState<SortState | null>({
    key: "createdAt",
    dir: "desc",
  });
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [selectedIds, setSelectedIds] = useState<number[]>([]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setRows(await listDisposalLots());
      setSelectedIds([]);
    } catch {
      toast.error("โหลดรายการ LOT จำหน่ายไม่สำเร็จ");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const handleTemplate = async () => {
    try {
      await downloadDisposalTemplate();
      toast.success("ดาวน์โหลดเทมเพลตสำเร็จ");
    } catch {
      toast.error("ไม่สามารถดาวน์โหลดเทมเพลตได้");
    }
  };

  const handleImport = () => {
    toast.info("กรุณาใช้หน้า + ออกจำหน่าย เพื่อสร้าง LOT จากไฟล์");
  };

  const handleExport = () => {
    if (!rows.length) {
      toast.info("ยังไม่มีข้อมูลให้ส่งออก");
      return;
    }
    const header = "Lot,วันที่จำหน่าย,ผู้ซื้อ/ผู้รับ,จำนวนเงิน,จำนวนรายการ,สถานะ\n";
    const body = rows
      .map((r) =>
        [
          r.lot ?? "",
          r.disposalDate ?? "",
          r.buyer ?? "",
          r.amount ?? "",
          r.assetCount ?? 0,
          disposalStatusLabel[r.status] ?? r.status,
        ]
          .map((v) => `"${String(v).replace(/"/g, '""')}"`)
          .join(","),
      )
      .join("\n");
    const blob = new Blob(["\ufeff" + header + body], {
      type: "text/csv;charset=utf-8;",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `sales_lots_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("ส่งออกข้อมูลสำเร็จ");
  };

  const columns: Column<DisposalLot & { id: number }>[] = useMemo(
    () => [
      {
        key: "lot",
        label: "Lot",
        sortable: true,
        sortAccessor: (r) => r.lot ?? "",
        render: (r) => (
          <Link
            to={`/sales/create?id=${r.id}`}
            className="font-medium text-primary hover:underline"
          >
            {r.lot || "—"}
          </Link>
        ),
      },
      {
        key: "assets",
        label: "สินทรัพย์",
        sortable: true,
        sortAccessor: (r) => r.assetCount ?? 0,
        render: (r) => {
          const first = r.sampleAssets?.[0];
          const extra = (r.assetCount ?? 0) - 1;
          return (
            <div className="min-w-[160px]">
              <span className="font-medium">
                {first?.assetName ?? first?.assetNumber ?? "ไม่มีรายการ"}
              </span>
              {extra > 0 && (
                <p className="text-muted-foreground text-xs">
                  และอีก {extra} รายการ
                </p>
              )}
              <p className="text-muted-foreground text-xs">
                รวม {r.assetCount ?? 0} รายการ
              </p>
            </div>
          );
        },
      },
      {
        key: "reason",
        label: "เหตุผล",
        sortable: true,
        sortAccessor: (r) => r.reason ?? "",
        render: (r) => (
          <span className="line-clamp-2 max-w-[240px] text-sm">
            {r.reason ?? "—"}
          </span>
        ),
      },
      {
        key: "createdAt",
        label: "วันที่สร้าง",
        sortable: true,
        sortAccessor: (r) => r.createdAt ?? r.disposalDate ?? "",
        render: (r) => (
          <span className="whitespace-nowrap">
            {formatThaiDate(r.createdAt ?? r.disposalDate ?? null)}
          </span>
        ),
      },
      {
        key: "docs",
        label: "เอกสาร",
        render: (r) => {
          const count = r.docs?.length ?? 0;
          if (count === 0)
            return <span className="text-muted-foreground">—</span>;
          return (
            <span className="inline-flex items-center gap-1 text-primary">
              <Paperclip className="h-3.5 w-3.5" />
              {count}
            </span>
          );
        },
      },
      {
        key: "status",
        label: "สถานะ",
        sortable: true,
        sortAccessor: (r) => r.status,
        render: (r) => statusBadge(r.status),
      },
    ],
    [],
  );

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter((r) =>
      [
        r.lot,
        r.reason,
        r.buyer,
        ...(r.sampleAssets?.map((a) => `${a.assetNumber} ${a.assetName}`) ??
          []),
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase()
        .includes(q),
    );
  }, [rows, search]);

  useEffect(() => {
    setPage(1);
  }, [search, pageSize]);

  const total = filtered.length;
  const pageRows = filtered.slice((page - 1) * pageSize, page * pageSize);

  return (
    <div className="space-y-6">
      <PageHeader
        title="ออกจำหน่าย"
        subtitle="จัดการ LOT การจำหน่ายครุภัณฑ์จำนวนมาก (รองรับนำเข้า CSV หลายร้อย–พันรายการต่อ LOT)"
        icon={<ShoppingCart className="h-5 w-5" />}
        toolbar={standardImportExportToolbar({
          onTemplate: handleTemplate,
          onImport: handleImport,
          onExport: handleExport,
          testIdPrefix: "sales",
        })}
        primaryAction={
          <Button asChild data-testid="sales-create">
            <Link to="/sales/create">
              <Plus className="mr-2 h-4 w-4" />
              ออกจำหน่าย
            </Link>
          </Button>
        }
      />

      <Card>
        <CardContent className="space-y-3 p-4 lg:p-6">
          <TableToolbar
            search={search}
            onSearchChange={setSearch}
            searchPlaceholder="ค้นหา Lot, เหตุผล, สินทรัพย์..."
            columns={toToolbarColumns(columns)}
            hiddenColumns={hidden}
            onHiddenChange={setHidden}
            testIdPrefix="sales"
          />
          <DataTable
            columns={columns}
            rows={pageRows as (DisposalLot & { id: number })[]}
            loading={loading}
            selectable
            selectedIds={selectedIds}
            onSelectionChange={setSelectedIds}
            hiddenColumns={hidden}
            sort={sort}
            onSortChange={setSort}
            emptyLabel="ยังไม่มี LOT จำหน่าย"
          />
          <DataTablePagination
            page={page}
            pageSize={pageSize}
            total={total}
            onPageChange={setPage}
            onPageSizeChange={setPageSize}
            testIdPrefix="sales-pagination"
          />
        </CardContent>
      </Card>
    </div>
  );
}
