import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { apiRequest } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

type OrgRow = { id: number; title: string };

export function SelectOrganizationPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [orgs, setOrgs] = useState<OrgRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user?.role_id !== 1 && user?.roleID !== 1) {
      navigate("/dashboard", { replace: true });
      return;
    }
    apiRequest<{ data?: OrgRow[] }>("/api/v1/super-admin/organizations")
      .then((res) => setOrgs(Array.isArray(res.data) ? res.data : []))
      .catch(() => setOrgs([]))
      .finally(() => setLoading(false));
  }, [user, navigate]);

  return (
    <div className="flex min-h-dvh items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>เลือกองค์กร</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {loading && (
            <p className="text-muted-foreground text-sm">กำลังโหลด...</p>
          )}
          {!loading && orgs.length === 0 && (
            <p className="text-muted-foreground text-sm">ไม่พบองค์กร</p>
          )}
          {orgs.map((org) => (
            <Button
              key={org.id}
              variant="outline"
              className="w-full justify-start"
              onClick={() => navigate("/dashboard")}
            >
              {org.title}
            </Button>
          ))}
          <Button variant="ghost" className="w-full" onClick={() => navigate(-1)}>
            ย้อนกลับ
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
