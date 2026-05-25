import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { useAuth } from "@/context/AuthContext";

export function DashboardPage() {
  const { user } = useAuth();
  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">องค์กร</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-2xl font-semibold">{user?.organization?.name || "Demo Organization"}</p>
          <p className="text-muted-foreground text-sm">Org ID: {user?.organization_id}</p>
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle className="text-base">สินทรัพย์ (Demo)</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-2xl font-semibold">~200</p>
          <p className="text-muted-foreground text-sm">ดูรายละเอียดที่เมนูรายการสินทรัพย์</p>
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle className="text-base">สถานะระบบ</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-primary text-sm font-medium">Go API + React (Phase 1)</p>
          <p className="text-muted-foreground mt-1 text-sm">โมดูลอื่นกำลังพัฒนาต่อ</p>
        </CardContent>
      </Card>
    </div>
  );
}
