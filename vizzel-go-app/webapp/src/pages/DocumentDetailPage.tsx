import { useState } from "react";
import { Link, useParams } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export function DocumentDetailPage() {
  const { id } = useParams();
  const [docs] = useState([
    { id: 1, name: "ใบรับประกัน.pdf", type: "warranty" },
    { id: 2, name: "ใบเสร็จ.pdf", type: "receipt" },
  ]);

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>เอกสาร — หมวด #{id}</CardTitle>
        <Link to="/documents">
          <Button variant="outline" className="h-8 text-xs">
            ← กลับ
          </Button>
        </Link>
      </CardHeader>
      <CardContent>
        <ul className="space-y-2">
          {docs.map((d) => (
            <li key={d.id} className="flex items-center justify-between rounded-lg border border-border p-3">
              <span>{d.name}</span>
              <span className="text-muted-foreground text-xs">{d.type}</span>
            </li>
          ))}
        </ul>
        <p className="text-muted-foreground mt-4 text-xs">Demo — อัปโหลดไฟล์จริงเชื่อม Supabase Storage ใน production</p>
      </CardContent>
    </Card>
  );
}
