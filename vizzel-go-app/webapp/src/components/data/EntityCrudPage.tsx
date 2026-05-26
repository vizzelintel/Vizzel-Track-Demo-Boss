import { useCallback, useEffect, useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { apiRequest } from "@/lib/api";
import { unwrapListRows } from "@/lib/list-response";
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
import { DataTable, type Column } from "./DataTable";

export type ListRow = {
  id: number;
  title: string;
  subtitle?: string;
  status?: string;
  value?: number;
};

type Props = {
  title: string;
  listEndpoint: string;
  entityKind?: string;
  parentField?: { label: string; listEndpoint: string };
  columns?: Column<ListRow>[];
  createLabel?: string;
};

export function EntityCrudPage({
  title,
  listEndpoint,
  entityKind,
  parentField,
  columns: customCols,
  createLabel = "เพิ่มรายการ",
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
      apiRequest<unknown>(parentField.listEndpoint).then((r) =>
        setParents(unwrapListRows(r)),
      );
    }
  }, [parentField]);

  const cols: Column<ListRow>[] =
    customCols ??
    [
      { key: "title", label: "ชื่อ" },
      { key: "subtitle", label: "รายละเอียด" },
      { key: "status", label: "สถานะ" },
    ];

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
      // Try a bulk endpoint first; gracefully fall back to per-id DELETE on 404/405.
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

  return (
    <Card>
      <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-2">
        <CardTitle className="text-lg">{title}</CardTitle>
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
            <Button size="sm" onClick={openCreate}>
              <Plus className="mr-2 size-4" />
              {createLabel}
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent>
        <DataTable
          columns={cols}
          rows={rows}
          loading={loading}
          onEdit={entityKind ? openEdit : undefined}
          selectable={Boolean(entityKind)}
          selectedIds={selectedIds}
          onSelectionChange={setSelectedIds}
        />
      </CardContent>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{editId ? "แก้ไข" : "เพิ่ม"} {title}</DialogTitle>
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
                <Select value={parentId || undefined} onValueChange={setParentId}>
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
            <Button variant="outline" type="button" onClick={() => setDialogOpen(false)}>
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
