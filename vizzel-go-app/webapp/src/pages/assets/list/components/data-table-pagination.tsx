import { Table } from "@tanstack/react-table";
import {
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { TEST_IDS } from "@/components/test-ids";

interface DataTablePaginationProps<TData> {
  table: Table<TData>;
  rowCount?: number;
}

export function DataTablePagination<TData>({
  table,
  rowCount,
}: DataTablePaginationProps<TData>) {
  return (
    <div className="flex flex-col items-center justify-between gap-4 px-2 lg:flex-row">
      <div className="text-muted-foreground flex-1 text-center text-sm whitespace-nowrap lg:text-left">
        รวมทั้งหมด{" "}
        {rowCount !== undefined
          ? rowCount
          : table.getFilteredRowModel().rows.length}{" "}
        รายการ
      </div>

      <div className="flex flex-wrap items-center justify-center gap-4 lg:gap-8">
        {/* ซ่อนบน mobile */}
        <div className="hidden items-center space-x-2 md:flex">
          <p className="text-sm font-medium">แสดงต่อหน้า</p>
          <Select
            value={`${table.getState().pagination.pageSize}`}
            onValueChange={(value) => table.setPageSize(Number(value))}
          >
            <SelectTrigger className="h-8 w-[70px]" data-testid={TEST_IDS.PAGINATION.DROPDOWN_PAGE_SIZE}>
              <SelectValue placeholder={table.getState().pagination.pageSize} />
            </SelectTrigger>
            <SelectContent side="top">
              {[10, 20, 25, 30, 40, 50].map((pageSize) => (
                <SelectItem key={pageSize} value={`${pageSize}`}>
                  {pageSize}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="flex items-center justify-center text-sm font-medium whitespace-nowrap">
          หน้า {table.getState().pagination.pageIndex + 1} จาก{" "}
          {table.getPageCount()}
        </div>

        <div className="flex items-center space-x-2">
          <Button
            variant="outline"
            size="icon"
            className="hidden size-8 lg:flex"
            onClick={() => table.setPageIndex(0)}
            disabled={!table.getCanPreviousPage()}
            data-testid={TEST_IDS.PAGINATION.BUTTON_FIRST}
          >
            <span className="sr-only">Go to first page</span>
            <ChevronsLeft />
          </Button>
          <Button
            variant="outline"
            size="icon"
            className="size-8"
            onClick={() => table.previousPage()}
            disabled={!table.getCanPreviousPage()}
            data-testid={TEST_IDS.PAGINATION.BUTTON_PREV}
          >
            <span className="sr-only">Go to previous page</span>
            <ChevronLeft />
          </Button>
          <Button
            variant="outline"
            size="icon"
            className="size-8"
            onClick={() => table.nextPage()}
            disabled={!table.getCanNextPage()}
            data-testid={TEST_IDS.PAGINATION.BUTTON_NEXT}
          >
            <span className="sr-only">Go to next page</span>
            <ChevronRight />
          </Button>
          <Button
            variant="outline"
            size="icon"
            className="hidden size-8 lg:flex"
            onClick={() => table.setPageIndex(table.getPageCount() - 1)}
            disabled={!table.getCanNextPage()}
            data-testid={TEST_IDS.PAGINATION.BUTTON_LAST}
          >
            <span className="sr-only">Go to last page</span>
            <ChevronsRight />
          </Button>
        </div>
      </div>
    </div>
  );
}
