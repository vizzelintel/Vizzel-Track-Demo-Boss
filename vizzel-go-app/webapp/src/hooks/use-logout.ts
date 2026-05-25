import { useAuth } from "@/context/AuthContext";
import { useNavigate } from "react-router-dom";

export function useLogout() {
  const { logout } = useAuth();
  const navigate = useNavigate();
  return () => {
    logout();
    navigate("/login");
  };
}
