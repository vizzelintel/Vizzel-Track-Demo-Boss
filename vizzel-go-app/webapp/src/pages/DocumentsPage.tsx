import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";

export function DocumentsPage() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>เอกสารสินทรัพย์</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-muted-foreground text-sm">
          โมดูลเอกสาร (Demo) — โครงสร้างหน้าเดียวกับ production `/documents` สำหรับจัดเก็บเอกสารแนบสินทรัพย์
        </p>
        <div className="mt-4 grid gap-3 sm:grid-cols-3">
          {["สัญญา", "ใบรับประกัน", "อื่นๆ"].map((f) => (
            <div key={f} className="rounded-lg border border-dashed border-border p-6 text-center text-sm">
              📁 {f}
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
