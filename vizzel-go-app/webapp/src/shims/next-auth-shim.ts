import { useAuth } from "@/context/AuthContext";
import { getToken, clearToken } from "@/lib/api";

export function useSession() {
  const { user, loading } = useAuth();
  const token = getToken();
  return {
    data: user
      ? {
          user: {
            id: user.id,
            email: user.email,
            username: user.display_name,
            roleID: user.role_id,
            organizationID: user.organization_id,
          },
          accessToken: token ?? undefined,
        }
      : null,
    status: loading ? "loading" : user ? "authenticated" : "unauthenticated",
  };
}

export async function getSession() {
  const token = getToken();
  if (!token) return null;
  try {
    const res = await fetch("/api/v1/auth/me", {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) return null;
    const user = await res.json();
    return {
      user: {
        id: user.id,
        email: user.email,
        roleID: user.role_id,
        organizationID: user.organization_id,
      },
      accessToken: token,
    };
  } catch {
    return null;
  }
}

export function signOut(opts?: { redirect?: boolean; callbackUrl?: string }) {
  clearToken();
  if (opts?.redirect === false) return;
  window.location.href = opts?.callbackUrl ?? "/login";
}

export async function signIn(
  _provider: string,
  options?: { email?: string; password?: string; redirect?: boolean },
) {
  if (_provider !== "credentials" || !options?.email || !options?.password) {
    return { error: "CredentialsSignin", ok: false };
  }
  try {
    const res = await fetch("/api/v1/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: options.email, password: options.password }),
    });
    const data = await res.json();
    if (!res.ok) return { error: "CredentialsSignin", ok: false };
    localStorage.setItem("vizzel_access_token", data.access_token);
    return { ok: true, error: null };
  } catch {
    return { error: "Load failed", ok: false };
  }
}
