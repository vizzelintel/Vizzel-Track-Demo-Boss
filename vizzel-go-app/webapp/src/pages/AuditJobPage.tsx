import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { apiRequest, type ListRow } from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";

export function AuditJobPage() {
  const { jobID } = useParams();
  const [job, setJob] = useState<ListRow | null>(null);

  useEffect(() => {
    if (jobID) {
      apiRequest<ListRow>(`/api/v1/audit/jobs/${jobID}`).then(setJob).catch(() => setJob(null));
    }
  }, [jobID]);

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>งานตรวจนับ #{jobID}</CardTitle>
        <Link to="/audit/ongoing">
          <Button variant="outline" className="h-8 px-3 text-xs">
            ← กลับ
          </Button>
        </Link>
      </CardHeader>
      <CardContent className="space-y-4">
        <p>
          <span className="text-muted-foreground">ชื่องาน:</span> {job?.title ?? "—"}
        </p>
        <p>
          <span className="text-muted-foreground">สถานะ:</span> {job?.status ?? "—"}
        </p>
        <p>
          <span className="text-muted-foreground">ความคืบหน้า:</span> {job?.value ?? 0}%
        </p>
        <p className="text-muted-foreground text-sm">
          หน้าสแกน/นับสินทรัพย์ (Demo) — ใช้แสดงรายละเอียดงานตรวจนับแบบ production
        </p>
      </CardContent>
    </Card>
  );
}
