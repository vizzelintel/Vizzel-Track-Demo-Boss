import { useCallback, useEffect, useState } from "react";
import { apiRequest, type Asset } from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";

export function AssetsListPage() {
  const [items, setItems] = useState<Asset[]>([]);
  const [cursor, setCursor] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async (next?: string | null, append = false) => {
    setLoading(true);
    try {
      const q = new URLSearchParams({ limit: "20" });
      if (next) q.set("cursor", next);
      const res = await apiRequest<{
        data: Asset[];
        next_cursor: string | null;
        has_more: boolean;
      }>(`/api/v1/assets?${q}`);
      setItems((prev) => (append ? [...prev, ...res.data] : res.data));
      setCursor(res.next_cursor);
      setHasMore(res.has_more);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-lg">รายการสินทรัพย์</CardTitle>
        <span className="text-muted-foreground text-sm">{items.length} รายการ</span>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto rounded-lg border border-border">
          <table className="w-full text-sm">
            <thead className="bg-muted/50">
              <tr className="text-left">
                <th className="p-3 font-medium">เลขที่</th>
                <th className="p-3 font-medium">ชื่อ</th>
                <th className="p-3 font-medium">มูลค่า</th>
                <th className="p-3 font-medium">สถานะ</th>
              </tr>
            </thead>
            <tbody>
              {items.map((row) => (
                <tr key={row.id} className="border-t border-border">
                  <td className="p-3">{row.asset_number}</td>
                  <td className="p-3">{row.asset_name}</td>
                  <td className="p-3">{row.asset_value.toLocaleString()}</td>
                  <td className="p-3">{row.status}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {loading && <p className="text-muted-foreground mt-4 text-sm">กำลังโหลด...</p>}
        {hasMore && !loading && (
          <Button className="mt-4" variant="outline" onClick={() => load(cursor, true)}>
            โหลดเพิ่ม
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
