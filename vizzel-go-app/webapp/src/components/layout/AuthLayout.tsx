import type { ReactNode } from "react";

export function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <div className="sm:bg-primary/5 flex min-h-dvh w-full items-center justify-center overflow-auto bg-white px-4 font-sans sm:overflow-hidden sm:px-0">
      {children}
    </div>
  );
}
