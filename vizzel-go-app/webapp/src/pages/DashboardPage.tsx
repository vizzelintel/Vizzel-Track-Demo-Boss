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
import { getDashboardInitialData } from "@/lib/data-service";
import type {
  DepreciationRow,
  LocationRow,
  NewAssetRow,
  StatusRow,
  TrendRow,
  ValueHistoryRow,
} from "@/lib/dashboard-normalize";
import { TEST_IDS } from "@/components/test-ids";

function CardSkeleton({ className = "h-[360px]" }: { className?: string }) {
  return <Skeleton className={`w-full rounded-xl ${className}`} />;
}

export function DashboardPage() {
  const { user } = useAuth();
  const orgId = user?.organization_id ?? 0;
  const [summary, setSummary] = useState<Record<string, unknown> | null>(null);
  const [trend, setTrend] = useState<TrendRow[]>([]);
  const [valueHistory, setValueHistory] = useState<ValueHistoryRow[]>([]);
  const [statusChart, setStatusChart] = useState<StatusRow[] | null>(null);
  const [depreciation, setDepreciation] = useState<DepreciationRow[]>([]);
  const [newAssets, setNewAssets] = useState<NewAssetRow[]>([]);
  const [location, setLocation] = useState<LocationRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!orgId) {
      setLoading(false);
      return;
    }
    setLoading(true);
    getDashboardInitialData(orgId)
      .then((bundle) => {
        setSummary(bundle.summary);
        setTrend(bundle.trend);
        setValueHistory(bundle.valueHistory);
        setStatusChart(bundle.status);
        setDepreciation(bundle.depreciation);
        setNewAssets(bundle.newAssets);
        setLocation(bundle.location);
      })
      .finally(() => setLoading(false));
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
              initialData={valueHistory}
              initialRangeId="3y"
            />
            <AssetStatusChart data={statusChart} />
          </div>

          <DepreciationSection
            organizationID={orgId}
            data={depreciation}
            initialRangeId="3y"
          />

          <NewAssetsSection data={newAssets} />

          <AssetLocationSection data={location} />
        </div>
      </div>
    </div>
  );
}
