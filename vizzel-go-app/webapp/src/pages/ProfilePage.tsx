import { useLocation } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";

export function ProfilePage() {
  const { user } = useAuth();
  const { pathname } = useLocation();
  const defaultTab = pathname === "/settings" ? "settings" : "account";
  const orgName = user?.organization?.name ?? "—";
  const orgId = user?.organization_id ?? user?.organizationID ?? "—";
  const roleId = user?.role_id ?? user?.roleID ?? "—";

  return (
    <div className="mx-auto max-w-2xl space-y-4">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">บัญชีผู้ใช้</h1>
        <p className="text-muted-foreground text-sm">
          ข้อมูลบัญชีและการตั้งค่าพื้นฐานของคุณในองค์กร
        </p>
      </div>

      <Tabs defaultValue={defaultTab} className="w-full">
        <TabsList>
          <TabsTrigger value="account">บัญชี</TabsTrigger>
          <TabsTrigger value="settings">ตั้งค่า</TabsTrigger>
        </TabsList>

        <TabsContent value="account">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">ข้อมูลบัญชี</CardTitle>
              <CardDescription>ข้อมูลที่ใช้แสดงในระบบและเมนูผู้ใช้</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-2">
                <Label>ชื่อที่แสดง</Label>
                <Input readOnly value={user?.display_name ?? ""} />
              </div>
              <div className="grid gap-2">
                <Label>อีเมล</Label>
                <Input readOnly value={user?.email ?? ""} />
              </div>
              <div className="grid gap-2">
                <Label>องค์กร</Label>
                <Input readOnly value={`${orgName} (ID ${orgId})`} />
              </div>
              <div className="grid gap-2">
                <Label>บทบาท</Label>
                <Input readOnly value={`Role ${roleId}`} />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="settings">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">ตั้งค่า</CardTitle>
              <CardDescription>
                การตั้งค่าส่วนตัว — รุ่นเดโมแสดงข้อมูลอ่านอย่างเดียว
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-2">
                <Label>ภาษาอินเทอร์เฟซ</Label>
                <Input readOnly value="ไทย (th-TH)" />
              </div>
              <div className="grid gap-2">
                <Label>การแจ้งเตือนทางอีเมล</Label>
                <Input readOnly value="เปิดใช้งาน (ค่าเริ่มต้น)" />
              </div>
              <p className="text-muted-foreground text-xs">
                การแก้ไขการตั้งค่าแบบเต็มรูปแบบจะเชื่อมกับ API ในรุ่น production
              </p>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
