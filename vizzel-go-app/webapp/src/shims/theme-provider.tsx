import type { ReactNode } from "react";

/** Minimal theme provider for Vite SPA (production uses next-themes). */
export function ThemeProvider({ children }: { children: ReactNode }) {
  return <>{children}</>;
}

export function useTheme() {
  return { theme: "light" as const, setTheme: (_: string) => {} };
}
