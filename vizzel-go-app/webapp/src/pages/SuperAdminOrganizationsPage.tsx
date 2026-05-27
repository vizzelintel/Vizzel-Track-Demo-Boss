import { useCallback, useEffect, useMemo, useState } from "react";
import { Building, MoreVertical, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { apiRequest } from "@/lib/api";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { PageHeader } from "@/components/layout/PageHeader";
import { TableToolbar, toToolbarColumns } from "@/components/data/TableToolbar";
import { DataTable, type Column, type SortState } from "@/components/data/DataTable";
import { DataTablePagination } from "@/components/data/DataTablePagination";

type Org = {
  id: number;
  title: string;
  subtitle?: string;
  status?: string;
  adminCount?: number;
  admins?: { id: number; name: string }[];
};

type Access = {
  id: number;
  user_id: number;
  user_name: string;
  organization_id: number;
  org_name: string;
  role_id: number;
};

export function SuperAdminOrganizationsPage() {
  const [orgs, setOrgs] = useState<Org[]>([]);
  const [access, setAccess] = useState<Access[]>([]);
  const [search, setSearch] = useState("");
  const [hidden, setHidden] = useState<string[]>([]);
  const [sort, setSort] = useState<SortState | null>({ key: "id", dir: "asc" });
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [createOpen, setCreateOpen] = useState(false);
  const [name, setName] = useState("");
  const [deleteTarget, setDeleteTarget] = useState<Org | null>(null);

  const load = useCallback(async () => {
    try {
      const [orgsRes, accessRes] = await Promise.all([
        apiRequest<{ data: Org[] }>("/api/v1/super-admin/organizations"),
        apiRequest<{ data: Access[] }>("/api/v1/super-admin/org-access").catch(
          () => ({ data: [] }),
        ),
      ]);
      setOrgs(orgsRes.data ?? []);
      setAccess(accessRes.data ?? []);
    } catch {
      toast.error("โหลดรายการองค์กรไม่สำเร็จ");
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const adminsByOrg = useMemo(() => {
    const map = new Map<number, string[]>();
    for (const a of access) {
      if (a.role_id === 1 || a.role_id === 2) {
        const list = map.get(a.organization_id) ?? [];
        list.push(a.user_name || `User #${a.user_id}`);
        map.set(a.organization_id, list);
      }
    }
    return map;
  }, [access]);

  const enriched = useMemo(
    () =>
      orgs.map((o) => ({
        ...o,
        adminCount: adminsByOrg.get(o.id)?.length ?? 0,
      })),
    [orgs, adminsByOrg],
  );

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return enriched;
    return enriched.filter((o) =>
      [o.title, o.subtitle, String(o.id)]
        .filter(Boolean)
        .join(" ")
        .toLowerCase()
        .includes(q),
    );
  }, [enriched, search]);

  useEffect(() => {
    setPage(1);
  }, [search, pageSize]);

  const total = filtered.length;
  const pageRows = filtered.slice((page - 1) * pageSize, page * pageSize);

  const columns: Column<Org & { id: number }>[] = [
    {
      key: "id",
      label: "ID",
      sortable: true,
      className: "w-16",
      render: (r) => (
        <span className="font-mono text-xs text-slate-500">#{r.id}</span>
      ),
    },
    {
      key: "title",
      label: "ชื่อองค์กร",
      sortable: true,
      render: (r) => (
        <div className="flex items-center gap-3">
          <div className="bg-primary/10 text-primary flex h-9 w-9 shrink-0 items-center justify-center rounded-lg">
            <Building className="h-4 w-4" />
          </div>
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-slate-900">
              {r.title}
            </p>
            <p className="text-muted-foreground truncate text-xs">
              องค์กรในระบบ
            </p>
          </div>
        </div>
      ),
    },
    {
      key: "subtitle",
      label: "รายละเอียด",
      render: (r) => (
        <span className="text-muted-foreground line-clamp-1 text-sm">
          {r.subtitle ?? "—"}
        </span>
      ),
    },
    {
      key: "admins",
      label: "ผู้ดูแลระบบ",
      render: (r) => {
        const names = adminsByOrg.get(r.id) ?? [];
        if (names.length === 0)
          return <span className="text-muted-foreground text-xs">—</span>;
        const first = names[0];
        const extra = names.length - 1;
        return (
          <div className="flex items-center gap-1">
            <Badge variant="secondary" className="truncate max-w-[140px]">
              {first}
            </Badge>
            {extra > 0 && (
              <Badge variant="outline" className="text-[10px]">
                +{extra}
              </Badge>
            )}
          </div>
        );
      },
    },
    {
      key: "status",
      label: "สถานะ",
      sortable: true,
      render: (r) => (
        <Badge
          className={
            r.status === "inactive"
              ? "bg-slate-100 text-slate-600"
              : "bg-emerald-100 text-emerald-700 hover:bg-emerald-100"
          }
        >
          {r.status === "inactive" ? "ปิดใช้งาน" : "ใช้งาน"}
        </Badge>
      ),
    },
  ];

  const create = async () => {
    if (!name.trim()) return;
    try {
      await apiRequest("/api/v1/super-admin/organizations", {
        method: "POST",
        body: JSON.stringify({ name }),
      });
      toast.success("สร้างองค์กรสำเร็จ");
      setCreateOpen(false);
      setName("");
      load();
    } catch {
      toast.error("สร้างองค์กรไม่สำเร็จ");
    }
  };

  const remove = async () => {
    if (!deleteTarget) return;
    try {
      await apiRequest(`/api/v1/super-admin/organizations/${deleteTarget.id}`, {
        method: "DELETE",
      });
      toast.success("ลบองค์กรสำเร็จ");
      setDeleteTarget(null);
      load();
    } catch {
      toast.error("ลบองค์กรไม่สำเร็จ");
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="จัดการองค์กร"
        subtitle="รายชื่อองค์กรทั้งหมดในระบบ — สำหรับ Super Admin"
        icon={<Building className="h-5 w-5" />}
        primaryAction={
          <Button onClick={() => setCreateOpen(true)} data-testid="sa-org-create">
            <Plus className="mr-2 h-4 w-4" />
            เพิ่มองค์กร
          </Button>
        }
      />

      <Card>
        <CardContent className="space-y-3 p-4 lg:p-6">
          <TableToolbar
            search={search}
            onSearchChange={setSearch}
            searchPlaceholder="ค้นหาองค์กร..."
            columns={toToolbarColumns(columns)}
            hiddenColumns={hidden}
            onHiddenChange={setHidden}
            testIdPrefix="sa-org"
          />
          <DataTable
            columns={columns}
            rows={pageRows as (Org & { id: number })[]}
            hiddenColumns={hidden}
            sort={sort}
            onSortChange={setSort}
            extraActions={(r) => (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-8 w-8"
                    data-testid={`sa-org-actions-${r.id}`}
                  >
                    <MoreVertical className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem
                    className="text-red-600"
                    onClick={() => setDeleteTarget(r as Org)}
                  >
                    <Trash2 className="mr-2 h-4 w-4" />
                    ลบองค์กร
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            )}
            emptyLabel="ยังไม่มีองค์กรในระบบ"
          />
          <DataTablePagination
            page={page}
            pageSize={pageSize}
            total={total}
            onPageChange={setPage}
            onPageSizeChange={setPageSize}
            testIdPrefix="sa-org-pagination"
          />
        </CardContent>
      </Card>

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>เพิ่มองค์กรใหม่</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <Label htmlFor="org-name">ชื่อองค์กร</Label>
            <Input
              id="org-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              data-testid="sa-org-name"
            />
          </div>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => setCreateOpen(false)}>
              ยกเลิก
            </Button>
            <Button onClick={create} data-testid="sa-org-submit">
              บันทึก
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog
        open={!!deleteTarget}
        onOpenChange={(o) => !o && setDeleteTarget(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>ยืนยันการลบ</AlertDialogTitle>
            <AlertDialogDescription>
              ลบองค์กร &quot;{deleteTarget?.title}&quot; ออกจากระบบ?
              การดำเนินการนี้ไม่สามารถกู้คืนได้
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>ยกเลิก</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault();
                remove();
              }}
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              ยืนยันลบ
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
