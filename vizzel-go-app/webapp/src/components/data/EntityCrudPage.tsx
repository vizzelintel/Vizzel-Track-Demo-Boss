import { useCallback, useEffect, useState } from "react";
import { apiRequest } from "@/lib/api";
import { unwrapListRows } from "@/lib/list-response";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-lg">{title}</CardTitle>
        {entityKind && (
          <Button className="h-8 px-3 text-xs" onClick={openCreate}>
            + {createLabel}
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
      {dialogOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="bg-background w-full max-w-md rounded-xl border border-border p-6 shadow-lg">
            <h3 className="mb-4 text-lg font-semibold">{editId ? "แก้ไข" : "เพิ่ม"}</h3>
            <label className="text-muted-foreground mb-1 block text-xs">ชื่อ</label>
            <Input value={name} onChange={(e) => setName(e.target.value)} className="mb-3" />
            {parentField && !editId && (
              <>
                <label className="text-muted-foreground mb-1 block text-xs">{parentField.label}</label>
                <select
                  className="border-input bg-background mb-4 h-9 w-full rounded-md border px-2 text-sm"
                  value={parentId}
                  onChange={(e) => setParentId(e.target.value)}
                >
                  <option value="">— เลือก —</option>
                  {parents.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.title}
                    </option>
                  ))}
                </select>
              </>
            )}
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setDialogOpen(false)}>
                ยกเลิก
              </Button>
              <Button onClick={save}>บันทึก</Button>
            </div>
          </div>
        </div>
      )}
    </Card>
  );
}
