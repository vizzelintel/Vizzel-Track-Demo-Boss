// frontend/app/(protected)/users/components/user-pagination.tsx
'use client';

import {
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
} from 'lucide-react';

import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { TEST_IDS } from '@/components/test-ids';

interface UserPaginationProps {
  page: number;
  totalPages: number;
  total: number;
  pageSize: number;
  onPageChange: (newPage: number) => void;
  onPageSizeChange: (newSize: number) => void;
}

export function UserPagination({
  page,
  totalPages,
  total,
  pageSize,
  onPageChange,
  onPageSizeChange,
}: UserPaginationProps) {
  return (
    <div className="flex flex-col items-center justify-between gap-4 px-2 py-4 lg:flex-row">
      <div className="text-muted-foreground text-sm whitespace-nowrap lg:text-left">
        รวมทั้งหมด {total} รายการ
      </div>

      <div className="flex flex-wrap items-center justify-center gap-4 lg:gap-8">
        {/* แสดงต่อหน้า — ซ่อนบน mobile */}
        <div className="hidden items-center space-x-2 md:flex">
          <p className="text-sm font-medium">แสดงต่อหน้า</p>

          <Select
            value={`${pageSize}`}
            onValueChange={(value) => onPageSizeChange(Number(value))}
          >
            <SelectTrigger className="h-8 w-[70px]" data-testid={TEST_IDS.PAGINATION.DROPDOWN_PAGE_SIZE}>
              <SelectValue placeholder={pageSize} />
            </SelectTrigger>

            <SelectContent side="top">
              {[10, 20, 25, 30, 40, 50].map((size) => (
                <SelectItem key={size} value={`${size}`}>
                  {size}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Page indicator */}
        <div className="flex w-[100px] items-center justify-center text-sm font-medium">
          หน้า {page} จาก {totalPages}
        </div>

        {/* Navigation buttons */}
        <div className="flex items-center space-x-2">
          {/* First */}
          <Button
            variant="outline"
            size="icon"
            className="hidden size-8 lg:flex"
            onClick={() => onPageChange(1)}
            disabled={page <= 1}
            data-testid={TEST_IDS.PAGINATION.BUTTON_FIRST}
          >
            <span className="sr-only">Go to first page</span>
            <ChevronsLeft />
          </Button>

          {/* Previous */}
          <Button
            variant="outline"
            size="icon"
            className="size-8"
            onClick={() => page > 1 && onPageChange(page - 1)}
            disabled={page <= 1}
            data-testid={TEST_IDS.PAGINATION.BUTTON_PREV}
          >
            <span className="sr-only">Go to previous page</span>
            <ChevronLeft />
          </Button>

          {/* Next */}
          <Button
            variant="outline"
            size="icon"
            className="size-8"
            onClick={() => page < totalPages && onPageChange(page + 1)}
            disabled={page >= totalPages}
            data-testid={TEST_IDS.PAGINATION.BUTTON_NEXT}
          >
            <span className="sr-only">Go to next page</span>
            <ChevronRight />
          </Button>

          {/* Last */}
          <Button
            variant="outline"
            size="icon"
            className="hidden size-8 lg:flex"
            onClick={() => onPageChange(totalPages)}
            disabled={page >= totalPages}
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
