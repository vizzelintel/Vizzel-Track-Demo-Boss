import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";

export function InboxPage() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>กล่องข้อความ</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-muted-foreground text-sm">ไม่มีข้อความใหม่ (Demo)</p>
      </CardContent>
    </Card>
  );
}
