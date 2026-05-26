import { useCallback, useEffect, useState } from "react";
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

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await apiRequest<unknown>(listEndpoint);
      setRows(unwrapListRows(res));
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

  const remove = async (row: ListRow) => {
    if (!entityKind || !confirm(`ลบ "${row.title}"?`)) return;
    await apiRequest(`/api/v1/entities/${entityKind}/${row.id}`, { method: "DELETE" });
    load();
  };

  return (
    <Card>
      <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-2">
        <CardTitle className="text-lg">{title}</CardTitle>
        {entityKind && (
          <Button size="sm" onClick={openCreate}>
            {createLabel}
          </Button>
        )}
      </CardHeader>
      <CardContent>
        <DataTable
          columns={cols}
          rows={rows}
          loading={loading}
          onEdit={entityKind ? openEdit : undefined}
          onDelete={entityKind ? remove : undefined}
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
    </Card>
  );
}
