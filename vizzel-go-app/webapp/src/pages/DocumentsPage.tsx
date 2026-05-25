import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { apiRequest, type ListRow } from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export function DocumentsPage() {
  const [categories, setCategories] = useState<ListRow[]>([]);

  useEffect(() => {
    apiRequest<{ data: ListRow[] }>("/api/v1/assets/categories").then((r) => setCategories(r.data));
  }, []);

  return (
    <Card>
      <CardHeader>
        <CardTitle>เอกสารสินทรัพย์</CardTitle>
        <p className="text-muted-foreground text-sm">เลือกหมวดเพื่อดูเอกสารแนบ (ตาม production)</p>
      </CardHeader>
      <CardContent>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {categories.map((c) => (
            <Link
              key={c.id}
              to={`/documents/${c.id}`}
              className="rounded-lg border border-border p-4 hover:bg-muted/50"
            >
              <div className="text-2xl">📁</div>
              <div className="mt-2 font-medium">{c.title}</div>
            </Link>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
