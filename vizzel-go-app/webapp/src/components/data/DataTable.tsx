import { useMemo, type ReactNode } from "react";
import { Pencil } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { cn } from "@/lib/utils";

export type Column<T> = {
  key: string;
  label: string;
  render?: (row: T) => ReactNode;
  className?: string;
};

type Props<T extends { id: number }> = {
  columns: Column<T>[];
  rows: T[];
  loading?: boolean;
  onEdit?: (row: T) => void;
  extraActions?: (row: T) => ReactNode;
  // Bulk-select integration. When `selectedIds` + `onSelectionChange` are
  // provided, the leftmost column becomes a master + per-row checkbox so the
  // parent toolbar can render a "ลบที่เลือก" action.
  selectable?: boolean;
  selectedIds?: number[];
  onSelectionChange?: (ids: number[]) => void;
};

export function DataTable<T extends { id: number }>({
  columns,
  rows,
  loading,
  onEdit,
  extraActions,
  selectable,
  selectedIds,
  onSelectionChange,
}: Props<T>) {
  const safeRows = Array.isArray(rows) ? rows : [];
  const selectionEnabled = Boolean(selectable && onSelectionChange);
  const selectedSet = useMemo(
    () => new Set(selectedIds ?? []),
    [selectedIds],
  );
  const allSelected =
    selectionEnabled && safeRows.length > 0 &&
    safeRows.every((r) => selectedSet.has(r.id));
  const someSelected = selectionEnabled && selectedSet.size > 0 && !allSelected;
  const hasActions = Boolean(onEdit) || Boolean(extraActions);

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

  return (
    <div className="overflow-x-auto rounded-lg border border-border">
      <table className="w-full text-sm">
        <thead className="bg-muted/50">
          <tr className="text-left">
            {selectionEnabled && (
              <th className="w-10 p-3">
                <Checkbox
                  checked={allSelected ? true : someSelected ? "indeterminate" : false}
                  onCheckedChange={toggleAll}
                  aria-label="เลือกทั้งหมด"
                  data-testid="data-table-select-all"
                />
              </th>
            )}
            {columns.map((c) => (
              <th key={c.key} className={cn("p-3 font-medium", c.className)}>
                {c.label}
              </th>
            ))}
            {hasActions && <th className="w-24 p-3 font-medium" />}
          </tr>
        </thead>
        <tbody>
          {safeRows.length === 0 && !loading && (
            <tr>
              <td
                colSpan={
                  columns.length +
                  (hasActions ? 1 : 0) +
                  (selectionEnabled ? 1 : 0)
                }
                className="text-muted-foreground p-8 text-center"
              >
                ไม่พบข้อมูล
              </td>
            </tr>
          )}
          {safeRows.map((row) => (
            <tr
              key={row.id}
              className="border-t border-border hover:bg-muted/30"
              data-testid={`data-table-row-${row.id}`}
            >
              {selectionEnabled && (
                <td className="p-3">
                  <Checkbox
                    checked={selectedSet.has(row.id)}
                    onCheckedChange={() => toggleRow(row.id)}
                    aria-label="เลือกแถว"
                    data-testid={`data-table-select-${row.id}`}
                  />
                </td>
              )}
              {columns.map((c) => (
                <td key={c.key} className={cn("p-3", c.className)}>
                  {c.render
                    ? c.render(row)
                    : String((row as Record<string, unknown>)[c.key] ?? "—")}
                </td>
              ))}
              {hasActions && (
                <td className="p-3">
                  <div className="flex items-center gap-1">
                    {onEdit && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="size-8"
                        onClick={() => onEdit(row)}
                        aria-label="แก้ไข"
                        data-testid={`data-table-edit-${row.id}`}
                      >
                        <Pencil className="size-4" />
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
