"use client";

import React, { useState, useEffect, useCallback, useRef } from "react";
import { z } from "zod";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import {
  Loader2,
  Save,
  Plus,
  Trash,
  ArrowUp,
  ArrowDown,
  AlertCircle,
  XCircle,
  CheckCircle2,
  FileText,
  ChevronLeft,
  ChevronRight,
  ChevronFirst,
  ChevronLast,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { TEST_IDS } from "@/components/test-ids";

// --- Validation Schema ---
// Update based on Asset CSV requirement
// assetName, assetDetails, assetClassName, assetTypeName, assetCategoryName, assetValue, assetNumber, getBy, sourceFund, depreciation, receivedDate, expiryDate
const rowSchema = z.object({
  assetName: z.string().min(1, "จำเป็นต้องระบุชื่อครุภัณฑ์"),
  assetNumber: z.string().min(1, "จำเป็นต้องระบุเลขครุภัณฑ์"),
  assetClassName: z.string().min(1, "ระบุ Class"),
  assetTypeName: z.string().min(1, "ระบุ Type"),
  assetCategoryName: z.string().min(1, "ระบุ Category"),
  assetValue: z
    .string()
    .regex(/^\d+(\.\d+)?$/, "ต้องเป็นตัวเลข")
    .or(z.string().regex(/^\d{1,3}(,\d{3})*(\.\d+)?$/, "ตัวเลขมี comma ได้"))
    .optional(),
  // Allow comma in frontend validation too, backend handles strip
  // But strictly regex might fail if simple partial typing. Let's start lenient or use a helper.
  // Actually, backend now strips comma, so frontend validation should allow it.
  receivedDate: z.string().min(1, "ระบุวันที่รับ"),
  verified: z.string().optional(),
});

// Mapping Header -> Key
// We assume English headers internally for processing, but if file has Thai headers we map them.
// Based on previous code, headers seem to be English keys in logic: 'username' etc.
// But Assets might have Thai headers in templates?
// Let's support standard template headers.
const HEADER_KEY_MAPPING: Record<string, string> = {
  ชื่อครุภัณฑ์: "assetName",
  รายละเอียด: "assetDetails",
  Class: "assetClassName",
  Type: "assetTypeName",
  Category: "assetCategoryName",
  มูลค่า: "assetValue",
  เลขครุภัณฑ์: "assetNumber",
  ที่มา: "getBy",
  แหล่งเงิน: "sourceFund",
  ค่าเสื่อม: "depreciation",
  วันที่รับ: "receivedDate",
  วันที่หมดอายุ: "expiryDate",
  "ต้องตรวจนับ (Verified)": "verified",
  Verified: "verified",
};

const KEY_INDEX_MAPPING_OLD: Record<number, string> = {
  0: "assetName",
  1: "assetDetails",
  2: "assetClassName",
  3: "assetTypeName",
  4: "assetCategoryName",
  5: "assetValue",
  6: "assetNumber",
  7: "receivedDate",
  8: "expiryDate",
};

const KEY_INDEX_MAPPING_NEW: Record<number, string> = {
  0: "assetNumber",
  1: "assetName",
  2: "assetDetails",
  3: "assetCategoryName",
  4: "assetTypeName",
  5: "assetClassName",
  6: "buildingName", // Not in schema yet, but safe to map
  7: "roomName",
  8: "getBy",
  9: "getFrom",
  10: "sourceFund",
  11: "assetValue",
  12: "depreciation",
  13: "receivedDate",
  14: "expiryDate",
  15: "usefulLife",
  16: "ownerName",
  17: "statusName",
  18: "verified",
};

interface AssetImportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  file: File | null;
  onConfirm: (file: File) => void;
  loading: boolean; // Loading state from parent (Dry Run)
}

export function AssetImportDialog({
  open,
  onOpenChange,
  file,
  onConfirm,
  loading,
}: AssetImportDialogProps) {
  const [data, setData] = useState<string[][]>([]);
  const [headers, setHeaders] = useState<string[]>([]);
  const [parsing, setParsing] = useState(false);
  const [parseProgress, setParseProgress] = useState(0);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isExcel, setIsExcel] = useState(false);

  // Pagination to fix performance issue on large datasets
  const [page, setPage] = useState(1);
  const PAGE_SIZE = 50;
  const totalPages = Math.ceil(data.length / PAGE_SIZE);

  useEffect(() => {
    if (file && open) {
      const fileName = file.name.toLowerCase();
      if (fileName.endsWith(".xlsx") || fileName.endsWith(".xls")) {
        setIsExcel(true);
        // For Excel, we assume valid and don't parse client-side
        setData([]);
        setHeaders([]);
        setErrors({});
        setParseProgress(0);
        setParsing(false);
      } else {
        setIsExcel(false);
        parseFile(file);
      }
      setPage(1);
    } else {
      setData([]);
      setHeaders([]);
      setErrors({});
      setParseProgress(0);
      setIsExcel(false);
      setPage(1);
    }
  }, [file, open]);

  // --- CSV Parsing ---
  const readFileAsText = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => resolve((e.target?.result as string) || "");
      reader.onerror = (e) => reject(e);
      reader.readAsText(file);
    });
  };

  const parseCSVAsync = async (
    text: string,
    onProgress: (percent: number) => void,
  ): Promise<string[][]> => {
    const rows: string[][] = [];
    let currentRow: string[] = [];
    let currentCell = "";
    let inQuote = false;

    const total = text.length;
    const YIELD_INTERVAL = 50000;

    for (let i = 0; i < total; i++) {
      const char = text[i];
      const nextChar = text[i + 1];

      if (char === '"') {
        if (inQuote && nextChar === '"') {
          currentCell += '"';
          i++;
        } else {
          inQuote = !inQuote;
        }
      } else if (char === "," && !inQuote) {
        currentRow.push(currentCell);
        currentCell = "";
      } else if ((char === "\r" || char === "\n") && !inQuote) {
        if (char === "\r" && nextChar === "\n") i++;
        currentRow.push(currentCell);
        rows.push(currentRow);
        currentRow = [];
        currentCell = "";
      } else {
        currentCell += char;
      }

      if (i % YIELD_INTERVAL === 0) {
        onProgress(Math.round((i / total) * 100));
        await new Promise((resolve) => setTimeout(resolve, 0));
      }
    }

    if (currentCell) {
      currentRow.push(currentCell);
      rows.push(currentRow);
    } else if (currentRow.length > 0) {
      // End of line empty cell case
      rows.push(currentRow);
    }

    onProgress(100);
    return rows;
  };

  const parseFile = async (file: File) => {
    setParsing(true);
    setParseProgress(0);

    try {
      const text = await readFileAsText(file);
      const rows = await parseCSVAsync(text, setParseProgress);

      if (rows.length > 0) {
        // Handle BOM
        if (rows[0][0]?.charCodeAt(0) === 0xfeff) {
          rows[0][0] = rows[0][0].slice(1);
        }

        setHeaders(rows[0]);
        // Filter empty rows
        const cleanData = rows
          .slice(1)
          .filter((r) => r.some((c) => c.trim() !== ""));
        setData(cleanData);
        validateAll(cleanData, rows[0]);
      }
    } catch (error) {
      console.error("Parse error", error);
      toast.error("ไม่สามารถอ่านไฟล์ได้");
    } finally {
      setParsing(false);
    }
  };

  // --- Validation ---
  const validateCell = (headerKey: string, value: string): string | null => {
    // Just simple check for now based on index/header name
    // We try to match header name to schema key

    // Reverse map check or direct check
    // If header matches key in schema directly (e.g. Asset Template English)
    // Or if valid Thai header maps to key

    // For simplicity, let's Map by Index if standard template?
    // Or Map by Header Name.

    // Let's assume the user is using the standard template which might have NO Header keys we know if they renamed it.
    // BUT, let's try mapping.

    // Heuristic: Check if header matches known keys.
    const key = HEADER_KEY_MAPPING[headerKey] || headerKey; // Try mapped or direct

    const shape = rowSchema.shape as any;
    if (!shape[key]) return null;

    const result = shape[key].safeParse(value);
    if (!result.success) {
      // Relaxed validation for assetValue (allow comma)
      if (key === "assetValue" && /^\d{1,3}(,\d{3})*(\.\d+)?$/.test(value)) {
        return null;
      }
      return "ข้อมูลไม่ถูกต้อง";
    }
    return null;
  };

  // Improved validation using Column Index to Field Mapping
  // Since CSV column order is fixed in Backend:
  // 0: assetName, 1: details, 2: class, 3: type, 4: category, 5: value, 6: number...
  const validateAll = useCallback(
    (currentData: string[][], currentHeaders: string[]) => {
      const newErrors: Record<string, string> = {};

      currentData.forEach((row, rowIndex) => {
        // Detect Format based on Header
        const isNewFormat =
          currentHeaders.length >= 15 &&
          (currentHeaders[0].includes("รหัส") ||
            currentHeaders[0].toLowerCase().includes("code") ||
            currentHeaders[0].toLowerCase().includes("asset number"));
        const mapping = isNewFormat
          ? KEY_INDEX_MAPPING_NEW
          : KEY_INDEX_MAPPING_OLD;

        row.forEach((cell, colIndex) => {
          const fieldKey = mapping[colIndex];
          if (fieldKey) {
            const shape = rowSchema.shape as any;
            if (shape[fieldKey]) {
              const result = shape[fieldKey].safeParse(cell);
              // Custom check for Comma numbers
              if (fieldKey === "assetValue" && cell && cell.includes(",")) {
                // Skip Zod check failure if it's just comma
                return;
              }

              if (!result.success) {
                newErrors[`${rowIndex}-${colIndex}`] = "ข้อมูลไม่ถูกต้อง";
              }
            }
          }
        });
      });
      setErrors(newErrors);
    },
    [],
  );

  const handleCellChange = (
    rowIndex: number,
    colIndex: number,
    value: string,
  ) => {
    const newData = [...data];
    newData[rowIndex] = [...newData[rowIndex]];
    newData[rowIndex][colIndex] = value;
    setData(newData);

    // Validate Single Cell
    const isNewFormat =
      headers.length >= 15 &&
      (headers[0].includes("รหัส") ||
        headers[0].toLowerCase().includes("code") ||
        headers[0].toLowerCase().includes("asset number"));
    const mapping = isNewFormat ? KEY_INDEX_MAPPING_NEW : KEY_INDEX_MAPPING_OLD;

    const fieldKey = mapping[colIndex];
    if (fieldKey) {
      const shape = rowSchema.shape as any;
      if (shape[fieldKey]) {
        const result = shape[fieldKey].safeParse(value);
        // Custom check for Comma numbers
        let isValid = result.success;
        if (
          !isValid &&
          fieldKey === "assetValue" &&
          value &&
          value.includes(",")
        )
          isValid = true;

        const errKey = `${rowIndex}-${colIndex}`;
        if (!isValid) {
          setErrors((prev) => ({ ...prev, [errKey]: "ข้อมูลไม่ถูกต้อง" }));
        } else {
          setErrors((prev) => {
            const next = { ...prev };
            delete next[errKey];
            return next;
          });
        }
      }
    }
  };

  // --- Row Ops ---
  const insertRow = (index: number, position: "above" | "below") => {
    const newRow = new Array(headers.length).fill("");
    const newData = [...data];
    const insertIndex = position === "above" ? index : index + 1;
    newData.splice(insertIndex, 0, newRow);
    setData(newData);
  };

  const deleteRow = (index: number) => {
    const newData = data.filter((_, i) => i !== index);
    setData(newData);
    // Force re-validate or just clear errors for that row?
    // Simply clearing all errors and revalidating might be safer but expensive.
    // For now, let validation effect run if we added it to dependency (we didn't for perf).
    // Let's crude revalidate:
    validateAll(newData, headers);
  };

  const addRow = () => {
    const newRow = new Array(headers.length).fill("");
    const newData = [...data, newRow];
    setData(newData);
  };

  const handleConfirm = () => {
    // If Excel, just pass the original file
    if (isExcel) {
      if (file) onConfirm(file);
      return;
    }

    if (Object.keys(errors).length > 0) {
      toast.error("กรุณาแก้ไขข้อมูลที่ผิดพลาดก่อนดำเนินการต่อ");
      return;
    }

    // Convert grid back to File
    const escape = (val: string) => {
      if (val === undefined || val === null) return "";
      const strVal = String(val);
      if (
        strVal.includes(",") ||
        strVal.includes('"') ||
        strVal.includes("\n")
      ) {
        return `"${strVal.replace(/"/g, '""')}"`;
      }
      return strVal;
    };

    const csvContent = [
      headers.map(escape).join(","),
      ...data.map((row) => row.map(escape).join(",")),
    ].join("\n");

    const bom = new Uint8Array([0xef, 0xbb, 0xbf]);
    const blob = new Blob([bom, csvContent], {
      type: "text/csv;charset=utf-8;",
    });
    // Reuse original filename if possible, else default
    const fileName = file?.name || "edited_import.csv";
    const newFile = new File([blob], fileName, { type: "text/csv" });

    onConfirm(newFile);
  };

  const hasErrors = Object.keys(errors).length > 0;

  return (
    <Dialog open={open} onOpenChange={(val) => !loading && onOpenChange(val)}>
      <DialogContent className="flex h-[90vh] w-[95vw] flex-col gap-0 overflow-hidden p-0 sm:max-w-[95vw]" data-testid={TEST_IDS.ASSET_IMPORT.MODAL}>
        <DialogHeader className="border-b p-6 pb-4">
          <DialogTitle>ตรวจสอบและแก้ไขข้อมูล</DialogTitle>
          <DialogDescription>
            {isExcel
              ? "ไฟล์ Excel (.xlsx) ตรวจสอบและแก้ไขได้ในขั้นตอนถัดไป"
              : 'ตรวจสอบข้อมูลในตาราง แก้ไขได้ทันที หากถูกต้องกด "ตรวจสอบ" เพื่อดำเนินการต่อ'}
          </DialogDescription>
        </DialogHeader>

        <div className="bg-muted/10 relative flex-1 overflow-hidden">
          {parsing ? (
            <div className="bg-background/50 absolute inset-0 z-10 flex flex-col items-center justify-center space-y-4">
              <Loader2 className="text-muted-foreground h-8 w-8 animate-spin" />
              <div className="text-muted-foreground text-sm font-medium">
                กำลังอ่านไฟล์... {parseProgress}%
              </div>
            </div>
          ) : isExcel ? (
            <div className="flex h-full flex-col items-center justify-center gap-4 text-center">
              <FileText className="h-16 w-16 text-green-600" />
              <div>
                <h3 className="text-lg font-medium">พบไฟล์ Excel</h3>
                <p className="text-muted-foreground text-sm">
                  {file?.name} ({Math.round((file?.size || 0) / 1024)} KB)
                </p>
              </div>
              <p className="text-muted-foreground max-w-md text-sm">
                ระบบไม่สามารถแสดงตัวอย่างไฟล์ Excel ในหน้านี้ได้
                <br />
                กรุณากดปุ่ม <b>"ตรวจสอบ (Dry Run)"</b>{" "}
                เพื่อให้ระบบตรวจสอบความถูกต้องและแสดงผลลัพธ์
              </p>
            </div>
          ) : (
            <TooltipProvider delayDuration={0}>
              <ScrollArea className="h-full w-full">
                <div className="min-w-max">
                  {/* Header */}
                  <div className="sticky top-0 z-20 flex shadow-sm">
                    <div className="bg-muted sticky left-0 z-30 flex w-12 shrink-0 items-center justify-center border-r border-b">
                      <span className="text-muted-foreground text-xs">#</span>
                    </div>
                    {headers.map((header, i) => (
                      <div
                        key={i}
                        className="bg-muted flex min-w-[150px] flex-1 items-center justify-center border-r border-b px-4 py-2"
                      >
                        <span className="text-muted-foreground text-xs font-medium select-none">
                          {header}
                        </span>
                      </div>
                    ))}
                  </div>

                  {/* Body */}
                  <div className="flex flex-col">
                    {data.length === 0 && (
                      <div className="text-muted-foreground p-8 text-center">
                        ไม่พบข้อมูล
                      </div>
                    )}
                    {/* Pagination Slice */}
                    {data
                      .slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)
                      .map((row, index) => {
                        const actualRowIndex = (page - 1) * PAGE_SIZE + index;
                        return (
                          <div key={actualRowIndex} className="group flex">
                            <div className="bg-muted/50 group-hover:bg-muted sticky left-0 z-10 flex w-12 shrink-0 items-center justify-center border-r border-b transition-colors">
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button
                                    variant="ghost"
                                    className="text-muted-foreground hover:text-foreground h-full w-full rounded-none p-0 text-xs"
                                    data-testid={TEST_IDS.ASSET_IMPORT.BUTTON_ROW_ACTIONS(actualRowIndex)}
                                  >
                                    {actualRowIndex + 1}
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent>
                                  <DropdownMenuItem
                                    onClick={() =>
                                      insertRow(actualRowIndex, "above")
                                    }
                                    data-testid={TEST_IDS.ASSET_IMPORT.MENUITEM_INSERT_ROW_ABOVE(actualRowIndex)}
                                  >
                                    <ArrowUp className="mr-2 h-4 w-4" />
                                    Insert Above
                                  </DropdownMenuItem>
                                  <DropdownMenuItem
                                    onClick={() =>
                                      insertRow(actualRowIndex, "below")
                                    }
                                    data-testid={TEST_IDS.ASSET_IMPORT.MENUITEM_INSERT_ROW_BELOW(actualRowIndex)}
                                  >
                                    <ArrowDown className="mr-2 h-4 w-4" />
                                    Insert Below
                                  </DropdownMenuItem>
                                  <DropdownMenuSeparator />
                                  <DropdownMenuItem
                                    onClick={() => deleteRow(actualRowIndex)}
                                    className="text-red-600"
                                    data-testid={TEST_IDS.ASSET_IMPORT.MENUITEM_DELETE_ROW(actualRowIndex)}
                                  >
                                    <Trash className="mr-2 h-4 w-4" />
                                    Delete Row
                                  </DropdownMenuItem>
                                </DropdownMenuContent>
                              </DropdownMenu>
                            </div>
                            {headers.map((_, colIndex) => {
                              const error =
                                errors[`${actualRowIndex}-${colIndex}`];
                              return (
                                <div
                                  key={colIndex}
                                  className="relative min-w-[150px] flex-1 border-r border-b p-0"
                                >
                                  <Tooltip>
                                    <TooltipTrigger asChild>
                                      <div className="relative h-full w-full">
                                        <Input
                                          className={cn(
                                            "focus-visible:ring-primary h-9 rounded-none border-none bg-transparent px-3 text-xs focus-visible:ring-1 focus-visible:ring-inset",
                                            error &&
                                              "bg-red-50 pr-8 focus-visible:ring-red-500",
                                          )}
                                          value={row[colIndex] || ""}
                                          onChange={(e) =>
                                            handleCellChange(
                                              actualRowIndex,
                                              colIndex,
                                              e.target.value,
                                            )
                                          }
                                          data-testid={TEST_IDS.ASSET_IMPORT.INPUT_CELL(actualRowIndex, String(colIndex))}
                                        />
                                        {error && (
                                          <div className="pointer-events-none absolute top-1/2 right-2 -translate-y-1/2 text-red-500">
                                            <AlertCircle className="h-3 w-3" />
                                          </div>
                                        )}
                                      </div>
                                    </TooltipTrigger>
                                    {error && (
                                      <TooltipContent
                                        side="top"
                                        className="params-none border-red-600 bg-red-500 text-white"
                                      >
                                        <p>{error}</p>
                                      </TooltipContent>
                                    )}
                                  </Tooltip>
                                </div>
                              );
                            })}
                          </div>
                        );
                      })}
                  </div>

                  <div className="border-b p-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-muted-foreground w-full"
                      onClick={addRow}
                      data-testid={TEST_IDS.ASSET_IMPORT.BUTTON_ADD_ROW}
                    >
                      <Plus className="mr-2 h-4 w-4" /> Add Row
                    </Button>
                  </div>
                </div>
                <ScrollBar orientation="horizontal" />
              </ScrollArea>
            </TooltipProvider>
          )}
        </div>

        <DialogFooter className="bg-background z-20 flex flex-col sm:flex-row items-center sm:justify-between border-t p-6 pt-4 gap-4 sm:gap-0">
          <div className="text-muted-foreground flex items-center gap-4 text-sm">
            {hasErrors ? (
              <span className="flex items-center gap-2 text-red-600">
                <AlertCircle className="h-4 w-4" /> พบข้อมูลไม่ถูกต้อง (
                {Object.keys(errors).length} จุด)
              </span>
            ) : (
              <span className="hidden sm:inline">
                ทั้งหมด {data.length} รายการ
              </span>
            )}

            {/* Pagination Controls */}
            {totalPages > 1 && (
              <div className="ml-2 flex items-center gap-1 border-l pl-4">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setPage(1)}
                  disabled={page === 1}
                  className="h-8 w-8"
                  data-testid={TEST_IDS.ASSET_IMPORT.BUTTON_FIRST_PAGE}
                >
                  <span className="sr-only">หน้าแรก</span>
                  <ChevronFirst className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className="h-8 w-8"
                  data-testid={TEST_IDS.ASSET_IMPORT.BUTTON_PREV_PAGE}
                >
                  <span className="sr-only">ก่อนหน้า</span>
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <div className="flex items-center gap-1 px-2">
                  <span className="text-sm font-medium">หน้า {page}</span>
                  <span className="text-muted-foreground text-xs">
                    / {totalPages}
                  </span>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages}
                  className="h-8 w-8"
                  data-testid={TEST_IDS.ASSET_IMPORT.BUTTON_NEXT_PAGE}
                >
                  <span className="sr-only">ถัดไป</span>
                  <ChevronRight className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setPage(totalPages)}
                  disabled={page === totalPages}
                  className="h-8 w-8"
                  data-testid={TEST_IDS.ASSET_IMPORT.BUTTON_LAST_PAGE}
                >
                  <span className="sr-only">หน้าสุดท้าย</span>
                  <ChevronLast className="h-4 w-4" />
                </Button>
              </div>
            )}
          </div>
          <div className="flex flex-col-reverse sm:flex-row w-full sm:w-auto gap-2">
            <Button
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={loading}
              className="flex-1 sm:flex-none"
              data-testid={TEST_IDS.ASSET_IMPORT.BUTTON_CANCEL}
            >
              ยกเลิก
            </Button>
            <Button
              onClick={handleConfirm}
              disabled={
                loading ||
                parsing ||
                (!isExcel && (hasErrors || data.length === 0))
              }
              className="flex-1 sm:flex-none"
              data-testid={TEST_IDS.ASSET_IMPORT.BUTTON_CONFIRM}
            >
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              ตรวจสอบ (Dry Run)
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
