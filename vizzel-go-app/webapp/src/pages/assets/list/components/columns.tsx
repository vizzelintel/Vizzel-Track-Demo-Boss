"use client";

import * as React from "react";

import { ColumnDef } from "@tanstack/react-table";
import { Checkbox } from "@/components/ui/checkbox";
import { DataTableColumnHeader } from "./data-table-column-header";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle, ImageIcon } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { getImageUrl } from "@/lib/utils";
import { AssetData } from "../types"; // import type จาก types.ts
import { TEST_IDS } from "@/components/test-ids";

export const columns: ColumnDef<AssetData>[] = [
  {
    id: "select",
    header: ({ table }) => (
      <Checkbox
        checked={
          table.getIsAllPageRowsSelected() ||
          (table.getIsSomePageRowsSelected() && "indeterminate")
        }
        onCheckedChange={(value) => table.toggleAllPageRowsSelected(!!value)}
        aria-label="เลือกทั้งหมด"
        className="translate-y-[2px]"
        data-testid={TEST_IDS.TABLE.CHECKBOX_SELECT_ALL}
      />
    ),
    cell: ({ row }) => (
      <Checkbox
        checked={row.getIsSelected()}
        onCheckedChange={(value) => row.toggleSelected(!!value)}
        aria-label="เลือกแถว"
        className="translate-y-[2px]"
        data-testid={TEST_IDS.TABLE.CHECKBOX_ROW((row.original as AssetData).id ?? 0)}
      />
    ),
    enableSorting: false,
    enableHiding: false,
  },
  {
    accessorKey: "image",
    header: "รูปภาพ",
    cell: ({ row }) => {
      let rawPath = row.original.image;

      // Fallback: If 'image' is missing but 'images' array exists, use the first image
      if (
        (!rawPath || rawPath === "null") &&
        row.original.images &&
        row.original.images.length > 0
      ) {
        const firstImg = row.original.images[0];
        if (typeof firstImg === "string") {
          rawPath = firstImg;
        } else if (typeof firstImg === "object" && firstImg !== null) {
          // Handle case where image might be an object (as seen in asset-dialog logic)
          // @ts-ignore
          rawPath = firstImg.image || firstImg.url || null;
        }
      }

      const url = getImageUrl(rawPath);
      // eslint-disable-next-line
      const [isLoading, setIsLoading] = React.useState(true);

      if (!rawPath || rawPath === "null") {
        return (
          <div className="bg-muted text-muted-foreground flex h-10 w-10 items-center justify-center rounded-lg">
            <ImageIcon className="h-5 w-5" />
          </div>
        );
      }

      return (
        <div className="bg-muted relative h-10 w-10 overflow-hidden rounded-lg border">
          {/* Fallback Icon */}
          {isLoading && (
            <div className="text-muted-foreground absolute inset-0 flex items-center justify-center">
              <ImageIcon className="h-5 w-5" />
            </div>
          )}

          <img
            src={url || ""}
            alt={row.getValue("assetName") || "Asset Image"}
            className={`h-full w-full object-cover transition-opacity duration-300 ${isLoading ? "opacity-0" : "opacity-100"}`}
            onLoad={() => setIsLoading(false)}
            onError={(e) => {
              // Keep it invisible and hide it
              const img = e.currentTarget;
              if (img) img.style.display = "none";
              setIsLoading(true); // Keep opacity-0
            }}
          />
        </div>
      );
    },
    enableSorting: false,
    meta: {
      className: "hidden md:table-cell",
    },
  },
  {
    accessorKey: "assetNumber",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="เลขครุภัณฑ์" />
    ),
    cell: ({ row }) => (
      <div
        className="font-medium truncate max-w-[150px]"
        title={row.getValue("assetNumber")}
      >
        {row.getValue("assetNumber")}
      </div>
    ),
    meta: {
      className: "hidden md:table-cell",
    },
  },
  {
    accessorKey: "assetName",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="ชื่อครุภัณฑ์" />
    ),
    cell: ({ row }) => (
      <div className="flex flex-col min-w-0 max-w-[150px] md:max-w-[250px]">
        <div
          className="truncate font-medium"
          title={row.getValue("assetName")}
        >
          {row.getValue("assetName")}
        </div>
        <span className="text-muted-foreground flex items-center gap-2 text-xs">
          <span>RFID: {row.original.rfidNum || "-"}</span>
          {(!row.original.getByID || !row.original.sourceFundID) && (
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger>
                  <AlertTriangle className="h-3 w-3 text-yellow-500" />
                </TooltipTrigger>
                <TooltipContent>
                  <p>ข้อมูลไม่ครบ (วิธีการได้รับ/แหล่งงบประมาณ)</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          )}
        </span>
      </div>
    ),
  },
  // ⭐ เพิ่มคอลัมน์นี้เพื่อให้ Filter "หมวดหมู่" ทำงานได้ (จะถูกซ่อนโดย default ใน data-table.tsx)
  {
    id: "categoryName", // Explicit ID
    accessorKey: "categoryName",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="หมวดหมู่" />
    ),
    cell: ({ row }) => <div>{row.getValue("categoryName")}</div>,
    enableHiding: true,
  },
  {
    id: "groupCategory", // ใช้แสดงผลคู่ class + category (Virtual)
    header: "กลุ่ม/หมวดหมู่",
    cell: ({ row }) => (
      <div className="text-sm">
        <div className="font-medium">{row.original.className}</div>
        <div className="text-muted-foreground text-xs">
          {row.original.categoryName}
        </div>
      </div>
    ),
    meta: {
      className: "hidden md:table-cell",
    },
  },
  {
    id: "owner",
    header: "ผู้ถือครอง / หน่วยงาน",
    cell: ({ row }) => {
      const user = row.original.users?.[0];
      if (!user) return <span className="text-muted-foreground">-</span>;

      // หาหน่วยงานที่ "ย่อยที่สุด" ที่มีข้อมูล
      const primaryOrg =
        user.section?.name || user.dept?.name || user.institute?.name;

      const fullOrgPath = [
        user.institute?.name,
        user.dept?.name,
        user.section?.name,
      ]
        .filter(Boolean)
        .join(" / ");

      return (
        <div className="flex min-w-[140px] flex-col text-sm">
          <span className="text-foreground/90 font-medium">
            {user.name} {user.surname}
          </span>
          {primaryOrg && (
            <span className="text-muted-foreground truncate text-xs">
              {primaryOrg}
            </span>
          )}
        </div>
      );
    },
    meta: {
      className: "hidden lg:table-cell",
    },
  },
  {
    accessorKey: "assetStatusName",
    header: "สถานะ",
    cell: ({ row }) => {
      const status = row.original.assetStatusName;
      // Override status display for ID 2 ("จำหน่าย") to "รอตัดจำหน่าย" as per user feedback
      // User prefers reusing the existing "Pending Write-off" (รอตัดจำหน่าย) term from Asset List
      // over the Sales-specific "Pending Sale" (รอจำหน่าย) term.

      return status ? (
        <Badge variant="outline" className="whitespace-nowrap">
          {status}
        </Badge>
      ) : (
        <span className="text-muted-foreground">-</span>
      );
    },
  },
  {
    id: "location", // Virtual column for location display
    header: "สถานที่",
    cell: ({ row }) => (
      <div className="min-w-[120px] text-sm">
        {row.original.roomName ? (
          <div className="flex flex-col">
            <span>{row.original.buildingName}</span>
            <span className="text-muted-foreground text-xs">
              ห้อง {row.original.roomName}
            </span>
          </div>
        ) : (
          <span className="text-muted-foreground text-xs">ยังไม่ระบุ</span>
        )}
      </div>
    ),
    meta: {
      className: "hidden md:table-cell",
    },
  },
  {
    id: "actions",
    // Action จะถูก inject ใน data-table.tsx
    enableHiding: false,
  },
];
