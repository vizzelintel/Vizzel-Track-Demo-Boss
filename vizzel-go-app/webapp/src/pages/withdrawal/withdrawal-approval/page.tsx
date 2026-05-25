import { useEffect, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { getApproveWithdrawals } from "@/lib/withdrawal";
import ClientApprovalPage from "./client-page";

export function WithdrawalApprovalPage() {
  const { user, loading: authLoading } = useAuth();
  const [initialPending, setInitialPending] = useState<unknown[]>([]);
  const [initialApproved, setInitialApproved] = useState<unknown[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (authLoading) return;
    const orgID = user?.organization_id;
    if (!orgID) {
      setLoading(false);
      return;
    }

    Promise.all([
      getApproveWithdrawals(orgID, 0, 1, 100).catch(() => ({ data: [] })),
      getApproveWithdrawals(orgID, 1, 1, 100).catch(() => ({ data: [] })),
    ])
      .then(([pendingRes, approvedRes]) => {
        setInitialPending((pendingRes as { data?: unknown[] })?.data ?? []);
        setInitialApproved((approvedRes as { data?: unknown[] })?.data ?? []);
      })
      .finally(() => setLoading(false));
  }, [user, authLoading]);

  if (authLoading || loading) {
    return (
      <div className="text-muted-foreground flex flex-1 items-center justify-center p-8">
        กำลังโหลดอนุมัติเบิก-ยืม...
      </div>
    );
  }

  return (
    <ClientApprovalPage
      initialPending={initialPending}
      initialApproved={initialApproved}
    />
  );
}
