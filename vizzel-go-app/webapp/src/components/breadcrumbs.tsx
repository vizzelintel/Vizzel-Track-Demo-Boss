"use client";

import { usePathname } from "next/navigation";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import React from "react";

const routeNameMap: Record<string, string> = {
  dashboard: "Dashboard",
  reports: "Reports",
  audit: "Audit",
  organization: "Organization",
  users: "Users",
  assets: "Assets",
  list: "List",
  category: "Category",
  type: "Type",
  class: "Class",
  start: "Start",
  ongoing: "Ongoing",
  history: "History",
  documents: "Documents",
  profile: "Profile",
  settings: "Settings",
  "super-admin": "Super Admin",
};

const nonClickableSegments = new Set(["super-admin"]);

export function Breadcrumbs() {
  const pathname = usePathname();

  if (!pathname) return null;

  const segments = pathname.split("/").filter((item) => item !== "");

  const breadcrumbItems = segments.map((segment, index) => {
    const url = `/${segments.slice(0, index + 1).join("/")}`;
    const isLast = index === segments.length - 1;
    const title =
      routeNameMap[segment] ||
      segment.charAt(0).toUpperCase() + segment.slice(1);

    // Check if the segment is in the non-clickable list
    const isClickable = !nonClickableSegments.has(segment);

    return {
      title,
      url,
      isLast,
      isClickable,
    };
  });

  if (breadcrumbItems.length === 0) {
    return (
      <Breadcrumb>
        <BreadcrumbList>
          <BreadcrumbItem>
            <BreadcrumbPage>Dashboard</BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>
    );
  }

  return (
    <Breadcrumb>
      <BreadcrumbList>
        {breadcrumbItems.map((item) => (
          <React.Fragment key={item.url}>
            <BreadcrumbItem>
              {item.isLast || !item.isClickable ? (
                <BreadcrumbPage>{item.title}</BreadcrumbPage>
              ) : (
                <BreadcrumbLink href={item.url}>{item.title}</BreadcrumbLink>
              )}
            </BreadcrumbItem>
            {!item.isLast && <BreadcrumbSeparator />}
          </React.Fragment>
        ))}
      </BreadcrumbList>
    </Breadcrumb>
  );
}
