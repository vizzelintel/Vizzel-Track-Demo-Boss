"use client";

import * as React from "react";
import Link from "next/link";
import {
  LayoutDashboard,
  FolderOpen,
  Building2,
  FileText,
  Database,
  Bolt,
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

import { NavUser } from "@/components/nav-user";
import { NavMain, type NavMainItem } from "@/components/nav-main";

import { useUser } from "@/hooks/use-user";
import { getImageUrl } from "@/lib/utils";

import { useSession } from "next-auth/react";

import { useOrganizationMenus } from "@/hooks/use-organization-menus";
import { TEST_IDS } from "@/components/test-ids";
import { useViewOrg } from "@/context/ViewOrgContext";

export function AppSidebar({
  initialMenus = [],
  ...props
}: React.ComponentProps<typeof Sidebar> & { initialMenus?: any[] }) {
  const { data: session, status: sessionStatus } = useSession();
  const { user, loading: userLoading } = useUser();
  const loading = userLoading || sessionStatus === "loading";
  // const { isMobile, setOpenMobile } = useSidebar();
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
  const { viewOrg, accessibleOrgs } = useViewOrg();
  const sidebarOrgName =
    accessibleOrgs.length >= 2 && viewOrg?.title
      ? viewOrg.title
      : user?.organizationRelation?.organizationName || "Enterprise";

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
      { title: "ตั้งค่าการแจ้งเตือน", url: "/settings/notifications" },
      { title: "ผู้อนุมัติตามขั้น", url: "/settings/approval-delegates" },
      { title: "บทบาท & สิทธิ์", url: "/settings/roles" },
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
  const showMainSystem = hasMenu(1);

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
        ...([1, 2].includes(roleID as number)
          ? [{ title: "ภาพรวม", url: "/withdrawal/dashboard" }]
          : []),
        { title: "ทำรายการเบิก-ยืม", url: "/withdrawal" },
        ...([1, 2].includes(roleID as number)
          ? [
              { title: "อนุมัติการเบิก-ยืม", url: "/withdrawal-approval" },
              { title: "คิวอนุมัติ (รวม)", url: "/approval-queue" },
            ]
          : []),
      ],
    },
    {
      title: "โอนย้ายครุภัณฑ์",
      url: "#",
      icon: ArrowLeftRight,
      disabled: !showMainSystem,
      badge: !showMainSystem ? "Pro" : undefined,
      items: [
        ...([1, 2].includes(roleID as number)
          ? [{ title: "ภาพรวม", url: "/transfer/dashboard" }]
          : []),
        { title: "ทำรายการโอนย้าย", url: "/transfer" },
        ...([1, 2].includes(roleID as number)
          ? [
              { title: "อนุมัติโอนย้าย", url: "/approval-queue?workflow=transfer" },
              { title: "คิวอนุมัติ (รวม)", url: "/approval-queue" },
            ]
          : []),
        { title: "รายการขาเข้า", url: "/transfer/incoming" },
      ],
    },
    {
      title: "ออกจำหน่าย",
      url: "#",
      icon: Database,
      disabled: !showMainSystem,
      badge: !showMainSystem ? "Pro" : undefined,
      items: [
        { title: "ภาพรวม LOT", url: "/sales" },
        { title: "ตั้งเรื่องจำหน่าย", url: "/sales/create" },
        ...([1, 2].includes(roleID as number)
          ? [{ title: "คิวอนุมัติ", url: "/approval-queue?workflow=disposal" }]
          : []),
      ],
    },
    {
      title: "แจ้งซ่อมบำรุง",
      url: "#",
      icon: Bolt,
      disabled: !showMainSystem,
      badge: !showMainSystem ? "Pro" : undefined,
      testId: TEST_IDS.SIDEBAR.LINK_REPAIR,
      items: [
        ...([1, 2].includes(roleID as number)
          ? [{ title: "ภาพรวม", url: "/repair/dashboard" }]
          : []),
        { title: "แจ้งซ่อม", url: "/repair" },
        ...([1, 2].includes(roleID as number)
          ? [{ title: "คิวอนุมัติ", url: "/approval-queue?workflow=repair" }]
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

  return (
    <>
      <Sidebar variant="inset" data-testid={TEST_IDS.SIDEBAR.WRAPPER} {...props}>
        <SidebarHeader>
          <SidebarMenu>
            <SidebarMenuItem>
              <SidebarMenuButton size="lg" asChild className="pr-8" data-testid={TEST_IDS.SIDEBAR.LINK_DASHBOARD}>
                <Link href="/dashboard">
                  <div className="bg-primary text-primary-foreground flex aspect-square size-8 items-center justify-center rounded-lg">
                    <Command className="size-4" />
                  </div>
                  <div className="grid flex-1 text-left text-sm leading-tight">
                    <span className="truncate font-medium">VizzelTrack</span>
                    <span className="truncate text-xs">{sidebarOrgName}</span>
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
          />
        </SidebarFooter>
      </Sidebar>
    </>
  );
}
/* end of AppSidebar */
