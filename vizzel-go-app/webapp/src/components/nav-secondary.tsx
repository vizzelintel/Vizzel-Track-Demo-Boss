'use client';

import { type LucideIcon } from 'lucide-react';
import * as React from 'react';

import {
  SidebarGroup,
  SidebarGroupContent,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from '@/components/ui/sidebar';

export function NavSecondary({
  items,
  ...props
}: {
  items: {
    title: string;
    url: string;
    icon: LucideIcon;
    badge?: React.ReactNode;
    disabled?: boolean;
    onClick?: () => void;
    testId?: string;
  }[];
} & React.ComponentPropsWithoutRef<typeof SidebarGroup>) {
  const { isMobile, setOpenMobile } = useSidebar();

  return (
    <SidebarGroup {...props}>
      <SidebarGroupContent>
        <SidebarMenu>
          {items.map((item) => (
            <SidebarMenuItem key={item.title}>
              <SidebarMenuButton
                asChild
                size={isMobile ? 'lg' : 'sm'}
                disabled={item.disabled}
                onClick={() => {
                  if (item.onClick) item.onClick();
                  if (isMobile) setOpenMobile(false);
                }}
                data-testid={item.testId}
              >
                <a
                  href={item.url}
                  className={
                    item.disabled ? 'pointer-events-none opacity-50' : ''
                  }
                >
                  <item.icon />
                  <span>{item.title}</span>
                </a>
              </SidebarMenuButton>
            </SidebarMenuItem>
          ))}
        </SidebarMenu>
      </SidebarGroupContent>
    </SidebarGroup>
  );
}
