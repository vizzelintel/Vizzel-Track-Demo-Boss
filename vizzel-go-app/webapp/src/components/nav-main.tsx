"use client";

import * as React from 'react';
import { ChevronRight, type LucideIcon } from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import {
  SidebarGroup,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
  useSidebar,
} from '@/components/ui/sidebar';

export interface NavMainItem {
  title: string;
  url: string;
  icon?: LucideIcon;
  isActive?: boolean;
  openOnActive?: boolean; // New prop to control auto-expansion
  disabled?: boolean;
  badge?: string; // New prop for badges like "Pro", "New"
  matchExact?: boolean;
  testId?: string; // Optional explicit data-testid
  items?: {
    title: string;
    url: string;
    disabled?: boolean;
    isActive?: boolean;
    matchExact?: boolean;
    testId?: string; // Optional explicit data-testid for sub-items
  }[];
}

export function NavMain({
  items,
  label,
}: {
  items: NavMainItem[];
  label?: string;
}) {
  return (
    <SidebarGroup>
      {label && <SidebarGroupLabel>{label}</SidebarGroupLabel>}
      <SidebarMenu>
        {items.map((item) => (
          <NavItem key={item.title} item={item} />
        ))}
      </SidebarMenu>
    </SidebarGroup>
  );
}

function NavItem({ item }: { item: NavMainItem }) {
  const { isMobile, setOpenMobile } = useSidebar();
  const pathname = usePathname();

  // Check if any sub-item is active
  const isChildActive = item.items?.some((subItem) =>
    subItem.matchExact
      ? pathname === subItem.url
      : pathname === subItem.url || pathname.startsWith(subItem.url + '/'),
  );

  // Check if the item itself is active (if no sub-items)
  const isItemActive = item.matchExact
    ? pathname === item.url
    : pathname === item.url || pathname.startsWith(item.url + '/');

  const shouldOpen =
    (item.isActive || (isChildActive && (item.openOnActive ?? true))) &&
    !item.disabled;

  const [isOpen, setIsOpen] = React.useState(shouldOpen);

  // Auto-collapse/expand when path changes
  React.useEffect(() => {
    setIsOpen(shouldOpen);
  }, [pathname, shouldOpen]);

  return (
    <Collapsible
      asChild
      open={isOpen}
      onOpenChange={setIsOpen}
      className="group/collapsible"
      suppressHydrationWarning
    >
      <SidebarMenuItem>
        <CollapsibleTrigger asChild disabled={item.disabled}>
          <SidebarMenuButton
            tooltip={item.title}
            isActive={isItemActive} // Only highlight if the item itself is active (not just children)
            className={item.items?.length ? '' : 'hidden'}
            size={isMobile ? 'lg' : 'default'}
            suppressHydrationWarning
            disabled={item.disabled}
            data-testid={item.testId ?? `sidebar-menu-${item.title.toLowerCase().replace(/\s+/g, '-')}`}
          >
            {item.icon && <item.icon />}
            <span>{item.title}</span>
            {item.badge && (
              <span className="bg-primary/10 text-primary ml-auto rounded-md px-1.5 py-0.5 text-xs font-bold">
                {item.badge}
              </span>
            )}
            {!item.disabled && (
              <ChevronRight className="ml-auto transition-transform duration-200 group-data-[state=open]/collapsible:rotate-90" />
            )}
          </SidebarMenuButton>
        </CollapsibleTrigger>

        {!item.items?.length && (
          <SidebarMenuButton
            asChild
            tooltip={item.title}
            isActive={isItemActive} // Highlight standalone item
            size={isMobile ? 'lg' : 'default'}
            data-testid={item.testId ?? `sidebar-menu-${item.title.toLowerCase().replace(/\s+/g, '-')}`}
          >
            <Link
              href={item.url}
              className={item.disabled ? 'pointer-events-none opacity-50' : ''}
              onClick={() => isMobile && setOpenMobile(false)}
              data-testid={item.testId ?? `sidebar-menu-${item.title.toLowerCase().replace(/\s+/g, '-')}-link`}
            >
              {item.icon && <item.icon />}
              <span>{item.title}</span>
              {item.badge && (
                <span className="bg-primary/10 text-primary ml-auto rounded-md px-1.5 py-0.5 text-xs font-bold">
                  {item.badge}
                </span>
              )}
            </Link>
          </SidebarMenuButton>
        )}

        {item.items?.length ? (
          <CollapsibleContent suppressHydrationWarning>
            <SidebarMenuSub>
              {item.items?.map((subItem) => {
                const isSubItemActive = pathname === subItem.url;
                return (
                  <SidebarMenuSubItem key={subItem.title}>
                    <SidebarMenuSubButton
                      asChild
                      isActive={isSubItemActive}
                      size={isMobile ? 'lg' : 'md'}
                      data-testid={subItem.testId ?? `sidebar-sub-menu-${subItem.title.toLowerCase().replace(/\s+/g, '-')}`}
                    >
                      <Link
                        href={subItem.url}
                        className={
                          subItem.disabled
                            ? 'pointer-events-none opacity-50'
                            : ''
                        }
                        onClick={() => isMobile && setOpenMobile(false)}
                        data-testid={subItem.testId ?? `sidebar-sub-menu-${subItem.title.toLowerCase().replace(/\s+/g, '-')}-link`}
                      >
                        <span>{subItem.title}</span>
                      </Link>
                    </SidebarMenuSubButton>
                  </SidebarMenuSubItem>
                );
              })}
            </SidebarMenuSub>
          </CollapsibleContent>
        ) : null}
      </SidebarMenuItem>
    </Collapsible>
  );
}
