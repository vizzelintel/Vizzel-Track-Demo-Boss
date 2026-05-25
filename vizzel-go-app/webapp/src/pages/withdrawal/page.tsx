import { useEffect, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { apiRequest } from "@/lib/api";
import { fetchOrganizationUsers } from "@/lib/user";
import { getApproveWithdrawals } from "@/lib/withdrawal";
import ClientWithdrawalPage from "./client-page";

type WithdrawalPayload = {
  initialAssets: unknown[];
  initialUsers: { data: unknown[] };
  initialHistory: unknown[];
};

export function WithdrawalPage() {
  const { user, loading: authLoading } = useAuth();
  const [payload, setPayload] = useState<WithdrawalPayload | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (authLoading) return;
    const orgID = user?.organization_id;
    if (!orgID) {
      setLoading(false);
      return;
    }

    Promise.all([
      apiRequest<unknown[]>(`/withdrawal/asset/list?organizationID=${orgID}`).catch(
        () => [],
      ),
      fetchOrganizationUsers(orgID, 1, 1000).catch(() => ({ data: [] })),
      getApproveWithdrawals(orgID, -1, 1, 100).catch(() => ({ data: [] })),
    ])
      .then(([assets, usersRes, historyRes]) => {
        setPayload({
          initialAssets: Array.isArray(assets) ? assets : [],
          initialUsers: usersRes?.data ? usersRes : { data: [] },
          initialHistory: (historyRes as { data?: unknown[] })?.data ?? [],
        });
      })
      .catch(() => {
        setPayload({
          initialAssets: [],
          initialUsers: { data: [] },
          initialHistory: [],
        });
      })
      .finally(() => setLoading(false));
  }, [user, authLoading]);

  if (authLoading || loading) {
    return (
      <div className="text-muted-foreground flex flex-1 items-center justify-center p-8">
        กำลังโหลดระบบเบิก-ยืม...
      </div>
    );
  }

  if (!payload) {
    return (
      <div className="text-muted-foreground flex flex-1 items-center justify-center p-8">
        ไม่พบข้อมูลองค์กร
      </div>
    );
  }

  return (
    <ClientWithdrawalPage
      initialAssets={payload.initialAssets}
      initialUsers={payload.initialUsers}
      initialHistory={payload.initialHistory}
    />
  );
}
