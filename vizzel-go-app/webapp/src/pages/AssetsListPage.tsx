import { useCallback, useEffect, useMemo, useState } from "react";
import {
  apiRequest,
  type Asset,
  type AssetListPage,
  type AssetReferenceData,
} from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { AssetDialog } from "@/components/assets/AssetDialog";
import { apiDownload } from "@/lib/api";

function statusBadge(name?: string) {
  const n = name || "ใช้งาน";
  const base = "inline-flex rounded-full px-2 py-0.5 text-xs font-medium";
  if (n === "ซ่อมบำรุง") return `${base} bg-amber-100 text-amber-800`;
  if (n === "จำหน่ายแล้ว") return `${base} bg-slate-200 text-slate-700`;
  return `${base} bg-emerald-100 text-emerald-800`;
}

export function AssetsListPage() {
  const [ref, setRef] = useState<AssetReferenceData | null>(null);
  const [items, setItems] = useState<Asset[]>([]);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [classId, setClassId] = useState("");
  const [status, setStatus] = useState("");
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Asset | null>(null);
  const [selected, setSelected] = useState<Set<number>>(new Set());

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search.trim()), 400);
    return () => clearTimeout(t);
  }, [search]);

  useEffect(() => {
    apiRequest<AssetReferenceData>("/api/v1/assets/initial-data")
      .then(setRef)
      .catch(() => setRef(null));
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const q = new URLSearchParams({
        page: String(page),
        page_size: String(pageSize),
      });
      if (debouncedSearch) q.set("search", debouncedSearch);
      if (categoryId) q.set("category_id", categoryId);
      if (classId) q.set("class_id", classId);
      if (status) q.set("status", status);
      const res = await apiRequest<AssetListPage>(`/api/v1/assets?${q}`);
      setItems(res.data);
      setTotal(res.total);
      setTotalPages(res.total_pages || 1);
    } finally {
      setLoading(false);
    }
  }, [page, pageSize, debouncedSearch, categoryId, classId, status]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    setPage(1);
  }, [debouncedSearch, categoryId, classId, status, pageSize]);

  const rangeLabel = useMemo(() => {
    if (total === 0) return "0 รายการ";
    const from = (page - 1) * pageSize + 1;
    const to = Math.min(page * pageSize, total);
    return `${from}–${to} จาก ${total} รายการ`;
  }, [page, pageSize, total]);

  return (
    <Card>
      <CardHeader className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <CardTitle className="text-lg">รายการสินทรัพย์</CardTitle>
          <p className="text-muted-foreground mt-1 text-sm">{rangeLabel}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            variant="outline"
            className="h-8 px-3 text-xs"
            onClick={() => apiDownload("/api/v1/assets/template", "asset-template.csv")}
          >
            เทมเพลต
          </Button>
          <label className="inline-flex h-8 cursor-pointer items-center rounded-lg border border-border px-3 text-xs hover:bg-muted">
            นำเข้า CSV
            <input
              type="file"
              accept=".csv"
              className="hidden"
              onChange={async (e) => {
                const file = e.target.files?.[0];
                if (!file) return;
                const fd = new FormData();
                fd.append("file", file);
                const token = localStorage.getItem("vizzel_access_token");
                await fetch("/api/v1/assets/import", {
                  method: "POST",
                  headers: token ? { Authorization: `Bearer ${token}` } : {},
                  body: fd,
                });
                load();
              }}
            />
          </label>
          {selected.size > 0 && (
            <Button
              variant="outline"
              className="h-8 px-3 text-xs text-destructive"
              onClick={async () => {
                if (!confirm(`ลบ ${selected.size} รายการ?`)) return;
                await apiRequest("/api/v1/assets/bulk-delete", {
                  method: "PATCH",
                  body: JSON.stringify({ assetIDs: [...selected] }),
                });
                setSelected(new Set());
                load();
              }}
            >
              ลบที่เลือก ({selected.size})
            </Button>
          )}
          <Button
            variant="outline"
            className="h-8 px-3 text-xs"
            onClick={() => {
              const q = new URLSearchParams();
              if (debouncedSearch) q.set("search", debouncedSearch);
              if (categoryId) q.set("category_id", categoryId);
              if (status) q.set("status", status);
              apiDownload(`/api/v1/assets/export?${q}`, "assets.csv");
            }}
          >
            ส่งออก CSV
          </Button>
          <Button
            className="h-8 px-3 text-xs"
            onClick={() => {
              setEditing(null);
              setDialogOpen(true);
            }}
          >
            + เพิ่มสินทรัพย์
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-wrap items-end gap-3">
          <div className="min-w-[200px] flex-1">
            <label className="text-muted-foreground mb-1 block text-xs">ค้นหา</label>
            <Input
              placeholder="เลขที่, ชื่อ, RFID..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <div>
            <label className="text-muted-foreground mb-1 block text-xs">หมวด</label>
            <select
              className="border-input bg-background h-9 min-w-[140px] rounded-md border px-2 text-sm"
              value={categoryId}
              onChange={(e) => setCategoryId(e.target.value)}
            >
              <option value="">ทั้งหมด</option>
              {ref?.categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.title}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-muted-foreground mb-1 block text-xs">ชนิด</label>
            <select
              className="border-input bg-background h-9 min-w-[140px] rounded-md border px-2 text-sm"
              value={classId}
              onChange={(e) => setClassId(e.target.value)}
            >
              <option value="">ทั้งหมด</option>
              {ref?.classes.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.title}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-muted-foreground mb-1 block text-xs">สถานะ</label>
            <select
              className="border-input bg-background h-9 min-w-[140px] rounded-md border px-2 text-sm"
              value={status}
              onChange={(e) => setStatus(e.target.value)}
            >
              <option value="">ทั้งหมด</option>
              {ref?.statuses.map((s) => (
                <option key={s.id} value={s.title}>
                  {s.title}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-muted-foreground mb-1 block text-xs">ต่อหน้า</label>
            <select
              className="border-input bg-background h-9 rounded-md border px-2 text-sm"
              value={pageSize}
              onChange={(e) => setPageSize(Number(e.target.value))}
            >
              {[10, 20, 50].map((n) => (
                <option key={n} value={n}>
                  {n}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="overflow-x-auto rounded-lg border border-border">
          <table className="w-full min-w-[960px] text-sm">
            <thead className="bg-muted/50">
              <tr className="text-left">
                <th className="p-3 w-10">
                  <input
                    type="checkbox"
                    checked={items.length > 0 && selected.size === items.length}
                    onChange={(e) =>
                      setSelected(e.target.checked ? new Set(items.map((i) => i.id)) : new Set())
                    }
                  />
                </th>
                <th className="p-3 font-medium">เลขที่</th>
                <th className="p-3 font-medium">RFID</th>
                <th className="p-3 font-medium">ชื่อสินทรัพย์</th>
                <th className="p-3 font-medium">หมวด</th>
                <th className="p-3 font-medium">ชนิด</th>
                <th className="p-3 font-medium">ที่ตั้ง</th>
                <th className="p-3 font-medium">เจ้าของ</th>
                <th className="p-3 font-medium text-right">มูลค่า</th>
                <th className="p-3 font-medium">สถานะ</th>
                <th className="p-3 font-medium">จัดการ</th>
              </tr>
            </thead>
            <tbody>
              {items.length === 0 && !loading && (
                <tr>
                  <td colSpan={11} className="text-muted-foreground p-8 text-center">
                    ไม่พบข้อมูล
                  </td>
                </tr>
              )}
              {items.map((row) => (
                <tr key={row.id} className="border-t border-border hover:bg-muted/30">
                  <td className="p-3">
                    <input
                      type="checkbox"
                      checked={selected.has(row.id)}
                      onChange={(e) => {
                        const next = new Set(selected);
                        if (e.target.checked) next.add(row.id);
                        else next.delete(row.id);
                        setSelected(next);
                      }}
                    />
                  </td>
                  <td className="p-3 font-mono text-xs">{row.asset_number}</td>
                  <td className="p-3 font-mono text-xs text-muted-foreground">
                    {row.rfid_num || "—"}
                  </td>
                  <td className="p-3 font-medium">{row.asset_name}</td>
                  <td className="p-3">{row.category_name || "—"}</td>
                  <td className="p-3">{row.class_name || "—"}</td>
                  <td className="p-3 text-muted-foreground">
                    {[row.building_name, row.room_name].filter(Boolean).join(" / ") || "—"}
                  </td>
                  <td className="p-3">{row.owner_name || "—"}</td>
                  <td className="p-3 text-right tabular-nums">
                    {row.asset_value.toLocaleString()}
                  </td>
                  <td className="p-3">
                    <span className={statusBadge(row.asset_status_name)}>
                      {row.asset_status_name || "ใช้งาน"}
                    </span>
                  </td>
                  <td className="p-3">
                    <div className="flex gap-1">
                      <Button
                        variant="outline"
                        className="h-7 px-2 text-xs"
                        onClick={() => {
                          setEditing(row);
                          setDialogOpen(true);
                        }}
                      >
                        แก้ไข
                      </Button>
                      <Button
                        variant="ghost"
                        className="h-7 px-2 text-xs text-destructive"
                        onClick={async () => {
                          if (!confirm("ลบสินทรัพย์นี้?")) return;
                          await apiRequest(`/api/v1/assets/${row.id}`, { method: "DELETE" });
                          load();
                        }}
                      >
                        ลบ
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {loading && <p className="text-muted-foreground text-sm">กำลังโหลด...</p>}

        <div className="flex flex-wrap items-center justify-between gap-2">
          <Button
            variant="outline"
            className="h-8 px-3 text-xs"
            disabled={page <= 1 || loading}
            onClick={() => setPage((p) => Math.max(1, p - 1))}
          >
            ก่อนหน้า
          </Button>
          <span className="text-muted-foreground text-sm">
            หน้า {page} / {totalPages}
          </span>
          <Button
            variant="outline"
            className="h-8 px-3 text-xs"
            disabled={page >= totalPages || loading}
            onClick={() => setPage((p) => p + 1)}
          >
            ถัดไป
          </Button>
        </div>
      </CardContent>
      <AssetDialog
        open={dialogOpen}
        asset={editing}
        refData={ref}
        onClose={() => setDialogOpen(false)}
        onSave={async (payload) => {
          if (editing) {
            await apiRequest(`/api/v1/assets/${editing.id}`, {
              method: "PATCH",
              body: JSON.stringify(payload),
            });
          } else {
            await apiRequest("/api/v1/assets", {
              method: "POST",
              body: JSON.stringify(payload),
            });
          }
          setDialogOpen(false);
          load();
        }}
      />
    </Card>
  );
}
