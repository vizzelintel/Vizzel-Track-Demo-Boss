'use client';

import { DropdownMenuTrigger } from '@radix-ui/react-dropdown-menu';
import { Table } from '@tanstack/react-table';
import { Settings2 } from 'lucide-react';

import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';

export function DataTableViewOptions<TData>({
  table,
}: {
  table: Table<TData>;
}) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className="ml-auto hidden h-8 lg:flex"
        >
          <Settings2 className="mr-2 h-4 w-4" />
          คอลัมน์
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-[150px]">
        <DropdownMenuLabel>เลือกคอลัมน์</DropdownMenuLabel>
        <DropdownMenuSeparator />
        {table
          .getAllColumns()
          .filter((column) => column.getCanHide())
          .map((column) => {
            return (
              <DropdownMenuCheckboxItem
                key={column.id}
                className="capitalize"
                checked={column.getIsVisible()}
                onCheckedChange={(value) => column.toggleVisibility(!!value)}
              >
                {getColumnTitle(column.id)}
              </DropdownMenuCheckboxItem>
            );
          })}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

// Helper function to translate column IDs to Thai titles
function getColumnTitle(id: string): string {
  const titles: Record<string, string> = {
    image: 'รูปภาพ',
    assetNumber: 'เลขครุภัณฑ์', // Matches accessorKey
    assetName: 'ชื่อครุภัณฑ์',
    categoryName: 'หมวดหมู่', // Renamed to avoid confusion
    groupCategory: 'กลุ่ม/หมวดหมู่', // Matches virtual ID
    assetStatusName: 'สถานะ',
    location: 'สถานที่',
    // Add other keys if needed
  };
  return titles[id] || id;
}
