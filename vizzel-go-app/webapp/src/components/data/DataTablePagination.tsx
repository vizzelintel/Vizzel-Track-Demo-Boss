import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

type Props = {
  page: number;
  pageSize: number;
  total: number;
  onPageChange: (page: number) => void;
  onPageSizeChange?: (size: number) => void;
  pageSizes?: number[];
  testIdPrefix?: string;
};

/**
 * Pagination footer matching the reference design:
 * "แสดงต่อหน้า [N] รายการ / หน้า X จาก Y" + first/prev/next/last buttons.
 */
export function DataTablePagination({
  page,
  pageSize,
  total,
  onPageChange,
  onPageSizeChange,
  pageSizes = [10, 20, 50, 100],
  testIdPrefix = "pagination",
}: Props) {
  const totalPages = Math.max(1, Math.ceil(total / Math.max(pageSize, 1)));
  const current = Math.min(Math.max(1, page), totalPages);
  return (
    <div className="flex flex-col gap-3 px-1 py-2 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex items-center gap-2 text-sm text-slate-500">
        <span>แสดงต่อหน้า</span>
        {onPageSizeChange ? (
          <Select
            value={String(pageSize)}
            onValueChange={(v) => onPageSizeChange(Number(v))}
          >
            <SelectTrigger
              className="h-8 w-[80px]"
              data-testid={`${testIdPrefix}-page-size`}
            >
              <SelectValue placeholder={pageSize} />
            </SelectTrigger>
            <SelectContent side="top">
              {pageSizes.map((s) => (
                <SelectItem key={s} value={String(s)}>
                  {s}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        ) : (
          <span className="font-medium text-slate-700">{pageSize}</span>
        )}
        <span>รายการ</span>
        <span className="hidden text-slate-300 sm:inline">·</span>
        <span className="hidden sm:inline">
          ทั้งหมด {total.toLocaleString("th-TH")} รายการ
        </span>
      </div>

      <div className="flex items-center gap-3">
        <span className="text-sm text-slate-500">
          หน้า{" "}
          <span className="font-medium text-slate-700">{current}</span> จาก{" "}
          <span className="font-medium text-slate-700">{totalPages}</span>
        </span>
        <div className="flex items-center gap-1">
          <Button
            type="button"
            variant="outline"
            size="icon"
            className="h-8 w-8"
            onClick={() => onPageChange(1)}
            disabled={current <= 1}
            data-testid={`${testIdPrefix}-first`}
            aria-label="หน้าแรก"
          >
            <ChevronsLeft className="h-4 w-4" />
          </Button>
          <Button
            type="button"
            variant="outline"
            size="icon"
            className="h-8 w-8"
            onClick={() => onPageChange(current - 1)}
            disabled={current <= 1}
            data-testid={`${testIdPrefix}-prev`}
            aria-label="ก่อนหน้า"
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button
            type="button"
            variant="outline"
            size="icon"
            className="h-8 w-8"
            onClick={() => onPageChange(current + 1)}
            disabled={current >= totalPages}
            data-testid={`${testIdPrefix}-next`}
            aria-label="ถัดไป"
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
          <Button
            type="button"
            variant="outline"
            size="icon"
            className="h-8 w-8"
            onClick={() => onPageChange(totalPages)}
            disabled={current >= totalPages}
            data-testid={`${testIdPrefix}-last`}
            aria-label="หน้าสุดท้าย"
          >
            <ChevronsRight className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
