import { useAuth } from "@/context/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";

export function ProfilePage() {
  const { user } = useAuth();
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">โปรไฟล์</CardTitle>
      </CardHeader>
      <CardContent className="space-y-2 text-sm">
        <p>
          <span className="text-muted-foreground">ชื่อ:</span> {user?.display_name}
        </p>
        <p>
          <span className="text-muted-foreground">อีเมล:</span> {user?.email}
        </p>
        <p>
          <span className="text-muted-foreground">องค์กร:</span>{" "}
          {user?.organization?.name} (ID {user?.organization_id})
        </p>
        <p>
          <span className="text-muted-foreground">บทบาท:</span> Role {user?.role_id}
        </p>
      </CardContent>
    </Card>
  );
}
