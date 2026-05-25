"use client";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { ScrollArea } from "@/components/ui/scroll-area";
import { TEST_IDS } from "@/components/test-ids";
import {
  CheckCircle2,
  AlertCircle,
  XCircle,
  UserPlus,
  UserCheck,
  UserX,
} from "lucide-react";

export interface ConfirmUserData {
  totalRows: number;
  added: number;
  updated: number;
  skipped: number;
  errors: any[];
  quotaBefore: number;
  quotaAfter: number;
}

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  data: ConfirmUserData;
  onConfirm: () => void;
  loading?: boolean;
  progress?: { success: number; fail: number; total: number };
  onCancel?: () => void;
}

export function ConfirmUserImportDialog({
  open,
  onOpenChange,
  data,
  onConfirm,
  loading = false,
  progress,
  onCancel,
}: Props) {
  const warnings = data.errors.filter((e) =>
    e.error.startsWith("ระงับการนำเข้า"),
  );
  const validationErrors = data.errors.filter(
    (e) => !e.error.startsWith("ระงับการนำเข้า"),
  );

  const hasWarnings = warnings.length > 0;
  const hasErrors = validationErrors.length > 0;

  // Helper to Group Errors
  const groupErrors = (errList: any[]) => {
    return Object.entries(
      errList.reduce(
        (acc: Record<string, number[]>, curr) => {
          if (!acc[curr.error]) acc[curr.error] = [];
          acc[curr.error].push(curr.line);
          return acc;
        },
        {} as Record<string, number[]>,
      ),
    ).map(([msg, lines]: [string, any], i) => {
      const lineNums = lines as number[];
      return (
        <div key={i} className="text-xs">
          <span className="font-semibold">{msg}</span> ({lineNums.length}{" "}
          รายการ):{" "}
          {lineNums.length > 5 ? (
            <span>
              บรรทัดที่ {lineNums[0]}...
              {lineNums[lineNums.length - 1]}
            </span>
          ) : (
            <span>บรรทัดที่ {lineNums.join(", ")}</span>
          )}
        </div>
      );
    });
  };

  // Progress Calculation
  const currentProgress = (progress?.success || 0) + (progress?.fail || 0);
  const progressPercent =
    loading && progress
      ? Math.round((currentProgress / progress.total) * 100)
      : 0;

  return (
    <Dialog open={open} onOpenChange={(val) => !loading && onOpenChange(val)}>
      <DialogContent className="flex max-h-[90vh] w-[95vw] sm:w-full max-w-lg flex-col overflow-hidden gap-0 p-0" data-testid={TEST_IDS.CONFIRM_IMPORT.MODAL_CONFIRM_IMPORT}>
        {/* Progress Overlay */}
        {loading && progress && (
          <div className="bg-background/95 absolute inset-0 z-50 flex flex-col items-center justify-center space-y-8 p-10 backdrop-blur-sm">
            <div className="w-full max-w-md space-y-6 text-center">
              <div className="space-y-2">
                <h3 className="text-xl font-semibold tracking-tight">
                  กำลังนำเข้าข้อมูล...
                </h3>
                <p className="text-muted-foreground text-sm">
                  กรุณารอสักครู่ ระบบกำลังประมวลผลข้อมูลของคุณ
                </p>
              </div>

              <div className="space-y-2">
                <div className="flex justify-between text-xs font-medium text-slate-500">
                  <span>ความคืบหน้า</span>
                  <span>{progressPercent}%</span>
                </div>
                <Progress value={progressPercent} className="h-3 w-full" />
              </div>

              <div className="flex justify-center pt-2">
                <div className="bg-green-50 text-green-700 inline-flex items-center gap-2 rounded-full px-4 py-1.5 text-sm font-medium border border-green-100 shadow-sm">
                  <span className="relative flex h-2.5 w-2.5">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-green-500"></span>
                  </span>
                  นำเข้าสำเร็จ: {progress.success} รายการ
                </div>
              </div>

              {onCancel && (
                <div className="pt-4">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={onCancel}
                    className="text-muted-foreground hover:text-red-600"
                  >
                    ยกเลิกการทำงาน
                  </Button>
                </div>
              )}
            </div>
          </div>
        )}

        <DialogHeader className="border-b p-6 pb-4">
          <DialogTitle>ยืนยันการนำเข้าข้อมูล</DialogTitle>
          <DialogDescription>
            สรุปรายการข้อมูลที่จะนำเข้าสู่ระบบ
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto">
          <div className="p-6 space-y-6">
            {/* Stats Grid */}
            <div className="grid grid-cols-2 gap-4">
              {/* Total/Success */}
              <div className="rounded-lg border bg-slate-50/50 p-4 space-y-1">
                <div className="text-sm text-muted-foreground">
                  รายการทั้งหมด
                </div>
                <div className="text-2xl font-bold text-slate-900">
                  {data.totalRows}
                </div>
                <div className="text-xs text-muted-foreground">
                  จากไฟล์ที่อัปโหลด
                </div>
              </div>

              {/* Added */}
              <div className="rounded-lg border border-green-100 bg-green-50/50 p-4 space-y-1">
                <div className="flex items-center gap-2 text-sm text-green-700 font-medium">
                  <UserPlus className="h-4 w-4" />
                  เพิ่มใหม่
                </div>
                <div className="text-2xl font-bold text-green-700">
                  {data.added}
                </div>
              </div>

              {/* Updated */}
              <div className="rounded-lg border border-blue-100 bg-blue-50/50 p-4 space-y-1">
                <div className="flex items-center gap-2 text-sm text-blue-700 font-medium">
                  <UserCheck className="h-4 w-4" />
                  อัปเดต
                </div>
                <div className="text-2xl font-bold text-blue-700">
                  {data.updated}
                </div>
              </div>

              {/* Skipped */}
              <div className="rounded-lg border border-orange-100 bg-orange-50/50 p-4 space-y-1">
                <div className="flex items-center gap-2 text-sm text-orange-700 font-medium">
                  <UserX className="h-4 w-4" />
                  ข้าม/เต็ม
                </div>
                <div className="text-2xl font-bold text-orange-700">
                  {data.skipped}
                </div>
              </div>
            </div>

            {/* Quota Info */}
            <div className="rounded-md bg-muted/30 p-3 text-sm flex items-center justify-between border">
              <span className="text-muted-foreground">โควต้าคงเหลือ:</span>
              <div className="flex items-center gap-2">
                <span className="line-through text-muted-foreground">
                  {data.quotaBefore}
                </span>
                <span className="text-muted-foreground">→</span>
                <span
                  className={
                    data.quotaAfter <= 0
                      ? "text-red-600 font-bold"
                      : "text-foreground font-medium"
                  }
                >
                  {data.quotaAfter}
                </span>
              </div>
            </div>

            {/* Quota Warnings (Orange) */}
            {hasWarnings && (
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-sm font-medium text-orange-600">
                  <AlertCircle className="h-4 w-4" />
                  รายการที่ไม่ถูกนำเข้า ({warnings.length})
                </div>
                <ScrollArea className="h-[100px] rounded-md border border-orange-200 bg-orange-50/30 p-2">
                  <div className="space-y-1 text-orange-700">
                    {groupErrors(warnings)}
                  </div>
                </ScrollArea>
              </div>
            )}

            {/* Validation Errors (Red) */}
            {hasErrors && (
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-sm font-medium text-red-600">
                  <XCircle className="h-4 w-4" />
                  พบข้อผิดพลาด ({validationErrors.length})
                </div>
                <ScrollArea className="h-[100px] rounded-md border bg-red-50/30 p-2">
                  <div className="space-y-1 text-red-600">
                    {groupErrors(validationErrors)}
                  </div>
                </ScrollArea>
              </div>
            )}
          </div>
        </div>

        <DialogFooter className="flex flex-col-reverse sm:flex-row sm:justify-end gap-3 sm:gap-2 p-6 pt-4 border-t">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            className="w-full sm:w-auto"
            data-testid={TEST_IDS.CONFIRM_IMPORT.BUTTON_CANCEL}
          >
            ยกเลิก
          </Button>
          <Button
            onClick={onConfirm}
            className="w-full sm:w-auto"
            disabled={data.added === 0 && data.updated === 0}
            data-testid={TEST_IDS.CONFIRM_IMPORT.BUTTON_CONFIRM}
          >
            ยืนยันนำเข้า {data.added + data.updated} รายการ
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
