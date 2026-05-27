import { useMemo, type ReactNode } from "react";
import { ArrowDown, ArrowUp, ArrowUpDown, Pencil } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { cn } from "@/lib/utils";

export type Column<T> = {
  key: string;
  label: string;
  render?: (row: T) => ReactNode;
  className?: string;
  sortable?: boolean;
  /** Used by the sort accessor when sortable is true and you want a custom value */
  sortAccessor?: (row: T) => string | number | null | undefined;
};

export type SortState = {
  key: string;
  dir: "asc" | "desc";
};

type Props<T extends { id: number }> = {
  columns: Column<T>[];
  rows: T[];
  loading?: boolean;
  onEdit?: (row: T) => void;
  extraActions?: (row: T) => ReactNode;
  /** Names of columns to hide. Used by the "คอลัมน์" toggle. */
  hiddenColumns?: string[];
  /** Bulk select integration */
  selectable?: boolean;
  selectedIds?: number[];
  onSelectionChange?: (ids: number[]) => void;
  /** Sortable header support */
  sort?: SortState | null;
  onSortChange?: (next: SortState | null) => void;
  /** Empty state override */
  emptyLabel?: string;
};

export function DataTable<T extends { id: number }>({
  columns,
  rows,
  loading,
  onEdit,
  extraActions,
  hiddenColumns,
  selectable,
  selectedIds,
  onSelectionChange,
  sort,
  onSortChange,
  emptyLabel = "ไม่พบข้อมูล",
}: Props<T>) {
  const safeRows = Array.isArray(rows) ? rows : [];
  const selectionEnabled = Boolean(selectable && onSelectionChange);
  const hiddenSet = useMemo(() => new Set(hiddenColumns ?? []), [hiddenColumns]);
  const visibleCols = useMemo(
    () => columns.filter((c) => !hiddenSet.has(c.key)),
    [columns, hiddenSet],
  );
  const selectedSet = useMemo(
    () => new Set(selectedIds ?? []),
    [selectedIds],
  );
  const allSelected =
    selectionEnabled &&
    safeRows.length > 0 &&
    safeRows.every((r) => selectedSet.has(r.id));
  const someSelected =
    selectionEnabled && selectedSet.size > 0 && !allSelected;
  const hasActions = Boolean(onEdit) || Boolean(extraActions);

  const sortedRows = useMemo(() => {
    if (!sort) return safeRows;
    const col = columns.find((c) => c.key === sort.key);
    if (!col) return safeRows;
    const accessor =
      col.sortAccessor ??
      ((r: T) => (r as Record<string, unknown>)[sort.key] as string | number | null | undefined);
    const dir = sort.dir === "asc" ? 1 : -1;
    return [...safeRows].sort((a, b) => {
      const va = accessor(a) ?? "";
      const vb = accessor(b) ?? "";
      if (typeof va === "number" && typeof vb === "number") {
        return (va - vb) * dir;
      }
      return String(va).localeCompare(String(vb), "th") * dir;
    });
  }, [safeRows, sort, columns]);

  const toggleRow = (id: number) => {
    if (!onSelectionChange) return;
    const next = new Set(selectedSet);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    onSelectionChange(Array.from(next));
  };

  const toggleAll = () => {
    if (!onSelectionChange) return;
    if (allSelected) {
      onSelectionChange([]);
    } else {
      onSelectionChange(safeRows.map((r) => r.id));
    }
  };

  const onHeaderClick = (col: Column<T>) => {
    if (!col.sortable || !onSortChange) return;
    if (!sort || sort.key !== col.key) {
      onSortChange({ key: col.key, dir: "asc" });
      return;
    }
    if (sort.dir === "asc") {
      onSortChange({ key: col.key, dir: "desc" });
    } else {
      onSortChange(null);
    }
  };

  return (
    <div className="overflow-x-auto rounded-lg border border-border bg-white">
      <table className="w-full text-sm">
        <thead className="bg-muted/50">
          <tr className="text-left">
            {selectionEnabled && (
              <th className="w-10 px-3 py-2">
                <Checkbox
                  checked={
                    allSelected ? true : someSelected ? "indeterminate" : false
                  }
                  onCheckedChange={toggleAll}
                  aria-label="เลือกทั้งหมด"
                  data-testid="data-table-select-all"
                />
              </th>
            )}
            {visibleCols.map((c) => {
              const isSorted = sort?.key === c.key;
              return (
                <th
                  key={c.key}
                  className={cn(
                    "px-3 py-2 font-medium",
                    c.sortable && "cursor-pointer select-none",
                    c.className,
                  )}
                  onClick={() => onHeaderClick(c)}
                >
                  <span className="inline-flex items-center gap-1">
                    {c.label}
                    {c.sortable && (
                      <span className="inline-flex h-4 w-4 items-center justify-center text-slate-400">
                        {isSorted ? (
                          sort?.dir === "asc" ? (
                            <ArrowUp className="h-3 w-3" />
                          ) : (
                            <ArrowDown className="h-3 w-3" />
                          )
                        ) : (
                          <ArrowUpDown className="h-3 w-3 opacity-50" />
                        )}
                      </span>
                    )}
                  </span>
                </th>
              );
            })}
            {hasActions && <th className="w-24 px-3 py-2 font-medium" />}
          </tr>
        </thead>
        <tbody>
          {sortedRows.length === 0 && !loading && (
            <tr>
              <td
                colSpan={
                  visibleCols.length +
                  (hasActions ? 1 : 0) +
                  (selectionEnabled ? 1 : 0)
                }
                className="text-muted-foreground p-6 text-center"
              >
                {emptyLabel}
              </td>
            </tr>
          )}
          {sortedRows.map((row) => (
            <tr
              key={row.id}
              className="border-t border-border hover:bg-muted/30"
              data-testid={`data-table-row-${row.id}`}
            >
              {selectionEnabled && (
                <td className="px-3 py-2">
                  <Checkbox
                    checked={selectedSet.has(row.id)}
                    onCheckedChange={() => toggleRow(row.id)}
                    aria-label="เลือกแถว"
                    data-testid={`data-table-select-${row.id}`}
                  />
                </td>
              )}
              {visibleCols.map((c) => (
                <td key={c.key} className={cn("px-3 py-2", c.className)}>
                  {c.render
                    ? c.render(row)
                    : String((row as Record<string, unknown>)[c.key] ?? "—")}
                </td>
              ))}
              {hasActions && (
                <td className="px-3 py-2">
                  <div className="flex items-center gap-1">
                    {onEdit && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="size-7"
                        onClick={() => onEdit(row)}
                        aria-label="แก้ไข"
                        data-testid={`data-table-edit-${row.id}`}
                      >
                        <Pencil className="size-3.5" />
                      </Button>
                    )}
                    {extraActions?.(row)}
                  </div>
                </td>
              )}
            </tr>
          ))}
        </tbody>
      </table>
      {loading && (
        <p className="text-muted-foreground p-3 text-sm">กำลังโหลด...</p>
      )}
    </div>
  );
}
