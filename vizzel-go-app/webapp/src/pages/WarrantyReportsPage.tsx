import { useEffect, useState } from "react";
import { apiRequest } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DataTable } from "@/components/data/DataTable";
import type { ListRow } from "@/lib/api";

export function WarrantyReportsPage() {
  const { user } = useAuth();
  const [rows, setRows] = useState<ListRow[]>([]);
  const [summary, setSummary] = useState<Record<string, number>>({});

  useEffect(() => {
    const org = user?.organization_id ?? 1;
    apiRequest<{ warranties: ListRow[]; summary: Record<string, number> }>(
      `/api/v1/warranty/initial-data/${org}`,
    ).then((r) => {
      setRows(r.warranties);
      setSummary(r.summary);
    });
  }, [user]);

  return (
    <div className="space-y-4">
      <div className="grid gap-4 md:grid-cols-3">
        {Object.entries(summary).map(([k, v]) => (
          <Card key={k}>
            <CardHeader>
              <CardTitle className="text-base capitalize">{k}</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-semibold">{v}</p>
            </CardContent>
          </Card>
        ))}
      </div>
      <Card>
        <CardHeader>
          <CardTitle>รายการรับประกัน</CardTitle>
        </CardHeader>
        <CardContent>
          <DataTable
            columns={[
              { key: "title", label: "เลขครุภัณฑ์" },
              { key: "subtitle", label: "ชื่อ" },
              { key: "status", label: "สถานะ" },
            ]}
            rows={rows}
          />
        </CardContent>
      </Card>
    </div>
  );
}
