import { useEffect, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { apiRequest } from "@/lib/api";
import ClientWithdrawalDashboardPage from "./client-page";

type DashboardStats = {
  pendingRequests: number;
  activeLoans: number;
  overdueCount: number;
  totalAssets: number;
};

function mapDashboardStats(raw: Record<string, unknown> | null): DashboardStats {
  if (!raw) {
    return { pendingRequests: 0, activeLoans: 0, overdueCount: 0, totalAssets: 0 };
  }
  return {
    pendingRequests: Number(raw.pendingRequests ?? raw.pending ?? 0),
    activeLoans: Number(raw.activeLoans ?? raw.approved ?? 0),
    overdueCount: Number(raw.overdueCount ?? 0),
    totalAssets: Number(raw.totalAssets ?? raw.total ?? 0),
  };
}

export function WithdrawalDashboardPage() {
  const { user, loading: authLoading } = useAuth();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (authLoading) return;
    const orgID = user?.organization_id;
    if (!orgID) {
      setLoading(false);
      return;
    }

    apiRequest<Record<string, unknown>>(`/withdrawal/dashboard-stats/${orgID}`)
      .then((res) => setStats(mapDashboardStats(res)))
      .catch(() =>
        setStats({ pendingRequests: 0, activeLoans: 0, overdueCount: 0, totalAssets: 0 }),
      )
      .finally(() => setLoading(false));
  }, [user, authLoading]);

  if (authLoading || loading) {
    return (
      <div className="text-muted-foreground flex flex-1 items-center justify-center p-8">
        กำลังโหลดภาพรวมเบิก-ยืม...
      </div>
    );
  }

  return <ClientWithdrawalDashboardPage dashboardStats={stats} />;
}
