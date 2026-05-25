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
  ArrowDown,
  AlertCircle,
  XCircle,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  ChevronFirst,
  ChevronLast,
  FileText,
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
import { TEST_IDS } from "@/components/test-ids";
import { toast } from "sonner";
import { useUser } from "@/hooks/use-user";
import { PREFIX_OPTIONS } from "@/lib/constants";

// --- Validation Schema ---
const rowSchema = z.object({
  username: z.string().min(1, "จำเป็นต้องระบุ Username"),
  password: z.string().optional(),
  email: z
    .string()
    .email("รูปแบบอีเมลไม่ถูกต้อง")
    .min(1, "จำเป็นต้องระบุ Email"),
  prefix: z
    .string()
    .optional()
    .refine(
      (val) => !val || PREFIX_OPTIONS.includes(val),
      `คำนำหน้าต้องเป็น ${PREFIX_OPTIONS.join(", ")}`,
    ),
  name: z.string().optional(),
  surname: z.string().optional(),
  mobile: z.string().optional(),
  position: z.string().optional(),
  role: z.string().optional(),
  dept: z.string().optional(),
  institute: z.string().optional(),
  section: z.string().optional(),
});

// Mapping Header -> Key
// Comprehensive Mapping (Supports both Legacy & Standard Template)
const HEADER_KEY_MAPPING: Record<string, string> = {
  // Legacy Format
  employeeid: "username",
  prefixname: "prefix",
  firstname: "name",
  lastname: "surname",
  phone: "mobile",
  // department: "position", // Legacy maps department -> position often (Removed/Fixed)

  // Standard Template Format (English keys)
  username: "username",
  password: "password",
  email: "email",
  prefix: "prefix",
  name: "name",
  surname: "surname",
  mobile: "mobile",
  institute: "institute",
  department: "dept",
  dept: "dept",
  section: "section",
  position: "position",
  role: "role",

  // Thai variations
  รหัสพนักงาน: "username",
  รหัส: "username",
  รหัสผ่าน: "password",
  อีเมล: "email",
  คำนำหน้า: "prefix",
  เบอร์โทร: "mobile",
  ตำแหน่ง: "position",
  ชื่อ: "name",
  นามสกุล: "surname",
  สำนัก: "institute",
  แผนก: "dept",
  ฝ่าย: "section",
  สิทธิ์: "role",
  ส่วนงาน: "section",
};

// Column Index Mapping (Standard Template Assumption)
// Backend Order: username, password, email, prefix, name, surname, mobile, institute, department, section, position
const KEY_INDEX_MAPPING: Record<number, string> = {
  0: "username",
  1: "password",
  2: "email",
  3: "prefix",
  4: "name",
  5: "surname",
  6: "mobile",
  7: "institute",
  8: "dept",
  9: "section",
  10: "position",
};

interface UserImportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  file: File | null;
  onConfirm: (file: File) => void;
  loading: boolean;
}

export function UserImportDialog({
  open,
  onOpenChange,
  file,
  onConfirm,
  loading,
}: UserImportDialogProps) {
  const [data, setData] = useState<string[][]>([]);
  const [headers, setHeaders] = useState<string[]>([]);
  const [parsing, setParsing] = useState(false);
  const [parseProgress, setParseProgress] = useState(0);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isExcel, setIsExcel] = useState(false);

  // Pagination
  const [page, setPage] = useState(1);
  const PAGE_SIZE = 50;
  const totalPages = Math.ceil(data.length / PAGE_SIZE);

  useEffect(() => {
    if (file && open) {
      const fileName = file.name.toLowerCase();
      if (fileName.endsWith(".xlsx") || fileName.endsWith(".xls")) {
        setIsExcel(true);
        // Excel handling is simpler since we use library downstream often,
        // but for preview we'd typically need to parse it client side properly.
        // For now, mirroring Asset dialog which might just skip preview for binary excel if libraries aren't loaded here.
        // BUT, User dashboard uses 'executeImport' which does parsing.
        // Let's rely on generic CSV parsing for now. If user uploads Excel, we might need 'exceljs'.
        // For simplicity towards UX similar to Assets, let's assume CSV predominantly or basic parsing.
        // *However*, Asset dialog actually disables client preview for Excel ("setIsExcel(true)... setData([])").
        // We will do the same: "Preview available for CSV only" to match Asset behavior.
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
      if (currentRow.some((c) => c.trim() !== "")) {
        rows.push(currentRow);
      }
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

  const validateAll = useCallback(
    (currentData: string[][], currentHeaders: string[]) => {
      const newErrors: Record<string, string> = {};

      // Determine mapping
      // Try to find indices for known columns from headers
      const columnMapping: Record<number, string> = {};

      currentHeaders.forEach((h, idx) => {
        const norm = h.toLowerCase().replace(/[^a-z0-9ก-๙]/g, "");
        const key = HEADER_KEY_MAPPING[norm] || HEADER_KEY_MAPPING[h];
        if (key) {
          columnMapping[idx] = key;
        } else if (KEY_INDEX_MAPPING[idx]) {
          // Fallback to position based if standard header matches roughly?
          // Actually, let's trust header name first. If no header match, use position?
          // User Dashboard logic prioritized Header Name.
          columnMapping[idx] = KEY_INDEX_MAPPING[idx];
        }
      });

      currentData.forEach((row, rowIndex) => {
        row.forEach((cell, colIndex) => {
          const fieldKey = columnMapping[colIndex];
          if (fieldKey) {
            const shape = rowSchema.shape as any;
            if (shape[fieldKey]) {
              const result = shape[fieldKey].safeParse(cell);
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
    // Determine page offset
    const actualRowIndex = (page - 1) * PAGE_SIZE + rowIndex;

    const newData = [...data];
    newData[actualRowIndex] = [...newData[actualRowIndex]];
    newData[actualRowIndex][colIndex] = value;
    setData(newData);

    // Re-validate cell
    // Determine mapping (Simplified for single cell - assuming headers static)
    const columnMapping: Record<number, string> = {};
    headers.forEach((h, idx) => {
      const norm = h.toLowerCase().replace(/[^a-z0-9ก-๙]/g, "");
      const key = HEADER_KEY_MAPPING[norm] || HEADER_KEY_MAPPING[h];
      if (key) columnMapping[idx] = key;
      else if (KEY_INDEX_MAPPING[idx])
        columnMapping[idx] = KEY_INDEX_MAPPING[idx];
    });

    const fieldKey = columnMapping[colIndex];
    if (fieldKey) {
      const shape = rowSchema.shape as any;
      if (shape[fieldKey]) {
        const result = shape[fieldKey].safeParse(value);
        const errKey = `${actualRowIndex}-${colIndex}`;

        if (!result.success) {
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

  const handleSave = () => {
    // Reconstruct CSV/Excel
    // Join headers + data
    const escaped = (v: string) => {
      if (v === null || v === undefined) return "";
      if (/[",\n\r]/.test(v)) return `"${v.replace(/"/g, '""')}"`;
      return v;
    };

    const csvContent = [
      headers.map(escaped).join(","),
      ...data.map((row) => row.map(escaped).join(",")),
    ].join("\n");

    const bom = new Uint8Array([0xef, 0xbb, 0xbf]);
    const blob = new Blob([bom, csvContent], {
      type: "text/csv;charset=utf-8;",
    });
    const newFile = new File([blob], file?.name || "import.csv", {
      type: "text/csv",
    });

    onConfirm(newFile);
  };

  const paginatedData = data.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  return (
    <Dialog open={open} onOpenChange={(val) => !loading && onOpenChange(val)}>
      <DialogContent className="flex h-[90vh] w-[95vw] flex-col gap-0 overflow-hidden p-0 sm:max-w-[95vw]" data-testid={TEST_IDS.USER_IMPORT.MODAL}>
        <DialogHeader className="border-b p-6 pb-4">
          <DialogTitle>ตรวจสอบและแก้ไขข้อมูล (Import Users)</DialogTitle>
          <DialogDescription>
            ตรวจสอบความถูกต้องของข้อมูลก่อนนำเข้า
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-hidden relative">
          {parsing ? (
            <div className="flex h-full flex-col items-center justify-center space-y-4 p-8">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
              <div className="text-sm font-medium text-muted-foreground">
                กำลังอ่านไฟล์ ({parseProgress}%)...
              </div>
            </div>
          ) : isExcel ? (
            <div className="flex h-full flex-col items-center justify-center space-y-4 p-8 text-center">
              <FileText className="h-16 w-16 text-muted-foreground/30" />
              <div className="space-y-2">
                <h3 className="font-semibold">ไฟล์ Excel (.xlsx)</h3>
                <p className="text-sm text-muted-foreground max-w-md mx-auto">
                  ไม่สามารถแสดงพรีวิวสำหรับไฟล์ Excel ได้โดยตรง <br />
                  โปรดตรวจสอบไฟล์ต้นฉบับ หรือบันทึกเป็น CSV
                  หากต้องการแก้ไขในหน้านี้
                </p>
              </div>
              <div className="pt-4">
                <Button
                  onClick={() => file && onConfirm(file)}
                  disabled={loading}
                >
                  {loading ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <CheckCircle2 className="mr-2 h-4 w-4" />
                  )}
                  ยืนยันการนำเข้า
                </Button>
              </div>
            </div>
          ) : data.length === 0 ? (
            <div className="flex h-full items-center justify-center text-muted-foreground">
              ไม่พบข้อมูล
            </div>
          ) : (
            <>
              <ScrollArea className="h-full w-full">
                <div className="min-w-max p-4">
                  <div className="border rounded-md">
                    {/* Custom Grid Table */}
                    <div
                      className="grid border-b bg-muted/50 text-sm font-medium"
                      style={{
                        gridTemplateColumns: `50px repeat(${headers.length}, minmax(150px, 1fr)) 50px`,
                      }}
                    >
                      <div className="flex items-center justify-center p-2 border-r bg-muted/20">
                        #
                      </div>
                      {headers.map((h, i) => (
                        <div
                          key={i}
                          className="flex items-center justify-center p-2 px-3 border-r"
                        >
                          {h}
                        </div>
                      ))}
                      <div className="flex items-center justify-center p-2 text-muted-foreground"></div>
                    </div>

                    {paginatedData.map((row, rowIndex) => (
                      <div
                        key={rowIndex}
                        className="grid border-b last:border-0 hover:bg-muted/5 transition-colors group text-sm"
                        style={{
                          gridTemplateColumns: `50px repeat(${headers.length}, minmax(150px, 1fr)) 50px`,
                        }}
                      >
                        <div className="flex items-center justify-center p-2 border-r text-xs text-muted-foreground bg-muted/10">
                          {(page - 1) * PAGE_SIZE + rowIndex + 1}
                        </div>
                        {row.map((cell, colIndex) => {
                          const actualRowIdx =
                            (page - 1) * PAGE_SIZE + rowIndex;
                          const hasError =
                            errors[`${actualRowIdx}-${colIndex}`];
                          return (
                            <div
                              key={colIndex}
                              className="relative border-r p-0"
                            >
                              <input
                                className={cn(
                                  "w-full h-full bg-transparent px-3 py-2 outline-none focus:bg-primary/5 focus:ring-1 focus:ring-inset focus:ring-primary/20 transition-colors",
                                  hasError &&
                                    "bg-red-50 text-red-600 font-medium",
                                )}
                                value={cell}
                                onChange={(e) =>
                                  handleCellChange(
                                    rowIndex,
                                    colIndex,
                                    e.target.value,
                                  )
                                }
                              />
                              {hasError && (
                                <div className="absolute right-1 top-1/2 -translate-y-1/2">
                                  <TooltipProvider>
                                    <Tooltip>
                                      <TooltipTrigger>
                                        <AlertCircle className="h-3 w-3 text-red-500" />
                                      </TooltipTrigger>
                                      <TooltipContent>
                                        <p>{hasError}</p>
                                      </TooltipContent>
                                    </Tooltip>
                                  </TooltipProvider>
                                </div>
                              )}
                            </div>
                          );
                        })}
                        <div className="flex items-center justify-center p-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6 text-muted-foreground hover:text-red-600 opacity-0 group-hover:opacity-100 transition-opacity"
                            onClick={() => {
                              const actualRowIdx =
                                (page - 1) * PAGE_SIZE + rowIndex;
                              const newData = [...data];
                              newData.splice(actualRowIdx, 1);
                              setData(newData);
                            }}
                          >
                            <Trash className="h-3 w-3" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </ScrollArea>
            </>
          )}
        </div>

        <DialogFooter className="bg-background z-20 flex flex-col sm:flex-row items-center sm:justify-between border-t p-6 pt-4 gap-4 sm:gap-0">
          <div className="text-muted-foreground flex items-center gap-4 text-sm">
            {Object.keys(errors).length > 0 ? (
              <span className="flex items-center gap-2 text-red-600 font-medium">
                <XCircle className="h-4 w-4" />
                พบข้อผิดพลาด {Object.keys(errors).length} จุด
              </span>
            ) : (
              <span className="flex items-center gap-2 text-green-600 font-medium h-4">
                {data.length > 0 && (
                  <>
                    <CheckCircle2 className="h-4 w-4" />
                    ข้อมูลถูกต้อง ({data.length} รายการ)
                  </>
                )}
              </span>
            )}
          </div>

          {/* Pagination in Footer */}
          {totalPages > 1 && (
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 rounded-full"
                onClick={() => setPage(1)}
                disabled={page === 1}
                data-testid={TEST_IDS.USER_IMPORT.BUTTON_FIRST_PAGE}
              >
                <ChevronFirst className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 rounded-full"
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
                data-testid={TEST_IDS.USER_IMPORT.BUTTON_PREV_PAGE}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <span className="text-xs font-medium min-w-[3rem] text-center">
                {page} / {totalPages}
              </span>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 rounded-full"
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                data-testid={TEST_IDS.USER_IMPORT.BUTTON_NEXT_PAGE}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 rounded-full"
                onClick={() => setPage(totalPages)}
                disabled={page === totalPages}
                data-testid={TEST_IDS.USER_IMPORT.BUTTON_LAST_PAGE}
              >
                <ChevronLast className="h-4 w-4" />
              </Button>
            </div>
          )}

          <div className="flex gap-2 w-full sm:w-auto justify-end">
            <Button
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={loading}
              data-testid={TEST_IDS.USER_IMPORT.BUTTON_CANCEL}
            >
              ยกเลิก
            </Button>
            {!isExcel && (
              <Button
                onClick={handleSave}
                disabled={
                  loading ||
                  data.length === 0 ||
                  Object.keys(errors).length > 0 ||
                  parsing
                }
                data-testid={TEST_IDS.USER_IMPORT.BUTTON_CONFIRM}
              >
                {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                ถัดไป
              </Button>
            )}
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
