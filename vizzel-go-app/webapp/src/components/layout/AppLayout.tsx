import { Outlet, useLocation } from "react-router-dom";
import { AppSidebar } from "./AppSidebar";

const titles: Record<string, string> = {
  "/dashboard": "ภาพรวม",
  "/assets/list": "รายการสินทรัพย์",
};

export function AppLayout() {
  const { pathname } = useLocation();
  const title = titles[pathname] || "Vizzel Track";

  return (
    <div className="flex min-h-screen bg-background">
      <AppSidebar />
      <div className="flex flex-1 flex-col">
        <header className="flex h-14 items-center border-b border-border px-6">
          <h1 className="text-lg font-semibold">{title}</h1>
        </header>
        <main className="flex-1 overflow-auto p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
