import { useCallback, useEffect, useMemo, useState } from "react";
import { Trash2 } from "lucide-react";
import { apiRequest } from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { DataTable } from "@/components/data/DataTable";
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
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

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

export function SuperAdminOrgAccessPage() {
  const [rows, setRows] = useState<Access[]>([]);
  const [orgs, setOrgs] = useState<Org[]>([]);
  const [users, setUsers] = useState<UserRow[]>([]);
  const [orgID, setOrgID] = useState<string>("");
  const [userID, setUserID] = useState<string>("");
  const [roleID, setRoleID] = useState<string>("2");
  const [submitting, setSubmitting] = useState(false);
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [bulkOpen, setBulkOpen] = useState(false);
  const [bulkDeleting, setBulkDeleting] = useState(false);

  const load = useCallback(async () => {
    try {
      const [accessRes, orgsRes] = await Promise.all([
        apiRequest<{ data: Access[] }>("/api/v1/super-admin/org-access"),
        apiRequest<{ data: Org[] }>("/api/v1/super-admin/organizations"),
      ]);
      setRows(accessRes?.data ?? []);
      setOrgs(orgsRes?.data ?? []);
      if (!orgID && orgsRes?.data?.length) {
        setOrgID(String(orgsRes.data[0].id));
      }
    } catch (e) {
      console.error(e);
      toast.error("โหลดข้อมูลไม่สำเร็จ");
    }
  }, [orgID]);

  // Refresh user dropdown whenever org changes so super admin can pick from
  // the right org's user pool (Org Access is a cross-org concept).
  useEffect(() => {
    if (!orgID) return;
    apiRequest<{ data: UserRow[] }>(`/api/v1/users?organizationID=${orgID}`)
      .then((r) => setUsers(r?.data ?? []))
      .catch(() => setUsers([]));
  }, [orgID]);

  useEffect(() => {
    load();
  }, [load]);

  const orgMap = useMemo(() => new Map(orgs.map((o) => [o.id, o.title])), [orgs]);

  const bulkDelete = async () => {
    if (selectedIds.length === 0) return;
    setBulkDeleting(true);
    let success = 0;
    let failed = 0;
    for (const id of selectedIds) {
      try {
        await apiRequest(`/api/v1/super-admin/org-access/${id}`, {
          method: "DELETE",
        });
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
    load();
  };

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
      setUserID("");
      load();
    } catch (e) {
      console.error(e);
      toast.error("เพิ่มสิทธิ์ไม่สำเร็จ");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between gap-2">
        <CardTitle>สิทธิ์เข้าถึงข้ามองค์กร</CardTitle>
        {selectedIds.length > 0 && (
          <Button
            type="button"
            variant="destructive"
            size="sm"
            onClick={() => setBulkOpen(true)}
            data-testid="org-access-bulk-delete"
          >
            <Trash2 className="mr-2 size-4" />
            ลบที่เลือก ({selectedIds.length})
          </Button>
        )}
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid items-end gap-3 rounded-lg border bg-muted/30 p-4 md:grid-cols-[1fr_1fr_160px_120px]">
          <div className="space-y-1">
            <Label>องค์กรปลายทาง</Label>
            <Select value={orgID} onValueChange={setOrgID}>
              <SelectTrigger>
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
          <div className="space-y-1">
            <Label>ผู้ใช้</Label>
            <Select value={userID} onValueChange={setUserID}>
              <SelectTrigger>
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
          <div className="space-y-1">
            <Label>Role</Label>
            <Select value={roleID} onValueChange={setRoleID}>
              <SelectTrigger>
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
          <Button onClick={handleAdd} disabled={submitting}>
            เพิ่มสิทธิ์
          </Button>
        </div>

        <DataTable
          columns={[
            {
              key: "user_name",
              label: "ผู้ใช้",
              render: (r) => r.user_name || `#${r.user_id}`,
            },
            {
              key: "org_name",
              label: "องค์กร",
              render: (r) => r.org_name || orgMap.get(r.organization_id) || `#${r.organization_id}`,
            },
            {
              key: "role_id",
              label: "Role",
              render: (r) =>
                ROLE_OPTIONS.find((o) => o.id === r.role_id)?.label ?? r.role_id,
            },
          ]}
          rows={rows}
          selectable
          selectedIds={selectedIds}
          onSelectionChange={setSelectedIds}
        />
      </CardContent>

      <AlertDialog open={bulkOpen} onOpenChange={setBulkOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>ยืนยันการลบ</AlertDialogTitle>
            <AlertDialogDescription>
              ลบสิทธิ์เข้าถึงจำนวน {selectedIds.length} รายการ?
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
              data-testid="org-access-bulk-delete-confirm"
            >
              {bulkDeleting ? "กำลังลบ..." : "ยืนยันลบ"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  );
}
