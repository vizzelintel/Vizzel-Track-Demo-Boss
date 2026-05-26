import { useCallback } from "react";
import { useAuth } from "@/context/AuthContext";
import { useNavigate } from "react-router-dom";

export function useLogout() {
  const { logout } = useAuth();
  const navigate = useNavigate();

  const doLogout = useCallback(() => {
    logout();
    navigate("/login");
  }, [logout, navigate]);

  return { logout: doLogout };
}
