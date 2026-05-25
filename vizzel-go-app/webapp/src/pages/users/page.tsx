import { useEffect, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { fetchOrganizationUsers } from "@/lib/user";
import UserManagementDashboard from "./components/user-management-dashboard";

type UsersPayload = {
  initialActiveUsers: { data: unknown[]; total: number; totalPages: number };
  initialPendingUsers: { data: unknown[]; total: number; totalPages: number };
  initialLimits: null;
};

const emptyPage = { data: [] as unknown[], total: 0, totalPages: 1 };

export function UsersPage() {
  const { user, loading: authLoading } = useAuth();
  const [payload, setPayload] = useState<UsersPayload | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (authLoading) return;
    const orgID = user?.organization_id;
    if (!orgID) {
      setLoading(false);
      return;
    }

    Promise.all([
      fetchOrganizationUsers(orgID, 1, 10, 2).catch(() => emptyPage),
      fetchOrganizationUsers(orgID, 1, 10, 1).catch(() => emptyPage),
    ])
      .then(([activeUsers, pendingUsers]) => {
        setPayload({
          initialActiveUsers: activeUsers,
          initialPendingUsers: pendingUsers,
          initialLimits: null,
        });
      })
      .catch(() => {
        setPayload({
          initialActiveUsers: emptyPage,
          initialPendingUsers: emptyPage,
          initialLimits: null,
        });
      })
      .finally(() => setLoading(false));
  }, [user, authLoading]);

  if (authLoading || loading) {
    return (
      <div className="text-muted-foreground flex flex-1 items-center justify-center p-8">
        กำลังโหลดจัดการสมาชิก...
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
    <UserManagementDashboard
      initialActiveUsers={payload.initialActiveUsers}
      initialPendingUsers={payload.initialPendingUsers}
      initialLimits={payload.initialLimits}
    />
  );
}
