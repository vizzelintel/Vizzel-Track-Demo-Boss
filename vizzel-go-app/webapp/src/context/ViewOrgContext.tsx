import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { useAuth } from "@/context/AuthContext";
import { listAccessibleOrganizations, type OrgOption } from "@/lib/organizations";

const STORAGE_KEY = "vizzel_view_org_id";

type ViewOrgState = {
  viewOrgId: number | null;
  viewOrg: OrgOption | null;
  loginOrgId: number | null;
  accessibleOrgs: OrgOption[];
  setViewOrgId: (id: number) => void;
  loading: boolean;
};

const ViewOrgContext = createContext<ViewOrgState | null>(null);

export function ViewOrgProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const loginOrgId = user?.organization_id ?? user?.organizationID ?? null;
  const loginOrgName = user?.organization?.name ?? "องค์กร";
  const roleID = user?.role_id ?? user?.roleID ?? null;
  const isSuperAdmin = roleID === 1;

  const [accessibleOrgs, setAccessibleOrgs] = useState<OrgOption[]>([]);
  const [viewOrgId, setViewOrgIdState] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!loginOrgId) {
      setAccessibleOrgs([]);
      setViewOrgIdState(null);
      setLoading(false);
      return;
    }
    // Only Super Admin can view-as another org. Regular users are pinned to
    // their primary org and never see the switcher.
    if (!isSuperAdmin) {
      setAccessibleOrgs([{ id: loginOrgId, title: loginOrgName }]);
      setViewOrgIdState(loginOrgId);
      localStorage.removeItem(STORAGE_KEY);
      setLoading(false);
      return;
    }
    setLoading(true);
    listAccessibleOrganizations(loginOrgId, loginOrgName)
      .then((orgs) => {
        setAccessibleOrgs(orgs);
        const stored = localStorage.getItem(STORAGE_KEY);
        const storedId = stored ? Number(stored) : NaN;
        if (Number.isFinite(storedId) && orgs.some((o) => o.id === storedId)) {
          setViewOrgIdState(storedId);
        } else {
          setViewOrgIdState(loginOrgId);
        }
      })
      .catch(() => {
        setAccessibleOrgs([{ id: loginOrgId, title: loginOrgName }]);
        setViewOrgIdState(loginOrgId);
      })
      .finally(() => setLoading(false));
  }, [loginOrgId, loginOrgName, isSuperAdmin]);

  const setViewOrgId = useCallback((id: number) => {
    setViewOrgIdState(id);
    localStorage.setItem(STORAGE_KEY, String(id));
  }, []);

  const viewOrg = useMemo(() => {
    if (!viewOrgId) return null;
    return accessibleOrgs.find((o) => o.id === viewOrgId) ?? null;
  }, [accessibleOrgs, viewOrgId]);

  const value = useMemo(
    () => ({
      viewOrgId,
      viewOrg,
      loginOrgId,
      accessibleOrgs,
      setViewOrgId,
      loading,
    }),
    [viewOrgId, viewOrg, loginOrgId, accessibleOrgs, setViewOrgId, loading],
  );

  return <ViewOrgContext.Provider value={value}>{children}</ViewOrgContext.Provider>;
}

export function useViewOrg() {
  const ctx = useContext(ViewOrgContext);
  if (!ctx) throw new Error("useViewOrg outside ViewOrgProvider");
  return ctx;
}
