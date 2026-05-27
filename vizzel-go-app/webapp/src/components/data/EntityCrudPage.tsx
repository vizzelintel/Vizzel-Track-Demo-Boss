import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import { Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { apiRequest } from "@/lib/api";
import { unwrapListRows, type ListRowExtra } from "@/lib/list-response";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DataTable,
  type Column,
  type SortState,
} from "./DataTable";
import { DataTablePagination } from "./DataTablePagination";
import { TableToolbar, toToolbarColumns } from "./TableToolbar";

export type ListRow = ListRowExtra;

type Props = {
  title: string;
  /** Optional icon + subtitle shown in the card header */
  subtitle?: ReactNode;
  icon?: ReactNode;
  listEndpoint: string;
  entityKind?: string;
  parentField?: { label: string; listEndpoint: string };
  columns?: Column<ListRow>[];
  createLabel?: string;
  searchPlaceholder?: string;
  /** Disable pagination / search when the dataset is tiny (default false) */
  hidePagination?: boolean;
  /** Hide the search + columns toolbar (default false) */
  hideToolbar?: boolean;
  /** Optional slot rendered to the right of the search/columns row */
  toolbarRight?: ReactNode;
};

export function EntityCrudPage({
  title,
  subtitle,
  icon,
  listEndpoint,
  entityKind,
  parentField,
  columns: customCols,
  createLabel = "เพิ่มรายการ",
  searchPlaceholder,
  hidePagination,
  hideToolbar,
  toolbarRight,
}: Props) {
  const [rows, setRows] = useState<ListRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editId, setEditId] = useState<number | null>(null);
  const [name, setName] = useState("");
  const [parentId, setParentId] = useState("");
  const [parents, setParents] = useState<ListRow[]>([]);
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [bulkOpen, setBulkOpen] = useState(false);
  const [bulkDeleting, setBulkDeleting] = useState(false);

  const [search, setSearch] = useState("");
  const [hiddenColumns, setHiddenColumns] = useState<string[]>([]);
  const [sort, setSort] = useState<SortState | null>(null);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await apiRequest<unknown>(listEndpoint);
      setRows(unwrapListRows(res));
      setSelectedIds([]);
    } finally {
      setLoading(false);
    }
  }, [listEndpoint]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    if (parentField) {
      apiRequest<unknown>(parentField.listEndpoint)
        .then((r) => setParents(unwrapListRows(r)))
        .catch(() => setParents([]));
    }
  }, [parentField]);

  const cols: Column<ListRow>[] =
    customCols ??
    [
      { key: "title", label: "ชื่อ", sortable: true },
      { key: "subtitle", label: "รายละเอียด" },
      { key: "status", label: "สถานะ" },
    ];

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter((r) => {
      const haystack = [r.title, r.subtitle, r.status, String(r.id)]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      return haystack.includes(q);
    });
  }, [rows, search]);

  const total = filtered.length;
  const pageRows = hidePagination
    ? filtered
    : filtered.slice((page - 1) * pageSize, page * pageSize);

  useEffect(() => {
    setPage(1);
  }, [search, pageSize]);

  const openCreate = () => {
    setEditId(null);
    setName("");
    setParentId("");
    setDialogOpen(true);
  };

  const openEdit = (row: ListRow) => {
    setEditId(row.id);
    setName(row.title);
    setDialogOpen(true);
  };

  const save = async () => {
    if (!entityKind) return;
    if (editId) {
      await apiRequest(`/api/v1/entities/${entityKind}/${editId}`, {
        method: "PATCH",
        body: JSON.stringify({ name }),
      });
    } else {
      await apiRequest(`/api/v1/entities/${entityKind}`, {
        method: "POST",
        body: JSON.stringify({ name, parent_id: Number(parentId) || 0 }),
      });
    }
    setDialogOpen(false);
    load();
  };

  const bulkDelete = async () => {
    if (!entityKind || selectedIds.length === 0) return;
    setBulkDeleting(true);
    let success = 0;
    let failed = 0;
    try {
      try {
        await apiRequest(`/api/v1/entities/${entityKind}/bulk-delete`, {
          method: "POST",
          body: JSON.stringify({ ids: selectedIds }),
        });
        success = selectedIds.length;
      } catch {
        for (const id of selectedIds) {
          try {
            await apiRequest(`/api/v1/entities/${entityKind}/${id}`, {
              method: "DELETE",
            });
            success += 1;
          } catch {
            failed += 1;
          }
        }
      }
      if (success > 0 && failed === 0) {
        toast.success(`ลบสำเร็จ ${success} รายการ`);
      } else if (success > 0 && failed > 0) {
        toast.warning(
          `ลบสำเร็จ ${success} รายการ และล้มเหลว ${failed} รายการ`,
        );
      } else {
        toast.error("ลบรายการที่เลือกไม่สำเร็จ");
      }
      setBulkOpen(false);
      setSelectedIds([]);
      load();
    } finally {
      setBulkDeleting(false);
    }
  };

  const placeholder = searchPlaceholder ?? `ค้นหา${title}...`;

  return (
    <Card>
      <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-3">
          {icon && (
            <div className="bg-primary/10 text-primary flex h-9 w-9 items-center justify-center rounded-lg border">
              {icon}
            </div>
          )}
          <div>
            <CardTitle className="text-lg">{title}</CardTitle>
            {subtitle && (
              <p className="text-muted-foreground mt-0.5 text-xs">{subtitle}</p>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2">
          {entityKind && selectedIds.length > 0 && (
            <Button
              type="button"
              variant="destructive"
              size="sm"
              onClick={() => setBulkOpen(true)}
              data-testid="entity-bulk-delete"
            >
              <Trash2 className="mr-2 size-4" />
              ลบที่เลือก ({selectedIds.length})
            </Button>
          )}
          {entityKind && (
            <Button size="sm" onClick={openCreate} data-testid="entity-create">
              <Plus className="mr-2 size-4" />
              {createLabel}
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {!hideToolbar && (
          <TableToolbar
            search={search}
            onSearchChange={setSearch}
            searchPlaceholder={placeholder}
            columns={toToolbarColumns(cols)}
            hiddenColumns={hiddenColumns}
            onHiddenChange={setHiddenColumns}
            rightSlot={toolbarRight}
            testIdPrefix={`entity-${entityKind ?? "list"}`}
          />
        )}
        <DataTable
          columns={cols}
          rows={pageRows}
          loading={loading}
          onEdit={entityKind ? openEdit : undefined}
          selectable={Boolean(entityKind)}
          selectedIds={selectedIds}
          onSelectionChange={setSelectedIds}
          hiddenColumns={hiddenColumns}
          sort={sort}
          onSortChange={setSort}
        />
        {!hidePagination && total > pageSize && (
          <DataTablePagination
            page={page}
            pageSize={pageSize}
            total={total}
            onPageChange={setPage}
            onPageSizeChange={setPageSize}
            testIdPrefix={`entity-${entityKind ?? "list"}-pagination`}
          />
        )}
      </CardContent>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {editId ? "แก้ไข" : "เพิ่ม"} {title}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="entity-name">ชื่อ</Label>
              <Input
                id="entity-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>
            {parentField && !editId && (
              <div className="space-y-2">
                <Label>{parentField.label}</Label>
                <Select
                  value={parentId || undefined}
                  onValueChange={setParentId}
                >
                  <SelectTrigger>
                    <SelectValue placeholder={`เลือก${parentField.label}`} />
                  </SelectTrigger>
                  <SelectContent>
                    {parents.map((p) => (
                      <SelectItem key={p.id} value={String(p.id)}>
                        {p.title}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              variant="outline"
              type="button"
              onClick={() => setDialogOpen(false)}
            >
              ยกเลิก
            </Button>
            <Button type="button" onClick={save}>
              บันทึก
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={bulkOpen} onOpenChange={setBulkOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>ยืนยันการลบ</AlertDialogTitle>
            <AlertDialogDescription>
              ลบ {title} จำนวน {selectedIds.length} รายการ?
              การดำเนินการนี้ไม่สามารถกู้คืนได้
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={bulkDeleting}>ยกเลิก</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault();
                bulkDelete();
              }}
              disabled={bulkDeleting}
              className="bg-red-600 hover:bg-red-700 text-white"
              data-testid="entity-bulk-delete-confirm"
            >
              {bulkDeleting ? "กำลังลบ..." : "ยืนยันลบ"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  );
}
