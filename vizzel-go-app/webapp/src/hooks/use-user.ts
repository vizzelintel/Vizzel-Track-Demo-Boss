import { useAuth } from "@/context/AuthContext";
import { apiRequest, type User } from "@/lib/api";
import { useEffect, useState } from "react";

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

  const mapped = user
    ? {
        ...user,
        id: user.id,
        organizationID: user.organization_id ?? user.organizationID,
        roleID: user.role_id ?? user.roleID,
        isOrgVerified: true,
        organizationRelation: {
          roleID: user.role_id ?? user.roleID ?? 2,
          organizationID: user.organization_id ?? user.organizationID ?? 1,
        },
      }
    : null;

  return { user: mapped, loading };
}
