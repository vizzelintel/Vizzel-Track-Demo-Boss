import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Building,
  ChevronRight,
  Plus,
  Shield,
  ShieldAlert,
  Trash2,
  UserCircle,
} from "lucide-react";
import { toast } from "sonner";
import { apiRequest } from "@/lib/api";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
import { PageHeader } from "@/components/layout/PageHeader";

type Access = {
  id: number;
  user_id: number;
  user_name: string;
  organization_id: number;
  org_name: string;
  role_id: number;
};

type Org = { id: number; title: string };
type UserRow = { id: number; title: string; subtitle?: string };

const ROLE_OPTIONS = [
  { id: 1, label: "Super Admin" },
  { id: 2, label: "Admin Organization" },
  { id: 3, label: "Officer" },
  { id: 4, label: "Member" },
];

function roleLabel(roleID: number) {
  return ROLE_OPTIONS.find((r) => r.id === roleID)?.label ?? `Role ${roleID}`;
}

export function SuperAdminOrgAccessPage() {
  const [rows, setRows] = useState<Access[]>([]);
  const [orgs, setOrgs] = useState<Org[]>([]);
  const [users, setUsers] = useState<UserRow[]>([]);
  const [selectedUserId, setSelectedUserId] = useState<number | null>(null);
  const [addOpen, setAddOpen] = useState(false);
  const [orgID, setOrgID] = useState<string>("");
  const [userID, setUserID] = useState<string>("");
  const [roleID, setRoleID] = useState<string>("2");
  const [submitting, setSubmitting] = useState(false);
  const [deleteAccess, setDeleteAccess] = useState<Access | null>(null);

  const load = useCallback(async () => {
    try {
      const [accessRes, orgsRes] = await Promise.all([
        apiRequest<{ data: Access[] }>("/api/v1/super-admin/org-access"),
        apiRequest<{ data: Org[] }>("/api/v1/super-admin/organizations"),
      ]);
      setRows(accessRes?.data ?? []);
      setOrgs(orgsRes?.data ?? []);
    } catch (e) {
      console.error(e);
      toast.error("โหลดข้อมูลไม่สำเร็จ");
    }
  }, []);

  useEffect(() => {
    if (!orgID) return;
    apiRequest<{ data: UserRow[] }>(`/api/v1/users?organizationID=${orgID}`)
      .then((r) => setUsers(r?.data ?? []))
      .catch(() => setUsers([]));
  }, [orgID]);

  useEffect(() => {
    load();
  }, [load]);

  // List of Super Admins (role 1) used for the left column
  const superAdmins = useMemo(() => {
    const ids = new Map<number, { id: number; name: string; total: number }>();
    for (const r of rows) {
      const cur = ids.get(r.user_id) ?? {
        id: r.user_id,
        name: r.user_name || `User #${r.user_id}`,
        total: 0,
      };
      if (r.role_id === 1) {
        cur.total += 1;
      }
      ids.set(r.user_id, cur);
    }
    return Array.from(ids.values()).sort((a, b) => b.total - a.total || a.id - b.id);
  }, [rows]);

  useEffect(() => {
    if (!selectedUserId && superAdmins.length > 0) {
      setSelectedUserId(superAdmins[0].id);
    }
  }, [superAdmins, selectedUserId]);

  const selectedAccess = useMemo(
    () => rows.filter((r) => r.user_id === selectedUserId),
    [rows, selectedUserId],
  );
  const selectedAdmin = superAdmins.find((a) => a.id === selectedUserId);

  const orgMap = useMemo(
    () => new Map(orgs.map((o) => [o.id, o.title])),
    [orgs],
  );

  const handleAdd = async () => {
    if (!userID || !orgID) {
      toast.error("เลือกผู้ใช้และองค์กร");
      return;
    }
    setSubmitting(true);
    try {
      await apiRequest("/api/v1/super-admin/org-access", {
        method: "POST",
        body: JSON.stringify({
          user_id: Number(userID),
          organization_id: Number(orgID),
          role_id: Number(roleID),
        }),
      });
      toast.success("เพิ่มสิทธิ์เรียบร้อย");
      setAddOpen(false);
      setUserID("");
      load();
    } catch (e) {
      console.error(e);
      toast.error("เพิ่มสิทธิ์ไม่สำเร็จ");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteAccess) return;
    try {
      await apiRequest(`/api/v1/super-admin/org-access/${deleteAccess.id}`, {
        method: "DELETE",
      });
      toast.success("ลบสิทธิ์สำเร็จ");
      setDeleteAccess(null);
      load();
    } catch {
      toast.error("ลบสิทธิ์ไม่สำเร็จ");
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="จัดการสิทธิ์เข้าถึง Org"
        subtitle="จัดการสิทธิ์ Super Admin ที่สามารถเข้าถึงข้ามองค์กรในระบบ"
        icon={<Shield className="h-5 w-5" />}
        primaryAction={
          <Button onClick={() => setAddOpen(true)} data-testid="sa-access-add">
            <Plus className="mr-2 h-4 w-4" />
            เพิ่ม
          </Button>
        }
      />

      <div className="grid gap-6 lg:grid-cols-[320px_1fr]">
        {/* LEFT: Super Admin list */}
        <Card className="overflow-hidden">
          <CardHeader>
            <CardTitle className="text-base">Super Admin</CardTitle>
            <p className="text-muted-foreground text-xs">
              เลือกผู้ใช้เพื่อดูสิทธิ์เข้าถึงองค์กร
            </p>
          </CardHeader>
          <CardContent className="space-y-2 p-3">
            {superAdmins.length === 0 ? (
              <div className="py-10 text-center">
                <ShieldAlert className="text-muted-foreground mx-auto mb-2 h-6 w-6 opacity-50" />
                <p className="text-muted-foreground text-sm">
                  ยังไม่มี Super Admin
                </p>
              </div>
            ) : (
              superAdmins.map((u) => {
                const isActive = u.id === selectedUserId;
                return (
                  <button
                    key={u.id}
                    type="button"
                    onClick={() => setSelectedUserId(u.id)}
                    className={cn(
                      "flex w-full items-center justify-between rounded-lg border p-3 text-left transition",
                      isActive
                        ? "border-primary/30 bg-primary/5 shadow-inner"
                        : "border-transparent bg-white hover:bg-slate-50",
                    )}
                    data-testid={`sa-access-admin-${u.id}`}
                  >
                    <div className="flex min-w-0 items-center gap-3">
                      <div className="flex h-9 w-9 items-center justify-center rounded-full bg-purple-50 text-purple-600">
                        <UserCircle className="h-5 w-5" />
                      </div>
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium">{u.name}</p>
                        <p className="text-muted-foreground text-xs">
                          {u.total > 0
                            ? `Super Admin · ${u.total} องค์กร`
                            : "ผู้ใช้ทั่วไป"}
                        </p>
                      </div>
                    </div>
                    <ChevronRight className="h-4 w-4 text-slate-400" />
                  </button>
                );
              })
            )}
          </CardContent>
        </Card>

        {/* RIGHT: selected admin's access */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">
              สิทธิ์การเข้าถึงองค์กร
              {selectedAdmin && (
                <span className="text-muted-foreground ml-2 text-sm font-normal">
                  ของ {selectedAdmin.name}
                </span>
              )}
            </CardTitle>
            <p className="text-muted-foreground text-xs">
              องค์กรที่ผู้ใช้นี้สามารถเข้าถึงและบทบาทที่ได้รับ
            </p>
          </CardHeader>
          <CardContent className="space-y-2">
            {!selectedAdmin ? (
              <div className="py-16 text-center">
                <Building className="text-muted-foreground mx-auto mb-3 h-8 w-8 opacity-40" />
                <p className="text-sm font-medium">
                  เลือก Super Admin จากด้านซ้าย
                </p>
              </div>
            ) : selectedAccess.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-center">
                <div className="bg-primary/5 mb-3 rounded-full p-4">
                  <Shield className="text-primary/40 h-8 w-8" />
                </div>
                <p className="text-sm font-medium">
                  ยังไม่ได้รับสิทธิ์เข้าถึงองค์กรใด
                </p>
                <p className="text-muted-foreground max-w-[320px] text-xs">
                  กดปุ่ม &quot;+ เพิ่ม&quot; ด้านบนเพื่อกำหนดสิทธิ์เข้าถึงองค์กรให้ผู้ใช้นี้
                </p>
              </div>
            ) : (
              selectedAccess.map((a) => (
                <div
                  key={a.id}
                  className="flex items-center justify-between rounded-lg border bg-white p-3 hover:bg-muted/30"
                  data-testid={`sa-access-row-${a.id}`}
                >
                  <div className="flex min-w-0 items-center gap-3">
                    <div className="bg-primary/10 text-primary flex h-9 w-9 items-center justify-center rounded-lg">
                      <Building className="h-4 w-4" />
                    </div>
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium">
                        {a.org_name || orgMap.get(a.organization_id) || `Org #${a.organization_id}`}
                      </p>
                      <Badge variant="secondary" className="mt-0.5 text-[10px]">
                        {roleLabel(a.role_id)}
                      </Badge>
                    </div>
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="text-slate-400 hover:bg-red-50 hover:text-red-600"
                    onClick={() => setDeleteAccess(a)}
                    data-testid={`sa-access-delete-${a.id}`}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>

      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>เพิ่มสิทธิ์เข้าถึงองค์กร</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>องค์กรปลายทาง</Label>
              <Select value={orgID} onValueChange={setOrgID}>
                <SelectTrigger data-testid="sa-access-org">
                  <SelectValue placeholder="เลือกองค์กร" />
                </SelectTrigger>
                <SelectContent>
                  {orgs.map((o) => (
                    <SelectItem key={o.id} value={String(o.id)}>
                      {o.title}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>ผู้ใช้</Label>
              <Select value={userID} onValueChange={setUserID}>
                <SelectTrigger data-testid="sa-access-user">
                  <SelectValue placeholder="เลือกผู้ใช้" />
                </SelectTrigger>
                <SelectContent>
                  {users.map((u) => (
                    <SelectItem key={u.id} value={String(u.id)}>
                      {u.title}
                      {u.subtitle ? ` — ${u.subtitle}` : ""}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Role</Label>
              <Select value={roleID} onValueChange={setRoleID}>
                <SelectTrigger data-testid="sa-access-role">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {ROLE_OPTIONS.map((r) => (
                    <SelectItem key={r.id} value={String(r.id)}>
                      {r.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => setAddOpen(false)}>
              ยกเลิก
            </Button>
            <Button
              onClick={handleAdd}
              disabled={submitting}
              data-testid="sa-access-submit"
            >
              {submitting ? "กำลังบันทึก..." : "เพิ่มสิทธิ์"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog
        open={!!deleteAccess}
        onOpenChange={(o) => !o && setDeleteAccess(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>ยืนยันการลบสิทธิ์</AlertDialogTitle>
            <AlertDialogDescription>
              ลบสิทธิ์เข้าถึงองค์กรนี้สำหรับผู้ใช้?
              การดำเนินการนี้ไม่สามารถกู้คืนได้
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>ยกเลิก</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault();
                handleDelete();
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
