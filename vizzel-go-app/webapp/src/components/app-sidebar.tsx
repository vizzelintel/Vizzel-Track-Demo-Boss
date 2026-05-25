"use client";

import * as React from "react";
import Link from "next/link";
import {
  LayoutDashboard,
  FolderOpen,
  Settings,
  Building2,
  FileText,
  Database,
  Bolt,
  FileJson,
  LifeBuoy,
  Send,
  Command,
  ArrowLeftRight,
  Shield,
} from "lucide-react";

import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarMenuSkeleton,
  useSidebar,
} from "@/components/ui/sidebar";

import { NavSecondary } from "@/components/nav-secondary";
import { NavUser } from "@/components/nav-user";
import { NavMain, type NavMainItem } from "@/components/nav-main";

import { useUser } from "@/hooks/use-user";
import { getImageUrl } from "@/lib/utils";

import { ProfileDialog } from "@/components/profile-dialog";
import { useSession } from "next-auth/react";

import { useOrganizationMenus } from "@/hooks/use-organization-menus";
import { TEST_IDS } from "@/components/test-ids";

export function AppSidebar({
  initialMenus = [],
  ...props
}: React.ComponentProps<typeof Sidebar> & { initialMenus?: any[] }) {
  const { data: session, status: sessionStatus } = useSession();
  const { user, loading: userLoading } = useUser();
  const loading = userLoading || sessionStatus === "loading";
  // const { isMobile, setOpenMobile } = useSidebar();
  const [profileOpen, setProfileOpen] = React.useState(false);
  const [profileTab, setProfileTab] = React.useState("personal");

  // Determine initial data from Session (Fast) or User Profile (Slow but detailed)
  // This prevents menu flickering/disappearing on refresh
  const roleID =
    user?.organizationRelation?.roleID ?? session?.user?.roleID ?? null;
  const organizationID =
    user?.organizationRelation?.organizationID ??
    session?.user?.organizationID ??
    null;

  const { hasMenu, loading: menuLoading } = useOrganizationMenus(
    organizationID,
    initialMenus,
  );

  if (loading && !user) {
    return (
      <Sidebar variant="inset" {...props}>
        <SidebarHeader>
          <SidebarMenu>
            <SidebarMenuItem>
              <SidebarMenuButton size="lg" asChild className="pr-8">
                <div className="flex items-center gap-2">
                  <div className="bg-sidebar-primary text-sidebar-primary-foreground flex aspect-square size-8 items-center justify-center rounded-lg">
                    <Command className="size-4" />
                  </div>
                  <div className="flex flex-col gap-1">
                    <div className="bg-sidebar-accent h-4 w-20 animate-pulse rounded" />
                    <div className="bg-sidebar-accent/50 h-3 w-16 animate-pulse rounded" />
                  </div>
                </div>
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarHeader>
        <SidebarContent>
          <div className="space-y-4 p-4">
            <div className="space-y-2">
              <div className="bg-sidebar-accent mb-4 h-4 w-24 animate-pulse rounded" />
              {Array.from({ length: 5 }).map((_, i) => (
                <SidebarMenuSkeleton key={i} showIcon />
              ))}
            </div>
          </div>
        </SidebarContent>
        <SidebarFooter className="z-10 shadow-[0_-1px_4px_rgba(0,0,0,0.1)] md:shadow-none">
          {/* Uses NavUser but passes loading state which handles its own skeleton */}
          <NavUser
            user={{ name: "", email: "", avatar: "" }}
            isLoading={true}
            isSuperAdmin={false}
            onOpenProfile={() => { }}
          />
        </SidebarFooter>
      </Sidebar>
    );
  }

  const userName = user?.username || session?.user?.username || "User";
  const userEmail = user?.email || session?.user?.email || "";
  // const roleID was declared above
  const userAvatar = React.useMemo(() => {
    const path = user?.image || user?.avatar;
    if (!path) return "";
    const url = getImageUrl(path);
    if (!url) return "";

    // Add cache buster consistent with ProfileHeader
    const version = [user?.name, user?.surname, user?.image, user?.avatar].join(
      "",
    );
    const hash = version.split("").reduce((a, b) => {
      a = (a << 5) - a + (b?.charCodeAt(0) || 0);
      return a & a;
    }, 0);

    return `${url}?v=${Math.abs(hash)}`;
  }, [user]);

  const isInactive = user?.organizationRelation?.status === false;

  const dashboardMenu: NavMainItem = {
    title: "แดชบอร์ด",
    url: "#",
    icon: LayoutDashboard,
    testId: TEST_IDS.SIDEBAR.LINK_DASHBOARD,
    items: [
      { title: "ภาพรวม", url: "/dashboard" },
      { title: "รายงานส่วนตัว", url: "/dashboard/personal" },
      { title: "รายงานการรับประกัน", url: "/dashboard/reports" },
      { title: "รายงานการตรวจนับ", url: "/dashboard/audit", matchExact: true },
      // { title: "รายงานการซ่อมบำรุง", url: "/dashboard/repair" }, // Disabled by user request
    ],
  };

  const orgMenu: NavMainItem = {
    title: "จัดการองค์กร",
    url: "#",
    icon: Building2,
    testId: TEST_IDS.SIDEBAR.LINK_ORGANIZATION,
    items: [
      { title: "จัดการสมาชิก", url: "/users", testId: TEST_IDS.SIDEBAR.LINK_USERS },
      { title: "ข้อมูลองค์กรและสถานที่", url: "/organization" },
      { title: "จัดการโครงสร้างองค์กร", url: "/organization-structure" },
    ],
  };

  const assetMenu: NavMainItem = {
    title: "จัดการข้อมูลสินทรัพย์",
    url: "#",
    icon: Database,
    testId: TEST_IDS.SIDEBAR.LINK_ASSETS,
    items: [
      { title: "โครงสร้างสินทรัพย์", url: "/assets/structure" },
      { title: "รายการสินทรัพย์", url: "/assets/list" },
      { title: "ออกจำหน่าย", url: "/sales" },
    ],
  };

  const auditMenu: NavMainItem = {
    title: "การตรวจนับสินทรัพย์",
    url: "#",
    icon: FolderOpen,
    testId: TEST_IDS.SIDEBAR.LINK_AUDIT,
    items: [
      { title: "การตรวจนับ", url: "/audit/ongoing" },
      { title: "ประวัติการตรวจนับ", url: "/audit/history" },
    ],
  };

  const repairMenu: NavMainItem = {
    title: "แจ้งซ่อมบำรุง",
    url: "/repair",
    icon: Bolt,
    disabled: false,
    testId: TEST_IDS.SIDEBAR.LINK_REPAIR,
  };

  const withdrawalMenu: NavMainItem = {
    title: "เบิก/ยืม",
    url: "/withdrawal",
    icon: FileJson, // Using FileJson as a placeholder icon, user can change later
    disabled: false,
    testId: TEST_IDS.SIDEBAR.LINK_WITHDRAWAL,
  };

  let navMain: NavMainItem[] = [];

  if (roleID === 4) {
    // 🌟 Role 4 (Member): เห็นแค่ Dashboard -> รายงานส่วนตัว เท่านั้น
    navMain = [
      {
        ...dashboardMenu,
        items: dashboardMenu.items?.filter(
          (item) => item.title === "รายงานส่วนตัว",
        ),
      },
    ];
  } else {
    // 🌟 Role 1 (Super Admin), 2 (Admin Org), 3 (Officer)

    // 🌟 Super Admin Menu (Role 1 Only) - Moved to TOP
    if (roleID === 1) {
      navMain.push({
        title: "Super Admin",
        url: "#",
        icon: Shield,
        items: [
          { title: "ภาพรวม", url: "/super-admin/dashboard" },
          { title: "จัดการองค์กร", url: "/super-admin/organizations" },
          { title: "จัดการเมนู", url: "/super-admin/menus" },
          { title: "จัดการสิทธิ์เข้าถึง Org", url: "/super-admin/org-access" },
        ],
      });
    }

    navMain.push(dashboardMenu);

    // Organization Management: Only Role 1 & 2
    if (roleID === 1 || roleID === 2) {
      navMain.push(orgMenu);
    }

    // Asset, Audit, Repair: Roles 1, 2, 3 have access
    navMain.push(assetMenu);
    navMain.push(auditMenu);

    // (Moved Super Admin Logic from here to top)
  }

  // ถ้า Inactive ให้ Disable เมนูทั้งหมด ยกเว้น Dashboard -> ภาพรวม
  if (isInactive) {
    navMain = navMain.map((item) => {
      const isDashboard = item.title === "แดชบอร์ด";
      return {
        ...item,
        disabled: !isDashboard,
        items: item.items?.map((child) => ({
          ...child,
          disabled:
            child.url !== "/dashboard" && child.url !== "/dashboard/personal",
        })),
      };
    });
  }

  // 🌟 Document System (Existing Logic)
  // Use menuLoading from top scope

  const showDocuments = hasMenu(2);
  const showWithdrawal = hasMenu(3); // 🌟 Borrow-Return System (ID 3)

  // 🌟 Organization Specific Items
  let orgSpecificItems: NavMainItem[] = [
    {
      title: "จัดการเอกสารสินทรัพย์",
      url: "/documents",
      icon: FileText,
      // 🌟 Stable UI: Don't disable on loading. Trust hasMenu() which now has Cache.
      disabled: !showDocuments,
      badge: !showDocuments ? "Pro" : undefined,
    },
    {
      title: "ระบบเบิก-ยืม",
      url: "#",
      icon: ArrowLeftRight,
      disabled: !showWithdrawal,
      badge: !showWithdrawal ? "Pro" : undefined,
      testId: TEST_IDS.SIDEBAR.LINK_WITHDRAWAL,
      items: [
        // 1. Dashboard (Overview) - Top for Admins (Role 1 & 2)
        ...([1, 2].includes(roleID as number)
          ? [{ title: "ภาพรวม", url: "/withdrawal/dashboard" }]
          : []),

        // 2. Request (Withdraw/Borrow) - Everyone (except Role 4 logic handled elsewhere)
        { title: "ทำรายการเบิก-ยืม", url: "/withdrawal" },

        // 3. Approval - Admins (Role 1 & 2)
        ...([1, 2].includes(roleID as number)
          ? [{ title: "อนุมัติการเบิก-ยืม", url: "/withdrawal-approval" }]
          : []),
      ],
    },
  ];

  // Role 4 Restriction: Hide org specific items if Role 4
  if (roleID === 4) {
    orgSpecificItems = [];
  } else {
    // Logic for Borrow-Return visibility if needed, currently enabled for non-role 4
  }

  // 🌟 Secondary Menu
  const navSecondary = [
    {
      title: "ตั้งค่า",
      url: "#",
      icon: Settings,
      disabled: isInactive,
      testId: TEST_IDS.SIDEBAR.LINK_SETTINGS,
      onClick: () => {
        setProfileTab("account");
        setProfileOpen(true);
      },
    },
    { title: "ขอความช่วยเหลือ", url: "#", icon: LifeBuoy, disabled: true },
    { title: "ข้อเสนอแนะ", url: "#", icon: Send, disabled: true },
  ];

  const showMainSystem = hasMenu(1);

  return (
    <>
      <Sidebar variant="inset" data-testid={TEST_IDS.SIDEBAR.WRAPPER} {...props}>
        <SidebarHeader>
          <SidebarMenu>
            <SidebarMenuItem>
              <SidebarMenuButton size="lg" asChild className="pr-8" data-testid={TEST_IDS.SIDEBAR.LINK_DASHBOARD}>
                <Link href="/dashboard">
                  <div className="flex aspect-square size-8 items-center justify-center rounded-lg overflow-hidden bg-white">
                    <img
                      src="/vizzel_logo.png"
                      alt="VizzelTrack Logo"
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <div className="grid flex-1 text-left text-sm leading-tight">
                    <span className="truncate font-medium">VizzelTrack</span>
                    <span className="truncate text-xs">{user?.organizationRelation?.organizationName || "Enterprise"}</span>
                  </div>
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarHeader>
        <SidebarContent>
          <NavMain items={navMain} label="ระบบหลัก" />

          {orgSpecificItems.length > 0 && (
            <NavMain items={orgSpecificItems} label="ระบบเฉพาะองค์กรคุณ" />
          )}

          <NavSecondary items={navSecondary} className="mt-auto" />
        </SidebarContent>
        <SidebarFooter className="z-10 shadow-[0_-1px_4px_rgba(0,0,0,0.1)] md:shadow-none">
          <NavUser
            user={{
              name: userName,
              email: userEmail,
              avatar: userAvatar || "",
            }}
            isLoading={loading}
            isSuperAdmin={roleID === 1}
            onOpenProfile={() => {
              setProfileTab("personal");
              setProfileOpen(true);
            }}
          />
        </SidebarFooter>
      </Sidebar>

      <ProfileDialog
        open={profileOpen}
        onOpenChange={setProfileOpen}
        defaultTab={profileTab}
      />
    </>
  );
}
/* end of AppSidebar */
