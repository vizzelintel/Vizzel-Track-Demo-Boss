import { Table } from "@tanstack/react-table";
import {
  X,
  FileDown,
  FileUp,
  FileText,
  Settings2,
  Plus,
  FileSpreadsheet,
  Trash2,
} from "lucide-react";
import { ExportAssetsOptions } from "@/lib/assets";
import { useEffect } from "react";
import { apiRequest } from "@/lib/api";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuSub,
  DropdownMenuSubTrigger,
  DropdownMenuSubContent,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

import { DataTableViewOptions } from "./data-table-view-options";
import { DataTableFacetedFilter } from "./data-table-faceted-filter";
import { ExportFilterDialog } from "./export-filter-dialog";
import { useState } from "react";
import { useUser } from "@/hooks/use-user";
import { TEST_IDS } from "@/components/test-ids";
import { filterRefRows, toFacetOptions } from "@/lib/asset-normalize";

interface DataTableToolbarProps<TData> {
  table: Table<TData>;
  onCreate: () => void;
  onImport: (format: "default" | "elaas") => void;
  onExport: (options: ExportAssetsOptions) => void;
  onTemplate: () => void;
  onSearch?: (value: string) => void;
  activeStatusFilter?: string | null;
  onClearStatusFilter?: () => void;
  onBulkDelete?: (ids: number[]) => void;
  initialReferenceData?: any;
  categoryFilter?: string[];
  onCategoryChange?: (val: string[]) => void;
  typeFilter?: string[];
  onTypeChange?: (val: string[]) => void;
  classFilter?: string[];
  onClassChange?: (val: string[]) => void;
}

export function DataTableToolbar<TData>({
  table,
  onCreate,
  onImport,
  onExport,
  onTemplate,
  onSearch,
  activeStatusFilter,
  onClearStatusFilter,
  onBulkDelete,
  initialReferenceData,
  categoryFilter,
  onCategoryChange,
  typeFilter,
  onTypeChange,
  classFilter,
  onClassChange,
}: DataTableToolbarProps<TData>) {
  const { user } = useUser();
  const isFiltered = table.getState().columnFilters.length > 0;
  const [filterExportOpen, setFilterExportOpen] = useState(false);
  const [bulkDeleteOpen, setBulkDeleteOpen] = useState(false);
  const [bulkDeleting, setBulkDeleting] = useState(false);

  const rowSelection = table.getState().rowSelection;
  const selectedIds = Object.keys(rowSelection).map(Number);
  const isSuperAdmin = (user as any)?.roleID === 1;
  const allCategories = filterRefRows(initialReferenceData?.categories);

  // Local state for input to avoid UI lag, sync with debounce
  const [searchValue, setSearchValue] = useState(
    (table.getColumn("assetName")?.getFilterValue() as string) ?? "",
  );

  const [types, setTypes] = useState<any[]>([]);
  const [classes, setClasses] = useState<any[]>([]);
  const [loadingTypes, setLoadingTypes] = useState(false);
  const [loadingClasses, setLoadingClasses] = useState(false);


  // Fetch Types when Category changes
  useEffect(() => {
    if (categoryFilter && categoryFilter.length > 0 && user?.organizationID) {
      setLoadingTypes(true);
      const categoryIdsParam = categoryFilter.join(",");
      apiRequest(
        `/asset/type/get_all?organizationID=${user.organizationID}&categoryID=${categoryIdsParam}`,
      )
        .then((res) =>
          setTypes(filterRefRows(Array.isArray(res) ? res : res?.data)),
        )
        .catch(() => setTypes([]))
        .finally(() => setLoadingTypes(false));
    } else {
      setTypes([]);
    }
  }, [categoryFilter, user?.organizationID]);

  // Fetch Classes when Type changes
  useEffect(() => {
    if (typeFilter && typeFilter.length > 0 && user?.organizationID) {
      setLoadingClasses(true);
      const typeIdsParam = typeFilter.join(",");
      apiRequest(
        `/asset/class/get_all?organizationID=${user.organizationID}&typeID=${typeIdsParam}`,
      )
        .then((res) =>
          setClasses(filterRefRows(Array.isArray(res) ? res : res?.data)),
        )
        .catch(() => setClasses([]))
        .finally(() => setLoadingClasses(false));
    } else {
      setClasses([]);
    }
  }, [typeFilter, user?.organizationID]);

  // Debounce handler
  const handleSearch = (value: string) => {
    setSearchValue(value);

    // If onSearch is provided (Server-side), use it.
    // Otherwise fallback to client-side filtering (legacy support)
    if (onSearch) {
      onSearch(value); // ⚡ No debounce to match Users page experience
    } else {
      table.getColumn("assetName")?.setFilterValue(value);
    }
  };

  // -------------------------------------------------------------
  // Load Categories from Table Data (Current Page)
  // -------------------------------------------------------------
  // ✅ ดึงข้อมูล Unique Values จาก Column "categoryName" ที่มีอยู่ในตารางปัจจุบัน
  const uniqueCategories =
    table.getColumn("categoryName")?.getFacetedUniqueValues() || new Map();

  // แปลง Map เป็น Array เพื่อนำไปแสดงผล
  const categories = Array.from(uniqueCategories.keys())
    .filter((key) => key) // กรองค่าว่าง/null ออก
    .map((key) => ({
      categoryName: key,
    }))
    .sort((a, b) => a.categoryName.localeCompare(b.categoryName)); // เรียงตามตัวอักษร

  const handleExportSelected = (format: "default" | "elaas") => {
    const selectedRows = table.getFilteredSelectedRowModel().rows;
    const ids = selectedRows
      .map((row) => (row.original as { id?: number })?.id)
      .filter((id): id is number => id != null && Number.isFinite(id));
    if (ids.length > 0) {
      onExport({ mode: "custom", assetID: ids, file: format });
    }
  };

  const handleBulkDelete = async () => {
    if (!onBulkDelete || selectedIds.length === 0) return;
    setBulkDeleting(true);
    try {
      await onBulkDelete(selectedIds);
      table.resetRowSelection();
      setBulkDeleteOpen(false);
    } finally {
      setBulkDeleting(false);
    }
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col xl:flex-row items-start justify-between gap-4 w-full">
        {/* Left Side: Search & Filters */}
        <div className="flex flex-1 flex-col sm:flex-row flex-wrap items-start sm:items-center gap-2 w-full xl:w-auto">
          {/* Row 1 on mobile: Search + Mobile Menu */}
          <div className="flex flex-1 items-center gap-2 w-full sm:w-auto sm:flex-none">
            <Input
              placeholder="ค้นหาสินทรัพย์..."
              value={searchValue}
              onChange={(event) => handleSearch(event.target.value)}
              className="h-8 flex-1 sm:w-[250px] sm:flex-none"
              data-testid={TEST_IDS.ASSET.INPUT_SEARCH}
            />

            {/* Mobile Actions Dropdown */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="icon" className="h-8 w-8 xl:hidden shrink-0">
                  <Settings2 className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-[200px]">
                <DropdownMenuLabel>จัดการข้อมูล</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={onTemplate} data-testid={TEST_IDS.ASSET.MENUITEM_TEMPLATE}>
                  <FileText className="mr-2 h-4 w-4" />
                  เทมเพลต
                </DropdownMenuItem>
                <DropdownMenuSub>
                  <DropdownMenuSubTrigger>
                    <FileDown className="mr-2 h-4 w-4" />
                    นำเข้า
                  </DropdownMenuSubTrigger>
                  <DropdownMenuSubContent>
                    <DropdownMenuItem onClick={() => onImport("default")} data-testid={TEST_IDS.ASSET.MENUITEM_IMPORT_STANDARD}>
                      Standard
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => onImport("elaas")} data-testid={TEST_IDS.ASSET.MENUITEM_IMPORT_ELAAS}>
                      e-LAAS (Excel)
                    </DropdownMenuItem>
                  </DropdownMenuSubContent>
                </DropdownMenuSub>

                {/* Mobile Export Submenus */}
                <DropdownMenuSub>
                  <DropdownMenuSubTrigger>
                    <FileUp className="mr-2 h-4 w-4" />
                    นำออก
                  </DropdownMenuSubTrigger>
                  <DropdownMenuSubContent>
                    <DropdownMenuLabel>Export Options</DropdownMenuLabel>
                    <DropdownMenuSub>
                      <DropdownMenuSubTrigger>นำออกทั้งหมด</DropdownMenuSubTrigger>
                      <DropdownMenuSubContent>
                        <DropdownMenuItem onClick={() => onExport({ mode: "all", file: "default" })} data-testid={TEST_IDS.ASSET.MENUITEM_EXPORT_ALL_STANDARD}>
                          Standard (CSV)
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => onExport({ mode: "all", file: "elaas" })} data-testid={TEST_IDS.ASSET.MENUITEM_EXPORT_ALL_ELAAS}>
                          E-Laas (Excel)
                        </DropdownMenuItem>
                      </DropdownMenuSubContent>
                    </DropdownMenuSub>

                    <DropdownMenuItem onClick={() => setFilterExportOpen(true)} data-testid={TEST_IDS.ASSET.MENUITEM_EXPORT_FILTER}>
                      นำออกตามกลุ่ม...
                    </DropdownMenuItem>

                    <DropdownMenuSub>
                      <DropdownMenuSubTrigger disabled={table.getFilteredSelectedRowModel().rows.length === 0}>
                        นำออกที่เลือก ({table.getFilteredSelectedRowModel().rows.length})
                      </DropdownMenuSubTrigger>
                      <DropdownMenuSubContent>
                        <DropdownMenuItem onClick={() => handleExportSelected("default")}>
                          Standard (CSV)
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleExportSelected("elaas")}>
                          E-Laas (Excel)
                        </DropdownMenuItem>
                      </DropdownMenuSubContent>
                    </DropdownMenuSub>
                  </DropdownMenuSubContent>
                </DropdownMenuSub>

                <DropdownMenuSeparator />
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          {/* Filters */}
          <div className="flex flex-wrap items-center gap-2">
            {/* ตัวกรองหมวดหมู่ (Faceted Style) */}
            <DataTableFacetedFilter
              title="หมวดหมู่"
              options={toFacetOptions(allCategories, [
                "categoryName",
                "title",
                "name",
              ])}
              selectedValues={new Set(categoryFilter || [])}
              onSelect={(val) => {
                const newValues = new Set(categoryFilter || []);
                if (newValues.has(val)) {
                  newValues.delete(val);
                } else {
                  newValues.add(val);
                }
                onCategoryChange?.(Array.from(newValues));
              }}
              onClear={() => onCategoryChange?.([])}
              dataTestId={TEST_IDS.ASSET.DROPDOWN_FILTER_CATEGORY}
            />

            {/* ตัวกรองประเภท (Faceted Style) */}
            {(categoryFilter && categoryFilter.length > 0 || typeFilter && typeFilter.length > 0) && (
              <DataTableFacetedFilter
                title="ประเภท"
                options={toFacetOptions(types, ["typeName", "title"])}
                selectedValues={new Set(typeFilter || [])}
                onSelect={(val) => {
                  const newValues = new Set(typeFilter || []);
                  if (newValues.has(val)) {
                    newValues.delete(val);
                  } else {
                    newValues.add(val);
                  }
                  onTypeChange?.(Array.from(newValues));
                }}
                onClear={() => onTypeChange?.([])}
                dataTestId={TEST_IDS.ASSET.DROPDOWN_FILTER_TYPE}
              />
            )}

            {/* ตัวกรองกลุ่ม (Faceted Style) */}
            {(typeFilter && typeFilter.length > 0 || classFilter && classFilter.length > 0) && (
              <DataTableFacetedFilter
                title="กลุ่ม"
                options={toFacetOptions(classes, ["className", "title"])}
                selectedValues={new Set(classFilter || [])}
                onSelect={(val) => {
                  const newValues = new Set(classFilter || []);
                  if (newValues.has(val)) {
                    newValues.delete(val);
                  } else {
                    newValues.add(val);
                  }
                  onClassChange?.(Array.from(newValues));
                }}
                onClear={() => onClassChange?.([])}
                dataTestId={TEST_IDS.ASSET.DROPDOWN_FILTER_CLASS}
              />
            )}

            {/* Status Filter Badge (Client Page Prop) */}
            {activeStatusFilter && (
              <Button
                variant="outline"
                onClick={onClearStatusFilter}
                className="h-8 px-2 text-red-600 border-red-200 bg-red-50 hover:bg-red-100 hover:text-red-700 xl:px-3"
              >
                {activeStatusFilter}
                <X className="ml-2 h-4 w-4" />
              </Button>
            )}

            {/* ปุ่ม Reset Filter (แสดงเมื่อมีการกรอง) */}
            {isFiltered ||
              (categoryFilter && categoryFilter.length > 0) ||
              (typeFilter && typeFilter.length > 0) ||
              (classFilter && classFilter.length > 0) ||
              activeStatusFilter ? (
              <Button
                variant="ghost"
                onClick={() => {
                  table.resetColumnFilters();
                  onCategoryChange?.([]);
                  onTypeChange?.([]);
                  onClassChange?.([]);
                  onClearStatusFilter?.();
                }}
                className="h-8 px-2 xl:px-3 text-muted-foreground hover:text-foreground"
                data-testid={TEST_IDS.ASSET.BUTTON_CLEAR_FILTER}
              >
                ล้างตัวกรอง
                <X className="ml-2 h-4 w-4" />
              </Button>
            ) : null}
          </div>
        </div>

        {/* Right Side: Actions (Desktop) */}
        <div className="flex items-center gap-2 w-full xl:w-auto justify-end xl:shrink-0">
          <div className="hidden xl:block">
            <DataTableViewOptions table={table} />
          </div>

          {/* Bulk Delete - Super Admin only */}
          {isSuperAdmin && Object.keys(rowSelection).length > 0 && (
            <AlertDialog open={bulkDeleteOpen} onOpenChange={setBulkDeleteOpen}>
              <AlertDialogTrigger asChild>
                <Button variant="destructive" size="sm" className="h-8 px-2 sm:px-3" data-testid={TEST_IDS.ASSET.BUTTON_BULK_DELETE}>
                  <Trash2 className="h-4 w-4 sm:mr-2" />
                  <span className="hidden sm:inline">ลบที่เลือก </span>
                  <span>({Object.keys(rowSelection).length})</span>
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent data-testid={TEST_IDS.ASSET.MODAL_BULK_DELETE}>
                <AlertDialogHeader>
                  <AlertDialogTitle>ยืนยันการลบ</AlertDialogTitle>
                  <AlertDialogDescription>
                    ลบสินทรัพย์ที่เลือกจำนวน {Object.keys(rowSelection).length} รายการ? การดำเนินการนี้ไม่สามารถกู้คืนได้
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel asChild>
                    <Button variant="outline" disabled={bulkDeleting}>
                      ยกเลิก
                    </Button>
                  </AlertDialogCancel>
                  <AlertDialogAction
                    className="bg-red-600 hover:bg-red-700 text-white"
                    onClick={handleBulkDelete}
                    disabled={bulkDeleting}
                    data-testid={TEST_IDS.ASSET.BUTTON_BULK_DELETE_CONFIRM}
                  >
                    {bulkDeleting ? "กำลังลบ..." : "ยืนยันลบ"}
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          )}

          {/* Desktop Actions (Unpacked) */}
          <div className="hidden items-center gap-2 xl:flex">
            <Button variant="outline" size="sm" className="h-8" onClick={onTemplate} data-testid={TEST_IDS.ASSET.BUTTON_TEMPLATE}>
              <FileText className="mr-2 h-4 w-4" />
              เทมเพลต
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" className="h-8" data-testid={TEST_IDS.ASSET.BUTTON_IMPORT}>
                  <FileDown className="mr-2 h-4 w-4" />
                  นำเข้า
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => onImport("default")} data-testid={TEST_IDS.ASSET.BUTTON_IMPORT_STANDARD}>Standard</DropdownMenuItem>
                <DropdownMenuItem onClick={() => onImport("elaas")} data-testid={TEST_IDS.ASSET.BUTTON_IMPORT_ELAAS}>e-LAAS (Excel)</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" className="h-8" data-testid={TEST_IDS.ASSET.BUTTON_EXPORT}>
                  <FileUp className="mr-2 h-4 w-4" />
                  นำออก
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                {/* Export All Submenu */}
                <DropdownMenuSub>
                  <DropdownMenuSubTrigger>นำออกทั้งหมด</DropdownMenuSubTrigger>
                  <DropdownMenuSubContent>
                    <DropdownMenuItem onClick={() => onExport({ mode: "all", file: "default" })}>
                      <FileSpreadsheet className="mr-2 h-4 w-4" />
                      Standard (CSV)
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => onExport({ mode: "all", file: "elaas" })}>
                      <FileSpreadsheet className="mr-2 h-4 w-4" />
                      E-Laas (Excel)
                    </DropdownMenuItem>
                  </DropdownMenuSubContent>
                </DropdownMenuSub>

                <DropdownMenuItem onClick={() => setFilterExportOpen(true)}>
                  นำออกตามกลุ่ม...
                </DropdownMenuItem>

                {/* Export Selected Submenu */}
                <DropdownMenuSub>
                  <DropdownMenuSubTrigger disabled={table.getFilteredSelectedRowModel().rows.length === 0}>
                    นำออกที่เลือก ({table.getFilteredSelectedRowModel().rows.length})
                  </DropdownMenuSubTrigger>
                  <DropdownMenuSubContent>
                    <DropdownMenuItem onClick={() => handleExportSelected("default")}>
                      <FileSpreadsheet className="mr-2 h-4 w-4" />
                      Standard (CSV)
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => handleExportSelected("elaas")}>
                      <FileSpreadsheet className="mr-2 h-4 w-4" />
                      E-Laas (Excel)
                    </DropdownMenuItem>
                  </DropdownMenuSubContent>
                </DropdownMenuSub>
              </DropdownMenuContent>
            </DropdownMenu>

            <Button size="sm" className="h-8" onClick={onCreate} data-testid={TEST_IDS.ASSET.BUTTON_CREATE}>
              <Plus className="mr-2 h-4 w-4" />
              เพิ่มสินทรัพย์
            </Button>
          </div>
        </div>
      </div>

      {/* 👈 3. ปุ่มเพิ่มสินทรัพย์ (Mobile - Full Width) */}
      <Button className="w-full xl:hidden" onClick={onCreate} data-testid={TEST_IDS.ASSET.BUTTON_CREATE}>
        <Plus className="mr-2 h-4 w-4" />
        เพิ่มสินทรัพย์
      </Button>

      <ExportFilterDialog
        open={filterExportOpen}
        onOpenChange={setFilterExportOpen}
        onConfirm={(ids, format) =>
          onExport({ mode: "filter", assetClassID: ids, file: format })
        }
      />
    </div>
  );
}
