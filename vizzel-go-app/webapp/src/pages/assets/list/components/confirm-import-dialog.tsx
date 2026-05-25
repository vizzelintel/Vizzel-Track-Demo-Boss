"use client";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";

import { Progress } from "@/components/ui/progress";
import { TEST_IDS } from "@/components/test-ids";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  data: {
    newCategories: string[];
    newTypes: string[];
    newClasses: string[];
    newBuildings: string[];
    newRooms: string[];
    newStatuses: string[];
    matchedOwners: number;
    imported: number;
    created?: number;
    updated?: number;
    failed: number;
    errors: any[];
  };
  onConfirm: () => void;
  loading?: boolean;
  progress?: { success: number; fail: number; total: number };
  onCancel?: () => void;
};

export function ConfirmImportDialog({
  open,
  onOpenChange,
  data,
  onConfirm,
  loading = false,
  progress,
  onCancel,
}: Props) {
  const hasErrors = data.failed > 0;
  const hasNewItems =
    data.newCategories.length > 0 ||
    data.newTypes.length > 0 ||
    data.newClasses.length > 0 ||
    data.newBuildings.length > 0 ||
    data.newRooms.length > 0 ||
    data.newStatuses.length > 0;

  // Progress Calculation
  // Use `processed` field if available (from new client logic), else fallback
  const currentProgress =
    (progress as any)?.processed ??
    (progress?.success || 0) + (progress?.fail || 0);
  const progressPercent =
    loading && progress
      ? Math.round((currentProgress / progress.total) * 100)
      : 0;

  // Error Categorization
  // Backend now handles duplicates as Updates, so we don't look for duplicates in errors anymore.
  const realErrors = data.errors;
  const failedCount = data.failed;
  const hasRealErrors = failedCount > 0;

  return (
    <Dialog open={open} onOpenChange={(val) => !loading && onOpenChange(val)}>
      <DialogContent className="flex max-h-[90vh] w-[95vw] sm:w-full max-w-2xl flex-col overflow-hidden gap-0 p-0" data-testid={TEST_IDS.CONFIRM_IMPORT.MODAL_CONFIRM_IMPORT}>
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
            ตรวจสอบรายละเอียดการนำเข้าและยืนยัน
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto">
          <div className="text-muted-foreground space-y-4 text-sm p-6">
            <div className="grid grid-cols-2 gap-4">
              <div className="rounded-lg border border-green-100 bg-green-50/50 p-3">
                <div className="text-2xl font-bold text-green-600">
                  {data.imported}
                </div>
                <div className="text-xs text-green-700">
                  รายการที่พร้อมนำเข้า
                </div>
                {/* Breakdown of Created vs Updated */}
                {(data.created !== undefined || data.updated !== undefined) && (
                  <div className="mt-1 flex flex-col gap-1 text-[11px] text-green-600/90 font-medium">
                    {data.created !== undefined && data.created > 0 && (
                      <span>• สร้างใหม่: {data.created} รายการ</span>
                    )}
                    {data.updated !== undefined && data.updated > 0 && (
                      <span>• อัปเดตข้อมูลเดิม: {data.updated} รายการ</span>
                    )}
                  </div>
                )}

                {data.matchedOwners > 0 && (
                  <div className="mt-2 pt-2 border-t border-green-200/50 text-[10px] text-green-600/80">
                    (ระบุผู้ถือครองได้ {data.matchedOwners} รายการ)
                  </div>
                )}
              </div>

              {/* Real Errors */}
              <div
                className={`rounded-lg border p-3 ${
                  hasRealErrors
                    ? "border-red-100 bg-red-50/50"
                    : "bg-muted/50 border-muted"
                }`}
              >
                <div
                  className={`text-2xl font-bold ${
                    hasRealErrors ? "text-red-600" : "text-muted-foreground"
                  }`}
                >
                  {failedCount}
                </div>
                <div
                  className={`text-xs ${
                    hasRealErrors ? "text-red-700" : "text-muted-foreground"
                  }`}
                >
                  รายการที่ไม่ผ่านเงื่อนไข
                </div>
              </div>
            </div>

            {/* Error Lists */}
            {hasRealErrors && (
              <div className="space-y-2">
                <p className="font-medium text-red-600">
                  ข้อผิดพลาดที่ต้องแก้ไข ({failedCount}):
                </p>
                <div className="bg-muted/50 max-h-[150px] space-y-1 overflow-y-auto rounded-md border p-2">
                  {realErrors.map((e: any, i: number) => (
                    <div key={i} className="text-xs text-red-600">
                      บรรทัดที่ {e.line}: {e.error}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {hasNewItems && (
              <div className="space-y-2 border-t pt-2">
                <p className="text-foreground font-medium">
                  ข้อมูลใหม่ที่จะถูกสร้างขึ้น:
                </p>
                <div className="bg-muted/50 max-h-[200px] space-y-2 overflow-y-auto rounded-md border p-2 text-xs">
                  {data.newCategories.length > 0 && (
                    <div className="space-y-1">
                      <span className="bg-muted/50 sticky top-0 block font-semibold">
                        Categories ({data.newCategories.length}):
                      </span>
                      <div className="text-muted-foreground pl-2 break-words">
                        {data.newCategories.slice(0, 100).join(", ")}
                        {data.newCategories.length > 100 &&
                          ` ...และอีก ${data.newCategories.length - 100} รายการ`}
                      </div>
                    </div>
                  )}
                  {data.newTypes.length > 0 && (
                    <div className="space-y-1">
                      <span className="bg-muted/50 sticky top-0 block font-semibold">
                        Types ({data.newTypes.length}):
                      </span>
                      <div className="text-muted-foreground pl-2 break-words">
                        {data.newTypes.slice(0, 100).join(", ")}
                        {data.newTypes.length > 100 &&
                          ` ...และอีก ${data.newTypes.length - 100} รายการ`}
                      </div>
                    </div>
                  )}
                  {data.newClasses.length > 0 && (
                    <div className="space-y-1">
                      <span className="bg-muted/50 sticky top-0 block font-semibold">
                        Classes ({data.newClasses.length}):
                      </span>
                      <div className="text-muted-foreground pl-2 break-words">
                        {data.newClasses.slice(0, 100).join(", ")}
                        {data.newClasses.length > 100 &&
                          ` ...และอีก ${data.newClasses.length - 100} รายการ`}
                      </div>
                    </div>
                  )}
                  {data.newBuildings.length > 0 && (
                    <div className="space-y-1">
                      <span className="bg-muted/50 sticky top-0 block font-semibold">
                        Buildings ({data.newBuildings.length}):
                      </span>
                      <div className="text-muted-foreground pl-2 break-words">
                        {data.newBuildings.slice(0, 100).join(", ")}
                        {data.newBuildings.length > 100 &&
                          ` ...และอีก ${data.newBuildings.length - 100} รายการ`}
                      </div>
                    </div>
                  )}
                  {data.newRooms.length > 0 && (
                    <div className="space-y-1">
                      <span className="bg-muted/50 sticky top-0 block font-semibold">
                        Rooms ({data.newRooms.length}):
                      </span>
                      <div className="text-muted-foreground pl-2 break-words">
                        {data.newRooms.slice(0, 100).join(", ")}
                        {data.newRooms.length > 100 &&
                          ` ...และอีก ${data.newRooms.length - 100} รายการ`}
                      </div>
                    </div>
                  )}
                  {data.newStatuses.length > 0 && (
                    <div className="space-y-1">
                      <span className="bg-muted/50 sticky top-0 block font-semibold">
                        Statuses ({data.newStatuses.length}):
                      </span>
                      <div className="text-muted-foreground pl-2 break-words">
                        {data.newStatuses.slice(0, 100).join(", ")}
                        {data.newStatuses.length > 100 &&
                          ` ...และอีก ${data.newStatuses.length - 100} รายการ`}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            <p className="pt-2 font-medium">
              {data.imported > 0
                ? "ต้องการยืนยันการนำเข้าข้อมูลที่ถูกต้องหรือไม่?"
                : "ไม่พบข้อมูลที่สามารถนำเข้าได้ กรุณาตรวจสอบไฟล์อีกครั้ง"}
            </p>
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
          {data.imported > 0 && (
            <Button onClick={onConfirm} className="w-full sm:w-auto" data-testid={TEST_IDS.CONFIRM_IMPORT.BUTTON_CONFIRM}>
              ยืนยันนำเข้า {data.imported} รายการ
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
