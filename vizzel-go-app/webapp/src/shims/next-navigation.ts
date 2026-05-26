import { useMemo } from "react";
import {
  useLocation,
  useNavigate,
  useSearchParams as useRRSearchParams,
} from "react-router-dom";

export function usePathname() {
  return useLocation().pathname;
}

export function useRouter() {
  const navigate = useNavigate();
  return {
    push: (url: string) => navigate(url),
    replace: (url: string) => navigate(url, { replace: true }),
    refresh: () => {
      /* SPA: no server refresh */
    },
  };
}

/** Next.js-compatible: returns URLSearchParams with `.get()`, not a tuple. */
export function useSearchParams() {
  const [params] = useRRSearchParams();
  return useMemo(() => params, [params]);
}
