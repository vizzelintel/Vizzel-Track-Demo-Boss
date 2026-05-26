import { useAuth } from "@/context/AuthContext";
import { apiRequest, type User } from "@/lib/api";
import { useEffect, useMemo, useState } from "react";

export function useUser() {
  const { user: ctxUser, loading: ctxLoading } = useAuth();
  const [user, setUser] = useState<User | null>(ctxUser);
  const [loading, setLoading] = useState(ctxLoading);

  useEffect(() => {
    if (!ctxUser) {
      setUser(null);
      setLoading(ctxLoading);
      return;
    }
    setUser(ctxUser);
    apiRequest<User>("/api/v1/auth/me")
      .then((me) => setUser(me))
      .catch(() => setUser(ctxUser))
      .finally(() => setLoading(false));
  }, [ctxUser, ctxLoading]);

  const mapped = useMemo(() => {
    if (!user) return null;
    const organizationID = user.organization_id ?? user.organizationID;
    const roleID = user.role_id ?? user.roleID ?? 2;
    return {
      ...user,
      id: user.id,
      organizationID,
      roleID,
      isOrgVerified: true,
      organizationRelation: {
        roleID,
        organizationID: organizationID ?? 1,
        organizationName: user.organization?.name ?? "Enterprise",
      },
    };
  }, [user]);

  return { user: mapped, loading };
}
