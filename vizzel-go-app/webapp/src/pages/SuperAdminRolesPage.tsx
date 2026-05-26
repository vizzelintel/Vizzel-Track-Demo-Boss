import { useCallback, useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
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
  createRole,
  deleteRole,
  listResources,
  listRoles,
  updateRole,
  SUPER_ADMIN_ROLE_ID,
  type Permission,
  type Resource,
  type Role,
  type RoleInput,
} from "@/lib/rbac";
import { ShieldCheck, Lock, Plus, Pencil, Trash2 } from "lucide-react";
import { toast } from "sonner";

const ACTIONS: Array<{
  key: "can_view" | "can_edit" | "can_delete";
  label: string;
}> = [
  { key: "can_view", label: "ดู" },
  { key: "can_edit", label: "แก้ไข" },
  { key: "can_delete", label: "ลบ" },
];

type DraftPermission = Record<string, Permission>;

function buildDraft(resources: Resource[], existing: Permission[]): DraftPermission {
  const draft: DraftPermission = {};
  const lookup = new Map(existing.map((p) => [p.resource, p]));
  for (const r of resources) {
    const p = lookup.get(r.code);
    draft[r.code] = {
      resource: r.code,
      label: r.label,
      can_view: p?.can_view ?? false,
      can_edit: p?.can_edit ?? false,
      can_delete: p?.can_delete ?? false,
    };
  }
  return draft;
}

export function SuperAdminRolesPage() {
  const [resources, setResources] = useState<Resource[]>([]);
  const [roles, setRoles] = useState<Role[]>([]);
  const [loading, setLoading] = useState(false);
  const [editing, setEditing] = useState<Role | null>(null);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [draft, setDraft] = useState<DraftPermission>({});
  const [open, setOpen] = useState(false);
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [bulkOpen, setBulkOpen] = useState(false);
  const [bulkDeleting, setBulkDeleting] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [r, role] = await Promise.all([listResources(), listRoles()]);
      setResources(r);
      setRoles(role);
      setSelectedIds([]);
    } catch (err) {
      const message = err instanceof Error ? err.message : "โหลดข้อมูลสิทธิ์ไม่สำเร็จ";
      toast.error(message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const startNew = () => {
    setEditing(null);
    setName("");
    setDescription("");
    setDraft(buildDraft(resources, []));
    setOpen(true);
  };

  const startEdit = (role: Role) => {
    if (role.id === SUPER_ADMIN_ROLE_ID) {
      toast.info("Role Super Admin ถูกล็อก ทำได้ทุกอย่างโดยอัตโนมัติ");
      return;
    }
    setEditing(role);
    setName(role.name);
    setDescription(role.description);
    setDraft(buildDraft(resources, role.permissions ?? []));
    setOpen(true);
  };

  const toggle = (resource: string, key: keyof Permission) => {
    setDraft((prev) => {
      const next = { ...prev };
      const row = { ...next[resource] };
      // @ts-expect-error dynamic key
      row[key] = !row[key];
      next[resource] = row;
      return next;
    });
  };

  const submit = async () => {
    if (!name.trim()) {
      toast.error("กรุณาระบุชื่อ role");
      return;
    }
    const input: RoleInput = {
      name: name.trim(),
      description: description.trim(),
      permissions: Object.values(draft),
    };
    try {
      if (editing) {
        await updateRole(editing.id, input);
        toast.success(`อัปเดต ${input.name} สำเร็จ`);
      } else {
        await createRole(input);
        toast.success(`สร้าง role ${input.name} สำเร็จ`);
      }
      setOpen(false);
      await load();
    } catch (err) {
      const message = err instanceof Error ? err.message : "บันทึกไม่สำเร็จ";
      toast.error(message);
    }
  };

  const deletableIds = useMemo(
    () =>
      roles
        .filter(
          (r) =>
            r.id !== SUPER_ADMIN_ROLE_ID && !r.is_locked && !r.is_system,
        )
        .map((r) => r.id),
    [roles],
  );

  const selectableSet = useMemo(() => new Set(deletableIds), [deletableIds]);
  const visibleSelected = selectedIds.filter((id) => selectableSet.has(id));

  const toggleSelectAll = () => {
    if (visibleSelected.length === deletableIds.length && deletableIds.length > 0) {
      setSelectedIds([]);
    } else {
      setSelectedIds(deletableIds);
    }
  };

  const toggleRow = (id: number) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((v) => v !== id) : [...prev, id],
    );
  };

  const bulkDelete = async () => {
    if (visibleSelected.length === 0) return;
    setBulkDeleting(true);
    let success = 0;
    let failed = 0;
    for (const id of visibleSelected) {
      try {
        await deleteRole(id);
        success += 1;
      } catch {
        failed += 1;
      }
    }
    if (success > 0 && failed === 0) {
      toast.success(`ลบสำเร็จ ${success} รายการ`);
    } else if (success > 0 && failed > 0) {
      toast.warning(`ลบสำเร็จ ${success} รายการ และล้มเหลว ${failed} รายการ`);
    } else {
      toast.error("ลบรายการที่เลือกไม่สำเร็จ");
    }
    setBulkDeleting(false);
    setBulkOpen(false);
    setSelectedIds([]);
    await load();
  };

  const dialogTitle = editing ? `แก้ไข role: ${editing.name}` : "เพิ่ม role ใหม่";

  const orderedResources = useMemo(
    () =>
      [...resources]
        // Super Admin (role 1) has implicit full access — no per-resource toggle
        // needed for the "super_admin" pseudo-resource.
        .filter((r) => r.code !== "super_admin")
        .sort((a, b) => a.sort_order - b.sort_order),
    [resources],
  );

  return (
    <div className="space-y-4" data-testid="roles-page">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <ShieldCheck className="size-5 text-primary" />
            จัดการสิทธิ์ตาม Role
          </CardTitle>
          <div className="flex items-center gap-2">
            {visibleSelected.length > 0 && (
              <Button
                type="button"
                variant="destructive"
                size="sm"
                onClick={() => setBulkOpen(true)}
                data-testid="role-bulk-delete"
              >
                <Trash2 className="mr-2 size-4" />
                ลบที่เลือก ({visibleSelected.length})
              </Button>
            )}
            <Button onClick={startNew} data-testid="role-create-btn">
              <Plus className="size-4" /> เพิ่ม Role
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto rounded-lg border border-border">
            <table className="w-full text-sm">
              <thead className="bg-muted/50 text-left">
                <tr>
                  <th className="w-10 p-3">
                    <Checkbox
                      checked={
                        deletableIds.length > 0 &&
                        visibleSelected.length === deletableIds.length
                          ? true
                          : visibleSelected.length > 0
                            ? "indeterminate"
                            : false
                      }
                      onCheckedChange={toggleSelectAll}
                      disabled={deletableIds.length === 0}
                      aria-label="เลือกทั้งหมด"
                      data-testid="role-select-all"
                    />
                  </th>
                  <th className="p-3 font-medium">Role</th>
                  <th className="p-3 font-medium">คำอธิบาย</th>
                  <th className="p-3 font-medium">สถานะ</th>
                  <th className="p-3 font-medium">สิทธิ์ที่กำหนด</th>
                  <th className="w-16 p-3" />
                </tr>
              </thead>
              <tbody>
                {roles.length === 0 && (
                  <tr>
                    <td colSpan={6} className="text-muted-foreground p-8 text-center">
                      {loading ? "กำลังโหลด..." : "ยังไม่มี role"}
                    </td>
                  </tr>
                )}
                {roles.map((role) => {
                  const locked = role.id === SUPER_ADMIN_ROLE_ID || role.is_locked;
                  const permCount = (role.permissions ?? []).filter(
                    (p) => p.can_view || p.can_edit || p.can_delete,
                  ).length;
                  const canSelect = selectableSet.has(role.id);
                  return (
                    <tr
                      key={role.id}
                      className="border-t border-border hover:bg-muted/30"
                      data-testid={`role-row-${role.id}`}
                    >
                      <td className="p-3">
                        <Checkbox
                          checked={selectedIds.includes(role.id)}
                          onCheckedChange={() => toggleRow(role.id)}
                          disabled={!canSelect}
                          aria-label="เลือก role"
                          data-testid={`role-select-${role.id}`}
                        />
                      </td>
                      <td className="p-3 font-medium">
                        <div className="flex items-center gap-2">
                          {locked && <Lock className="size-3 text-muted-foreground" />}
                          {role.name}
                        </div>
                      </td>
                      <td className="p-3 text-muted-foreground">
                        {role.description || "—"}
                      </td>
                      <td className="p-3">
                        {locked ? (
                          <span className="rounded bg-primary/10 px-2 py-1 text-xs text-primary">
                            ระบบ · ล็อก
                          </span>
                        ) : role.is_system ? (
                          <span className="rounded bg-muted px-2 py-1 text-xs">
                            ระบบ
                          </span>
                        ) : (
                          <span className="rounded bg-green-50 px-2 py-1 text-xs text-green-700">
                            กำหนดเอง
                          </span>
                        )}
                      </td>
                      <td className="p-3 text-muted-foreground">
                        {locked ? "ทุกอย่าง" : `${permCount}/${resources.length}`}
                      </td>
                      <td className="p-3">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="size-8"
                          disabled={locked}
                          onClick={() => startEdit(role)}
                          aria-label="แก้ไข"
                          data-testid={`role-edit-${role.id}`}
                        >
                          <Pencil className="size-4" />
                        </Button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      <AlertDialog open={bulkOpen} onOpenChange={setBulkOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>ยืนยันการลบ</AlertDialogTitle>
            <AlertDialogDescription>
              ลบ role จำนวน {visibleSelected.length} รายการ?
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
              data-testid="role-bulk-delete-confirm"
            >
              {bulkDeleting ? "กำลังลบ..." : "ยืนยันลบ"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-3xl">
          <DialogHeader>
            <DialogTitle>{dialogTitle}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid gap-3 md:grid-cols-2">
              <div>
                <Label htmlFor="role-name">ชื่อ Role</Label>
                <Input
                  id="role-name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="เช่น Officer ตรวจนับ"
                  data-testid="role-name-input"
                />
              </div>
              <div>
                <Label htmlFor="role-desc">คำอธิบาย</Label>
                <Textarea
                  id="role-desc"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={2}
                  placeholder="หน้าที่ของ role นี้"
                />
              </div>
            </div>

            <div className="overflow-x-auto rounded-lg border border-border">
              <table className="w-full text-sm">
                <thead className="bg-muted/50">
                  <tr className="text-left">
                    <th className="p-3 font-medium">หมวด</th>
                    {ACTIONS.map((a) => (
                      <th key={a.key} className="p-3 font-medium text-center">
                        {a.label}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {orderedResources.map((res) => {
                    const row = draft[res.code];
                    if (!row) return null;
                    return (
                      <tr
                        key={res.code}
                        className="border-t border-border"
                        data-testid={`perm-row-${res.code}`}
                      >
                        <td className="p-3">{res.label}</td>
                        {ACTIONS.map((a) => (
                          <td key={a.key} className="p-3 text-center">
                            <input
                              type="checkbox"
                              checked={Boolean(row[a.key])}
                              onChange={() => toggle(res.code, a.key)}
                              data-testid={`perm-${res.code}-${a.key}`}
                              className="size-4 cursor-pointer accent-primary"
                            />
                          </td>
                        ))}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>
              ยกเลิก
            </Button>
            <Button onClick={submit} data-testid="role-save-btn">
              บันทึก
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
