import { useEffect, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { SectionCards } from "@/components/section-cards";
import { ChartAreaInteractive } from "@/components/chart-area-interactive";
import { AssetValueHistoryChart } from "@/components/asset-value-history-chart";
import { AssetStatusChart } from "@/components/asset-status-chart";
import { DepreciationSection } from "@/components/depreciation-section";
import { NewAssetsSection } from "@/components/new-assets-section";
import { AssetLocationSection } from "@/components/asset-location-section";
import { Skeleton } from "@/components/ui/skeleton";
import {
  getAssetLocationDashboard,
  getAssetStatusChart,
  getAssetTrend,
  getAssetValueHistory,
  getDashboardSummary,
  getDepreciationHistoryDashboard,
  getNewAssetsDashboard,
} from "@/lib/data-service";
import { TEST_IDS } from "@/components/test-ids";

function CardSkeleton({ className = "h-[360px]" }: { className?: string }) {
  return <Skeleton className={`w-full rounded-xl ${className}`} />;
}

export function DashboardPage() {
  const { user } = useAuth();
  const orgId = user?.organization_id ?? 0;
  const [summary, setSummary] = useState<Record<string, unknown> | null>(null);
  const [trend, setTrend] = useState<Array<{ date: string; count: number }>>([]);
  const [valueHistory, setValueHistory] = useState<
    Array<{ date: string; value: number }> | null
  >(null);
  const [statusChart, setStatusChart] = useState<
    Array<{ status: string; value: number; label: string }> | null
  >(null);
  const [depreciation, setDepreciation] = useState<unknown>(null);
  const [newAssets, setNewAssets] = useState<unknown>(null);
  const [location, setLocation] = useState<unknown>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!orgId) {
      setLoading(false);
      return;
    }
    Promise.all([
      getDashboardSummary(orgId).then(setSummary),
      getAssetTrend(orgId, "3m", "week").then(setTrend),
      getAssetValueHistory(orgId, "3m", "week").then(setValueHistory),
      getAssetStatusChart(orgId).then(setStatusChart),
      getDepreciationHistoryDashboard(orgId, "3y").then(setDepreciation),
      getNewAssetsDashboard(orgId).then(setNewAssets),
      getAssetLocationDashboard(orgId).then(setLocation),
    ]).finally(() => setLoading(false));
  }, [orgId]);

  if (loading) {
    return (
      <div className="flex flex-col gap-4 p-4">
        <CardSkeleton className="h-32" />
        <CardSkeleton />
      </div>
    );
  }

  return (
    <div className="flex flex-1 flex-col" data-testid={TEST_IDS.DASHBOARD.TAB_OVERVIEW}>
      <div className="@container/main flex flex-1 flex-col gap-2">
        <div className="flex flex-col gap-3 py-4 md:gap-4 md:py-6">
          <div data-testid={TEST_IDS.DASHBOARD.SECTION_KPI}>
            <SectionCards data={summary} />
          </div>

          <div className="px-4 lg:px-6">
            <ChartAreaInteractive
              organizationID={orgId}
              initialData={trend}
              initialRangeId="3m"
            />
          </div>

          <div className="grid grid-cols-1 gap-3 px-4 lg:grid-cols-2 lg:px-6">
            <AssetValueHistoryChart
              organizationID={orgId}
              initialData={valueHistory ?? []}
              initialRangeId="3m"
            />
            <AssetStatusChart data={statusChart} />
          </div>

          <DepreciationSection
            organizationID={orgId}
            data={depreciation as never}
            initialRangeId="3y"
          />

          <NewAssetsSection data={newAssets as never} />

          <AssetLocationSection data={location as never} />
        </div>
      </div>
    </div>
  );
}
