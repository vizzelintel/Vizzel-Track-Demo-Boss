"use client";

import * as React from "react";
import { ExportAssetsOptions } from "@/lib/assets";
import {
  ColumnDef,
  ColumnFiltersState,
  flexRender,
  getCoreRowModel,
  getFacetedRowModel,
  getFacetedUniqueValues,
  getFilteredRowModel,
  getSortedRowModel,
  SortingState,
  useReactTable,
  VisibilityState,
  PaginationState,
  Updater,
} from "@tanstack/react-table";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

import { Inbox, Plus, SearchX } from "lucide-react";
import { Button } from "@/components/ui/button";

import { DataTablePagination } from "./data-table-pagination";
import { DataTableToolbar } from "./data-table-toolbar";
import { DataTableRowActions } from "./data-table-row-actions";
import { TEST_IDS } from "@/components/test-ids";

// ----------------------------------------------------------------------
// Props Definition
// ----------------------------------------------------------------------
interface DataTableProps<TData, TValue> {
  columns: ColumnDef<TData, TValue>[];
  data: TData[];

  // --- Server-side Pagination Props ---
  pageCount: number; // จำนวนหน้าทั้งหมด (totalPages)
  page: number; // หน้าปัจจุบัน (เริ่มที่ 1)
  pageSize: number; // จำนวนรายการต่อหน้า
  rowCount?: number; // จำนวนรายการทั้งหมด (totalItems)
  onPageChange: (page: number) => void;
  onPageSizeChange: (size: number) => void;
  initialReferenceData?: any;

  // --- Handlers ---
  onCreate: () => void; // ✅ รับฟังก์ชันสร้างมาจาก Parent
  onImport: (format: "default" | "elaas") => void;
  onExport: (options: ExportAssetsOptions) => void;
  onTemplate: () => void;
  reload?: () => void | Promise<void>;
  onEdit: (asset: any) => void;
  onDuplicate: (asset: any) => void;
  onDelete: (assetID: number) => void;
  isLoading?: boolean;
  onSearch?: (value: string) => void;
  activeStatusFilter?: string | null;
  onClearStatusFilter?: () => void;
  isStatusLocked?: boolean;
  onBulkDelete?: (ids: number[]) => void;
  // Hierarchical Filters
  categoryFilter?: string[];
  onCategoryChange?: (val: string[]) => void;
  typeFilter?: string[];
  onTypeChange?: (val: string[]) => void;
  classFilter?: string[];
  onClassChange?: (val: string[]) => void;
}

// ----------------------------------------------------------------------
// Component
// ----------------------------------------------------------------------
export function DataTable<TData, TValue>({
  columns,
  data,
  // Pagination
  pageCount,
  page,
  pageSize,
  rowCount,
  onPageChange,
  onPageSizeChange,
  // Actions
  onCreate,
  onImport,
  onExport,
  onTemplate,
  reload,
  onEdit,
  onDuplicate,
  onDelete,
  isLoading,
  onSearch,
  activeStatusFilter,
  onClearStatusFilter,
  isStatusLocked,
  onBulkDelete,
  initialReferenceData,
  categoryFilter,
  onCategoryChange,
  typeFilter,
  onTypeChange,
  classFilter,
  onClassChange,
}: DataTableProps<TData, TValue>) {
  // Local State (Client-side)
  const [rowSelection, setRowSelection] = React.useState({});

  // ⭐ ตั้งค่าเริ่มต้นให้ categoryName ถูกซ่อน (แต่ยัง Filter ได้)
  const [columnVisibility, setColumnVisibility] =
    React.useState<VisibilityState>({
      categoryName: false,
    });

  const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>(
    [],
  );
  const [sorting, setSorting] = React.useState<SortingState>([]);

  // ----------------------------------------------------------
  // Inject Actions Column (Override)
  // ----------------------------------------------------------
  const tableColumns = React.useMemo(() => {
    return columns.map((col) => {
      if (col.id === "actions") {
        return {
          ...col,
          cell: ({ row }: any) => {
            const isRowLocked = Boolean((row.original as any)?.statusIsLocked);

            return (
              <DataTableRowActions
                row={row}
                onEdit={isRowLocked ? undefined : onEdit}
                onDuplicate={onDuplicate}
                onDelete={onDelete}
              />
            );
          },
        };
      }
      return col;
    });
  }, [columns, onEdit, onDuplicate, onDelete]);

  // ----------------------------------------------------------
  // Handle Pagination Change (Adapter)
  // TanStack Table ใช้ 0-based index แต่ API เราใช้ 1-based
  // ----------------------------------------------------------
  const handlePaginationChange = (updater: Updater<PaginationState>) => {
    const oldState: PaginationState = {
      pageIndex: page - 1,
      pageSize: pageSize,
    };

    // คำนวณค่าใหม่จาก updater (อาจจะเป็นค่า หรือ เป็นฟังก์ชัน)
    const newState =
      typeof updater === "function" ? updater(oldState) : updater;

    // อัปเดตกลับไปที่ Parent (แปลงกลับเป็น 1-based)
    onPageChange(newState.pageIndex + 1);

    // ถ้า pageSize เปลี่ยน ให้แจ้ง Parent
    if (newState.pageSize !== pageSize) {
      onPageSizeChange(newState.pageSize);
    }
  };

  // ----------------------------------------------------------
  // Create Table Instance
  // ----------------------------------------------------------
  const table = useReactTable({
    data,
    columns: tableColumns,
    pageCount: pageCount, // แจ้งจำนวนหน้าทั้งหมดให้ Table รู้
    state: {
      sorting,
      columnVisibility,
      rowSelection,
      columnFilters,
      pagination: {
        pageIndex: page - 1, // แปลง 1 => 0
        pageSize: pageSize,
      },
    },
    manualPagination: true, // ⭐ สำคัญ: บอกว่าเราจัดการ Pagination เอง (Server-side)
    getRowId: (row: any) => row.id, // ⭐ ใช้ ID จาก Database แทน index เพื่อให้เลือกข้ามหน้าได้

    // Handlers
    onRowSelectionChange: setRowSelection,
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    onColumnVisibilityChange: setColumnVisibility,
    onPaginationChange: handlePaginationChange,

    // Core Models
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(), // Client-side filter (เฉพาะข้อมูลในหน้านี้)
    getSortedRowModel: getSortedRowModel(), // Client-side sort (เฉพาะข้อมูลในหน้านี้)
    getFacetedRowModel: getFacetedRowModel(),
    getFacetedUniqueValues: getFacetedUniqueValues(),
  });

  return (
    <div className="flex flex-col gap-4">
      {/* ✅ ส่ง onCreate ต่อให้ Toolbar และลบ reload ออกเพื่อแก้ Error */}
      <DataTableToolbar
        table={table}
        onCreate={onCreate}
        onImport={onImport}
        onExport={onExport}
        onTemplate={onTemplate}
        onSearch={onSearch}
        activeStatusFilter={activeStatusFilter}
        onClearStatusFilter={onClearStatusFilter}
        onBulkDelete={onBulkDelete}
        initialReferenceData={initialReferenceData}
        // Hierarchical Filters
        categoryFilter={categoryFilter}
        onCategoryChange={onCategoryChange}
        typeFilter={typeFilter}
        onTypeChange={onTypeChange}
        classFilter={classFilter}
        onClassChange={onClassChange}
      />

      {!isLoading && table.getRowModel().rows?.length === 0 ? (
        <div className="flex flex-col items-center justify-center p-12 text-center animate-in fade-in-50 rounded-xl border-2 border-dashed bg-muted/20 min-h-[400px]">
          <div className="flex h-20 w-20 items-center justify-center rounded-full bg-primary/5 mb-4 p-5">
            {columnFilters.length > 0 || activeStatusFilter ? (
              <SearchX className="h-10 w-10 text-primary/40" />
            ) : (
              <Inbox className="h-10 w-10 text-primary/40" />
            )}
          </div>
          <h3 className="text-xl font-bold tracking-tight">
            {columnFilters.length > 0 || activeStatusFilter
              ? "ไม่พบข้อมูลที่ค้นหา"
              : "ยังไม่มีข้อมูลสินทรัพย์"}
          </h3>
          <p className="text-muted-foreground mt-2 mb-8 max-w-sm">
            {columnFilters.length > 0 || activeStatusFilter
              ? "ลองเปลี่ยนคำค้นหา หรือลบตัวกรองเพื่อดูข้อมูลทั้งหมด"
              : "เริ่มต้นการจัดการสินทรัพย์ของคุณ"}
          </p>
          {!(columnFilters.length > 0 || activeStatusFilter) && onCreate && (
            <Button
              onClick={onCreate}
              className="gap-2 h-11 px-6 text-base shadow-sm"
              data-testid={TEST_IDS.ASSET.BUTTON_CREATE_EMPTY_STATE}
            >
              <Plus className="h-4 w-4" />
              เพิ่มสินทรัพย์ใหม่
            </Button>
          )}
        </div>
      ) : (
        <div className="overflow-auto rounded-md border bg-card">
          <Table data-testid={TEST_IDS.ASSET.TABLE}>
            <TableHeader>
              {table.getHeaderGroups().map((headerGroup) => (
                <TableRow key={headerGroup.id} data-testid={TEST_IDS.ASSET.TABLE_HEADER_ROW}>
                  {headerGroup.headers.map((header) => (
                    <TableHead
                      key={header.id}
                      colSpan={header.colSpan}
                      className={
                        (header.column.columnDef.meta as any)?.className
                      }
                    >
                      {header.isPlaceholder
                        ? null
                        : flexRender(
                            header.column.columnDef.header,
                            header.getContext(),
                          )}
                    </TableHead>
                  ))}
                </TableRow>
              ))}
            </TableHeader>

            <TableBody>
              {isLoading
                ? // Simple Skeleton Rows
                  Array.from({ length: 5 }).map((_, i) => (
                    <TableRow key={i} data-testid={TEST_IDS.ASSET.TABLE_LOADING_ROW}>
                      {table.getVisibleLeafColumns().map((col) => (
                        <TableCell
                          key={col.id}
                          className={
                            (col.columnDef.meta as any)?.className || "p-4"
                          }
                        >
                          <div className="bg-muted h-6 animate-pulse rounded" />
                        </TableCell>
                      ))}
                    </TableRow>
                  ))
                : table.getRowModel().rows.map((row) => (
                    <TableRow
                      key={row.id}
                      data-state={row.getIsSelected() && "selected"}
                      data-testid={TEST_IDS.ASSET.TABLE_ROW((row.original as any).id)}
                    >
                      {row.getVisibleCells().map((cell) => {
                        const isRowLocked = Boolean(
                          (row.original as any)?.statusIsLocked,
                        );

                        return (
                          <TableCell
                            key={cell.id}
                            className={
                              (cell.column.columnDef.meta as any)?.className
                            }
                          >
                            {flexRender(cell.column.columnDef.cell, {
                              ...cell.getContext(),
                              // Pass handlers down just in case custom cells need them
                              onEdit: isRowLocked ? undefined : onEdit,
                              onDuplicate,
                              onDelete,
                            })}
                          </TableCell>
                        );
                      })}
                    </TableRow>
                  ))}
            </TableBody>
          </Table>
        </div>
      )}

      {/* Pagination Control - Show only if there is data OR if a search/filter is active (showing 0 results) */}
      {(table.getRowModel().rows?.length > 0 ||
        columnFilters.length > 0 ||
        activeStatusFilter) && (
        <DataTablePagination table={table} rowCount={rowCount} />
      )}
    </div>
  );
}
