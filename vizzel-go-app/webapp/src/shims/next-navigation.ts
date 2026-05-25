import { useLocation, useNavigate } from "react-router-dom";

export function usePathname() {
  return useLocation().pathname;
}

export function useRouter() {
  const navigate = useNavigate();
  return {
    push: (url: string) => navigate(url),
    replace: (url: string) => navigate(url, { replace: true }),
    refresh: () => {
      /* SPA: no server refresh — remount via soft navigation */
    },
  };
}

export { useSearchParams } from "react-router-dom";
