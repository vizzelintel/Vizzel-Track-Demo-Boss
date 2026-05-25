import { NavLink } from "react-router-dom";
import {
  LayoutDashboard,
  Building2,
  Database,
  FolderOpen,
  Bolt,
  FileJson,
  Command,
  ChevronDown,
  Shield,
} from "lucide-react";
import { useState, type ComponentType } from "react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/context/AuthContext";

type NavItem = {
  title: string;
  icon: ComponentType<{ className?: string }>;
  items?: { title: string; url: string }[];
  url?: string;
};

export function AppSidebar() {
  const { user, logout } = useAuth();
  const roleID = user?.role_id ?? 2;

  const nav: NavItem[] = [
    {
      title: "แดชบอร์ด",
      icon: LayoutDashboard,
      items: [
        { title: "ภาพรวม", url: "/dashboard" },
        { title: "รายงานส่วนตัว", url: "/dashboard/personal" },
        { title: "รายงานการรับประกัน", url: "/dashboard/reports" },
        { title: "รายงานการตรวจนับ", url: "/dashboard/audit" },
      ],
    },
  ];

  if (roleID === 1) {
    nav.unshift({
      title: "Super Admin",
      icon: Shield,
      items: [
        { title: "ภาพรวม", url: "/super-admin/dashboard" },
        { title: "จัดการองค์กร", url: "/super-admin/organizations" },
        { title: "จัดการเมนู", url: "/super-admin/menus" },
        { title: "สิทธิ์เข้าถึง Org", url: "/super-admin/org-access" },
      ],
    });
  }

  if (roleID === 1 || roleID === 2) {
    nav.push({
      title: "จัดการองค์กร",
      icon: Building2,
      items: [
        { title: "จัดการสมาชิก", url: "/users" },
        { title: "ข้อมูลองค์กรและสถานที่", url: "/organization" },
        { title: "จัดการโครงสร้างองค์กร", url: "/organization-structure" },
      ],
    });
  }

  nav.push(
    {
      title: "จัดการข้อมูลสินทรัพย์",
      icon: Database,
      items: [
        { title: "โครงสร้างสินทรัพย์", url: "/assets/structure" },
        { title: "รายการสินทรัพย์", url: "/assets/list" },
        { title: "ออกจำหน่าย", url: "/sales" },
      ],
    },
    {
      title: "การตรวจนับสินทรัพย์",
      icon: FolderOpen,
      items: [
        { title: "การตรวจนับ", url: "/audit/ongoing" },
        { title: "ประวัติการตรวจนับ", url: "/audit/history" },
      ],
    },
    { title: "แจ้งซ่อมบำรุง", icon: Bolt, url: "/repair" },
    { title: "เบิก/ยืม", icon: FileJson, url: "/withdrawal" },
  );

  return (
    <aside className="flex h-full w-64 flex-col border-r border-sidebar-border bg-sidebar text-sidebar-foreground">
      <div className="flex items-center gap-2 border-b border-sidebar-border p-4">
        <div className="flex size-8 items-center justify-center rounded-lg bg-sidebar-primary text-sidebar-primary-foreground">
          <Command className="size-4" />
        </div>
        <div>
          <div className="text-sm font-semibold">Vizzel Track</div>
          <div className="text-xs text-muted-foreground">Demo</div>
        </div>
      </div>
      <nav className="flex-1 overflow-y-auto p-2">
        {nav.map((group) => (
          <NavGroup key={group.title} item={group} />
        ))}
      </nav>
      <div className="border-t border-sidebar-border p-4">
        <div className="mb-2 truncate text-sm font-medium">{user?.display_name || user?.email}</div>
        <button
          type="button"
          onClick={logout}
          className="text-sm text-primary hover:underline"
        >
          ออกจากระบบ
        </button>
      </div>
    </aside>
  );
}

function NavGroup({ item }: { item: NavItem }) {
  const [open, setOpen] = useState(true);
  const Icon = item.icon;

  if (item.url) {
    return (
      <NavLink
        to={item.url}
        className={({ isActive }) =>
          cn(
            "mb-1 flex items-center gap-2 rounded-lg px-3 py-2 text-sm hover:bg-sidebar-accent",
            isActive && "bg-sidebar-accent font-medium",
          )
        }
      >
        <Icon className="size-4" />
        {item.title}
      </NavLink>
    );
  }

  return (
    <div className="mb-2">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="flex w-full items-center justify-between rounded-lg px-3 py-2 text-sm font-medium hover:bg-sidebar-accent"
      >
        <span className="flex items-center gap-2">
          <Icon className="size-4" />
          {item.title}
        </span>
        <ChevronDown className={cn("size-4 transition", open && "rotate-180")} />
      </button>
      {open && (
        <div className="ml-2 space-y-0.5 border-l border-sidebar-border pl-2">
          {item.items?.map((sub) => (
            <NavLink
              key={sub.url}
              to={sub.url}
              className={({ isActive }) =>
                cn(
                  "block rounded-md px-3 py-1.5 text-sm text-muted-foreground hover:bg-sidebar-accent hover:text-sidebar-foreground",
                  isActive && "bg-sidebar-accent font-medium text-sidebar-foreground",
                )
              }
            >
              {sub.title}
            </NavLink>
          ))}
        </div>
      )}
    </div>
  );
}
