import { useCallback, useEffect, useMemo, useState } from "react";
import { useUser } from "@/hooks/use-user";
import {
  createRole,
  deleteRole,
  listResources,
  listRoles,
  updateRole,
  type Permission,
  type Resource,
  type Role,
} from "@/lib/rbac";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Lock, Trash2, Plus, Save, ShieldAlert } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { toast } from "sonner";

// Roles & Permissions page — Admin (role_id=1) is hard-locked.
// Admin Organization (2) is editable but kept by default.
// Custom roles can be added; their permissions are toggled per resource.

export function RolesPage() {
  const { user } = useUser();
  const myRoleID = user?.organizationRelation?.roleID ?? 4;
  const isAdmin = myRoleID === 1 || myRoleID === 2;

  const [roles, setRoles] = useState<Role[]>([]);
  const [resources, setResources] = useState<Resource[]>([]);
  const [selectedID, setSelectedID] = useState<number | null>(null);
  const [draftName, setDraftName] = useState("");
  const [draftDesc, setDraftDesc] = useState("");
  const [draftPerms, setDraftPerms] = useState<Record<string, Permission>>({});
  const [creating, setCreating] = useState(false);
  const [newName, setNewName] = useState("");
  const [saving, setSaving] = useState(false);

  const selected = useMemo(
    () => roles.find((r) => r.id === selectedID) ?? null,
    [roles, selectedID],
  );

  const load = useCallback(async () => {
    try {
      const [r, res] = await Promise.all([listRoles(), listResources()]);
      setRoles(r ?? []);
      // Hide the "super_admin" pseudo-resource — role 1 has implicit full access.
      setResources((res ?? []).filter((row) => row.code !== "super_admin"));
      if (r && r.length && !selectedID) {
        setSelectedID(r[0].id);
      }
    } catch (e) {
      console.error(e);
      toast.error("โหลดสิทธิ์ไม่สำเร็จ");
    }
  }, [selectedID]);

  useEffect(() => {
    load();
  }, [load]);

  // Hydrate draft when selected role changes.
  useEffect(() => {
    if (!selected) {
      setDraftName("");
      setDraftDesc("");
      setDraftPerms({});
      return;
    }
    setDraftName(selected.name);
    setDraftDesc(selected.description);
    const map: Record<string, Permission> = {};
    for (const p of selected.permissions ?? []) {
      map[p.resource] = { ...p };
    }
    for (const res of resources) {
      if (!map[res.code]) {
        map[res.code] = {
          resource: res.code,
          label: res.label,
          can_view: false,
          can_edit: false,
          can_delete: false,
        };
      }
    }
    setDraftPerms(map);
  }, [selected, resources]);

  const togglePerm = (code: string, key: "can_view" | "can_edit" | "can_delete") => {
    setDraftPerms((prev) => {
      const next = { ...prev };
      const current = next[code] ?? {
        resource: code,
        can_view: false,
        can_edit: false,
        can_delete: false,
      };
      const flipped = !current[key];
      next[code] = { ...current, [key]: flipped };
      // Cascade: edit/delete imply view.
      if (key === "can_edit" && flipped) next[code].can_view = true;
      if (key === "can_delete" && flipped) {
        next[code].can_view = true;
        next[code].can_edit = true;
      }
      // Cascade in reverse: turning off view clears edit+delete.
      if (key === "can_view" && !flipped) {
        next[code].can_edit = false;
        next[code].can_delete = false;
      }
      return next;
    });
  };

  const handleSelectAll = (code: string) => {
    setDraftPerms((prev) => {
      const next = { ...prev };
      const current = next[code] ?? {
        resource: code,
        can_view: false,
        can_edit: false,
        can_delete: false,
      };
      const allOn = current.can_view && current.can_edit && current.can_delete;
      next[code] = {
        ...current,
        can_view: !allOn,
        can_edit: !allOn,
        can_delete: !allOn,
      };
      return next;
    });
  };

  const handleSave = async () => {
    if (!selected) return;
    if (selected.is_locked || selected.id === 1) {
      toast.error("Role นี้ถูกล็อก ไม่สามารถแก้ไขได้");
      return;
    }
    setSaving(true);
    try {
      const perms = Object.values(draftPerms);
      await updateRole(selected.id, {
        name: draftName.trim() || selected.name,
        description: draftDesc.trim(),
        permissions: perms,
      });
      toast.success("บันทึกสิทธิ์แล้ว");
      await load();
    } catch (e: unknown) {
      console.error(e);
      const msg = e instanceof Error ? e.message : "บันทึกไม่สำเร็จ";
      toast.error(msg);
    } finally {
      setSaving(false);
    }
  };

  const handleCreate = async () => {
    const name = newName.trim();
    if (!name) {
      toast.error("กรุณาตั้งชื่อ Role");
      return;
    }
    try {
      const created = await createRole({
        name,
        description: "",
        permissions: resources.map((r) => ({
          resource: r.code,
          can_view: false,
          can_edit: false,
          can_delete: false,
        })),
      });
      toast.success("สร้าง Role แล้ว");
      setNewName("");
      setCreating(false);
      await load();
      if (created?.id) setSelectedID(created.id);
    } catch (e) {
      console.error(e);
      toast.error("สร้าง Role ไม่สำเร็จ");
    }
  };

  const handleDelete = async (role: Role) => {
    if (role.is_system || role.is_locked) {
      toast.error("Role ระบบลบไม่ได้");
      return;
    }
    if (!confirm(`ลบ Role "${role.name}" ?`)) return;
    try {
      await deleteRole(role.id);
      toast.success("ลบเรียบร้อย");
      setSelectedID(null);
      await load();
    } catch (e) {
      console.error(e);
      toast.error("ลบไม่สำเร็จ");
    }
  };

  if (!isAdmin) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <ShieldAlert className="size-4" /> ไม่มีสิทธิ์เข้าถึง
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground text-sm">
            เฉพาะผู้ดูแลระบบ (Super Admin / Admin) เท่านั้นที่จัดการสิทธิ์ได้
          </p>
        </CardContent>
      </Card>
    );
  }

  const editable = selected && !selected.is_locked && selected.id !== 1;

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Roles & Permissions</h1>
        <p className="text-muted-foreground text-sm">
          จัดการบทบาทและสิทธิ์เข้าถึงแต่ละโมดูล (Role <strong>Super Admin</strong> ถูกล็อก ไม่สามารถแก้ไขได้)
        </p>
      </div>
      <div className="grid gap-4 lg:grid-cols-[280px_minmax(0,1fr)]">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-base">Roles</CardTitle>
            <Button
              size="sm"
              variant="ghost"
              type="button"
              onClick={() => setCreating(true)}
              data-testid="roles-create-btn"
            >
              <Plus className="size-4" /> เพิ่ม Role
            </Button>
          </CardHeader>
          <CardContent className="space-y-2">
            {creating && (
              <div className="flex gap-2 rounded-lg border border-dashed p-2">
                <Input
                  placeholder="ชื่อ Role ใหม่"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  className="h-8 text-sm"
                  autoFocus
                />
                <Button size="sm" type="button" onClick={handleCreate}>
                  ตกลง
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  type="button"
                  onClick={() => {
                    setCreating(false);
                    setNewName("");
                  }}
                >
                  ยกเลิก
                </Button>
              </div>
            )}
            <ul className="space-y-1">
              {roles.map((r) => {
                const active = selectedID === r.id;
                return (
                  <li key={r.id}>
                    <button
                      type="button"
                      onClick={() => setSelectedID(r.id)}
                      className={
                        "flex w-full items-center justify-between rounded-md border px-3 py-2 text-left text-sm transition-colors " +
                        (active
                          ? "border-primary bg-primary/5 font-medium"
                          : "border-transparent hover:bg-accent")
                      }
                      data-testid={`role-row-${r.id}`}
                    >
                      <span className="flex items-center gap-2">
                        {r.is_locked && <Lock className="text-muted-foreground size-3.5" />}
                        {r.name}
                      </span>
                      {!r.is_system && (
                        <Trash2
                          className="text-muted-foreground hover:text-destructive size-4"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDelete(r);
                          }}
                        />
                      )}
                    </button>
                  </li>
                );
              })}
            </ul>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-start justify-between gap-2">
            <div className="flex-1 space-y-3">
              <div className="grid gap-2 sm:grid-cols-2">
                <div className="space-y-1">
                  <Label htmlFor="role-name">ชื่อ Role</Label>
                  <Input
                    id="role-name"
                    value={draftName}
                    onChange={(e) => setDraftName(e.target.value)}
                    disabled={!editable}
                  />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="role-desc">คำอธิบาย</Label>
                  <Input
                    id="role-desc"
                    value={draftDesc}
                    onChange={(e) => setDraftDesc(e.target.value)}
                    disabled={!editable}
                  />
                </div>
              </div>
            </div>
            <Button
              type="button"
              onClick={handleSave}
              disabled={!editable || saving}
              data-testid="roles-save-btn"
            >
              <Save className="mr-1 size-4" /> บันทึก
            </Button>
          </CardHeader>
          <CardContent>
            {selected?.is_locked || selected?.id === 1 ? (
              <div className="mb-3 rounded-md border border-amber-300 bg-amber-50 px-3 py-2 text-sm text-amber-800">
                Role <strong>{selected?.name}</strong> ถูกล็อก — สิทธิ์ทั้งหมดเปิดอัตโนมัติและแก้ไขไม่ได้
              </div>
            ) : null}
            <div className="overflow-x-auto rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="min-w-[180px]">โมดูล / เมนู</TableHead>
                    <TableHead className="text-center">View</TableHead>
                    <TableHead className="text-center">Edit</TableHead>
                    <TableHead className="text-center">Delete</TableHead>
                    <TableHead className="text-center">ทั้งหมด</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {resources.map((r) => {
                    const p = draftPerms[r.code] ?? {
                      resource: r.code,
                      can_view: false,
                      can_edit: false,
                      can_delete: false,
                    };
                    const allOn = p.can_view && p.can_edit && p.can_delete;
                    return (
                      <TableRow key={r.code}>
                        <TableCell>
                          <div className="font-medium">{r.label}</div>
                          <div className="text-muted-foreground text-xs">{r.code}</div>
                        </TableCell>
                        <TableCell className="text-center">
                          <Checkbox
                            checked={p.can_view}
                            onCheckedChange={() => togglePerm(r.code, "can_view")}
                            disabled={!editable}
                            data-testid={`perm-${r.code}-view`}
                          />
                        </TableCell>
                        <TableCell className="text-center">
                          <Checkbox
                            checked={p.can_edit}
                            onCheckedChange={() => togglePerm(r.code, "can_edit")}
                            disabled={!editable}
                            data-testid={`perm-${r.code}-edit`}
                          />
                        </TableCell>
                        <TableCell className="text-center">
                          <Checkbox
                            checked={p.can_delete}
                            onCheckedChange={() => togglePerm(r.code, "can_delete")}
                            disabled={!editable}
                            data-testid={`perm-${r.code}-delete`}
                          />
                        </TableCell>
                        <TableCell className="text-center">
                          <Checkbox
                            checked={allOn}
                            onCheckedChange={() => handleSelectAll(r.code)}
                            disabled={!editable}
                          />
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
