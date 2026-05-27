import * as React from "react";
import useSWR from "swr";
import { useAuth } from "@/context/AuthContext";
import { fetcher } from "@/lib/api";
import { Card, CardContent } from "@/components/ui/card";
import {
  AuditKpiSummary,
  AuditStatusChart,
  AuditJobFilter,
  AuditDetailTables,
  type AuditKpiData,
  type AuditStatusPoint,
  type AuditJobOption,
  type AuditAssetRow,
} from "@/components/audit";

interface AuditInitialData {
  summary: AuditKpiData;
  status: AuditStatusPoint[];
  assetsNotChecked: { data: AuditAssetRow[]; total: number } | null;
  selectedJobIds: number[];
}

interface ListEnvelope<T> {
  data: T;
}

export function AuditReportPage() {
  const { user } = useAuth();
  const orgId = user?.organization_id ?? 0;
  const [selectedJobIds, setSelectedJobIds] = React.useState<number[]>([]);

  const jobsKey = orgId ? `/audit/jobs/${orgId}` : null;
  const { data: jobsRes } = useSWR<{ data: AuditJobOption[] }>(jobsKey, fetcher, {
    revalidateOnFocus: false,
  });
  const jobs: AuditJobOption[] = React.useMemo(
    () => (Array.isArray(jobsRes?.data) ? jobsRes!.data : []),
    [jobsRes],
  );

  const sortedSelected = React.useMemo(
    () => [...selectedJobIds].sort((a, b) => a - b),
    [selectedJobIds],
  );
  const jobIdsParam =
    sortedSelected.length > 0 ? `&jobIds=${sortedSelected.join(",")}` : "";

  const dashKey = orgId
    ? `/audit/initial-data/${orgId}?page=1&pageSize=10${jobIdsParam}`
    : null;
  const { data: dashRes, isLoading } = useSWR<ListEnvelope<AuditInitialData>>(
    dashKey,
    fetcher,
    {
      revalidateOnFocus: false,
      keepPreviousData: true,
    },
  );

  const summary: AuditKpiData = dashRes?.data?.summary ?? {
    checked: 0,
    notChecked: 0,
    checkRate: 0,
    notFound: 0,
  };
  const status: AuditStatusPoint[] = dashRes?.data?.status ?? [];
  const tableData = dashRes?.data?.assetsNotChecked ?? null;

  const effectiveJobIds = React.useMemo(() => {
    if (sortedSelected.length > 0) return sortedSelected;
    return Array.isArray(dashRes?.data?.selectedJobIds)
      ? dashRes!.data.selectedJobIds
      : [];
  }, [sortedSelected, dashRes]);

  return (
    <div className="flex flex-1 flex-col">
      <div className="@container/main flex flex-1 flex-col gap-2">
        <div className="flex flex-col gap-3 py-4 md:gap-4 md:py-6">
          <div className="px-4 lg:px-6">
            <div className="flex flex-col gap-1 pb-2">
              <h1 className="text-2xl font-bold tracking-tight">
                รายงานการตรวจนับ
              </h1>
              <p className="text-muted-foreground">
                ภาพรวมการตรวจนับสินทรัพย์ขององค์กร พร้อมตัวกรองตามงานตรวจนับ
              </p>
            </div>
            <Card>
              <CardContent className="flex flex-col gap-2 py-4">
                <div className="flex flex-col gap-1">
                  <span className="text-sm font-medium">กรองข้อมูลตาม Job</span>
                  <span className="text-muted-foreground text-xs">
                    {selectedJobIds.length === 0
                      ? "ไม่ได้เลือก - ระบบใช้ Job ล่าสุดเป็นค่าเริ่มต้น"
                      : `จะกรอง KPI, กราฟ และตารางทั้งหมดตาม Job ที่เลือก ${selectedJobIds.length} รายการ`}
                  </span>
                </div>
                <AuditJobFilter
                  jobs={jobs}
                  selected={selectedJobIds}
                  onChange={setSelectedJobIds}
                />
              </CardContent>
            </Card>
          </div>

          <AuditKpiSummary data={summary} />

          <div className="px-4 lg:px-6">
            <AuditStatusChart data={status} />
          </div>

          <AuditDetailTables
            organizationID={orgId}
            summary={summary}
            initialTableData={tableData}
            jobIds={effectiveJobIds}
          />

          {isLoading && !dashRes && (
            <div className="text-muted-foreground px-4 text-sm lg:px-6">
              กำลังโหลดข้อมูลรายงานการตรวจนับ...
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
