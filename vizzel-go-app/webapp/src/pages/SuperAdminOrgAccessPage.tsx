import { useCallback, useEffect, useState } from "react";
import { apiRequest } from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { DataTable } from "@/components/data/DataTable";

type Access = {
  id: number;
  user_id: number;
  user_name: string;
  organization_id: number;
  org_name: string;
  role_id: number;
};

export function SuperAdminOrgAccessPage() {
  const [rows, setRows] = useState<Access[]>([]);
  const [userId, setUserId] = useState("");
  const [orgId, setOrgId] = useState("1");

  const load = useCallback(() => {
    apiRequest<{ data: Access[] }>("/api/v1/super-admin/org-access").then((r) => setRows(r.data));
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>สิทธิ์เข้าถึง Org</CardTitle>
        <div className="flex gap-2">
          <Input placeholder="user_id" value={userId} onChange={(e) => setUserId(e.target.value)} className="w-24" />
          <Input placeholder="org_id" value={orgId} onChange={(e) => setOrgId(e.target.value)} className="w-24" />
          <Button
            className="h-8 text-xs"
            onClick={async () => {
              await apiRequest("/api/v1/super-admin/org-access", {
                method: "POST",
                body: JSON.stringify({ user_id: Number(userId), organization_id: Number(orgId), role_id: 2 }),
              });
              load();
            }}
          >
            เพิ่ม
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <DataTable
          columns={[
            { key: "user_name", label: "ผู้ใช้", render: (r) => r.user_name },
            { key: "org_name", label: "องค์กร", render: (r) => r.org_name },
            { key: "role_id", label: "Role", render: (r) => r.role_id },
          ]}
          rows={rows}
          onDelete={async (r) => {
            await apiRequest(`/api/v1/super-admin/org-access/${r.id}`, { method: "DELETE" });
            load();
          }}
        />
      </CardContent>
    </Card>
  );
}
