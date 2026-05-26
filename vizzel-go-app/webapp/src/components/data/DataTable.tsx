import type { ReactNode } from "react";
import { Button } from "@/components/ui/button";

export type Column<T> = {
  key: string;
  label: string;
  render?: (row: T) => ReactNode;
};

type Props<T extends { id: number }> = {
  columns: Column<T>[];
  rows: T[];
  loading?: boolean;
  onEdit?: (row: T) => void;
  onDelete?: (row: T) => void;
  extraActions?: (row: T) => ReactNode;
};

export function DataTable<T extends { id: number }>({
  columns,
  rows,
  loading,
  onEdit,
  onDelete,
  extraActions,
}: Props<T>) {
  const hasActions = onEdit || onDelete || extraActions;
  const safeRows = Array.isArray(rows) ? rows : [];
  return (
    <div className="overflow-x-auto rounded-lg border border-border">
      <table className="w-full text-sm">
        <thead className="bg-muted/50">
          <tr className="text-left">
            {columns.map((c) => (
              <th key={c.key} className="p-3 font-medium">
                {c.label}
              </th>
            ))}
            {hasActions && <th className="p-3 font-medium">จัดการ</th>}
          </tr>
        </thead>
        <tbody>
          {safeRows.length === 0 && !loading && (
            <tr>
              <td colSpan={columns.length + (hasActions ? 1 : 0)} className="text-muted-foreground p-8 text-center">
                ไม่พบข้อมูล
              </td>
            </tr>
          )}
          {safeRows.map((row) => (
            <tr key={row.id} className="border-t border-border hover:bg-muted/30">
              {columns.map((c) => (
                <td key={c.key} className="p-3">
                  {c.render ? c.render(row) : String((row as Record<string, unknown>)[c.key] ?? "—")}
                </td>
              ))}
              {hasActions && (
                <td className="p-3">
                  <div className="flex flex-wrap gap-1">
                    {onEdit && (
                      <Button variant="outline" className="h-7 px-2 text-xs" onClick={() => onEdit(row)}>
                        แก้ไข
                      </Button>
                    )}
                    {extraActions?.(row)}
                    {onDelete && (
                      <Button variant="ghost" className="h-7 px-2 text-xs text-destructive" onClick={() => onDelete(row)}>
                        ลบ
                      </Button>
                    )}
                  </div>
                </td>
              )}
            </tr>
          ))}
        </tbody>
      </table>
      {loading && <p className="text-muted-foreground p-3 text-sm">กำลังโหลด...</p>}
    </div>
  );
}
