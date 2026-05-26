"use client";

import {
  BadgeCheck,
  ChevronsUpDown,
  LogOut,
  User,
  Building2,
  Settings,
  Bell,
} from "lucide-react";

import { useRouter } from "next/navigation";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar";
import { useLogout } from "@/hooks/use-logout";
import { TEST_IDS } from "@/components/test-ids";
import { useViewOrg } from "@/context/ViewOrgContext";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export function NavUser({
  user,
  isLoading,
  isSuperAdmin,
}: {
  user: {
    name: string;
    email: string;
    avatar: string;
  };
  isLoading?: boolean;
  isSuperAdmin?: boolean;
}) {
  const { isMobile, setOpenMobile } = useSidebar();
  const { logout } = useLogout();
  const router = useRouter();
  const { accessibleOrgs, viewOrgId, setViewOrgId } = useViewOrg();
  // Org "view as" switcher is reserved for Super Admin (role 1).
  // Other multi-org users (e.g. org-access entries) keep their primary org.
  const showOrgSwitcher = Boolean(isSuperAdmin) && accessibleOrgs.length >= 2;

  const goTo = (path: string) => {
    router.push(path);
    if (isMobile) setOpenMobile(false);
  };

  if (isLoading) {
    return (
      <SidebarMenu>
        <SidebarMenuItem>
          <SidebarMenuButton size="lg" disabled>
            <div className="h-8 w-8 animate-pulse rounded-lg bg-zinc-200" />
            <div className="grid flex-1 gap-1 text-left text-sm leading-tight">
              <div className="h-4 w-24 animate-pulse rounded bg-zinc-200" />
              <div className="h-3 w-32 animate-pulse rounded bg-zinc-200" />
            </div>
            <ChevronsUpDown className="ml-auto size-4 opacity-50" />
          </SidebarMenuButton>
        </SidebarMenuItem>
      </SidebarMenu>
    );
  }

  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <SidebarMenuButton
              size="lg"
              className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground"
              suppressHydrationWarning
              data-testid={TEST_IDS.NAV_USER.BUTTON_USER_MENU}
            >
              <Avatar className="h-8 w-8 rounded-lg">
                <AvatarImage src={user.avatar} alt={user.name} />
                <AvatarFallback className="rounded-lg bg-slate-50">
                  <User className="h-4 w-4 text-slate-400" />
                </AvatarFallback>
              </Avatar>
              <div className="grid flex-1 text-left text-sm leading-tight">
                <span className="truncate font-medium">{user.name}</span>
                <span className="truncate text-xs">{user.email}</span>
              </div>
              <ChevronsUpDown className="ml-auto size-4" />
            </SidebarMenuButton>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            className="z-[100] w-(--radix-dropdown-menu-trigger-width) min-w-56 rounded-lg"
            side={isMobile ? "bottom" : "right"}
            align="end"
            sideOffset={4}
          >
            <DropdownMenuLabel className="p-0 font-normal">
              <div className="flex items-center gap-2 px-1 py-1.5 text-left text-sm">
                <Avatar className="h-8 w-8 rounded-lg">
                  <AvatarImage src={user.avatar} alt={user.name} />
                  <AvatarFallback className="rounded-lg bg-slate-50">
                    <User className="h-4 w-4 text-slate-400" />
                  </AvatarFallback>
                </Avatar>
                <div className="grid flex-1 text-left text-sm leading-tight">
                  <span className="truncate font-medium">{user.name}</span>
                  <span className="truncate text-xs">{user.email}</span>
                </div>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            {showOrgSwitcher && viewOrgId != null && (
              <>
                <DropdownMenuLabel className="text-muted-foreground text-xs">
                  เปลี่ยนองค์กร
                </DropdownMenuLabel>
                <div
                  className="px-2 pb-2"
                  onPointerDown={(e) => e.stopPropagation()}
                  onClick={(e) => e.stopPropagation()}
                >
                  <Select
                    value={String(viewOrgId)}
                    onValueChange={(v) => setViewOrgId(Number(v))}
                  >
                    <SelectTrigger className="h-8 w-full" data-testid={TEST_IDS.NAV_USER.SELECT_ORGANIZATION}>
                      <SelectValue placeholder="เลือกองค์กร" />
                    </SelectTrigger>
                    <SelectContent>
                      {accessibleOrgs.map((org) => (
                        <SelectItem key={org.id} value={String(org.id)}>
                          {org.title}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <DropdownMenuSeparator />
              </>
            )}
            {isSuperAdmin && (
              <>
                <DropdownMenuGroup>
                  <DropdownMenuItem onClick={() => goTo("/select-organization")}>
                    <Building2 />
                    เปลี่ยนองค์กร
                  </DropdownMenuItem>
                </DropdownMenuGroup>
                <DropdownMenuSeparator />
              </>
            )}
            <DropdownMenuGroup>
              <DropdownMenuItem
                onClick={() => goTo("/profile")}
                data-testid={TEST_IDS.NAV_USER.MENUITEM_PROFILE}
              >
                <BadgeCheck />
                บัญชี
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => goTo("/notifications")}
              >
                <Bell />
                การแจ้งเตือน
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => goTo("/settings")}
                data-testid={TEST_IDS.NAV_USER.MENUITEM_SETTINGS}
              >
                <Settings />
                ตั้งค่า
              </DropdownMenuItem>
            </DropdownMenuGroup>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={() => logout()}
              data-testid={TEST_IDS.NAV_USER.MENUITEM_LOGOUT}
            >
              <LogOut />
              ออกจากระบบ
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarMenuItem>
    </SidebarMenu>
  );
}
