import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { apiRequest, type ListRow } from "@/lib/api";
import ClientAuditScanningPage from "@/pages/audit/ongoing/client-page";

function mapJob(row: ListRow & Record<string, unknown>) {
  return {
    id: row.id,
    name: row.title,
    desc: row.subtitle ?? "ไม่มีรายละเอียด",
    status: row.status ?? "Ongoing",
    jobCode: `#${row.id}`,
    refCode: row.refCode ?? "-",
    createdAt: row.createdAt ?? new Date().toISOString(),
    startDate: row.startDate,
    assignedUsers: row.assignedUsers ?? [],
    stats: {
      total: 100,
      counted: Number(row.value ?? 0),
      progress: Number(row.value ?? 0),
    },
  };
}

export function AuditJobPage() {
  const { jobID } = useParams();
  const { user, loading: authLoading } = useAuth();
  const [job, setJob] = useState<ReturnType<typeof mapJob> | null>(null);
  const [errorMsg, setErrorMsg] = useState<string>();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (authLoading || !jobID) return;
    apiRequest<ListRow & Record<string, unknown>>(`/audit/job-detail/${jobID}`)
      .then((row) => setJob(mapJob(row)))
      .catch(async () => {
        try {
          const fallback = await apiRequest<ListRow & Record<string, unknown>>(
            `/api/v1/audit/jobs/${jobID}`,
          );
          setJob(mapJob(fallback));
        } catch (err: unknown) {
          setErrorMsg(err instanceof Error ? err.message : "not found");
          setJob(null);
        }
      })
      .finally(() => setLoading(false));
  }, [jobID, authLoading]);

  if (authLoading || loading) {
    return (
      <div className="text-muted-foreground flex flex-1 items-center justify-center p-8">
        กำลังโหลดงานตรวจนับ...
      </div>
    );
  }

  return (
    <ClientAuditScanningPage
      initialJob={job}
      jobID={jobID ?? ""}
      errorMsg={errorMsg}
      orgID={user?.organization_id}
    />
  );
}
