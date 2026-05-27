import type { ReactNode } from "react";
import { Check, Search, Settings2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { Column } from "./DataTable";

export type TableToolbarColumn = {
  key: string;
  label: string;
  hideable?: boolean;
};

type Props = {
  search: string;
  onSearchChange: (value: string) => void;
  searchPlaceholder?: string;
  columns?: TableToolbarColumn[];
  hiddenColumns?: string[];
  onHiddenChange?: (next: string[]) => void;
  rightSlot?: ReactNode;
  testIdPrefix?: string;
};

/**
 * Toolbar above tables: search input + "คอลัมน์" dropdown + a right-side slot
 * (typically a "+ เพิ่ม" or bulk-action button).
 */
export function TableToolbar({
  search,
  onSearchChange,
  searchPlaceholder = "ค้นหา...",
  columns,
  hiddenColumns,
  onHiddenChange,
  rightSlot,
  testIdPrefix = "table",
}: Props) {
  const hiddenSet = new Set(hiddenColumns ?? []);
  const toggle = (key: string) => {
    if (!onHiddenChange) return;
    const next = new Set(hiddenSet);
    if (next.has(key)) next.delete(key);
    else next.add(key);
    onHiddenChange(Array.from(next));
  };

  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <div className="relative w-full sm:max-w-sm">
        <Search className="text-muted-foreground absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2" />
        <Input
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder={searchPlaceholder}
          className="bg-white pl-9"
          data-testid={`${testIdPrefix}-search`}
        />
      </div>
      <div className="flex items-center gap-2">
        {columns && columns.length > 0 && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="h-9 bg-white"
                data-testid={`${testIdPrefix}-columns`}
              >
                <Settings2 className="mr-2 h-4 w-4" />
                คอลัมน์
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              <DropdownMenuLabel>แสดงคอลัมน์</DropdownMenuLabel>
              <DropdownMenuSeparator />
              {columns
                .filter((c) => c.hideable !== false)
                .map((c) => {
                  const visible = !hiddenSet.has(c.key);
                  return (
                    <DropdownMenuCheckboxItem
                      key={c.key}
                      checked={visible}
                      onCheckedChange={() => toggle(c.key)}
                    >
                      {c.label}
                      {visible && <Check className="ml-auto h-3 w-3 opacity-0" />}
                    </DropdownMenuCheckboxItem>
                  );
                })}
            </DropdownMenuContent>
          </DropdownMenu>
        )}
        {rightSlot}
      </div>
    </div>
  );
}

/** Helper to turn DataTable `Column<T>[]` into the toolbar column type. */
export function toToolbarColumns<T>(cols: Column<T>[]): TableToolbarColumn[] {
  return cols.map((c) => ({ key: c.key, label: c.label }));
}
