import { useEffect, useState } from "react";
import { apiRequest } from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";

export type Row = {
  id: number;
  title: string;
  subtitle?: string;
  status?: string;
  value?: number;
};

type Props = {
  title: string;
  endpoint: string;
  columns: { key: keyof Row | "value"; label: string }[];
};

export function ModuleListPage({ title, endpoint, columns }: Props) {
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    apiRequest<{ data: Row[] }>(endpoint)
      .then((res) => setRows(res.data || []))
      .catch((e) => setError(e instanceof Error ? e.message : "โหลดไม่สำเร็จ"))
      .finally(() => setLoading(false));
  }, [endpoint]);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        {error && <p className="text-destructive mb-3 text-sm">{error}</p>}
        <div className="overflow-x-auto rounded-lg border border-border">
          <table className="w-full text-sm">
            <thead className="bg-muted/50">
              <tr>
                {columns.map((c) => (
                  <th key={c.key} className="p-3 text-left font-medium">
                    {c.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.id} className="border-t border-border">
                  {columns.map((c) => (
                    <td key={c.key} className="p-3">
                      {c.key === "value"
                        ? row.value?.toLocaleString() ?? "-"
                        : String(row[c.key as keyof Row] ?? "-")}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {loading && <p className="text-muted-foreground mt-3 text-sm">กำลังโหลด...</p>}
        {!loading && rows.length === 0 && (
          <p className="text-muted-foreground mt-3 text-sm">ไม่มีข้อมูล</p>
        )}
      </CardContent>
    </Card>
  );
}
